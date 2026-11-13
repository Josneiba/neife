import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { correos } from "@/lib/correo";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

/**
 * Resumen diario por correo para cada asesor: solicitudes sin responder y contactos que vencen hoy o antes.
 * Lo llama Vercel Cron (vercel.json) con la cabecera Authorization: Bearer CRON_SECRET.
 * El correo solo trae cantidades, nunca nombres ni relatos.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const d = await getDb();
  const hoy = new Date().toISOString().slice(0, 10);
  const r = await d.execute({
    sql: `SELECT u.email,
                 SUM(CASE WHEN s.estado = 'nueva' THEN 1 ELSE 0 END) AS nuevas,
                 SUM(CASE WHEN s.estado IN ('aceptada','informe','entregada','derivada')
                           AND s.proximo_contacto <> '' AND s.proximo_contacto <= ? THEN 1 ELSE 0 END) AS vencidos,
                 SUM(CASE WHEN s.estado IN ('aceptada','informe','entregada','derivada')
                           AND s.actualizado_en < ahora(-7) THEN 1 ELSE 0 END) AS detenidos
            FROM usuarios u JOIN solicitudes s ON s.asesor_id = u.id
           WHERE u.rol = 'abogado' AND u.estado = 'activo'
           GROUP BY u.email`,
    args: [hoy],
  });
  let enviados = 0;
  for (const f of r.rows) {
    const n = Number(f.nuevas), v = Number(f.vencidos), x = Number(f.detenidos);
    if (n + v + x === 0) continue;
    const partes = [
      n ? `${n} solicitud${n === 1 ? "" : "es"} sin responder` : "",
      v ? `${v} contacto${v === 1 ? "" : "s"} para hoy o atrasado${v === 1 ? "" : "s"}` : "",
      x ? `${x} caso${x === 1 ? "" : "s"} sin movimiento hace 7 días o más` : "",
    ].filter(Boolean);
    if (await correos.recordatorio(String(f.email), partes.join("\n"), `${urlSitio()}/panel`)) enviados++;
  }
  const abiertas = await d.execute(
    "SELECT COUNT(*)::int AS n FROM solicitudes WHERE asesor_id IS NULL AND estado = 'nueva' AND creado_en < ahora(-1)",
  );
  const sinTomar = Number(abiertas.rows[0]?.n ?? 0);
  let avisadosBandeja = 0;
  if (sinTomar > 0) {
    const todos = await d.execute("SELECT email FROM usuarios WHERE rol = 'abogado' AND estado = 'activo'");
    for (const f of todos.rows) {
      const enviado = await correos.recordatorio(
        String(f.email),
        `Hay ${sinTomar} solicitud${sinTomar === 1 ? "" : "es"} en la bandeja que nadie ha tomado hace más de 24 horas. Las personas están esperando.`,
        `${urlSitio()}/panel/bandeja`,
      );
      if (enviado) avisadosBandeja++;
    }
  }
  return NextResponse.json({ asesores: r.rows.length, enviados, sinTomar, avisadosBandeja });
}
