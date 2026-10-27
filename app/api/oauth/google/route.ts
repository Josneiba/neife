import { NextResponse, type NextRequest } from "next/server";
import { googleActivo, urlDeInicio } from "@/lib/oauth";
import { rutaSegura } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!googleActivo()) return NextResponse.redirect(new URL("/ingresar?error=google", req.url));
  const siguiente = rutaSegura(req.nextUrl.searchParams.get("siguiente"), "");
  return NextResponse.redirect(await urlDeInicio(siguiente));
}
