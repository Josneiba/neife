import type { ContenidoInforme } from "./datos";

export type ItemCompleto = { clave: string; texto: string; ok: boolean };

/**
 * Qué le falta al informe para estar completo. Sigue la estructura de un dictamen en Chile:
 * consulta planteada, antecedentes de hecho, normativa aplicable, fundamentos, conclusiones.
 */
export function completitudInforme(c: ContenidoInforme, pendientesAbiertos: number): { items: ItemCompleto[]; hechos: number; total: number; faltan: string[] } {
  const items: ItemCompleto[] = [
    { clave: "objeto", texto: "Consulta planteada", ok: c.objeto.trim().length >= 15 },
    { clave: "hechos", texto: "Antecedentes de hecho", ok: c.resumen.trim().length >= 40 },
    { clave: "cronologia", texto: "Cronología", ok: c.cronologia.trim().length > 0 },
    { clave: "normas", texto: "Normas aplicables", ok: c.normas.some((n) => n.incluir) },
    { clave: "fundamentos", texto: "Fundamentos (derechos, vía y plazos)", ok: c.derechos.length > 0 && c.vias.trim().length > 0 && c.plazos.trim().length > 0 },
    { clave: "documentos", texto: "Documentos recibidos de la persona", ok: pendientesAbiertos === 0 },
    { clave: "conclusiones", texto: "Conclusiones y recomendaciones", ok: c.conclusiones.trim().length >= 20 },
    { clave: "destino", texto: "Abogado o rubro de destino", ok: c.abogadoDestino.trim().length > 0 },
  ];
  const hechos = items.filter((i) => i.ok).length;
  return { items, hechos, total: items.length, faltan: items.filter((i) => !i.ok).map((i) => i.texto) };
}

/** Extrae del relato las frases con fechas o tiempos, como punto de partida de la cronología. */
export function cronologiaDesdeRelato(relato: string): string {
  const frases = relato.split(/(?<=[.!?])\s+/).map((f) => f.trim()).filter(Boolean);
  const marca = /\b(\d{1,2}\s+de\s+[a-záéíóú]+|\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?|(19|20)\d{2}|hace\s+\w+\s+(días|semanas|meses|años)|el\s+(lunes|martes|miércoles|jueves|viernes|sábado|domingo)|ayer|la semana pasada|el mes pasado)\b/i;
  return frases.filter((f) => marca.test(f)).slice(0, 8).join("\n");
}
