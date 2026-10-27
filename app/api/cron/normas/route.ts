import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { enviarCorreo } from "@/lib/correo";
import { revisarNormas } from "@/lib/revision-normas";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Revisión diaria de las leyes importadas de LeyChile: si cambió la versión, se reemplaza sola.
 * Así los asesores no tienen que preocuparse de mantener la biblioteca al día.
 * Avisa por correo al administrador solo si hubo cambios o fallas.
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const r = await revisarNormas({ maximo: 6 });
  if (r.actualizadas.length || r.fallidas.length || r.derogadas.length) {
    const d = await getDb();
    const admins = await d.execute("SELECT email FROM usuarios WHERE rol = 'admin' AND estado = 'activo'");
    const lineas = [
      r.actualizadas.length ? `Actualizadas:\n- ${r.actualizadas.join("\n- ")}` : "",
      r.derogadas.length ? `Figuran como derogadas (revísalas):\n- ${r.derogadas.join("\n- ")}` : "",
      r.fallidas.length ? `No se pudieron revisar:\n- ${r.fallidas.map((f) => `${f.nombre}: ${f.motivo}`).join("\n- ")}` : "",
    ].filter(Boolean);
    for (const a of admins.rows) {
      await enviarCorreo({
        para: String(a.email),
        asunto: "Revisión de leyes: hay novedades",
        texto: `${lineas.join("\n\n")}\n\nBiblioteca:\n${urlSitio()}/admin/biblioteca`,
      });
    }
  }
  return NextResponse.json({ revisadas: r.revisadas, actualizadas: r.actualizadas.length, sinCambios: r.sinCambios, fallidas: r.fallidas.length });
}
