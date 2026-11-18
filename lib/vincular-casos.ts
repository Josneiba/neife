import { getDb } from "./db";
import { descifrarSeguro } from "./crypto";
import { huellaCorreo } from "./huella-correo";

/**
 * Cuando una persona confirma su correo (o ingresa), sus solicitudes hechas antes sin cuenta
 * pasan a aparecer en «Mi cuenta». Solo se vinculan casos con el mismo correo y sin cuenta.
 * Los casos anteriores a la huella se revisan de a 300 en los últimos 120 días.
 */
export async function vincularCasosPrevios(usuarioId: number, email: string): Promise<number> {
  try {
    const d = await getDb();
    const huella = huellaCorreo(email);
    let total = (
      await d.execute({
        sql: `UPDATE solicitudes SET cliente_id = ?
               WHERE cliente_id IS NULL AND anonimizada_en = '' AND email_hash = ? RETURNING id`,
        args: [usuarioId, huella],
      })
    ).rows.length;

    const viejas = await d.execute({
      sql: `SELECT id, email_enc FROM solicitudes
             WHERE cliente_id IS NULL AND anonimizada_en = '' AND email_hash = '' AND email_enc <> ''
               AND creado_en >= ahora(-120) ORDER BY id DESC LIMIT 300`,
      args: [],
    });
    for (const f of viejas.rows) {
      const correo = descifrarSeguro(String(f.email_enc), "solicitud.email");
      if (correo.startsWith("[no se pudo")) continue;
      const h = huellaCorreo(correo);
      const igual = h === huella;
      await d.execute({ sql: "UPDATE solicitudes SET email_hash = ? WHERE id = ?", args: [h, Number(f.id)] });
      if (igual) {
        await d.execute({ sql: "UPDATE solicitudes SET cliente_id = ? WHERE id = ? AND cliente_id IS NULL", args: [usuarioId, Number(f.id)] });
      }
      if (igual) total++;
    }
    return total;
  } catch (e) {
    console.error("No se pudieron vincular casos previos:", e instanceof Error ? e.message : e);
    return 0;
  }
}
