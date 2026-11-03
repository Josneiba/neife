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

/* =====================================================================================
   v2 · Citas, requisitos, derivaciones, gestiones y planificación
   ===================================================================================== */

export const TIPOS_CITA = [
  { clave: "asesoria", nombre: "Asesoría", icono: "birrete", color: "azul" },
  { clave: "reunion", nombre: "Reunión", icono: "usuarios", color: "morado" },
  { clave: "audiencia", nombre: "Audiencia", icono: "balanza", color: "cafe" },
  { clave: "contacto", nombre: "Contacto", icono: "mensaje", color: "verde" },
  { clave: "evento", nombre: "Evento", icono: "agenda", color: "gris" },
] as const;
export type TipoCita = (typeof TIPOS_CITA)[number]["clave"];
export const CLAVES_CITA = TIPOS_CITA.map((t) => t.clave) as TipoCita[];
export function esTipoCita(x: unknown): x is TipoCita {
  return typeof x === "string" && (CLAVES_CITA as string[]).includes(x);
}
export function tipoCita(c: string) {
  return TIPOS_CITA.find((t) => t.clave === c) ?? TIPOS_CITA[4];
}

export const ESTADOS_CITA = [
  { clave: "pendiente", nombre: "Pendiente" },
  { clave: "realizada", nombre: "Realizada" },
  { clave: "no_asistio", nombre: "No asistió" },
  { clave: "cancelada", nombre: "Cancelada" },
] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number]["clave"];
export function esEstadoCita(x: unknown): x is EstadoCita {
  return ESTADOS_CITA.some((e) => e.clave === x);
}

/** Las citas de estos tipos, al darse por realizadas, quedan como registro en el historial y suman a los indicadores. */
export const CITAS_QUE_REGISTRAN: TipoCita[] = ["asesoria", "reunion", "audiencia", "contacto"];

export const CATEGORIAS_PASO = [
  { clave: "documento", nombre: "Documento por reunir" },
  { clave: "tramite", nombre: "Trámite o gestión" },
  { clave: "compromiso", nombre: "Compromiso con el cliente" },
] as const;
export type CategoriaPaso = (typeof CATEGORIAS_PASO)[number]["clave"];

export const ESTADOS_PASO = [
  { clave: "pendiente", nombre: "Pendiente" },
  { clave: "en_curso", nombre: "En curso" },
  { clave: "listo", nombre: "Listo" },
  { clave: "omitido", nombre: "No aplica" },
] as const;
export type EstadoPaso = (typeof ESTADOS_PASO)[number]["clave"];

/** Lista de requisitos sugerida al empezar un caso, según la materia. */
export const PASOS_POR_MATERIA: Record<string, { texto: string; categoria: CategoriaPaso }[]> = {
  laboral: [
    { texto: "Contrato de trabajo y anexos", categoria: "documento" },
    { texto: "Últimas liquidaciones de sueldo", categoria: "documento" },
    { texto: "Carta de despido o de renuncia", categoria: "documento" },
    { texto: "Certificado de cotizaciones (AFP, salud, cesantía)", categoria: "documento" },
    { texto: "Calcular finiquito y plazos (60 días hábiles para demandar)", categoria: "tramite" },
    { texto: "Evaluar reclamo ante la Inspección del Trabajo", categoria: "tramite" },
  ],
  familia: [
    { texto: "Cédula de identidad de las partes", categoria: "documento" },
    { texto: "Certificado de nacimiento de los hijos", categoria: "documento" },
    { texto: "Comprobantes de ingresos y gastos", categoria: "documento" },
    { texto: "Evaluar mediación familiar previa", categoria: "tramite" },
    { texto: "Acordar con el cliente la estrategia (acuerdo o demanda)", categoria: "compromiso" },
  ],
  civil: [
    { texto: "Contrato o documento que origina el conflicto", categoria: "documento" },
    { texto: "Comprobantes de pago y comunicaciones", categoria: "documento" },
    { texto: "Revisar plazos de prescripción", categoria: "tramite" },
    { texto: "Evaluar carta de requerimiento previo", categoria: "tramite" },
  ],
  penal: [
    { texto: "Copia de la denuncia o querella", categoria: "documento" },
    { texto: "Número de causa (RUC) y fiscalía", categoria: "documento" },
    { texto: "Revisar fechas de audiencias y plazos", categoria: "tramite" },
    { texto: "Explicar al cliente sus derechos e intervinientes", categoria: "compromiso" },
  ],
  consumidor: [
    { texto: "Boleta, factura o contrato de la compra", categoria: "documento" },
    { texto: "Reclamo presentado ante la empresa (SERNAC)", categoria: "documento" },
    { texto: "Evaluar denuncia ante el Juzgado de Policía Local", categoria: "tramite" },
  ],
  arriendo: [
    { texto: "Contrato de arriendo firmado", categoria: "documento" },
    { texto: "Comprobantes de pago de arriendo y garantía", categoria: "documento" },
    { texto: "Cartas o mensajes con el arrendador/arrendatario", categoria: "documento" },
    { texto: "Revisar plazos de término y restitución", categoria: "tramite" },
  ],
  otra: [
    { texto: "Cédula de identidad del cliente", categoria: "documento" },
    { texto: "Documentos que respaldan el caso", categoria: "documento" },
    { texto: "Definir con el cliente el objetivo y el siguiente paso", categoria: "compromiso" },
  ],
};

export const ESTADOS_COMISION = [
  { clave: "sin_acuerdo", nombre: "Sin acuerdo" },
  { clave: "acordada", nombre: "Acordada (por cobrar)" },
  { clave: "cobrada", nombre: "Cobrada" },
] as const;
export type EstadoComision = (typeof ESTADOS_COMISION)[number]["clave"];

export const TIPOS_COMISION = [
  { clave: "ninguna", nombre: "Sin comisión" },
  { clave: "porcentaje", nombre: "Porcentaje de los honorarios" },
  { clave: "monto", nombre: "Monto fijo en pesos" },
] as const;
export type TipoComision = (typeof TIPOS_COMISION)[number]["clave"];

export const RESULTADOS_DERIVACION = [
  { clave: "en_curso", nombre: "En curso" },
  { clave: "aceptado", nombre: "El colega aceptó el caso" },
  { clave: "rechazado", nombre: "El colega lo rechazó" },
  { clave: "sin_respuesta", nombre: "Sin respuesta" },
  { clave: "resuelto", nombre: "Caso resuelto" },
] as const;
export type ResultadoDerivacion = (typeof RESULTADOS_DERIVACION)[number]["clave"];
export function nombreResultadoDerivacion(c: string): string {
  return RESULTADOS_DERIVACION.find((r) => r.clave === c)?.nombre ?? c;
}

/**
 * Las «gestiones abiertas» de la portada. Cada una tiene su propia pantalla (/panel/crm/gestion/<clave>)
 * con la lista de clientes, qué hacer con cada uno y un botón para hacerlo ahí mismo.
 */
export type GestionClave =
  | "citas_proximas"
  | "hitos_14"
  | "referidos"
  | "mandatos_por_firmar"
  | "sin_seguimiento"
  | "por_contactar"
  | "postventa"
  | "nuevos_mandantes";

export const GESTIONES: {
  clave: GestionClave;
  titulo: string;
  icono: "calendario-ok" | "usuarios" | "firma" | "alerta" | "mensaje" | "escudo" | "usuario-mas";
  que: string;
  hacer: string;
  plantilla: string;
}[] = [
  { clave: "citas_proximas", titulo: "Citas próximas", icono: "calendario-ok", que: "Asesorías, reuniones y audiencias agendadas para los próximos 7 días.", hacer: "Confirma cada cita el día anterior para evitar inasistencias.", plantilla: "recordatorio" },
  { clave: "hitos_14", titulo: "Hitos en 14 días", icono: "calendario-ok", que: "Clientes con una audiencia, mediación, firma o plazo en las próximas dos semanas.", hacer: "Revisa que tengan sus documentos listos y avísales con tiempo.", plantilla: "recordatorio" },
  { clave: "referidos", titulo: "Referidos por contactar", icono: "usuarios", que: "Personas que te recomendó alguien y aún no has contactado.", hacer: "Escríbeles pronto y agradece a quien los refirió.", plantilla: "primer_contacto" },
  { clave: "mandatos_por_firmar", titulo: "Mandatos por firmar", icono: "firma", que: "Clientes con fecha de hito que aún no firman mandato.", hacer: "Confirma honorarios y alcance; cuando firmen, márcalos como mandato firmado.", plantilla: "recordatorio" },
  { clave: "sin_seguimiento", titulo: "Sin seguimiento", icono: "alerta", que: "Clientes con contacto vencido o sin movimiento hace 7 días o más.", hacer: "Un mensaje breve basta: pregunta cómo sigue y propón un siguiente paso.", plantilla: "seguimiento" },
  { clave: "por_contactar", titulo: "Por contactar", icono: "mensaje", que: "Prospectos que todavía no han tenido un primer contacto.", hacer: "El primer contacto, dentro de 24 horas, aumenta mucho la probabilidad de asesoría.", plantilla: "primer_contacto" },
  { clave: "postventa", titulo: "Postventa", icono: "escudo", que: "Clientes con mandato o caso resuelto sin contacto hace 30 días o más.", hacer: "Pregunta cómo les fue y, si quedaron conformes, pide su opinión.", plantilla: "opinion" },
  { clave: "nuevos_mandantes", titulo: "Nuevos mandantes", icono: "usuario-mas", que: "Clientes con mandato firmado.", hacer: "Reúne los documentos y define el primer trámite con cada uno.", plantilla: "despues_asesoria" },
];

export function gestionDe(c: string) {
  return GESTIONES.find((g) => g.clave === c);
}

/** Segmentos de la pestaña «Personas» de la planificación semanal. */
export const SEGMENTOS_PLAN = [
  { clave: "nuevos_mandantes", titulo: "Nuevos mandantes", ayuda: "Firmaron mandato: acompáñalos en el primer trámite." },
  { clave: "con_hito", titulo: "Con fecha de hito", ayuda: "Tienen audiencia, mediación, firma o plazo fijado." },
  { clave: "asesoria_reciente", titulo: "Asesorados recientemente", ayuda: "Recibieron una asesoría en los últimos 14 días." },
  { clave: "en_asesoria", titulo: "Otros en asesoría", ayuda: "Están en asesoría pero sin fecha de hito aún." },
  { clave: "interesados", titulo: "Personas con interés", ayuda: "Prospectos y contactados que todavía no reciben asesoría." },
  { clave: "derivados", titulo: "Derivados con seguimiento", ayuda: "Los conectaste con un colega; haz seguimiento." },
  { clave: "antiguos", titulo: "Clientes antiguos", ayuda: "Casos resueltos o que no continuaron: retoma el contacto." },
  { clave: "referentes", titulo: "Pueden recomendarte", ayuda: "Quedaron muy conformes (4 o 5 estrellas)." },
] as const;
export type SegmentoPlan = (typeof SEGMENTOS_PLAN)[number]["clave"];
export function esSegmento(x: unknown): x is SegmentoPlan {
  return SEGMENTOS_PLAN.some((s) => s.clave === x);
}
