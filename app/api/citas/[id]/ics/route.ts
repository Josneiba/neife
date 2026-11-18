import { requerirAbogado } from "@/lib/guards";
import { obtenerCita } from "@/lib/crm/servicio-citas";
import { crearIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** Una cita de la agenda del asesor, para su calendario del teléfono o del computador. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requerirAbogado();
  const { id } = await ctx.params;
  const c = Number.isInteger(Number(id)) ? await obtenerCita(u.id, Number(id)) : null;
  if (!c) return new Response("No encontrado", { status: 404 });
  const ics = crearIcs({
    uid: `cita-${c.id}`,
    fecha: c.fecha,
    horaIni: c.horaIni,
    horaFin: c.horaFin,
    titulo: c.persona ? `Asesoría con ${c.persona}` : c.titulo || "Asesoría",
    descripcion: c.nota || undefined,
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="cita-${c.id}.ics"`, "Cache-Control": "private, no-store" } });
}
