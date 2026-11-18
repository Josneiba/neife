import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { usuarioActual, type Usuario } from "./auth";

/** Exige una sesión iniciada. */
export async function requerirUsuario(volverA = "/"): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) redirect(`/ingresar?siguiente=${encodeURIComponent(volverA)}`);
  return u;
}

/** Solo abogados con la cuenta ya verificada. */
export async function requerirAbogado(): Promise<Usuario> {
  const u = await requerirUsuario("/panel");
  if (u.rol !== "abogado") redirect(u.rol === "admin" ? "/admin" : "/cuenta");
  if (u.estado !== "activo") redirect("/panel");
  return u;
}

export async function requerirAdmin(): Promise<Usuario> {
  const u = await requerirUsuario("/admin");
  if (u.rol !== "admin" || u.estado !== "activo") redirect("/");
  return u;
}

export async function requerirCliente(): Promise<Usuario> {
  const u = await requerirUsuario("/cuenta");
  if (u.rol === "abogado") redirect("/panel");
  if (u.rol === "admin") redirect("/admin");
  return u;
}

/** Solo permite volver a rutas internas (evita redirecciones a otros sitios). */
export function rutaSegura(destino: string | null | undefined, porDefecto = "/"): string {
  if (!destino) return porDefecto;
  if (!destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) return porDefecto;
  return destino;
}

export async function ipActual(): Promise<string> {
  const h = await headers();
  if (process.env.VERCEL) {
    const vercel = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for");
    const ip = vercel?.split(",").map((x) => x.trim()).find(Boolean);
    if (ip) return ip;
  }
  const configurado = process.env.PROXY_HOPS;
  const saltos = configurado ? Number(configurado) : 1;
  if (!Number.isSafeInteger(saltos) || saltos < 1) {
    throw new Error("PROXY_HOPS debe ser un entero positivo.");
  }
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const lista = xff.split(",").map((x) => x.trim()).filter(Boolean);
    if (lista.length) return lista[Math.max(0, lista.length - saltos)];
  }
  return h.get("x-real-ip") ?? "local";
}
