import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { getDb } from "./db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const tipoCodigoIngreso = (email: string) => `codigo_ingreso:${email}`;
function hashCodigo(t: string): string {
  const secreto = process.env.SESSION_SECRET ?? "";
  if (secreto.length < 32) throw new Error("SESSION_SECRET falta o es muy corta (mínimo 32 caracteres).");
  return createHmac("sha256", secreto).update(t).digest("hex");
}

/** Crea un enlace de un solo uso. Solo se guarda su huella: si alguien lee la base, no puede usarlo. */
export async function crearToken(usuarioId: number, tipo: string, minutos = 60): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM tokens WHERE usuario_id = ? AND tipo = ?", args: [usuarioId, tipo] });
  await d.execute({
    sql: "INSERT INTO tokens (hash, usuario_id, tipo, vence) VALUES (?, ?, ?, ?)",
    args: [hash(token), usuarioId, tipo, Date.now() + minutos * 60_000],
  });
  return token;
}

/** Revisa el token sin gastarlo (para mostrar el formulario). */
export async function tokenValido(token: string, tipo: string): Promise<number | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT usuario_id FROM tokens WHERE hash = ? AND tipo = ? AND usado = 0 AND vence > ?",
    args: [hash(token), tipo, Date.now()],
  });
  return r.rows[0] ? Number(r.rows[0].usuario_id) : null;
}

/** Gasta el token: devuelve el usuario solo la primera vez. */
export async function gastarToken(token: string, tipo: string): Promise<number | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE tokens SET usado = 1 WHERE hash = ? AND tipo = ? AND usado = 0 AND vence > ? RETURNING usuario_id",
    args: [hash(token), tipo, Date.now()],
  });
  return r.rows[0] ? Number(r.rows[0].usuario_id) : null;
}

/** Crea un código de ingreso de seis dígitos vinculado a un correo y de un solo uso. */
export async function crearCodigoIngreso(usuarioId: number, email: string, minutos = 10): Promise<string> {
  const codigo = String(randomInt(100_000, 1_000_000));
  const tipo = tipoCodigoIngreso(email);
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM tokens WHERE usuario_id = ? AND tipo = ?", args: [usuarioId, tipo] });
  await d.execute({
    sql: "INSERT INTO tokens (hash, usuario_id, tipo, vence) VALUES (?, ?, ?, ?)",
    args: [hashCodigo(`${tipo}:${codigo}`), usuarioId, tipo, Date.now() + minutos * 60_000],
  });
  return codigo;
}

/** Valida y consume un código solo para el correo al que fue enviado. */
export async function gastarCodigoIngreso(codigo: string, email: string): Promise<number | null> {
  const tipo = tipoCodigoIngreso(email);
  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE tokens SET usado = 1 WHERE hash = ? AND tipo = ? AND usado = 0 AND vence > ? RETURNING usuario_id",
    args: [hashCodigo(`${tipo}:${codigo}`), tipo, Date.now()],
  });
  return r.rows[0] ? Number(r.rows[0].usuario_id) : null;
}
