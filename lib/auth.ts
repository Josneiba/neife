import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

export type Rol = "cliente" | "abogado" | "admin";
export type Estado = "activo" | "pendiente" | "rechazado";

export type Usuario = {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  estado: Estado;
};

const COOKIE = "neife_sesion";
const DURACION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

function secreto(): Uint8Array {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length < 32) {
    throw new Error("SESSION_SECRET falta o es muy corta (mínimo 32 caracteres). Corre «npm run setup».");
  }
  return new TextEncoder().encode(s);
}

export async function hashClave(clave: string): Promise<string> {
  return bcrypt.hash(clave, 12);
}

// Hash de relleno: así verificar un correo inexistente tarda lo mismo que uno real.
const HASH_FALSO = "$2b$12$sf8pYb8UT/DZI5BsMEMeJ.gwZ2II5Zkbyh39/AUCrCj1nksNrdgmi";

export async function verificarClave(clave: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(clave, hash ?? HASH_FALSO);
  return hash !== null && ok;
}

export async function iniciarSesion(usuarioId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(usuarioId))
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(secreto());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function cerrarSesionActual() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Usuario de la sesión actual, leído desde la base (si lo rechazan, pierde el acceso al tiro). */
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const d = await getDb();
    const r = await d.execute({
      sql: "SELECT id, email, nombre, rol, estado FROM usuarios WHERE id = ?",
      args: [id],
    });
    const fila = r.rows[0];
    if (!fila) return null;
    return {
      id: Number(fila.id),
      email: String(fila.email),
      nombre: String(fila.nombre),
      rol: fila.rol as Rol,
      estado: fila.estado as Estado,
    };
  } catch {
    return null;
  }
});
