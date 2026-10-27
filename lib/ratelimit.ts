import { getDb } from "./db";

/**
 * Límite de intentos guardado en la base de datos, para que valga aunque el sitio corra
 * en varias instancias (Vercel). Si la base falla, deja pasar: es mejor que bloquear a todos.
 */
export async function permitir(clave: string, maximo: number, ventanaMs: number): Promise<boolean> {
  try {
    const d = await getDb();
    const ahora = Date.now();
    const r = await d.execute({
      sql: `INSERT INTO limites (clave, cuenta, hasta) VALUES (?, 1, ?)
            ON CONFLICT (clave) DO UPDATE SET
              cuenta = CASE WHEN limites.hasta < ? THEN 1 ELSE limites.cuenta + 1 END,
              hasta  = CASE WHEN limites.hasta < ? THEN ? ELSE limites.hasta END
            RETURNING cuenta`,
      args: [clave, ahora + ventanaMs, ahora, ahora, ahora + ventanaMs],
    });
    if (Math.random() < 0.02) await d.execute({ sql: "DELETE FROM limites WHERE hasta < ?", args: [ahora] });
    return Number(r.rows[0]?.cuenta ?? 1) <= maximo;
  } catch {
    return true;
  }
}

export async function reiniciar(clave: string) {
  try {
    const d = await getDb();
    await d.execute({ sql: "DELETE FROM limites WHERE clave = ?", args: [clave] });
  } catch {
    /* sin efecto */
  }
}
