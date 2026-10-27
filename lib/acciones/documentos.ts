"use server";

import { revalidatePath } from "next/cache";
import { getDb, auditar } from "../db";
import { cifrar } from "../crypto";
import { requerirAbogado } from "../guards";
import { obtenerInformePorSolicitud, obtenerSolicitudAsesor } from "../datos";
import { analizarTexto } from "../documentos";
import { fusionarEnInforme, guardarDocumento, leerArchivoDocumento, MAX_DOCUMENTO_MB, obtenerDocumento } from "../documentos-datos";
import { mensajeError } from "../errores";

export type ResultadoLectura = { ok: boolean; mensaje: string; id?: number };

/** Lee UN documento de una ficha, lo analiza y guarda solo lo extraído (cifrado). El archivo no se almacena. */
export async function leerDocumento(fd: FormData): Promise<ResultadoLectura> {
  const u = await requerirAbogado();
  try {
    const solicitudId = Number(fd.get("id"));
    const s = Number.isInteger(solicitudId) ? await obtenerSolicitudAsesor(solicitudId, u.id) : null;
    if (!s) return { ok: false, mensaje: "No encontramos este caso." };
    const archivo = fd.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Elige un archivo." };
    if (archivo.size > MAX_DOCUMENTO_MB * 1024 * 1024) {
      return { ok: false, mensaje: `Pesa ${(archivo.size / 1048576).toFixed(1)} MB y el máximo es ${MAX_DOCUMENTO_MB} MB. Sube solo las páginas que importan.` };
    }
    const { texto, paginas } = await leerArchivoDocumento(Buffer.from(await archivo.arrayBuffer()), archivo.name);
    if (texto.trim().length < 60) return { ok: false, mensaje: "No tiene texto legible (¿es una foto o un escaneo?). Pide el documento en PDF digital." };
    const analisis = analizarTexto(texto, paginas);
    const id = await guardarDocumento(s.id, u.id, archivo.name, analisis);
    await auditar(u.id, "documento_leido", "solicitud", s.id);
    revalidatePath(`/panel/solicitudes/${s.id}`);
    return { ok: true, mensaje: "Documento leído.", id };
  } catch (e) {
    return { ok: false, mensaje: mensajeError(e, "leer el documento") };
  }
}

export async function pasarDocumentoAlInforme(documentoId: number): Promise<ResultadoLectura> {
  const u = await requerirAbogado();
  try {
    const doc = await obtenerDocumento(documentoId, u.id);
    if (!doc) return { ok: false, mensaje: "No encontramos este documento." };
    const informe = await obtenerInformePorSolicitud(doc.solicitudId);
    if (!informe || informe.asesorId !== u.id) return { ok: false, mensaje: "Primero crea el informe del caso y luego vuelve a pasar el documento." };
    if (informe.entregado) return { ok: false, mensaje: "El informe ya fue entregado a la persona." };
    const { contenido, resumen } = await fusionarEnInforme(informe.contenido, doc.nombre, doc.analisis);
    const d = await getDb();
    await d.batch([
      { sql: "UPDATE informes SET contenido_enc = ?, actualizado_en = datetime('now') WHERE id = ? AND asesor_id = ?", args: [cifrar(JSON.stringify(contenido), "informe.contenido"), informe.id, u.id] },
      { sql: "UPDATE documentos SET pasado = 1 WHERE id = ?", args: [doc.id] },
    ]);
    await auditar(u.id, "documento_al_informe", "informe", informe.id);
    revalidatePath(`/panel/solicitudes/${doc.solicitudId}`);
    revalidatePath(`/panel/informes/${informe.id}`);
    return { ok: true, mensaje: resumen };
  } catch (e) {
    return { ok: false, mensaje: mensajeError(e, "pasar el documento al informe") };
  }
}

export async function borrarDocumento(documentoId: number): Promise<ResultadoLectura> {
  const u = await requerirAbogado();
  const doc = await obtenerDocumento(documentoId, u.id);
  if (!doc) return { ok: false, mensaje: "No encontramos este documento." };
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM documentos WHERE id = ? AND asesor_id = ?", args: [doc.id, u.id] });
  await auditar(u.id, "documento_borrado", "solicitud", doc.solicitudId);
  revalidatePath(`/panel/solicitudes/${doc.solicitudId}`);
  return { ok: true, mensaje: "Documento borrado." };
}
