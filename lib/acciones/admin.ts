"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, auditar } from "../db";
import { requerirAdmin } from "../guards";
import { buscarArticulos, crearNorma, eliminarNorma, EXTENSIONES_PERMITIDAS, extraerTexto } from "../normas";
import { detectarMateria, nombreDeArchivo } from "../materia-auto";
import { revisarNormas } from "../revision-normas";
import { mensajeError } from "../errores";
import { descargarNormaActual, idNormaDesde } from "../leychile";
import { limiteArchivoMb } from "../sitio";
import { esMateria } from "../materias";
import { coincideConFuente, fuentePorClave } from "../fuentes";
import { datosDeForm, erroresPorCampo, esquemaNorma, type EstadoForm } from "../validators";
import { leerTerminos, validarContenidoTerminos } from "../terminos";

/** Vercel rechaza cuerpos de más de 4,5 MB antes de llegar a la app; en tu propio servidor el tope es mayor. */
const MAX_ARCHIVO_MB = limiteArchivoMb();
const MAX_ARCHIVO = MAX_ARCHIVO_MB * 1024 * 1024;

async function decidirAbogado(id: number, estado: "activo" | "rechazado") {
  const admin = await requerirAdmin();
  const d = await getDb();
  await d.execute({
    sql: "UPDATE usuarios SET estado = ? WHERE id = ? AND rol = 'abogado'",
    args: [estado, id],
  });
  await auditar(admin.id, estado === "activo" ? "abogado_aprobado" : "abogado_rechazado", "usuario", id);
  revalidatePath("/admin/asesores");
  revalidatePath("/admin");
  revalidatePath("/asesoria");
}

export async function aprobarAbogado(fd: FormData) {
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) await decidirAbogado(id, "activo");
  redirect("/admin/asesores");
}

export async function rechazarAbogado(fd: FormData) {
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) await decidirAbogado(id, "rechazado");
  redirect("/admin/asesores");
}

export async function publicarTerminos(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const contenido = String(fd.get("contenido") ?? "").replace(/\r\n/g, "\n").trim();
  const errorContenido = validarContenidoTerminos(contenido);
  if (errorContenido) return { error: errorContenido, valores: { contenido } };

  const actual = await leerTerminos();
  const documento = {
    version: actual.version + 1,
    publicadoEn: new Date().toISOString(),
    contenido,
  };
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO meta (clave, valor) VALUES (?, ?)
          ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    args: ["terminos_publicados", JSON.stringify(documento)],
  });
  await auditar(admin.id, "terminos_publicados", "meta", documento.version);
  revalidatePath("/terminos");
  revalidatePath("/admin/terminos");
  revalidatePath("/asesoria/solicitar");
  return { ok: `Términos publicados como versión ${documento.version}.` };
}

/**
 * Carga las leyes base (paquete biblioteca/base.json.gz, sacado del repositorio legalize-cl). Es rápido y no depende
 * de internet. Si una norma ya está al día, no se toca.
 */
export async function cargarLeyesBase(forzar = false): Promise<{ ok: boolean; texto: string }> {
  const admin = await requerirAdmin();
  try {
    const { leerPaqueteBase } = await import("@/lib/biblioteca-base");
    const { cargarNormasLista } = await import("@/lib/biblioteca-base");
    const normas = leerPaqueteBase();
    const t0 = Date.now();
    const r = await cargarNormasLista(normas, { forzar, usuarioId: admin.id });
    await auditar(admin.id, "biblioteca_base_cargada", "norma", 0);
    revalidatePath("/admin/biblioteca");
    revalidatePath("/admin");
    return { ok: true, texto: `Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${r.creadas} nuevas, ${r.actualizadas} actualizadas, ${r.sinCambios} sin cambios (${r.articulos} artículos cargados).` };
  } catch (e) {
    return { ok: false, texto: mensajeError(e, "cargar las leyes base") };
  }
}

export type HitPrueba = { norma: string; numero: string; texto: string };
/** Prueba de búsqueda del administrador: confirma que las máquinas «leen» lo que se subió. */
export async function probarBusqueda(materia: string, texto: string): Promise<{ hits: HitPrueba[]; error?: string }> {
  await requerirAdmin();
  const t = String(texto ?? "").trim().slice(0, 600);
  if (t.length < 10) return { hits: [], error: "Escribe una frase de ejemplo (mínimo 10 caracteres)." };
  try {
    const r = await buscarArticulos(t, { materia: esMateria(materia) ? materia : undefined, limite: 5 });
    return { hits: r.map((a) => ({ norma: a.norma, numero: a.numero, texto: a.texto.slice(0, 260) })) };
  } catch (e) {
    return { hits: [], error: mensajeError(e, "buscar") };
  }
}

export async function revisarNormasAhora(): Promise<{ texto: string }> {
  const admin = await requerirAdmin();
  try {
    const r = await revisarNormas({ maximo: 5, adminId: admin.id });
    revalidatePath("/admin/biblioteca");
    revalidatePath("/admin");
    if (r.revisadas === 0) return { texto: "No hay normas importadas de LeyChile para revisar." };
    const partes = [`${r.revisadas} revisadas`, `${r.actualizadas.length} actualizadas`, `${r.sinCambios} sin cambios`];
    if (r.fallidas.length) partes.push(`${r.fallidas.length} con error: ${r.fallidas[0].motivo}`);
    return { texto: partes.join(" · ") };
  } catch (e) {
    return { texto: mensajeError(e, "revisar las normas") };
  }
}

export async function borrarNorma(fd: FormData) {
  const admin = await requerirAdmin();
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await eliminarNorma(id);
    await auditar(admin.id, "norma_eliminada", "norma", id);
    revalidatePath("/admin/biblioteca");
  }
  redirect("/admin/biblioteca");
}

/** Importa (o actualiza) una norma directamente desde LeyChile. */
export async function importarLeyChile(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const datos = datosDeForm(fd);
  const valores = { entrada: datos.entrada ?? "", materia: datos.materia ?? "" };
  const id = idNormaDesde(datos.entrada ?? "");
  if (!id) return { errores: { entrada: "Escribe el número de norma o pega la dirección de leychile.cl." }, valores };
  if (!esMateria(datos.materia ?? "")) return { errores: { materia: "Elige una materia." }, valores };

  try {
    const norma = await descargarNormaActual(id);
    if (norma.piezas.length === 0) return { error: "LeyChile no entregó artículos para esa norma.", valores };

    const d = await getDb();
    const previas = await d.execute({ sql: "SELECT id FROM normas WHERE bcn_id = ?", args: [id] });
    const nombre = (datos.nombre ?? "").trim() || norma.titulo.slice(0, 200);
    const r = await crearNorma({
      nombre,
      materia: datos.materia,
      fuente: `https://www.leychile.cl/Navegar?idNorma=${id}`,
      archivo: `leychile-${id}.xml`,
      usuarioId: admin.id,
      piezas: norma.piezas,
      bcnId: id,
      version: norma.version,
    });
    for (const f of previas.rows) await eliminarNorma(Number(f.id));
    await auditar(admin.id, previas.rows.length ? "norma_actualizada" : "norma_importada", "norma", r.normaId);
    revalidatePath("/admin/biblioteca");
    return {
      ok: `${previas.rows.length ? "Actualizada" : "Importada"}: ${r.piezas} artículos${norma.version ? `, versión del ${norma.version}` : ""}.${norma.derogada ? " Aviso: la norma figura como derogada." : ""}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo importar la norma.", valores };
  }
}

export async function actualizarNorma(fd: FormData) {
  const admin = await requerirAdmin();
  const normaId = Number(fd.get("id"));
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT bcn_id, materia, nombre FROM normas WHERE id = ?", args: [normaId] });
  const fila = r.rows[0];
  if (fila && fila.bcn_id) {
    const norma = await descargarNormaActual(String(fila.bcn_id));
    if (norma.piezas.length) {
      const nueva = await crearNorma({
        nombre: String(fila.nombre),
        materia: String(fila.materia),
        fuente: `https://www.leychile.cl/Navegar?idNorma=${fila.bcn_id}`,
        archivo: `leychile-${fila.bcn_id}.xml`,
        usuarioId: admin.id,
        piezas: norma.piezas,
        bcnId: String(fila.bcn_id),
        version: norma.version,
      });
      await eliminarNorma(normaId);
      await auditar(admin.id, "norma_actualizada", "norma", nueva.normaId);
    }
  }
  revalidatePath("/admin/biblioteca");
  redirect("/admin/biblioteca");
}

/**
 * Importa desde LeyChile una de las normas de la lista cerrada (las que no trae el repositorio).
 * Antes de guardar comprueba que el enlace corresponde a esa norma; si no, no importa nada.
 */
export async function importarFuenteWeb(clave: string, entrada: string): Promise<{ ok: boolean; texto: string }> {
  const admin = await requerirAdmin();
  try {
    const fuente = fuentePorClave(clave);
    if (!fuente) return { ok: false, texto: "Esa norma no está en la lista." };
    const id = idNormaDesde(String(entrada ?? ""));
    if (!id) return { ok: false, texto: "Pega el número de norma o el enlace de leychile.cl (tiene «idNorma=»)." };
    const norma = await descargarNormaActual(id);
    if (norma.idNorma && norma.idNorma !== id) return { ok: false, texto: "LeyChile devolvió otra norma distinta a la pedida. No se importó nada." };
    if (!coincideConFuente(fuente, norma.titulo, norma.identificadores)) {
      return { ok: false, texto: `Ese enlace corresponde a «${norma.titulo.slice(0, 90)}», no a ${fuente.nombre.split(",")[0]}. No se importó nada: revisa el enlace.` };
    }
    if (norma.derogada) return { ok: false, texto: "LeyChile la muestra como derogada. No se importó." };
    if (norma.piezas.length < 5) return { ok: false, texto: "La norma descargada casi no trae artículos. No se importó." };

    const d = await getDb();
    const previas = await d.execute({ sql: "SELECT id FROM normas WHERE bcn_id = ? OR lower(nombre) LIKE ?", args: [id, `${fuente.prefijo.toLowerCase()}%`] });
    const r = await crearNorma({
      nombre: fuente.nombre,
      materia: fuente.materia,
      fuente: `https://www.leychile.cl/Navegar?idNorma=${id}`,
      archivo: `leychile-${id}.xml`,
      usuarioId: admin.id,
      piezas: norma.piezas,
      bcnId: id,
      version: norma.version,
    });
    for (const f of previas.rows) await eliminarNorma(Number(f.id));
    await auditar(admin.id, "norma_importada", "norma", r.normaId);
    revalidatePath("/admin/biblioteca");
    revalidatePath("/admin");
    return { ok: true, texto: `Importada: ${r.piezas} artículos, versión del ${norma.version || "fecha no informada"}. Se actualizará sola.` };
  } catch (e) {
    return { ok: false, texto: e instanceof Error ? e.message : "No se pudo importar la norma." };
  }
}
