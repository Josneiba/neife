import { auditar } from "@/lib/db";
import { obtenerInformePorSolicitud, obtenerPerfil, obtenerSolicitudPorCodigo } from "@/lib/datos";
import { folio } from "@/lib/formato";
import { generarPdf } from "@/lib/informe-pdf";
import { normasFaltantes } from "@/lib/fuentes";
import { ipActual } from "@/lib/guards";
import { permitir } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** La persona descarga su informe con el enlace de seguimiento (solo si el asesor lo entregó). */
export async function GET(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  if (!(await permitir(`pdf:${await ipActual()}`, 30, 10 * 60 * 1000))) {
    return new Response("Demasiadas descargas. Intenta en unos minutos.", { status: 429 });
  }
  const { codigo } = await ctx.params;
  const solicitud = await obtenerSolicitudPorCodigo(codigo);
  if (!solicitud || !["entregada", "derivada", "cerrada"].includes(solicitud.estado)) return new Response("No encontrado", { status: 404 });
  const informe = await obtenerInformePorSolicitud(solicitud.id);
  const perfil = await obtenerPerfil(solicitud.asesorId);
  if (!informe || !informe.entregado || !perfil) return new Response("No encontrado", { status: 404 });

  const buf = await generarPdf({
    normasPendientes: await normasFaltantes(informe.contenido.materia),
    folio: folio(solicitud.codigo),
    fecha: new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date()),
    asesorNombre: perfil.nombre,
    asesorTitulo: perfil.titulo,
    consultante: solicitud.nombre,
    region: solicitud.region,
    contenido: informe.contenido,
  });
  await auditar(solicitud.clienteId, "informe_descargado", "informe", informe.id);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-${folio(solicitud.codigo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
