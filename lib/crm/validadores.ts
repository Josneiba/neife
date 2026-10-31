import { z } from "zod";
import { MATERIAS, REGIONES } from "../materias";
import { CANALES, CLAVES_ETAPA, FUENTES_PLAN, ORIGENES_CRM, TIPOS_HITO, TIPOS_INTERACCION, CLAVES_METRICA } from "./catalogo";
import { esFecha } from "./fechas";

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
