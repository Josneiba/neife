import { randomInt } from "node:crypto";

/**
 * Código de seguimiento que ve y dicta la persona: dos grupos de cuatro (K7M4-9QX2).
 * Sin 0, 1, I, L ni O para que no se confunda al leerlo o decirlo por teléfono.
 * Solo muestra la etapa del caso; los datos personales exigen además el correo (ver /seguir).
 */
export const ALFABETO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generarCodigoCorto(): string {
  let r = "";
  for (let i = 0; i < 8; i++) {
    r += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
    if (i === 3) r += "-";
  }
  return r;
}

/**
 * Acepta mayúsculas, minúsculas, con o sin guion o espacios. Devuelve el código en su forma
 * guardada, o null si no tiene el formato. Reconoce también los códigos antiguos CASO-XXXX-XXXX-XXXX.
 */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = String(entrada ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (limpio.length === 16 && limpio.startsWith("CASO") && /^[0-9A-F]{12}$/.test(limpio.slice(4))) {
    return `CASO-${limpio.slice(4, 8)}-${limpio.slice(8, 12)}-${limpio.slice(12, 16)}`;
  }
  if (limpio.length !== 8) return null;
  for (const c of limpio) if (!ALFABETO_CODIGO.includes(c)) return null;
  return `${limpio.slice(0, 4)}-${limpio.slice(4)}`;
}
