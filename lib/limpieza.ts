import { getDb } from "./db";

/** Borra solicitudes cerradas o rechazadas que superaron el plazo de conservación. */
export async function eliminarSolicitudesAntiguas(meses = 12): Promise<number> {
  if (!Number.isFinite(meses) || meses < 1) {
    throw new Error("Indica un número de meses válido (mínimo 1).");
  }
  const d = await getDb();
  const r = await d.execute({
    sql: `DELETE FROM solicitudes
           WHERE estado IN ('cerrada','rechazada')
             AND actualizado_en < ahora(?)`,
    args: [-Math.floor(meses) * 30],
  });
  return r.rowsAffected;
}
