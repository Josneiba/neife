import { getDb } from "./db";
import { correos } from "./correo";
import { urlSitio } from "./sitio";
import { calcularAvance, reunirExpediente } from "./expediente";

/** Notifica como máximo una vez cada 24 horas y solo si el avance del caso aumentó. */
export async function avisarAvanceSiCorresponde(solicitudId: number, asesorId: number): Promise<boolean> {
  const d = await getDb();
  const fila = (await d.execute({
    sql: "SELECT ultimo_aviso FROM solicitudes WHERE id = ? AND asesor_id = ?",
    args: [solicitudId, asesorId],
  })).rows[0];
  if (!fila) return false;
  const [cuando, porcentajePrevio] = String(fila.ultimo_aviso ?? "").split("|");
  if (cuando && Date.now() - new Date(cuando.replace(" ", "T") + "Z").getTime() < 24 * 3600 * 1000) return false;
  const expediente = await reunirExpediente(solicitudId, asesorId);
  if (!expediente || !expediente.solicitud.email.includes("@") || ["nueva", "rechazada", "cerrada"].includes(expediente.solicitud.estado)) return false;
  const { porcentaje, etapa } = calcularAvance(expediente);
  if (porcentaje <= Number(porcentajePrevio ?? 0)) return false;
  const enviado = await correos.avance(
    expediente.solicitud.email,
    `Tu caso avanzó: ahora está al ${porcentaje}% (${etapa.toLowerCase()}).\nPuedes descargar el expediente actualizado en PDF desde el enlace.`,
    `${urlSitio()}/seguimiento/${expediente.solicitud.codigo}`,
  );
  if (enviado) {
    await d.execute({
      sql: "UPDATE solicitudes SET ultimo_aviso = datetime('now') || '|' || ? WHERE id = ? AND asesor_id = ?",
      args: [String(porcentaje), solicitudId, asesorId],
    });
  }
  return enviado;
}
