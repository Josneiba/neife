import { z } from "zod";
import { MATERIAS, REGIONES } from "../materias";
import { CANALES, CLAVES_CITA, CLAVES_ETAPA, ESTADOS_COMISION, RESULTADOS_DERIVACION, TIPOS_COMISION, CATEGORIAS_PASO, FUENTES_PLAN, ORIGENES_CRM, TIPOS_HITO, TIPOS_INTERACCION, CLAVES_METRICA } from "./catalogo";
import { esFecha, esHora } from "./fechas";

const texto = (min: number, max: number, nombre: string) =>
  z
    .string({ error: `Escribe ${nombre}.` })
    .trim()
    .min(min, { error: `Escribe ${nombre}.` })
    .max(max, { error: `Eso es muy largo (máximo ${max} caracteres).` });

const fechaOpcional = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || esFecha(v), { error: "La fecha no es válida." });

/** Coordenada opcional: "" (sin dato) o un número dentro del rango. */
function coordenada(min: number, max: number) {
  return z.union([z.literal(""), z.coerce.number({ error: "La ubicación no es válida." }).min(min, { error: "La ubicación no es válida." }).max(max, { error: "La ubicación no es válida." })]).default("");
}

const enteroId = z.coerce.number({ error: "Elige una persona." }).int({ error: "Elige una persona." }).positive({ error: "Elige una persona." });

const enumDe = <T extends readonly string[]>(valores: T, mensaje: string) => z.enum(valores as unknown as [string, ...string[]], { error: mensaje });

export const esquemaPersonaCrm = z.object({
  nombre: texto(2, 120, "el nombre"),
  contacto: z.string().trim().max(160, { error: "El contacto es muy largo." }).default(""),
  materia: enumDe(MATERIAS.map((m) => m.clave), "Elige una materia.").default("otra"),
  origen: enumDe(ORIGENES_CRM.map((o) => o.clave), "Elige cómo llegó.").default("otro"),
  tipo: z.enum(["natural", "empresa"]).default("natural"),
  region: z.union([z.literal(""), enumDe(REGIONES, "Elige una región.")]).default(""),
  comuna: z.string().trim().max(80, { error: "La comuna es muy larga." }).default(""),
  nota: z.string().trim().max(1000, { error: "La nota es muy larga (máximo 1.000 caracteres)." }).default(""),
  proximo_contacto: fechaOpcional,
  direccion: z.string().trim().max(200, { error: "La dirección es muy larga." }).default(""),
  referido_por: z.string().trim().max(120, { error: "Ese nombre es muy largo." }).default(""),
  lat: coordenada(-90, 90),
  lng: coordenada(-180, 180),
});

export const esquemaInteraccionCrm = z.object({
  persona_id: enteroId,
  tipo: enumDe(TIPOS_INTERACCION.map((t) => t.clave), "Elige el tipo."),
  canal: z.union([z.literal(""), enumDe(CANALES.map((c) => c.clave), "Elige el canal.")]).default(""),
  fecha: fechaOpcional,
  con_colega: z.string().optional().default(""),
  nota: z.string().trim().max(1500, { error: "La nota es muy larga (máximo 1.500 caracteres)." }).default(""),
});

export const esquemaMetaCrm = z.object({
  metrica: enumDe(CLAVES_METRICA, "Indicador no válido."),
  periodo: enumDe(["dia", "semana", "mes"], "Período no válido."),
  inicio: z.string().refine(esFecha, { error: "La fecha no es válida." }),
  objetivo: z.coerce.number({ error: "La meta debe ser un número." }).int({ error: "La meta debe ser un número entero." }).min(0, { error: "La meta no puede ser negativa." }).max(10_000, { error: "La meta es demasiado alta." }),
});

export const esquemaTareaCrm = z.object({
  texto: texto(2, 300, "la tarea"),
  persona_id: z.union([z.literal(""), enteroId]).default(""),
  vence: fechaOpcional,
});

export const esquemaPlanCrm = z.object({
  fuente: enumDe(FUENTES_PLAN.map((f) => f.clave), "Elige de dónde vendrá."),
  fecha: z.string().refine(esFecha, { error: "Elige el día." }),
  texto: z.string().trim().max(300, { error: "El plan es muy largo." }).default(""),
  persona_id: z.union([z.literal(""), enteroId]).default(""),
});

export const esquemaHitoCrm = z.object({
  persona_id: enteroId,
  fecha: fechaOpcional,
  tipo_hito: z.union([z.literal(""), enumDe(TIPOS_HITO.map((t) => t.clave), "Elige el tipo de hito.")]).default("audiencia"),
});

export const esquemaDetallePersonaCrm = z.object({
  persona_id: enteroId,
  nombre: texto(2, 120, "el nombre"),
  telefono: z.string().trim().max(30, { error: "El teléfono es muy largo." }).regex(/^[0-9+()\s-]*$/, { error: "El teléfono solo puede tener números, + y guiones." }).default(""),
  email: z.union([z.literal(""), z.email({ error: "Ese correo no parece válido." })]).default(""),
  materia: enumDe(MATERIAS.map((m) => m.clave), "Elige una materia."),
  origen: enumDe(ORIGENES_CRM.map((o) => o.clave), "Elige cómo llegó."),
  tipo: z.enum(["natural", "empresa"]).default("natural"),
  region: z.union([z.literal(""), enumDe(REGIONES, "Elige una región.")]).default(""),
  comuna: z.string().trim().max(80).default(""),
  nota: z.string().trim().max(1000, { error: "La nota es muy larga (máximo 1.000 caracteres)." }).default(""),
  abogado_destino: z.string().trim().max(160).default(""),
  valor_estimado: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  prioritario: z.string().optional().default(""),
});

export const esquemaGrupoCrm = z.object({ nombre: texto(2, 60, "el nombre del grupo") });

export const esquemaEtapaCrm = z.object({ persona_id: enteroId, etapa: enumDe(CLAVES_ETAPA, "Etapa no válida.") });

/** «+56 9 1234 5678» o «ana@correo.cl»: separa teléfono y correo del campo único «contacto». */
export function separarContacto(contacto: string): { telefono: string; email: string } {
  const c = contacto.trim();
  if (!c) return { telefono: "", email: "" };
  if (c.includes("@")) return { telefono: "", email: c.toLowerCase() };
  return { telefono: c, email: "" };
}

/* ---------- v2 ---------- */

const horaTexto = z.string().refine(esHora, { error: "Elige una hora válida." });
const idOpcional = z.union([z.literal(""), enteroId]).default("");

export const esquemaCitaCrm = z.object({
  id: idOpcional,
  tipo: enumDe(CLAVES_CITA, "Elige el tipo de cita."),
  fecha: z.string().refine(esFecha, { error: "Elige el día." }),
  hora_ini: horaTexto,
  hora_fin: z.union([z.literal(""), horaTexto]).default(""),
  persona_id: idOpcional,
  titulo: z.string().trim().max(120, { error: "El título es muy largo (máximo 120 caracteres)." }).default(""),
  nota: z.string().trim().max(600, { error: "La nota es muy larga (máximo 600 caracteres)." }).default(""),
  canal: z.union([z.literal(""), enumDe(CANALES.map((c) => c.clave), "Elige el canal.")]).default(""),
});

export const esquemaPasoCrm = z.object({
  persona_id: enteroId,
  texto: texto(2, 200, "el requisito"),
  categoria: enumDe(CATEGORIAS_PASO.map((c) => c.clave), "Elige el tipo.").default("documento"),
  vence: fechaOpcional,
});

export const esquemaDerivacionCrm = z.object({
  persona_id: enteroId,
  colega: texto(2, 120, "el nombre del colega"),
  colega_id: idOpcional,
  contacto: z.string().trim().max(160, { error: "El contacto es muy largo." }).default(""),
  fecha: fechaOpcional,
  motivo: z.string().trim().max(600, { error: "El motivo es muy largo (máximo 600 caracteres)." }).default(""),
  comision_tipo: enumDe(TIPOS_COMISION.map((t) => t.clave), "Elige el tipo de comisión.").default("ninguna"),
  comision_valor: z.coerce.number({ error: "La comisión debe ser un número." }).int({ error: "Usa un número entero." }).min(0, { error: "No puede ser negativa." }).max(1_000_000_000, { error: "Es demasiado alta." }).default(0),
  comision_estado: enumDe(ESTADOS_COMISION.map((t) => t.clave), "Elige el estado de la comisión.").default("sin_acuerdo"),
  comision_cobrada: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  resultado: enumDe(RESULTADOS_DERIVACION.map((t) => t.clave), "Elige el resultado.").default("en_curso"),
  trato: z.string().trim().max(800, { error: "El texto es muy largo (máximo 800 caracteres)." }).default(""),
  satisfaccion: z.coerce.number().int().min(0).max(5).default(0),
});

export const esquemaUbicacionCrm = z.object({
  persona_id: enteroId,
  lat: coordenada(-90, 90),
  lng: coordenada(-180, 180),
  direccion: z.string().trim().max(200, { error: "La dirección es muy larga." }).default(""),
});

export const esquemaFichaCrm = esquemaDetallePersonaCrm.extend({
  direccion: z.string().trim().max(200, { error: "La dirección es muy larga." }).default(""),
  disponibilidad: z.string().trim().max(300, { error: "Es muy largo (máximo 300 caracteres)." }).default(""),
  referido_por: z.string().trim().max(120, { error: "Ese nombre es muy largo." }).default(""),
  lat: coordenada(-90, 90),
  lng: coordenada(-180, 180),
  informe_visible: z.string().optional().default(""),
});

export const esquemaNotaZonaCrm = z.object({
  region: z.union([z.literal(""), enumDe(REGIONES, "Elige una región.")]).default(""),
  comuna: texto(2, 80, "la comuna"),
  texto: texto(2, 500, "la nota"),
});
