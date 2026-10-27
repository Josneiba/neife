import { NextResponse, type NextRequest } from "next/server";
import { googleActivo, iniciarConGoogle, intercambiarCodigo } from "@/lib/oauth";
import { rutaSegura } from "@/lib/guards";
import { urlSitio } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const volver = (q: string) => NextResponse.redirect(`${urlSitio()}/ingresar?error=${q}`);
  if (!googleActivo()) return volver("google");
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  if (sp.get("error") || !code) return volver("google_cancelado");
  try {
    const r = await intercambiarCodigo(code, sp.get("state") ?? "");
    if (!r) return volver("google");
    const u = await iniciarConGoogle(r.perfil);
    if (!u) return volver("google_correo");
    const defecto = u.rol === "admin" ? "/admin" : u.rol === "abogado" ? "/panel" : "/cuenta";
    return NextResponse.redirect(`${urlSitio()}${rutaSegura(r.siguiente, defecto)}`);
  } catch (e) {
    console.error("[oauth google]", e);
    return volver("google");
  }
}
