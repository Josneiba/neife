import { NextResponse, type NextRequest } from "next/server";
import { purgarTerminadas } from "@/lib/privacidad";

export const dynamic = "force-dynamic";

/** Cada día: elimina los datos personales de las asesorías terminadas cuya persona no pidió guardarlos. */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const anonimizadas = await purgarTerminadas();
  return NextResponse.json({ anonimizadas });
}
