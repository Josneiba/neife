import { z } from "zod";
import { MATERIAS, PRESUPUESTOS, REGIONES, URGENCIAS } from "./materias";

const texto = (min: number, max: number, nombre: string) => {
  const Nombre = nombre[0].toUpperCase() + nombre.slice(1);
  let base = z
    .string({ error: `Escribe ${nombre}.` })
    .trim()
    .min(1, { error: `Escribe ${nombre}.` });
  if (min > 1) base = base.min(min, { error: `${Nombre} es muy corto (mínimo ${min} caracteres).` });
  return base.max(max, { error: `${Nombre} es muy largo (máximo ${max} caracteres).` });
};

const correo = z
  .string({ error: "Escribe tu correo." })
  .trim()
  .toLowerCase()
  .max(160, { error: "El correo es muy largo." })
  .pipe(z.email({ error: "Ese correo no parece válido." }));

const clave = z
  .string({ error: "Escribe una contraseña." })
  .min(10, { error: "La contraseña debe tener al menos 10 caracteres." })
  .max(200, { error: "La contraseña es muy larga." });

export const esquemaLogin = z.object({
  email: correo,
  clave: z.string().min(1, { error: "Escribe tu contraseña." }).max(200),
});

export const esquemaSolicitarCodigoIngreso = z.object({ email: correo });

export const esquemaCodigoIngreso = z.object({
  email: correo,
  codigo: z.string().regex(/^\d{6}$/, { error: "Escribe el código de 6 dígitos." }),
  siguiente: z.string().optional(),
});

export const esquemaVerificarCorreo = z.object({
  token: z.string().min(20).max(100),
});

export const esquemaRegistroCliente = z.object({
  nombre: texto(2, 120, "tu nombre"),
  email: correo,
  clave,
});

export const esquemaRegistroAbogado = z.object({
  nombre: texto(2, 120, "tu nombre"),
  email: correo,
  clave,
  titulo: texto(3, 120, "tu condición profesional"),
  registro: texto(3, 160, "tu número de colegiatura o universidad"),
  declaracion: z.literal("on", { error: "Debes confirmar que los datos son verdaderos." }),
});

export const esquemaSolicitud = z.object({
  asesor: z.union([z.literal("auto"), z.coerce.number().int().positive()], { error: "Elige con quién quieres la asesoría." }).default("auto"),
  materia: z.enum(MATERIAS.map((m) => m.clave) as [string, ...string[]], { error: "Elige una materia." }),
  region: z.enum(REGIONES as unknown as [string, ...string[]], { error: "Elige tu región." }),
  urgencia: z.enum(URGENCIAS.map((u) => u.clave) as [string, ...string[]], { error: "Elige la urgencia." }),
  presupuesto: z.union([z.literal(""), z.enum(PRESUPUESTOS as unknown as [string, ...string[]])]).default(""),
  relato: texto(40, 1500, "el relato"),
  nombre: texto(2, 120, "tu nombre"),
  email: correo,
  telefono: z
    .string()
    .trim()
    .max(30, { error: "El teléfono es muy largo." })
    .regex(/^[0-9+()\s-]*$/, { error: "El teléfono solo puede tener números, + y guiones." })
    .optional()
    .default(""),
  consentimiento: z.literal("on", { error: "Debes aceptar el tratamiento de tus datos para continuar." }),
  derivar: z.string().optional().default(""),
  conservar: z.string().optional().default(""),
});

export const esquemaPerfil = z.object({
  nombre: texto(2, 120, "tu nombre"),
  titulo: texto(3, 120, "tu condición profesional"),
  registro: texto(3, 160, "tu número de colegiatura o universidad"),
  ubicacion: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(900, { error: "La presentación es muy larga (máximo 900 caracteres)." }).default(""),
  precio_informe: z.coerce
    .number({ error: "El precio debe ser un número." })
    .int({ error: "El precio debe ser un número entero." })
    .min(0, { error: "El precio no puede ser negativo." })
    .max(5_000_000, { error: "El precio es demasiado alto." }),
  instrucciones_pago: z.string().trim().max(600, { error: "Las instrucciones de pago son muy largas." }).default(""),
  meta_semanal: z.coerce.number().int().min(1, { error: "La meta debe ser al menos 1." }).max(100, { error: "La meta es demasiado alta." }).default(3),
});

export const esquemaNorma = z.object({
  nombre: texto(3, 200, "el nombre de la norma"),
  materia: z.enum(MATERIAS.map((m) => m.clave) as [string, ...string[]], { error: "Elige una materia." }),
  fuente: z.string().trim().max(300).default(""),
});

/** Devuelve el primer mensaje de error por campo. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const i of error.issues) {
    const campo = String(i.path[0] ?? "general");
    if (!salida[campo]) salida[campo] = i.message;
  }
  return salida;
}

export type EstadoForm = {
  error?: string;
  errores?: Record<string, string>;
  valores?: Record<string, string>;
  ok?: string;
};

/** Convierte FormData en un objeto de textos (ignora archivos). */
export function datosDeForm(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) o[k] = v;
  }
  return o;
}

export const esquemaPedirRecuperacion = z.object({ email: correo });

export const esquemaNuevaClave = z
  .object({ token: z.string().min(20).max(100), clave, repetir: z.string() })
  .refine((v) => v.clave === v.repetir, { error: "Las contraseñas no coinciden.", path: ["repetir"] });

export const esquemaContactoRapido = z.object({
  nombre: texto(2, 120, "el nombre"),
  contacto: texto(5, 160, "un teléfono o correo"),
  materia: z.enum(MATERIAS.map((m) => m.clave) as [string, ...string[]]).default("otra"),
  origen: z.enum(["web", "referido", "whatsapp", "llamada", "otro"]).default("otro"),
  nota: z.string().trim().max(600, { error: "La nota es muy larga (máximo 600 caracteres)." }).default(""),
});
