import { auditar } from "@/lib/db";
import { obtenerSolicitudPorCodigo } from "@/lib/datos";
import { reunirExpediente } from "@/lib/expediente";
import { generarExpedientePdf } from "@/lib/expediente-pdf";
import { folio } from "@/lib/formato";
import { ipActual } from "@/lib/guards";
import { permitir } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** La persona descarga el avance de su caso con el enlace de seguimiento. Sin notas internas del asesor. */
export async function GET(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  if (!(await permitir(`pdf:${await ipActual()}`, 30, 10 * 60 * 1000))) {
    return new Response("Demasiadas descargas. Intenta en unos minutos.", { status: 429 });
  }
  const { codigo } = await ctx.params;
  const s = await obtenerSolicitudPorCodigo(codigo);
  if (!s || !s.asesorId || s.anonimizada || ["rechazada"].includes(s.estado)) return new Response("No encontrado", { status: 404 });
  const e = await reunirExpediente(s.id, s.asesorId);
  if (!e) return new Response("No encontrado", { status: 404 });
  const buf = await generarExpedientePdf(e, { paraPersona: true });
  await auditar(s.clienteId, "expediente_descargado_persona", "solicitud", s.id);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="avance-${folio(s.codigo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
