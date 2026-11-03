import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado AES-256-GCM para relatos, datos de contacto e informes.
 *
 * Formato guardado:  v1:<base64( iv(12) + etiqueta(16) + datos cifrados )>
 *  - "v1" permite cambiar de clave o de algoritmo más adelante.
 *  - El "contexto" (por ejemplo "solicitud.relato") se ata al dato: si alguien copia un
 *    texto cifrado a otra columna, el descifrado falla.
 */

const ALGORITMO = "aes-256-gcm";
let claveCache: Buffer | null = null;

function clave(): Buffer {
  if (claveCache) return claveCache;
  const hex = process.env.DATA_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "DATA_ENCRYPTION_KEY falta o es inválida. Debe tener 64 caracteres hexadecimales. Corre «npm run setup» para crearla.",
    );
  }
  claveCache = Buffer.from(hex, "hex");
  return claveCache;
}

export function cifrar(texto: string, contexto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv(ALGORITMO, clave(), iv);
  cifrador.setAAD(Buffer.from(contexto, "utf8"));
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return "v1:" + Buffer.concat([iv, etiqueta, datos]).toString("base64");
}

export function descifrar(guardado: string, contexto: string): string {
  if (!guardado.startsWith("v1:")) throw new Error("Formato de dato cifrado desconocido.");
  const bruto = Buffer.from(guardado.slice(3), "base64");
  const iv = bruto.subarray(0, 12);
  const etiqueta = bruto.subarray(12, 28);
  const datos = bruto.subarray(28);
  const descifrador = createDecipheriv(ALGORITMO, clave(), iv);
  descifrador.setAAD(Buffer.from(contexto, "utf8"));
  descifrador.setAuthTag(etiqueta);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}

/** Descifra sin romper la página si un dato está dañado o la clave cambió. */
export function descifrarSeguro(guardado: string, contexto: string): string {
  try {
    return descifrar(guardado, contexto);
  } catch {
    return "[no se pudo descifrar]";
  }
}

/** Código largo e imposible de adivinar para los enlaces de seguimiento. */
export function codigoAleatorio(): string {
  return randomBytes(16).toString("base64url");
}

export function codigoCaso(tipo: "CASO" | "CRM"): string {
  const codigo = randomBytes(6).toString("hex").toUpperCase();
  return `${tipo}-${codigo.slice(0, 4)}-${codigo.slice(4, 8)}-${codigo.slice(8)}`;
}
