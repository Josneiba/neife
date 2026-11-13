import { getDb } from "./db";

export type Resena = { estrellas: number; comentario: string; fecha: string };

export async function resumenResenas(asesorId: number): Promise<{ promedio: number; total: number; ultimas: Resena[] }> {
  const d = await getDb();
  const [resumen, ultimas] = await Promise.all([
    d.execute({
      sql: "SELECT COUNT(*)::int AS n, AVG(estrellas)::float AS promedio FROM resenas WHERE asesor_id = ? AND publicada = 1",
      args: [asesorId],
    }),
    d.execute({
      sql: "SELECT estrellas, comentario, creado_en FROM resenas WHERE asesor_id = ? AND publicada = 1 ORDER BY creado_en DESC, id DESC LIMIT 200",
      args: [asesorId],
    }),
  ]);
  const filaResumen = resumen.rows[0];
  const todas = ultimas.rows.map((f) => ({
    estrellas: Number(f.estrellas),
    comentario: String(f.comentario ?? ""),
    fecha: String(f.creado_en).slice(0, 10),
  }));
  const total = Number(filaResumen?.n ?? 0);
  const promedio = filaResumen?.promedio == null ? 0 : Math.round(Number(filaResumen.promedio) * 10) / 10;
  return { promedio, total, ultimas: todas.filter((x) => x.comentario).slice(0, 3) };
}

export async function yaTieneResena(solicitudId: number): Promise<boolean> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT 1 FROM resenas WHERE solicitud_id = ?", args: [solicitudId] });
  return r.rows.length > 0;
}

export async function guardarResena(p: { solicitudId: number; asesorId: number; estrellas: number; comentario: string }): Promise<boolean> {
  const d = await getDb();
  const r = await d.execute({
    sql: "INSERT INTO resenas (asesor_id, solicitud_id, estrellas, comentario) VALUES (?, ?, ?, ?) ON CONFLICT (solicitud_id) DO NOTHING",
    args: [p.asesorId, p.solicitudId, p.estrellas, p.comentario.trim().slice(0, 400)],
  });
  return r.rowsAffected === 1;
}

/** Mediana de horas entre llegada y asignación; se oculta hasta tener suficientes casos. */
export async function tiempoRespuestaHoras(asesorId?: number, minimoCasos = 3): Promise<number | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT COUNT(*)::int AS n,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (tomada_en::timestamp - creado_en::timestamp)) / 3600.0) AS horas
            FROM solicitudes
           WHERE tomada_en <> '' AND creado_en >= ahora(-90) ${asesorId ? "AND asesor_id = ?" : ""}`,
    args: asesorId ? [asesorId] : [],
  });
  const fila = r.rows[0];
  if (!fila || Number(fila.n) < minimoCasos || fila.horas == null) return null;
  return Math.max(0, Number(fila.horas));
}

export function textoTiempo(horas: number): string {
  if (horas < 1) return "menos de 1 hora";
  if (horas < 24) {
    const cantidad = Math.round(horas);
    return `${cantidad} hora${cantidad === 1 ? "" : "s"}`;
  }
  const dias = Math.round(horas / 24);
  return `${dias} día${dias === 1 ? "" : "s"}`;
}
