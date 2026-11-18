import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth";
import { listarSolicitudesCliente } from "@/lib/datos";

export const dynamic = "force-dynamic";

/** Descarga de los datos de la cuenta y de sus casos (derecho de acceso y portabilidad). Solo con sesión. */
export async function GET() {
  const u = await usuarioActual();
  if (!u || u.rol !== "cliente") return new NextResponse("No autorizado", { status: 401 });
  const solicitudes = await listarSolicitudesCliente(u.id);
  const cuerpo = {
    generadoEn: new Date().toISOString(),
    cuenta: { nombre: u.nombre, correo: u.email },
    casos: solicitudes.map((s) => ({
      codigoSeguimiento: s.codigoSeguimiento,
      materia: s.materia,
      region: s.region,
      urgencia: s.urgencia,
      presupuesto: s.presupuesto,
      estado: s.estado,
      enviadoEn: s.creadoEn,
      relato: s.anonimizada ? "(eliminado)" : s.relato,
      contraparte: s.anonimizada ? "" : s.contraparte,
      nombre: s.anonimizada ? "" : s.nombre,
      correo: s.anonimizada ? "" : s.email,
      telefono: s.anonimizada ? "" : s.telefono,
    })),
  };
  return new NextResponse(JSON.stringify(cuerpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos-neife.json"',
      "Cache-Control": "no-store",
    },
  });
}
