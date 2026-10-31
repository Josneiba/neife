import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb, auditar } from "./db";
import { hashClave, iniciarSesion } from "./auth";
import { urlSitio } from "./sitio";

/** Ingreso con Google (OAuth 2.0 con PKCE). Solo se activa si hay GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. */
export const googleActivo = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const redirectUri = () => `${urlSitio()}/api/oauth/google/callback`;
const COOKIE = "neife_oauth";

export async function urlDeInicio(siguiente: string): Promise<string> {
  const estado = randomBytes(16).toString("base64url");
  const verificador = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify({ estado, verificador, siguiente }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth",
    maxAge: 600,
  });
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: estado,
    code_challenge: createHash("sha256").update(verificador).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export type PerfilGoogle = { sub: string; email: string; verificado: boolean; nombre: string };

export async function intercambiarCodigo(code: string, estado: string): Promise<{ perfil: PerfilGoogle; siguiente: string } | null> {
  const jar = await cookies();
  const guardado = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (!guardado) return null;
  let c: { estado: string; verificador: string; siguiente: string };
  try {
    c = JSON.parse(guardado);
  } catch {
    return null;
  }
  if (!estado || c.estado !== estado) return null;

  const t = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: c.verificador,
    }),
  });
  if (!t.ok) return null;
  const { access_token } = (await t.json()) as { access_token?: string };
  if (!access_token) return null;
  const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!u.ok) return null;
  const j = (await u.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!j.sub || !j.email) return null;
  return { perfil: { sub: j.sub, email: j.email.toLowerCase(), verificado: j.email_verified === true, nombre: j.name || j.email }, siguiente: c.siguiente };
}

/**
 * Busca o crea la cuenta. Solo se une a una cuenta existente por correo si Google confirmó
 * que ese correo es de la persona; si no, se rechaza (evita tomar cuentas ajenas).
 */
export async function iniciarConGoogle(p: PerfilGoogle): Promise<{ id: number; rol: string; estado: string } | null> {
  if (!p.verificado) return null;
  const d = await getDb();
  const ya = await d.execute({
    sql: `SELECT u.id, u.rol, u.estado FROM identidades i JOIN usuarios u ON u.id = i.usuario_id WHERE i.proveedor = 'google' AND i.sub = ?`,
    args: [p.sub],
  });
  let fila = ya.rows[0];
  if (!fila) {
    fila = (await d.execute({ sql: "SELECT id, rol, estado FROM usuarios WHERE email = ?", args: [p.email] })).rows[0];
    if (!fila) {
      const r = await d.execute({
        sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, 'cliente', ?, 'activo')",
        args: [p.email, await hashClave(randomBytes(24).toString("base64url")), p.nombre.slice(0, 120)],
      });
      fila = { id: r.lastInsertRowid, rol: "cliente", estado: "activo" };
    }
    await d.execute({
      sql: "INSERT INTO identidades (proveedor, sub, usuario_id) VALUES ('google', ?, ?) ON CONFLICT DO NOTHING",
      args: [p.sub, Number(fila.id)],
    });
  }
  await d.execute({ sql: "UPDATE usuarios SET email_verificado = 1 WHERE id = ?", args: [Number(fila.id)] });
  if (String(fila.estado) === "rechazado") return null;
  await iniciarSesion(Number(fila.id));
  await auditar(Number(fila.id), "ingreso_google", "usuario", Number(fila.id));
  return { id: Number(fila.id), rol: String(fila.rol), estado: String(fila.estado) };
}
