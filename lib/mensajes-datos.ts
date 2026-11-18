import { getDb } from "./db";
import { cifrar, descifrarSeguro } from "./crypto";

export type Autor = "persona" | "asesor";
export type Mensaje = { id: number; de: Autor; texto: string; creadoEn: string; leido: boolean };

const CTX = "mensaje.texto";
export const MAX_MENSAJE = 2000;

export async function listarMensajes(solicitudId: number): Promise<Mensaje[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT id, de, texto_enc, creado_en, leido_en FROM mensajes WHERE solicitud_id = ? ORDER BY id DESC LIMIT 300",
    args: [solicitudId],
  });
  return [...r.rows].reverse().map((f) => ({
    id: Number(f.id),
    de: String(f.de) as Autor,
    texto: descifrarSeguro(String(f.texto_enc), CTX),
    creadoEn: String(f.creado_en),
    leido: Boolean(f.leido_en),
  }));
}

export async function guardarMensaje(solicitudId: number, de: Autor, texto: string): Promise<{ yaHabiaSinLeer: boolean }> {
  const d = await getDb();
  const previo = (await d.execute({
    sql: "SELECT 1 FROM mensajes WHERE solicitud_id = ? AND de = ? AND leido_en = '' LIMIT 1",
    args: [solicitudId, de],
  })).rows[0];
  await d.execute({
    sql: "INSERT INTO mensajes (solicitud_id, de, texto_enc) VALUES (?, ?, ?)",
    args: [solicitudId, de, cifrar(texto, CTX)],
  });
  return { yaHabiaSinLeer: Boolean(previo) };
}

export async function marcarLeidos(solicitudId: number, lector: Autor): Promise<void> {
  const d = await getDb();
  await d.execute({
    sql: "UPDATE mensajes SET leido_en = ahora() WHERE solicitud_id = ? AND de <> ? AND leido_en = ''",
    args: [solicitudId, lector],
  });
}

export async function sinLeerDelAsesor(asesorId: number): Promise<Map<number, number>> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT m.solicitud_id, COUNT(*) AS n FROM mensajes m JOIN solicitudes s ON s.id = m.solicitud_id
          WHERE s.asesor_id = ? AND m.de = 'persona' AND m.leido_en = '' GROUP BY m.solicitud_id`,
    args: [asesorId],
  });
  return new Map(r.rows.map((f) => [Number(f.solicitud_id), Number(f.n)]));
}
