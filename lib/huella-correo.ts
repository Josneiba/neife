import { createHmac } from "node:crypto";

/**
 * Huella (HMAC-SHA256) del correo con la clave de datos. Permite encontrar los casos de una
 * persona al crear su cuenta sin guardar el correo en claro. No se puede revertir sin la clave.
 */
export function huellaCorreo(email: string): string {
  const hex = process.env.DATA_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("DATA_ENCRYPTION_KEY falta o es inválida.");
  return createHmac("sha256", Buffer.from(hex, "hex")).update("correo:" + email.trim().toLowerCase()).digest("hex");
}
