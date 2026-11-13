import { usuarioActual } from "@/lib/auth";
import { auditar } from "@/lib/db";
import { reunirExpediente } from "@/lib/expediente";
import { generarExpedientePdf } from "@/lib/expediente-pdf";
import { folio } from "@/lib/formato";
import { ipActual } from "@/lib/guards";
import { permitir } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Expediente del caso en PDF, armado en el momento con todo lo registrado hasta ahora.
 * `?para=persona` entrega la copia que se le puede enviar a la persona (sin notas internas del CRM).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await permitir(`pdf:${await ipActual()}`, 30, 10 * 60 * 1000))) {
    return new Response("Demasiadas descargas. Intenta en unos minutos.", { status: 429 });
  }
  const u = await usuarioActual();
  if (!u || u.rol !== "abogado" || u.estado !== "activo") return new Response("No autorizado", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("No encontrado", { status: 404 });

  const e = await reunirExpediente(id, u.id);
  if (!e) return new Response("No encontrado", { status: 404 });

  const paraPersona = new URL(req.url).searchParams.get("para") === "persona";
  const buf = await generarExpedientePdf(e, { paraPersona });
  await auditar(u.id, paraPersona ? "expediente_pdf_persona" : "expediente_pdf", "solicitud", id);

  const nombre = `expediente-${folio(e.solicitud.codigo)}${paraPersona ? "-persona" : ""}.pdf`;
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
