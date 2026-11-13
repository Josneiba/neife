/**
 * Puntaje de completitud de una solicitud (0–100), calculado al vuelo con los datos existentes.
 */
export type NivelInfo = "completa" | "media" | "basica";

export function completitud(s: { relato: string; presupuesto: string; region: string; urgencia: string }): { puntaje: number; nivel: NivelInfo; falta: string[] } {
  const relato = s.relato.trim();
  const falta: string[] = [];
  let puntaje = 0;
  if (relato.length >= 300) puntaje += 45;
  else if (relato.length >= 120) puntaje += 30;
  else if (relato.length >= 40) puntaje += 15;
  else falta.push("relato más detallado");
  if (/\d{1,2}[\/\-.]\d{1,2}|\b(19|20)\d{2}\b|\$\s?\d|\b\d+\s*(días|dias|meses|años|anos|semanas)\b/i.test(relato)) puntaje += 20;
  else falta.push("fechas, montos o plazos");
  if (s.presupuesto && s.presupuesto !== "Prefiero conversarlo") puntaje += 15;
  else falta.push("presupuesto");
  if (s.region) puntaje += 10;
  else falta.push("región");
  if (s.urgencia) puntaje += 10;
  const valor = Math.min(100, puntaje);
  return { puntaje: valor, nivel: valor >= 75 ? "completa" : valor >= 45 ? "media" : "basica", falta };
}

export function nombreNivel(n: NivelInfo): string {
  return n === "completa" ? "Información completa" : n === "media" ? "Información media" : "Información básica";
}
