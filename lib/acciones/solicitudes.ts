"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { correos } from "../correo";
import { urlSitio } from "../sitio";
import { mensajeError } from "../errores";
import { nombreMateria } from "../materias";
import { getDb, auditar } from "../db";
import { cifrar, codigoAleatorio, codigoCaso } from "../crypto";
import { usuarioActual } from "../auth";
import { ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { limpiarDatosPersonales } from "../limpiar";
import { asignarAsesor, obtenerAsesorPublico, registrarEvento } from "../datos";
import { datosDeForm, erroresPorCampo, esquemaSolicitud, type EstadoForm } from "../validators";
import { leerTerminos } from "../terminos";

export async function crearSolicitud(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const valores = { ...datos };
  delete valores.web;

  // Campo trampa: las personas no lo ven, los programas automáticos sí.
  if (datos.web) redirect("/");

  const ip = await ipActual();
  // Dos límites: uno holgado para intentos (incluye errores de llenado) y otro estricto para solicitudes válidas.
  if (!(await permitir(`solicitud-intento:${ip}`, 60, 60 * 60 * 1000))) {
    return { error: "Hiciste muchos intentos seguidos. Espera un rato y vuelve a probar.", valores };
  }

  const parsed = esquemaSolicitud.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores };
  const s = parsed.data;
  const terminos = await leerTerminos();
  if (!terminos.publicado) {
    return {
      error: "El sitio todavía no puede recibir solicitudes: administración debe completar y publicar los términos.",
      valores,
    };
  }

  if (!(await permitir(`solicitud:${ip}`, 6, 60 * 60 * 1000))) {
    return { error: "Enviaste varias solicitudes seguidas. Espera un rato antes de enviar otra.", valores };
  }

  const asesor = s.asesor === "auto" ? await asignarAsesor(s.materia) : await obtenerAsesorPublico(s.asesor);
  if (!asesor) return { error: "Ese asesor ya no está disponible. Elige otro.", valores };

  const usuario = await usuarioActual();
  const clienteId = usuario?.rol === "cliente" ? usuario.id : null;

  const { texto: relato } = limpiarDatosPersonales(s.relato);
  const codigo = codigoAleatorio();
  const codigoSeguimiento = codigoCaso("CASO");

  let id: number;
  try {
    const d = await getDb();
    const r = await d.execute({
      sql: `INSERT INTO solicitudes
              (codigo, codigo_seguimiento, asesor_id, cliente_id, materia, region, urgencia, presupuesto,
               relato_enc, nombre_enc, email_enc, telefono_enc, derivar_ok, conservar_datos, terminos_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        codigo,
        codigoSeguimiento,
        asesor.usuarioId,
        clienteId,
        s.materia,
        s.region,
        s.urgencia,
        s.presupuesto,
        cifrar(relato, "solicitud.relato"),
        cifrar(s.nombre, "solicitud.nombre"),
        cifrar(s.email, "solicitud.email"),
        s.telefono ? cifrar(s.telefono, "solicitud.telefono") : "",
        s.derivar === "on" ? 1 : 0,
        s.conservar === "on" ? 1 : 0,
        String(terminos.version),
      ],
    });
    id = Number(r.lastInsertRowid);
    await registrarEvento(id, "etapa", "Recibida");
    await auditar(clienteId, "solicitud_creada", "solicitud", id);
  } catch (e) {
    return { error: mensajeError(e, "enviar tu solicitud"), valores };
  }
  // Los correos salen después de responder: la persona no espera por ellos.
  after(async () => {
    const d = await getDb();
    const f = (await d.execute({ sql: "SELECT email FROM usuarios WHERE id = ?", args: [asesor.usuarioId] })).rows[0];
    if (f) await correos.nuevaSolicitud(String(f.email), nombreMateria(s.materia), `${urlSitio()}/panel/solicitudes/${id}`);
    await correos.confirmacion(s.email, `${urlSitio()}/seguimiento/${codigo}`);
  });
  redirect(`/seguimiento/${codigo}?nueva=1`);
}

/** La persona borra su solicitud con el código del enlace. Elimina caso, informe, pendientes e historial. */
export async function borrarMisDatos(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "").slice(0, 40);
  if (fd.get("confirmo") !== "on") redirect(`/seguimiento/${encodeURIComponent(codigo)}?borrar=confirma`);
  const ip = await ipActual();
  if (!(await permitir(`borrar:${ip}`, 10, 60 * 60 * 1000))) redirect(`/seguimiento/${encodeURIComponent(codigo)}?borrar=limite`);
  const d = await getDb();
  const f = (await d.execute({ sql: "SELECT id FROM solicitudes WHERE codigo = ?", args: [codigo] })).rows[0];
  if (!f) redirect("/");
  const id = Number(f.id);
  await d.execute({ sql: "DELETE FROM solicitudes WHERE id = ?", args: [id] });
  // La auditoría no guarda nada de la persona: solo que hubo un borrado.
  await auditar(null, "datos_borrados_por_persona", "solicitud", id);
  redirect("/privacidad?borrado=1");
}

/** La persona decide si se guardan sus datos después de la asesoría. */
export async function cambiarConservacion(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "").slice(0, 40);
  const conservar = fd.get("conservar") === "on" ? 1 : 0;
  const ip = await ipActual();
  if (!(await permitir(`conservar:${ip}`, 20, 60 * 60 * 1000))) redirect(`/seguimiento/${encodeURIComponent(codigo)}`);
  const d = await getDb();
  const f = (await d.execute({ sql: "SELECT id FROM solicitudes WHERE codigo = ? AND anonimizada_en = ''", args: [codigo] })).rows[0];
  if (f) {
    await d.execute({ sql: "UPDATE solicitudes SET conservar_datos = ? WHERE id = ?", args: [conservar, Number(f.id)] });
    await auditar(null, conservar ? "conservar_datos_si" : "conservar_datos_no", "solicitud", Number(f.id));
  }
  redirect(`/seguimiento/${encodeURIComponent(codigo)}?guardado=1`);
}
