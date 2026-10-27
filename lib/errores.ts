/**
 * Convierte un error técnico en un mensaje que una persona entienda.
 * El detalle técnico va a los registros del servidor, nunca a la pantalla.
 */
export function mensajeError(e: unknown, queIntentaba = "completar esto"): string {
  const t = e instanceof Error ? `${e.name} ${e.message} ${(e as { code?: string }).code ?? ""}` : String(e);
  console.error(`[error] al ${queIntentaba}:`, e);
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|timeout|connection|DATABASE_URL/i.test(t)) {
    return "No pudimos conectarnos en este momento. Espera un minuto y vuelve a intentar. Lo que escribiste sigue en pantalla.";
  }
  if (/DATA_ENCRYPTION_KEY|SESSION_SECRET/.test(t)) {
    return "El sitio no está bien configurado todavía. Avisa a quien lo administra.";
  }
  return `No pudimos ${queIntentaba}. Vuelve a intentarlo; si sigue pasando, escríbenos y cuéntanos qué estabas haciendo.`;
}

/** Ejecuta una acción y, si falla por un problema técnico, devuelve un mensaje claro. */
export async function conMensaje<T>(accion: () => Promise<T>, queIntentaba: string): Promise<T | { error: string }> {
  try {
    return await accion();
  } catch (e) {
    // redirect() y notFound() de Next lanzan errores especiales que hay que dejar pasar.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    return { error: mensajeError(e, queIntentaba) };
  }
}

/** Envuelve una acción de formulario: si falla por algo técnico, devuelve un mensaje claro en vez de romper la página. */
export function segura<A extends unknown[], R extends { error?: string }>(
  fn: (...a: A) => Promise<R>,
  queIntentaba: string,
): (...a: A) => Promise<R | { error: string }> {
  return async (...a) => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
      return { error: mensajeError(e, queIntentaba) };
    }
  };
}
