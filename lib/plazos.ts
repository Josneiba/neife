/**
 * Plazos legales aproximados para avisar a tiempo. Es orientación, no cómputo judicial:
 * no considera feriados (por eso la fecha límite sale igual o más temprana que la real).
 */
import { diasEntre, sumarDias } from "./crm/fechas";

export type TonoPlazo = "ok" | "pronto" | "urgente" | "vencido";

export type Plazo = {
  /** Qué plazo es, en palabras simples. */
  titulo: string;
  limite: string;
  /** Días corridos que faltan; negativo si ya pasó. */
  restantes: number;
  tono: TonoPlazo;
  texto: string;
  base: string;
};

/** Suma días hábiles (lunes a viernes), sin contar feriados. */
export function sumarDiasHabiles(desde: string, n: number): string {
  let f = desde;
  let falta = n;
  while (falta > 0) {
    f = sumarDias(f, 1);
    const dow = new Date(`${f}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) falta--;
  }
  return f;
}

/** Suma meses calendario; si el día no existe en el mes final, usa el último día de ese mes. */
export function sumarMeses(desde: string, n: number): string {
  const [a, m, d] = desde.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const aa = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(aa, mm, 0)).getUTCDate();
  return `${aa}-${String(mm).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

function tono(restantes: number): TonoPlazo {
  if (restantes < 0) return "vencido";
  if (restantes <= 10) return "urgente";
  if (restantes <= 25) return "pronto";
  return "ok";
}

function frase(restantes: number): string {
  if (restantes < 0) return `Venció hace ${-restantes} día${restantes === -1 ? "" : "s"}`;
  if (restantes === 0) return "Vence hoy";
  return `Quedan ${restantes} día${restantes === 1 ? "" : "s"}`;
}

const REGLAS: Record<string, { titulo: string; base: string; limite: (hecho: string) => string }> = {
  laboral: {
    titulo: "Reclamar por despido",
    base: "60 días hábiles desde la separación (Código del Trabajo, art. 168). Un reclamo en la Inspección del Trabajo puede suspenderlo.",
    limite: (h) => sumarDiasHabiles(h, 60),
  },
  consumidor: {
    titulo: "Reclamar como consumidor",
    base: "6 meses desde la infracción (Ley 19.496, art. 26).",
    limite: (h) => sumarMeses(h, 6),
  },
};

export function materiaConPlazo(materia: string): boolean {
  return materia in REGLAS;
}

/** Plazo de la materia contado desde la fecha del hecho; null si no hay regla o no hay fecha. */
export function plazoDe(materia: string, fechaHecho: string, hoy: string): Plazo | null {
  const regla = REGLAS[materia];
  if (!regla || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHecho)) return null;
  const limite = regla.limite(fechaHecho);
  const restantes = diasEntre(hoy, limite);
  return { titulo: regla.titulo, limite, restantes, tono: tono(restantes), texto: frase(restantes), base: regla.base };
}
