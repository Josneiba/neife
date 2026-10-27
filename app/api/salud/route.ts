import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Para monitores de disponibilidad (UptimeRobot, BetterStack). No expone datos. */
export async function GET() {
  try {
    const d = await getDb();
    await d.execute("SELECT 1");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falló la comprobación de salud de la base de datos.", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
