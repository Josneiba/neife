import type { Periodo } from "./fechas";

/**
 * Catálogo de indicadores del CRM legal. Es la única lista que hay que tocar para agregar,
 * quitar o renombrar un indicador: la base de datos solo guarda eventos con su clave.
 *
 *  - «modo» dice cómo se cuenta:  eventos = cada vez que ocurre;  personas = clientes distintos.
 *  - «base» es la meta inicial por período, hasta que el abogado fije la suya.
 */

export type MetricaClave =
  | "consultas_nuevas"
  | "asesorias"
  | "asesorias_con_colega"
  | "con_hito"
  | "reuniones"
  | "mandatos"
  | "derivaciones"
  | "casos_resueltos";

export type MetricaDef = {
  clave: MetricaClave;
  nombre: string;
  corto: string;
  ayuda: string;
  icono: "usuario-mas" | "birrete" | "usuarios" | "calendario-ok" | "balanza" | "firma" | "intercambio" | "trofeo";
  modo: "eventos" | "personas";
  periodos: Periodo[];
  base: Partial<Record<Periodo, number>>;
};

export const METRICAS: MetricaDef[] = [
  {
    clave: "consultas_nuevas",
    nombre: "Clientes nuevos",
    corto: "Clientes nuevos",
    ayuda: "Personas nuevas que llegan a tu CRM: consultas, referidos o contactos que anotas.",
    icono: "usuario-mas",
    modo: "personas",
    periodos: ["dia", "semana", "mes"],
    base: { dia: 1, semana: 6, mes: 24 },
  },
  {
    clave: "asesorias",
    nombre: "Asesorías realizadas",
    corto: "Asesorías realizadas",
    ayuda: "Cada asesoría que das (presencial, videollamada o teléfono) y registras.",
    icono: "birrete",
    modo: "eventos",
    periodos: ["dia", "semana", "mes"],
    base: { dia: 2, semana: 8, mes: 32 },
  },
  {
    clave: "asesorias_con_colega",
    nombre: "Asesorías con abogado o colega presente",
    corto: "Asesorías con colega",
    ayuda: "Asesorías en que participa un abogado supervisor, un colega o un perito. Útil si trabajas en equipo o bajo supervisión.",
    icono: "usuarios",
    modo: "eventos",
    periodos: ["semana", "mes"],
    base: { semana: 3, mes: 12 },
  },
  {
    clave: "con_hito",
    nombre: "Casos con fecha de hito",
    corto: "Con fecha de hito",
    ayuda: "Clientes a los que ya les fijaste una fecha concreta: audiencia, mediación, firma de mandato o plazo judicial.",
    icono: "calendario-ok",
    modo: "personas",
    periodos: ["semana", "mes"],
    base: { semana: 2, mes: 8 },
  },
  {
    clave: "reuniones",
    nombre: "Clientes que asisten a reunión o audiencia",
    corto: "En reunión o audiencia",
    ayuda: "Clientes distintos que llegaron a una reunión presencial o a una audiencia contigo. Es la señal de compromiso más fuerte.",
    icono: "balanza",
    modo: "personas",
    periodos: ["semana", "mes"],
    base: { semana: 4, mes: 16 },
  },
  {
    clave: "mandatos",
    nombre: "Mandatos firmados",
    corto: "Mandatos firmados",
    ayuda: "Clientes que firmaron mandato o contrato de servicios legales contigo.",
    icono: "firma",
    modo: "personas",
    periodos: ["semana", "mes"],
    base: { semana: 1, mes: 4 },
  },
  {
    clave: "derivaciones",
    nombre: "Clientes conectados con un abogado",
    corto: "Conectados con abogado",
    ayuda: "Clientes que derivaste a un abogado de la materia (con su autorización) y el abogado aceptó tomar el caso.",
    icono: "intercambio",
    modo: "personas",
    periodos: ["semana", "mes"],
    base: { semana: 1, mes: 4 },
  },
  {
    clave: "casos_resueltos",
    nombre: "Casos resueltos",
    corto: "Casos resueltos",
    ayuda: "Casos que cerraste con un resultado: acuerdo, sentencia, asesoría concluida.",
    icono: "trofeo",
    modo: "personas",
    periodos: ["mes"],
    base: { mes: 3 },
  },
];

export const CLAVES_METRICA = METRICAS.map((m) => m.clave) as MetricaClave[];

export function esMetrica(x: unknown): x is MetricaClave {
  return typeof x === "string" && (CLAVES_METRICA as string[]).includes(x);
}

export function metricaDe(clave: string): MetricaDef {
  const m = METRICAS.find((m) => m.clave === clave);
  if (!m) throw new Error(`Indicador desconocido: ${clave}`);
  return m;
}

/** Qué indicadores se ven en la portada. */
export const HOME_SEMANAL: MetricaClave[] = ["consultas_nuevas", "asesorias_con_colega", "reuniones", "con_hito", "asesorias"];
export const HOME_MENSUAL: MetricaClave[] = ["consultas_nuevas", "asesorias", "derivaciones", "casos_resueltos"];

/** Meta inicial de un indicador en un período (0 si no aplica). */
export function metaBase(clave: MetricaClave, p: Periodo): number {
  return metricaDe(clave).base[p] ?? 0;
}

/* ---------- Etapas del embudo de clientes ---------- */

export const ETAPAS_CRM = [
  { clave: "prospecto", nombre: "Prospecto", corto: "Prospecto", ayuda: "Lo encontraste o te lo recomendaron; aún no hablan." },
  { clave: "contactado", nombre: "Contactado", corto: "Contactado", ayuda: "Ya hubo un primer contacto." },
  { clave: "en_asesoria", nombre: "En asesoría", corto: "En asesoría", ayuda: "Está recibiendo orientación o revisando su caso." },
  { clave: "con_hito", nombre: "Con fecha de hito", corto: "Con hito", ayuda: "Tiene una fecha fijada: audiencia, mediación o firma." },
  { clave: "mandato", nombre: "Mandato firmado", corto: "Mandante", ayuda: "Firmó mandato o contrato de servicios." },
  { clave: "derivado", nombre: "Derivado a abogado", corto: "Derivado", ayuda: "Lo conectaste con un abogado de la materia." },
  { clave: "cerrado", nombre: "Caso resuelto", corto: "Resuelto", ayuda: "El caso terminó." },
  { clave: "perdido", nombre: "No continuó", corto: "No continuó", ayuda: "Dejó de responder o decidió no seguir." },
] as const;

export type EtapaCrm = (typeof ETAPAS_CRM)[number]["clave"];
export const CLAVES_ETAPA = ETAPAS_CRM.map((e) => e.clave) as EtapaCrm[];

export function esEtapa(x: unknown): x is EtapaCrm {
  return typeof x === "string" && (CLAVES_ETAPA as string[]).includes(x);
}
export function nombreEtapaCrm(clave: string): string {
  return ETAPAS_CRM.find((e) => e.clave === clave)?.nombre ?? clave;
}

/** Etapas «abiertas»: el cliente sigue en juego. */
export const ETAPAS_ABIERTAS: EtapaCrm[] = ["prospecto", "contactado", "en_asesoria", "con_hito", "mandato"];

/** Al llegar a estas etapas se anota un evento (una sola vez por cliente). */
export const EVENTO_POR_ETAPA: Partial<Record<EtapaCrm, MetricaClave>> = {
  con_hito: "con_hito",
  mandato: "mandatos",
  derivado: "derivaciones",
  cerrado: "casos_resueltos",
};

export const TIPOS_HITO = [
  { clave: "audiencia", nombre: "Audiencia" },
  { clave: "mediacion", nombre: "Mediación" },
  { clave: "firma", nombre: "Firma de mandato" },
  { clave: "plazo", nombre: "Plazo judicial" },
  { clave: "reunion", nombre: "Reunión de estrategia" },
] as const;
export function nombreHito(c: string): string {
  return TIPOS_HITO.find((t) => t.clave === c)?.nombre ?? "Hito";
}

export const TIPOS_INTERACCION = [
  { clave: "contacto", nombre: "Contacto", icono: "mensaje" },
  { clave: "asesoria", nombre: "Asesoría", icono: "birrete" },
  { clave: "reunion", nombre: "Reunión", icono: "balanza" },
  { clave: "audiencia", nombre: "Audiencia", icono: "balanza" },
  { clave: "nota", nombre: "Nota", icono: "nota" },
] as const;
export type TipoInteraccion = (typeof TIPOS_INTERACCION)[number]["clave"];
export function nombreInteraccion(c: string): string {
  return TIPOS_INTERACCION.find((t) => t.clave === c)?.nombre ?? c;
}

export const CANALES = [
  { clave: "presencial", nombre: "Presencial" },
  { clave: "video", nombre: "Videollamada" },
  { clave: "telefono", nombre: "Teléfono" },
  { clave: "whatsapp", nombre: "WhatsApp" },
  { clave: "correo", nombre: "Correo" },
] as const;
export function nombreCanal(c: string): string {
  return CANALES.find((x) => x.clave === c)?.nombre ?? "";
}

export const ORIGENES_CRM = [
  { clave: "web", nombre: "Sitio web" },
  { clave: "referido", nombre: "Referido" },
  { clave: "whatsapp", nombre: "WhatsApp" },
  { clave: "llamada", nombre: "Llamada" },
  { clave: "red", nombre: "Red de contactos" },
  { clave: "actividad", nombre: "Charla o actividad" },
  { clave: "otro", nombre: "Otro" },
] as const;
export function nombreOrigenCrm(c: string): string {
  return ORIGENES_CRM.find((o) => o.clave === c)?.nombre ?? c;
}

export const FUENTES_PLAN = [
  { clave: "asesorias", nombre: "Clientes en asesoría", ayuda: "Clientes a los que visitarás o llamarás para continuar su asesoría." },
  { clave: "antiguos", nombre: "Clientes antiguos", ayuda: "Quienes ya atendiste antes y podrían necesitar algo nuevo." },
  { clave: "red", nombre: "Red de contactos", ayuda: "Colegas, clientes y conocidos que pueden recomendarte." },
  { clave: "actividades", nombre: "Charlas y actividades", ayuda: "Charlas, talleres, ferias o clínicas jurídicas donde conocer personas." },
  { clave: "interesados", nombre: "Personas con interés", ayuda: "Quienes dejaron sus datos en tu sitio o te escribieron preguntando." },
] as const;
export type FuentePlan = (typeof FUENTES_PLAN)[number]["clave"];
export function esFuente(x: unknown): x is FuentePlan {
  return FUENTES_PLAN.some((f) => f.clave === x);
}

export const GRUPOS_BASE = [
  "Contacto diario",
  "Plan semanal",
  "Casos urgentes",
  "Falta documentación",
  "Clientes que recomiendan",
  "Retomar casos antiguos",
  "Empresas",
  "Familias",
];
