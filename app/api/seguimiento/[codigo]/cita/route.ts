import { obtenerSolicitudPorCodigo, obtenerPerfil } from "@/lib/datos";
import { reservaVigente } from "@/lib/agenda-publica";
import { leerHorario } from "@/lib/agenda-publica";
import { crearIcs } from "@/lib/ics";
import { ipActual } from "@/lib/guards";
import { permitir } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** La persona agrega su hora reservada a su calendario. Solo con su enlace privado de seguimiento. */
export async function GET(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  if (!(await permitir(`ics:${await ipActual()}`, 30, 10 * 60 * 1000))) return new Response("Demasiadas descargas.", { status: 429 });
  const { codigo } = await ctx.params;
  const s = await obtenerSolicitudPorCodigo(codigo);
  if (!s || !s.asesorId || s.anonimizada) return new Response("No encontrado", { status: 404 });
  const r = await reservaVigente(s.asesorId, s.id);
  if (!r) return new Response("No hay una hora reservada.", { status: 404 });
  const [perfil, horario] = await Promise.all([obtenerPerfil(s.asesorId), leerHorario(s.asesorId)]);
  const ics = crearIcs({
    uid: `reserva-${s.id}-${r.fecha}-${r.hora}`,
    fecha: r.fecha,
    horaIni: r.hora,
    horaFin: aHora(aMin(r.hora) + horario.duracion),
    titulo: `Asesoría con ${perfil?.nombre ?? "tu asesor"}`,
    descripcion: `Caso ${s.codigoSeguimiento}. Sigue tu caso en Neife con ese código.`,
    lugar: perfil?.direccion || undefined,
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="asesoria-${s.codigoSeguimiento}.ics"`, "Cache-Control": "private, no-store" } });
}
