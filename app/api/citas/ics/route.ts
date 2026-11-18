import { requerirAbogado } from "@/lib/guards";
import { listarCitas } from "@/lib/crm/servicio-citas";
import { hoyLocal, sumarDias } from "@/lib/crm/fechas";
import { crearIcsVarios } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** Las citas pendientes de los próximos 60 días en un solo archivo de calendario. */
export async function GET() {
  const u = await requerirAbogado();
  const hoy = hoyLocal();
  const citas = (await listarCitas(u.id, hoy, sumarDias(hoy, 60))).filter((c) => c.estado === "pendiente");
  const ics = crearIcsVarios(
    citas.map((c) => ({
      uid: `cita-${c.id}`,
      fecha: c.fecha,
      horaIni: c.horaIni,
      horaFin: c.horaFin,
      titulo: c.persona ? `Asesoría con ${c.persona}` : c.titulo || "Asesoría",
      descripcion: c.nota || undefined,
    })),
  );
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="neife-citas.ics"', "Cache-Control": "private, no-store" } });
}
