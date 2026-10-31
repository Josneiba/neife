import { esFecha, esPeriodo, hoyLocal, inicioPeriodo, type Periodo } from "./fechas";

/** Lee ?p=semana&d=2026-10-26 de la dirección y devuelve un período válido (por defecto, la semana actual). */
export function periodoDeParams(sp: Record<string, string | undefined>, porDefecto: Periodo = "semana", hoy = hoyLocal()) {
  const periodo: Periodo = esPeriodo(sp.p) ? sp.p : porDefecto;
  const base = esFecha(sp.d) ? sp.d : hoy;
  return { periodo, inicio: inicioPeriodo(periodo, base), hoy };
}

/** Porcentaje 0–100 de avance hacia la meta (sin meta = 0). */
export function porcentaje(real: number, meta: number): number {
  if (meta <= 0) return real > 0 ? 100 : 0;
  return Math.min(100, Math.round((real / meta) * 100));
}
