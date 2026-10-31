/**
 * Fechas del CRM. Todo se maneja como día local «YYYY-MM-DD» en Chile (America/Santiago),
 * con la semana de lunes a domingo (igual que la referencia: «26 oct – 1 nov»).
 * Son funciones puras: no tocan la base de datos, así se prueban fácil.
 */

export type Periodo = "dia" | "semana" | "mes";
export const PERIODOS: { clave: Periodo; nombre: string; plural: string }[] = [
  { clave: "dia", nombre: "Día", plural: "Diario" },
  { clave: "semana", nombre: "Semana", plural: "Semanal" },
  { clave: "mes", nombre: "Mes", plural: "Mensual" },
];

const ZONA = "America/Santiago";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esPeriodo(x: unknown): x is Periodo {
  return x === "dia" || x === "semana" || x === "mes";
}

/** ¿Es una fecha real (no 2026-02-31)? */
export function esFecha(f: unknown): f is string {
  if (typeof f !== "string" || !FECHA.test(f)) return false;
  const d = aUTC(f);
  return !Number.isNaN(d.getTime()) && aTexto(d) === f;
}

const aUTC = (f: string) => new Date(`${f}T00:00:00Z`);
const aTexto = (d: Date) => d.toISOString().slice(0, 10);

/** Hoy en Chile, aunque el servidor esté en otra zona horaria (Vercel corre en UTC). */
export function hoyLocal(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function sumarDias(f: string, n: number): string {
  const d = aUTC(f);
  d.setUTCDate(d.getUTCDate() + n);
  return aTexto(d);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUTC(hasta).getTime() - aUTC(desde).getTime()) / 86_400_000);
}

/** Lunes de la semana de la fecha dada. */
export function inicioSemana(f: string): string {
  const dow = aUTC(f).getUTCDay(); // 0 = domingo
  return sumarDias(f, -((dow + 6) % 7));
}

export function inicioPeriodo(p: Periodo, f: string): string {
  if (p === "dia") return f;
  if (p === "semana") return inicioSemana(f);
  return `${f.slice(0, 7)}-01`;
}

export function finPeriodo(p: Periodo, inicio: string): string {
  if (p === "dia") return inicio;
  if (p === "semana") return sumarDias(inicio, 6);
  const d = aUTC(inicio);
  return aTexto(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Desplaza un período n veces (negativo = hacia atrás). Siempre devuelve el inicio del período. */
export function sumarPeriodos(p: Periodo, inicio: string, n: number): string {
  if (p === "dia") return sumarDias(inicio, n);
  if (p === "semana") return sumarDias(inicio, 7 * n);
  const d = aUTC(inicio);
  return aTexto(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

const fmt = (opts: Intl.DateTimeFormatOptions, f: string) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", ...opts }).format(aUTC(f)).replace(/\./g, "");

/** «26 oct – 1 nov 2026», «oct 2026» o «vie 30 oct 2026». */
export function etiquetaPeriodo(p: Periodo, inicio: string): string {
  if (p === "dia") return fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }, inicio);
  if (p === "mes") return fmt({ month: "long", year: "numeric" }, inicio);
  const fin = finPeriodo("semana", inicio);
  const ini = fmt({ day: "numeric", month: "short" }, inicio);
  return `${ini} – ${fmt({ day: "numeric", month: "short", year: "numeric" }, fin)}`;
}

/** Etiqueta corta para el eje del gráfico (dos líneas en la referencia). */
export function etiquetaCorta(p: Periodo, inicio: string): string[] {
  if (p === "dia") return [fmt({ day: "numeric", month: "short" }, inicio)];
  if (p === "mes") return [fmt({ month: "short" }, inicio), fmt({ year: "2-digit" }, inicio)];
  return [fmt({ day: "numeric", month: "short" }, inicio), fmt({ day: "numeric", month: "short" }, finPeriodo("semana", inicio))];
}

/** «30-10-2026». */
export function fechaDMA(f: string): string {
  if (!esFecha(f)) return "";
  const [a, m, d] = f.split("-");
  return `${d}-${m}-${a}`;
}

export function nombreMes(f: string): string {
  return fmt({ month: "long" }, f);
}

export function nombreDiaLargo(f: string): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }, f);
}

/** «hace 3 días», «hace un mes», «hoy», «ayer». */
export function haceCuanto(desde: string, hoy: string): string {
  if (!esFecha(desde)) return "nunca";
  const d = diasEntre(desde, hoy);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 14) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} semanas`;
  const m = Math.floor(d / 30);
  if (m < 12) return m === 1 ? "hace un mes" : `hace ${m} meses`;
  return "hace más de un año";
}
