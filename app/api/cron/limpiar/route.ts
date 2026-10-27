import { NextResponse, type NextRequest } from "next/server";
import { eliminarSolicitudesAntiguas } from "@/lib/limpieza";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Elimina mensualmente las solicitudes cerradas o rechazadas que superaron el plazo de conservación. */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const eliminadas = await eliminarSolicitudesAntiguas();
  return NextResponse.json({ eliminadas });
}
