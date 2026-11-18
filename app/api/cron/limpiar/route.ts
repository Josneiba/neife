import { NextResponse, type NextRequest } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { eliminarSolicitudesAntiguas } from "@/lib/limpieza";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Elimina mensualmente las solicitudes cerradas o rechazadas que superaron el plazo de conservación. */
export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const eliminadas = await eliminarSolicitudesAntiguas();
  return NextResponse.json({ eliminadas });
}
