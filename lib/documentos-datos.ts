import { getDb } from "./db";
import { cifrar, descifrarSeguro } from "./crypto";
import { analizarTexto, NOMBRE_TIPO, type AnalisisDocumento } from "./documentos";
import type { ContenidoInforme, NormaInforme } from "./datos";

export const MAX_DOCUMENTO_MB = 4;
const MAX_PAGINAS = 80;

export type DocumentoLeido = { id: number; nombre: string; creadoEn: string; pasado: boolean; analisis: AnalisisDocumento };

/** Lee un PDF o TXT en memoria. El archivo no se guarda en ningún lado. */
export async function leerArchivoDocumento(contenido: Buffer, nombre: string): Promise<{ texto: string; paginas: number }> {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "txt") return { texto: contenido.toString("utf8"), paginas: 1 };
  if (ext !== "pdf") throw new Error("Formato no permitido. Sube un PDF o un TXT.");
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(contenido));
    if (pdf.numPages > MAX_PAGINAS) throw new Error(`El documento tiene ${pdf.numPages} páginas; el máximo es ${MAX_PAGINAS}. Sube las páginas que importan.`);
    const { text } = await extractText(pdf, { mergePages: false });
    const paginas = Array.isArray(text) ? text : [text];
    return { texto: paginas.join("\n\n"), paginas: pdf.numPages };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("El documento tiene")) throw e;
    throw new Error("No pudimos leer este PDF. Puede estar dañado o protegido con contraseña.");
  }
}

export async function guardarDocumento(solicitudId: number, asesorId: number, nombre: string, analisis: AnalisisDocumento): Promise<number> {
  const d = await getDb();
  const r = await d.execute({
    sql: "INSERT INTO documentos (solicitud_id, asesor_id, nombre_enc, resultado_enc) VALUES (?, ?, ?, ?) RETURNING id",
    args: [solicitudId, asesorId, cifrar(nombre.slice(0, 200), "documento.nombre"), cifrar(JSON.stringify(analisis), "documento.resultado")],
  });
  return Number(r.rows[0].id);
}

function aDocumento(f: Record<string, unknown>): DocumentoLeido {
  let analisis: AnalisisDocumento;
  try {
    analisis = JSON.parse(descifrarSeguro(String(f.resultado_enc), "documento.resultado"));
  } catch {
    analisis = analizarTexto("");
  }
  return { id: Number(f.id), nombre: descifrarSeguro(String(f.nombre_enc), "documento.nombre"), creadoEn: String(f.creado_en), pasado: Number(f.pasado) === 1, analisis };
}

export async function listarDocumentos(solicitudId: number, asesorId: number): Promise<DocumentoLeido[]> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM documentos WHERE solicitud_id = ? AND asesor_id = ? ORDER BY id DESC", args: [solicitudId, asesorId] });
  return r.rows.map(aDocumento);
}

export async function obtenerDocumento(id: number, asesorId: number): Promise<(DocumentoLeido & { solicitudId: number }) | null> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM documentos WHERE id = ? AND asesor_id = ?", args: [id, asesorId] });
  return r.rows[0] ? { ...aDocumento(r.rows[0]), solicitudId: Number(r.rows[0].solicitud_id) } : null;
}

/** Ubica en la biblioteca un artículo citado en un documento («Código del Trabajo», «161»). */
export async function buscarCitado(norma: string, numero: string) {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT a.id, a.numero, a.texto, n.nombre AS norma, n.fuente, n.version
            FROM articulos a JOIN normas n ON n.id = a.norma_id
           WHERE n.nombre LIKE ? AND a.numero = ? ORDER BY a.id LIMIT 1`,
    args: [`${norma}%`, numero],
  });
  return r.rows[0] ? { id: Number(r.rows[0].id), norma: String(r.rows[0].norma), numero: String(r.rows[0].numero), texto: String(r.rows[0].texto), fuente: String(r.rows[0].fuente), version: String(r.rows[0].version) } : null;
}

const fechaLarga = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Suma lo detectado en un documento al borrador del informe, sin pisar lo que el abogado ya escribió:
 * cronología (fechas con su contexto), normas citadas (si están en la biblioteca), datos y puntos a revisar.
 */
export async function fusionarEnInforme(c: ContenidoInforme, nombre: string, a: AnalisisDocumento): Promise<{ contenido: ContenidoInforme; resumen: string }> {
  const etiqueta = `${NOMBRE_TIPO[a.tipo]} «${nombre}»`;
  const sal: ContenidoInforme = { ...c, normas: [...c.normas], datos: [...c.datos] };

  const lineasCrono = sal.cronologia.split("\n").filter(Boolean);
  let fechasNuevas = 0;
  for (const f of a.fechas.slice(0, 8)) {
    const base = `${fechaLarga(f.iso)} — ${f.contexto.slice(0, 170)} (${NOMBRE_TIPO[a.tipo].toLowerCase()})`;
    if (lineasCrono.some((l) => l.includes(f.texto) || l.startsWith(fechaLarga(f.iso)) && l.includes(f.contexto.slice(0, 40)))) continue;
    lineasCrono.push(base);
    fechasNuevas++;
  }
  sal.cronologia = lineasCrono.join("\n").slice(0, 4000);

  let normasNuevas = 0;
  for (const cit of a.articulos) {
    const art = await buscarCitado(cit.norma, cit.numero);
    if (!art || sal.normas.some((n) => n.articuloId === art.id)) continue;
    const n: NormaInforme = { articuloId: art.id, norma: art.norma, numero: art.numero, texto: art.texto, incluir: true, comentario: `Citado en ${etiqueta}.`, fuente: art.fuente, version: art.version };
    sal.normas.push(n);
    normasNuevas++;
  }

  const datos: string[] = [];
  if (a.causa.length) datos.push(`Causa en ${etiqueta}: ${a.causa.join(", ")}${a.tribunal ? ` (${a.tribunal})` : ""}`);
  else if (a.tribunal) datos.push(`Tribunal en ${etiqueta}: ${a.tribunal}`);
  if (a.partes.length) datos.push(`Partes en ${etiqueta}: ${a.partes.map((p) => `${p.rol} ${p.nombre}`).join("; ")}`);
  if (a.montos.length) datos.push(`Montos en ${etiqueta}: ${a.montos.slice(0, 8).join(", ")}`);
  for (const t of datos) if (!sal.datos.includes(t)) sal.datos.push(t);

  if (a.lineasClave.length) {
    const bloque = `Del ${etiqueta}:\n` + a.lineasClave.slice(0, 6).map((l) => `- ${l}`).join("\n");
    if (!sal.puntos.includes(`Del ${etiqueta}:`)) sal.puntos = (sal.puntos ? sal.puntos + "\n\n" : "") + bloque;
    sal.puntos = sal.puntos.slice(0, 6000);
  }
  return { contenido: sal, resumen: `${fechasNuevas} fechas, ${normasNuevas} normas, ${datos.length} datos y ${Math.min(a.lineasClave.length, 6)} líneas relevantes agregadas al informe.` };
}
