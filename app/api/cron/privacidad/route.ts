import { NextResponse, type NextRequest } from "next/server";
import { cronAutorizado } from "@/lib/cron";
import { purgarTerminadas } from "@/lib/privacidad";

export const dynamic = "force-dynamic";

/** Cada día: elimina los datos personales de las asesorías terminadas cuya persona no pidió guardarlos. */
export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const anonimizadas = await purgarTerminadas();
  return NextResponse.json({ anonimizadas });
}
