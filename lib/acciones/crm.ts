"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirAbogado } from "../guards";
import { segura } from "../errores";
import { ErrorCrm } from "../crm/servicio";
import * as crm from "../crm/servicio";
import { esMetrica, esFuente, type EtapaCrm, type FuentePlan, type TipoInteraccion } from "../crm/catalogo";
import { hoyLocal, inicioPeriodo, esPeriodo, esFecha } from "../crm/fechas";
import {
  esquemaDetallePersonaCrm,
  esquemaEtapaCrm,
  esquemaGrupoCrm,
  esquemaHitoCrm,
  esquemaInteraccionCrm,
  esquemaMetaCrm,
  esquemaPersonaCrm,
  esquemaPlanCrm,
  esquemaTareaCrm,
  separarContacto,
} from "../crm/validadores";
import { datosDeForm, erroresPorCampo, type EstadoForm } from "../validators";

/**
 * Acciones del CRM (se ejecutan en el servidor cuando se envía un formulario).
 * Todas exigen un abogado con la cuenta verificada y validan los datos aquí, nunca solo en el navegador.
 */

const refrescar = () => revalidatePath("/panel/crm", "layout");

function entero(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Los errores de negocio (ErrorCrm) se muestran tal cual; los técnicos los traduce «segura». */
async function conNegocio(fn: () => Promise<EstadoForm>, valores: Record<string, string>): Promise<EstadoForm> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorCrm) return { error: e.message, valores };
    throw e;
  }
}

/* ---------- Personas ---------- */

async function crearPersonaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaPersonaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  const { telefono, email } = separarContacto(c.contacto);
  const id = await crm.crearPersona(u.id, {
    nombre: c.nombre,
    telefono,
    email,
    nota: c.nota,
    tipo: c.tipo,
    materia: c.materia,
    region: c.region,
    comuna: c.comuna,
    origen: c.origen,
    proximoContacto: c.proximo_contacto,
    direccion: c.direccion,
    referidoPor: c.referido_por,
    lat: c.lat === "" ? null : Number(c.lat),
    lng: c.lng === "" ? null : Number(c.lng),
  });
  refrescar();
  return { ok: `Agregado: ${c.nombre}.`, valores: { id: String(id) } };
}
export const crearPersonaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(crearPersonaInterna, "guardar a la persona")(prev, fd);

async function actualizarPersonaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaDetallePersonaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    await crm.actualizarPersona(u.id, c.persona_id, {
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      materia: c.materia,
      origen: c.origen,
      tipo: c.tipo,
      region: c.region,
      comuna: c.comuna,
      nota: c.nota,
      abogadoDestino: c.abogado_destino,
      valorEstimado: c.valor_estimado,
      prioritario: c.prioritario === "on",
    });
    refrescar();
    return { ok: "Cambios guardados.", valores: datos };
  }, datos);
}
export const actualizarPersonaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(actualizarPersonaInterna, "guardar los cambios")(prev, fd);

export async function eliminarPersonaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  if (id) await crm.eliminarPersona(u.id, id);
  refrescar();
  redirect("/panel/crm/clientes");
}

export async function cambiarEtapaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const p = esquemaEtapaCrm.safeParse(datosDeForm(fd));
  if (!p.success) return;
  await crm.cambiarEtapa(u.id, p.data.persona_id, p.data.etapa as EtapaCrm);
  refrescar();
}

async function fijarHitoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaHitoCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  return conNegocio(async () => {
    await crm.fijarHito(u.id, p.data.persona_id, p.data.fecha, p.data.tipo_hito || "audiencia");
    refrescar();
    return { ok: p.data.fecha ? "Fecha de hito guardada." : "Fecha de hito quitada.", valores: datos };
  }, datos);
}
export const fijarHitoAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(fijarHitoInterna, "guardar la fecha")(prev, fd);

export async function programarContactoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  const fecha = String(fd.get("fecha") ?? "");
  if (!id || (fecha !== "" && !esFecha(fecha))) return;
  await crm.programarContacto(u.id, id, fecha);
  refrescar();
}

export async function importarSolicitudesAccion() {
  const u = await requerirAbogado();
  await crm.importarSolicitudes(u.id);
  refrescar();
  redirect("/panel/crm/clientes");
}

/* ---------- Interacciones ---------- */

async function registrarInteraccionInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaInteraccionCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    await crm.registrarInteraccion(u.id, {
      personaId: c.persona_id,
      tipo: c.tipo as TipoInteraccion,
      canal: c.canal,
      fecha: c.fecha,
      conColega: c.con_colega === "on",
      nota: c.nota,
    });
    refrescar();
    return { ok: "Registrado.", valores: {} };
  }, datos);
}
export const registrarInteraccionAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(registrarInteraccionInterna, "guardar el registro")(prev, fd);

export async function eliminarInteraccionAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.eliminarInteraccion(u.id, id);
  refrescar();
}

/* ---------- Metas ---------- */

async function guardarMetaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaMetaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    if (!esMetrica(c.metrica) || !esPeriodo(c.periodo)) throw new ErrorCrm("Indicador no válido.");
    await crm.fijarMeta(u.id, c.metrica, c.periodo, c.inicio, c.objetivo);
    refrescar();
    return { ok: "Meta guardada.", valores: datos };
  }, datos);
}
export const guardarMetaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(guardarMetaInterna, "guardar la meta")(prev, fd);

/** El «+» de «Meta de hoy»: sube en 1 la meta diaria de clientes nuevos. */
export async function subirMetaHoyAccion() {
  const u = await requerirAbogado();
  const hoy = hoyLocal();
  const actual = (await crm.metasVigentes(u.id, "dia", hoy)).consultas_nuevas;
  await crm.fijarMeta(u.id, "consultas_nuevas", "dia", inicioPeriodo("dia", hoy), Math.min(actual + 1, 10_000));
  refrescar();
}

/* ---------- Tareas ---------- */

async function crearTareaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaTareaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  return conNegocio(async () => {
    await crm.crearTarea(u.id, { texto: p.data.texto, personaId: p.data.persona_id === "" ? null : p.data.persona_id, vence: p.data.vence });
    refrescar();
    return { ok: "Tarea agregada.", valores: {} };
  }, datos);
}
export const crearTareaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(crearTareaInterna, "guardar la tarea")(prev, fd);

export async function alternarTareaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.alternarTarea(u.id, id);
  refrescar();
}

export async function eliminarTareaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.eliminarTarea(u.id, id);
  refrescar();
}

/* ---------- Plan semanal ---------- */

async function crearPlanInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaPlanCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  return conNegocio(async () => {
    if (!esFuente(p.data.fuente)) throw new ErrorCrm("Elige de dónde vendrá.");
    await crm.crearPlan(u.id, {
      fuente: p.data.fuente as FuentePlan,
      fecha: p.data.fecha,
      texto: p.data.texto,
      personaId: p.data.persona_id === "" ? null : p.data.persona_id,
    });
    refrescar();
    return { ok: "Plan agregado.", valores: { fuente: p.data.fuente, fecha: p.data.fecha } };
  }, datos);
}
export const crearPlanAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(crearPlanInterna, "guardar el plan")(prev, fd);

export async function alternarPlanAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.alternarPlan(u.id, id);
  refrescar();
}

export async function eliminarPlanAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.eliminarPlan(u.id, id);
  refrescar();
}

/* ---------- Grupos ---------- */

async function crearGrupoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaGrupoCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  return conNegocio(async () => {
    await crm.crearGrupo(u.id, p.data.nombre);
    refrescar();
    return { ok: "Grupo creado.", valores: {} };
  }, datos);
}
export const crearGrupoAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(crearGrupoInterna, "crear el grupo")(prev, fd);

export async function eliminarGrupoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await crm.eliminarGrupo(u.id, id);
  refrescar();
}

export async function moverGrupoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const dir = fd.get("dir") === "arriba" ? "arriba" : "abajo";
  if (id) await crm.moverGrupo(u.id, id, dir);
  refrescar();
}

export async function alternarGrupoPersonaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const g = entero(fd.get("grupo_id"));
  const p = entero(fd.get("persona_id"));
  if (g && p) await crm.alternarGrupoPersona(u.id, g, p);
  refrescar();
}
