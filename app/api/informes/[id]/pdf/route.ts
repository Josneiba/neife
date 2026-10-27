import { usuarioActual } from "@/lib/auth";
import { auditar } from "@/lib/db";
import { obtenerInforme, obtenerPerfil, obtenerSolicitudAsesor } from "@/lib/datos";
import { folio } from "@/lib/formato";
import { generarPdf } from "@/lib/informe-pdf";
import { normasFaltantes } from "@/lib/fuentes";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u || u.rol !== "abogado" || u.estado !== "activo") return new Response("No autorizado", { status: 401 });

  const { id: idTexto } = await ctx.params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) return new Response("No encontrado", { status: 404 });

  const informe = await obtenerInforme(id, u.id);
  const solicitud = informe ? await obtenerSolicitudAsesor(informe.solicitudId, u.id) : null;
  const perfil = await obtenerPerfil(u.id);
  if (!informe || !solicitud || !perfil) return new Response("No encontrado", { status: 404 });

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
  await auditar(u.id, "informe_pdf", "informe", informe.id);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-${folio(solicitud.codigo)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
