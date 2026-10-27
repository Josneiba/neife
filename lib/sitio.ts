/** Dirección pública del sitio, sin barra final. En Vercel usa la del despliegue si falta SITE_URL. */
export function urlSitio(): string {
  const v = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return v.replace(/\/+$/, "");
}

/** Tope de archivos subidos. Vercel corta en 4,5 MB; en tu propio servidor puede ser mayor. */
export function limiteArchivoMb(): number {
  return process.env.VERCEL ? 4 : 20;
}
