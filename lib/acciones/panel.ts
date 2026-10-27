"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb, auditar } from "../db";
import { cifrar, codigoAleatorio } from "../crypto";
import { requerirAbogado } from "../guards";
import { correos } from "../correo";
import { urlSitio } from "../sitio";
import {
  agregarPendientes,
  obtenerInforme,
  obtenerInformePorSolicitud,
  obtenerSolicitudAsesor,
  registrarEvento,
  type ContenidoInforme,
} from "../datos";
import { nombreEtapa, RESULTADOS, nombreResultado } from "../etapas";
import { borradorDeInforme } from "../informe";
import { buscarArticulos, obtenerArticulo, type Resultado } from "../normas";
import { esMateria, MATERIAS, PLANTILLAS } from "../materias";
import { conMensaje } from "../errores";
import { segura } from "../errores";
import { datosDeForm, erroresPorCampo, esquemaContactoRapido, esquemaPerfil, type EstadoForm } from "../validators";

function entero(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/* ---------- Solicitudes ---------- */

/** Frases para avisar a la persona cuando su caso cambia de etapa. */
const AVISOS: Record<string, string> = {
  aceptada: "El asesor aceptó tu solicitud y te va a contactar.",
  derivada: "Tu caso fue derivado a un abogado de la materia. Pronto se pondrá en contacto contigo.",
  cerrada: "Tu caso quedó cerrado. Recuerda descargar tu informe: tus datos se borran en unos días, salvo que pidas guardarlos.",
};

async function cambiarEstado(id: number, asesorId: number, estado: string, motivo = "") {
  const d = await getDb();
  await d.execute({
    sql: "UPDATE solicitudes SET estado = ?, motivo_rechazo = ?, actualizado_en = datetime('now') WHERE id = ? AND asesor_id = ?",
    args: [estado, motivo, id, asesorId],
  });
  await auditar(asesorId, `solicitud_${estado}`, "solicitud", id);
  await registrarEvento(id, "etapa", nombreEtapa(estado));
  const aviso = AVISOS[estado];
  if (aviso) {
    const sol = await obtenerSolicitudAsesor(id, asesorId);
    if (sol && sol.email.includes("@")) {
      after(async () => {
        await correos.avance(sol.email, aviso, `${urlSitio()}/seguimiento/${sol.codigo}`);
      });
    }
  }
}

export async function aceptarSolicitud(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s || s.estado !== "nueva") redirect("/panel");
  await cambiarEstado(id, u.id, "aceptada");
  const plantilla = PLANTILLAS[esMateria(s.materia) ? s.materia : "otra"];
  await agregarPendientes(id, [...plantilla.datos, ...plantilla.documentos]);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${id}`);
}

export async function rechazarSolicitud(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim().slice(0, 400);
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s || s.estado !== "nueva") redirect("/panel");
  await cambiarEstado(id, u.id, "rechazada", motivo);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${id}`);
}

export async function cerrarSolicitud(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s || !["aceptada", "informe", "entregada", "derivada"].includes(s.estado)) redirect("/panel");
  const res = String(fd.get("resultado") ?? "");
  const resultado = RESULTADOS.some((r) => r.clave === res) ? res : s.abogadoConfirmado ? "con_abogado" : "informe_entregado";
  const d = await getDb();
  await d.execute({ sql: "UPDATE solicitudes SET resultado = ?, proximo_contacto = '' WHERE id = ?", args: [resultado, id] });
  await cambiarEstado(id, u.id, "cerrada");
  await registrarEvento(id, "nota", `Cerrada: ${nombreResultado(resultado)}.`);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${id}`);
}

export async function confirmarAbogado(fd: FormData) {
  const { s } = await casoPropio(fd);
  if (s.estado !== "derivada") redirect(`/panel/solicitudes/${s.id}`);
  const d = await getDb();
  await d.execute({ sql: "UPDATE solicitudes SET abogado_confirmado = 1, actualizado_en = datetime('now') WHERE id = ?", args: [s.id] });
  await registrarEvento(s.id, "nota", `${s.abogadoDestino} confirmó que toma el caso.`);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${s.id}`);
}

export async function fijarContacto(fd: FormData) {
  const { s } = await casoPropio(fd);
  const f = String(fd.get("fecha") ?? "");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : "";
  const d = await getDb();
  await d.execute({ sql: "UPDATE solicitudes SET proximo_contacto = ? WHERE id = ?", args: [fecha, s.id] });
  if (fecha) await registrarEvento(s.id, "nota", `Próximo contacto: ${fecha}.`);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${s.id}`);
}

async function casoPropio(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s) redirect("/panel");
  return { u, s };
}

export async function agregarNota(fd: FormData) {
  const { s } = await casoPropio(fd);
  const texto = String(fd.get("texto") ?? "").trim().slice(0, 1000);
  if (texto) await registrarEvento(s.id, "nota", texto);
  revalidatePath(`/panel/solicitudes/${s.id}`);
  redirect(`/panel/solicitudes/${s.id}`);
}

export async function agregarPendiente(fd: FormData) {
  const { s } = await casoPropio(fd);
  const texto = String(fd.get("texto") ?? "").trim().slice(0, 200);
  if (texto) await agregarPendientes(s.id, [texto]);
  revalidatePath(`/panel/solicitudes/${s.id}`);
  redirect(`/panel/solicitudes/${s.id}`);
}

export async function alternarPendiente(fd: FormData) {
  const { s } = await casoPropio(fd);
  const pid = entero(fd.get("pendiente"));
  const d = await getDb();
  await d.execute({
    sql: "UPDATE pendientes SET hecho = 1 - hecho WHERE id = ? AND solicitud_id = ?",
    args: [pid, s.id],
  });
  await d.execute({ sql: "UPDATE solicitudes SET actualizado_en = datetime('now') WHERE id = ?", args: [s.id] });
  revalidatePath(`/panel/solicitudes/${s.id}`);
  redirect(`/panel/solicitudes/${s.id}`);
}

export async function borrarPendiente(fd: FormData) {
  const { s } = await casoPropio(fd);
  const pid = entero(fd.get("pendiente"));
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM pendientes WHERE id = ? AND solicitud_id = ?", args: [pid, s.id] });
  revalidatePath(`/panel/solicitudes/${s.id}`);
  redirect(`/panel/solicitudes/${s.id}`);
}

/** El asesor deja constancia de que la persona autorizó compartir su caso con un abogado. */
export async function registrarAutorizacion(fd: FormData) {
  const { u, s } = await casoPropio(fd);
  const d = await getDb();
  await d.execute({
    sql: "UPDATE solicitudes SET derivar_ok = 1, actualizado_en = datetime('now') WHERE id = ?",
    args: [s.id],
  });
  await registrarEvento(s.id, "nota", "La persona autorizó compartir su caso con un abogado.");
  await auditar(u.id, "derivacion_autorizada", "solicitud", s.id);
  revalidatePath(`/panel/solicitudes/${s.id}`);
  redirect(`/panel/solicitudes/${s.id}`);
}

export async function derivarSolicitud(fd: FormData) {
  const { u, s } = await casoPropio(fd);
  const destino = String(fd.get("destino") ?? "").trim().slice(0, 200);
  if (s.estado !== "entregada" || !s.derivarOk || !destino) redirect(`/panel/solicitudes/${s.id}`);
  const d = await getDb();
  await d.execute({
    sql: "UPDATE solicitudes SET abogado_destino_enc = ? WHERE id = ?",
    args: [cifrar(destino, "solicitud.abogado"), s.id],
  });
  await cambiarEstado(s.id, u.id, "derivada");
  await registrarEvento(s.id, "nota", `Derivada a ${destino.replace(/\.$/, "")}.`);
  revalidatePath("/panel", "layout");
  redirect(`/panel/solicitudes/${s.id}`);
}

/* ---------- Informes ---------- */

export async function crearInforme(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s || !["aceptada", "informe", "entregada"].includes(s.estado)) redirect("/panel");

  const existente = await obtenerInformePorSolicitud(s.id);
  if (existente) redirect(`/panel/informes/${existente.id}`);

  const contenido = await borradorDeInforme(s, []);
  const d = await getDb();
  const r = await d.execute({
    sql: "INSERT INTO informes (solicitud_id, asesor_id, contenido_enc) VALUES (?, ?, ?)",
    args: [s.id, u.id, cifrar(JSON.stringify(contenido), "informe.contenido")],
  });
  const informeId = Number(r.lastInsertRowid);
  await auditar(u.id, "informe_creado", "informe", informeId);
  if (s.estado === "aceptada") await cambiarEstado(s.id, u.id, "informe");
  redirect(`/panel/informes/${informeId}`);
}

function lineas(t: string, max = 40): string[] {
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((l) => l.slice(0, 300));
}

export type EntradaInforme = {
  materia: string;
  objeto: string;
  conclusiones: string;
  resumen: string;
  puntos: string;
  cronologia: string;
  derechos: string;
  vias: string;
  plazos: string;
  datos: string;
  documentos: string;
  faltantes: string;
  preguntas: string;
  abogadoDestino: string;
  observaciones: string;
  normas: {
    articuloId: number;
    incluir: boolean;
    comentario: string;
  }[];
};

/** Guarda el informe. Los textos de los artículos se vuelven a leer de la biblioteca: nunca vienen del navegador. */
export async function guardarInforme(
  informeId: number,
  entrada: EntradaInforme,
  accion: "borrador" | "final",
): Promise<{ ok: boolean; mensaje: string }> {
  const u = await requerirAbogado();
  const informe = await obtenerInforme(informeId, u.id);
  if (!informe) return { ok: false, mensaje: "No encontramos ese informe." };

  const normas: ContenidoInforme["normas"] = [];
  const vistos = new Set<number>();
  for (const n of entrada.normas.slice(0, 40)) {
    const id = entero(n.articuloId);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const art = await obtenerArticulo(id);
    if (!art) continue;
    normas.push({
      articuloId: art.id,
      norma: art.norma,
      numero: art.numero,
      texto: art.texto,
      incluir: Boolean(n.incluir),
      comentario: String(n.comentario ?? "").slice(0, 500),
      fuente: art.fuente,
      version: art.version,
    });
  }

  const materia = esMateria(entrada.materia) ? entrada.materia : informe.contenido.materia;
  const contenido: ContenidoInforme = {
    materia,
    objeto: String(entrada.objeto ?? "").slice(0, 1000),
    conclusiones: String(entrada.conclusiones ?? "").slice(0, 4000),
    resumen: String(entrada.resumen ?? "").slice(0, 6000),
    normas,
    puntos: String(entrada.puntos ?? "").slice(0, 4000),
    cronologia: String(entrada.cronologia ?? "").slice(0, 4000),
    derechos: lineas(String(entrada.derechos ?? "")),
    vias: String(entrada.vias ?? "").slice(0, 1500),
    plazos: String(entrada.plazos ?? "").slice(0, 1500),
    datos: lineas(String(entrada.datos ?? "")),
    documentos: lineas(String(entrada.documentos ?? "")),
    faltantes: lineas(String(entrada.faltantes ?? "")),
    preguntas: lineas(String(entrada.preguntas ?? "")),
    abogadoDestino: String(entrada.abogadoDestino ?? "").slice(0, 200),
    observaciones: String(entrada.observaciones ?? "").slice(0, 4000),
  };

  const d = await getDb();
  await d.execute({
    sql: "UPDATE informes SET contenido_enc = ?, estado = ?, actualizado_en = datetime('now') WHERE id = ? AND asesor_id = ?",
    args: [cifrar(JSON.stringify(contenido), "informe.contenido"), accion, informeId, u.id],
  });
  await auditar(u.id, `informe_${accion}`, "informe", informeId);
  revalidatePath(`/panel/informes/${informeId}`);
  revalidatePath("/panel/informes");
  return {
    ok: true,
    mensaje: accion === "final" ? "Informe marcado como final." : "Borrador guardado.",
  };
}

/** Busca en la biblioteca desde el editor del informe. */
export async function buscarParaInforme(consulta: string): Promise<Resultado[]> {
  await requerirAbogado();
  const q = String(consulta ?? "").slice(0, 400);
  return buscarArticulos(q, { limite: 10 });
}

export async function entregarInforme(fd: FormData) {
  const u = await requerirAbogado();
  const informeId = entero(fd.get("id"));
  const entregar = fd.get("entregar") === "1";
  const informe = await obtenerInforme(informeId, u.id);
  if (!informe) redirect("/panel/informes");
  if (entregar && informe.estado !== "final") redirect(`/panel/informes/${informeId}?aviso=final`);

  const d = await getDb();
  await d.batch(
    [
      {
        sql: "UPDATE informes SET entregado = ?, actualizado_en = datetime('now') WHERE id = ?",
        args: [entregar ? 1 : 0, informeId],
      },
      {
        sql: "UPDATE solicitudes SET estado = ?, actualizado_en = datetime('now') WHERE id = ? AND estado IN ('aceptada','informe','entregada')",
        args: [entregar ? "entregada" : "informe", informe.solicitudId],
      },
    ],
    "write",
  );
  await registrarEvento(informe.solicitudId, "etapa", entregar ? "Informe entregado" : "Entrega retirada");
  await auditar(u.id, entregar ? "informe_entregado" : "informe_retirado", "informe", informeId);
  if (entregar) {
    const sol = await obtenerSolicitudAsesor(informe.solicitudId, u.id);
    if (sol && sol.email.includes("@")) {
      const nombreAsesor = u.nombre;
      after(async () => {
        await correos.informeListo(sol.email, nombreAsesor, `${urlSitio()}/seguimiento/${sol.codigo}`);
      });
    }
  }
  revalidatePath("/panel", "layout");
  redirect(`/panel/informes/${informeId}`);
}

/* ---------- Perfil ---------- */

async function guardarPerfilInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const materias = MATERIAS.map((m) => m.clave).filter((c) => fd.get(`materia_${c}`) === "on");
  const valores = { ...datos, materias: materias.join(",") };
  const parsed = esquemaPerfil.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores };
  const p = parsed.data;

  const d = await getDb();
  await d.batch(
    [
      { sql: "UPDATE usuarios SET nombre = ? WHERE id = ?", args: [p.nombre, u.id] },
      {
        sql: `UPDATE perfiles
                 SET titulo = ?, registro = ?, materias = ?, ubicacion = ?, bio = ?,
                     precio_informe = ?, instrucciones_pago = ?, publicado = ?, meta_semanal = ?
               WHERE usuario_id = ?`,
        args: [
          p.titulo,
          p.registro,
          materias.join(","),
          p.ubicacion,
          p.bio,
          p.precio_informe,
          p.instrucciones_pago,
          fd.get("publicado") === "on" ? 1 : 0,
          p.meta_semanal,
          u.id,
        ],
      },
    ],
    "write",
  );
  await auditar(u.id, "perfil_actualizado", "perfil", u.id);
  revalidatePath("/panel", "layout");
  revalidatePath("/asesoria");
  return { ok: "Cambios guardados.", valores };
}


/* ---------- Contacto rápido ---------- */

/**
 * Anota un contacto nuevo (llamada, WhatsApp, referido) en segundos: nombre y un teléfono o correo.
 * Queda como caso «En contacto», con los antecedentes típicos de su materia y seguimiento para mañana.
 */
export async function contactoRapido(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const parsed = esquemaContactoRapido.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores: datos };
  const c = parsed.data;

  const r = await conMensaje(async () => {
    const esCorreo = c.contacto.includes("@");
    const codigo = codigoAleatorio();
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const d = await getDb();
    const ins = await d.execute({
      sql: `INSERT INTO solicitudes
              (codigo, asesor_id, materia, region, urgencia, relato_enc, nombre_enc, email_enc, telefono_enc,
               estado, origen, proximo_contacto)
            VALUES (?, ?, ?, '', 'normal', ?, ?, ?, ?, 'aceptada', ?, ?)`,
      args: [
        codigo,
        u.id,
        c.materia,
        cifrar(c.nota || "Contacto anotado por el asesor. Falta pedir el relato.", "solicitud.relato"),
        cifrar(c.nombre, "solicitud.nombre"),
        cifrar(esCorreo ? c.contacto : "", "solicitud.email"),
        esCorreo ? "" : cifrar(c.contacto, "solicitud.telefono"),
        c.origen,
        manana,
      ],
    });
    const id = Number(ins.lastInsertRowid);
    const plantilla = PLANTILLAS[c.materia as keyof typeof PLANTILLAS];
    await agregarPendientes(id, ["Relato completo de lo ocurrido", ...plantilla.datos.slice(0, 3)]);
    await registrarEvento(id, "etapa", "Recibida");
    await registrarEvento(id, "etapa", "En contacto");
    await auditar(u.id, "contacto_rapido", "solicitud", id);
    revalidatePath("/panel", "layout");
    return { ok: `Agregado: ${c.nombre}.`, valores: { id: String(id), codigo } } as EstadoForm;
  }, "guardar el contacto");
  return "error" in r && r.error ? { error: r.error, valores: datos } : (r as EstadoForm);
}

export const guardarPerfil = async (...a: Parameters<typeof guardarPerfilInterna>) => segura(guardarPerfilInterna, "guardar el perfil")(...a);
