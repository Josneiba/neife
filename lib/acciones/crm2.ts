"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirAbogado } from "../guards";
import { segura } from "../errores";
import { ErrorCrm } from "../crm/servicio";
import * as crm from "../crm/servicio";
import * as citas from "../crm/servicio-citas";
import * as seg from "../crm/servicio-seguimiento";
import * as avi from "../crm/servicio-avisos";
import * as plan from "../crm/servicio-planificacion";
import { esEstadoCita, esEtapa, type CategoriaPaso, type EstadoCita, type EstadoComision, type EstadoPaso, type ResultadoDerivacion, type TipoCita, type TipoComision } from "../crm/catalogo";
import { esFecha, sumarDias, hoyLocal } from "../crm/fechas";
import {
  esquemaCitaCrm,
  esquemaDerivacionCrm,
  esquemaFichaCrm,
  esquemaNotaZonaCrm,
  esquemaPasoCrm,
  esquemaUbicacionCrm,
} from "../crm/validadores";
import { datosDeForm, erroresPorCampo, type EstadoForm } from "../validators";

/** Acciones de la v2: agenda, requisitos, derivaciones, ubicación, ficha y avisos. */

const refrescar = () => {
  revalidatePath("/panel", "layout");
};

function entero(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function conNegocio(fn: () => Promise<EstadoForm>, valores: Record<string, string>): Promise<EstadoForm> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorCrm) return { error: e.message, valores };
    throw e;
  }
}
const num = (v: string) => (v === "" ? null : Number(v));

/* ---------- Citas ---------- */

async function guardarCitaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaCitaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    const base = {
      tipo: c.tipo as TipoCita,
      fecha: c.fecha,
      horaIni: c.hora_ini,
      horaFin: c.hora_fin,
      personaId: c.persona_id === "" ? null : c.persona_id,
      titulo: c.titulo,
      nota: c.nota,
      canal: c.canal,
    };
    if (c.id !== "") {
      await citas.actualizarCita(u.id, c.id, base);
      refrescar();
      return { ok: "Cita actualizada.", valores: datos };
    }
    const r = await citas.crearCita(u.id, base);
    refrescar();
    return { ok: r.cruces > 0 ? "Cita agendada. Ojo: se cruza con otra cita a esa hora." : "Cita agendada.", valores: { fecha: c.fecha } };
  }, datos);
}
export const guardarCitaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(guardarCitaInterna, "guardar la cita")(prev, fd);

async function estadoCitaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const estado = String(fd.get("estado") ?? "");
  if (!id || !esEstadoCita(estado)) return { error: "Datos no válidos." };
  return conNegocio(async () => {
    await citas.cambiarEstadoCita(u.id, id, estado as EstadoCita);
    refrescar();
    return { ok: "Listo." };
  }, {});
}
export const estadoCitaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(estadoCitaInterna, "cambiar la cita")(prev, fd);

async function eliminarCitaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await citas.eliminarCita(u.id, id);
  refrescar();
  return { ok: "Cita eliminada." };
}
export const eliminarCitaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(eliminarCitaInterna, "eliminar la cita")(prev, fd);

/* ---------- Requisitos del caso ---------- */

async function crearPasoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaPasoCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  return conNegocio(async () => {
    await seg.crearPaso(u.id, p.data.persona_id, { texto: p.data.texto, categoria: p.data.categoria as CategoriaPaso, vence: p.data.vence });
    refrescar();
    return { ok: "Requisito agregado.", valores: { persona_id: datos.persona_id } };
  }, datos);
}
export const crearPasoAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(crearPasoInterna, "guardar el requisito")(prev, fd);

const ESTADOS_PASO_OK: EstadoPaso[] = ["pendiente", "en_curso", "listo", "omitido"];
export async function estadoPasoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  const estado = String(fd.get("estado")) as EstadoPaso;
  if (id && ESTADOS_PASO_OK.includes(estado)) await seg.fijarEstadoPaso(u.id, id, estado);
  refrescar();
}
export async function eliminarPasoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await seg.eliminarPaso(u.id, id);
  refrescar();
}
export async function pasosSugeridosAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  if (id) await seg.agregarPasosSugeridos(u.id, id);
  refrescar();
}

/* ---------- Conformidad del cliente ---------- */

export async function satisfaccionAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  const valor = Number(fd.get("valor"));
  if (!id || !Number.isInteger(valor)) return;
  await seg.fijarSatisfaccion(u.id, id, valor, String(fd.get("nota") ?? ""));
  refrescar();
}

/* ---------- Derivaciones ---------- */

async function derivacionInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaDerivacionCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    await seg.guardarDerivacion(u.id, {
      personaId: c.persona_id,
      colegaId: c.colega_id === "" ? null : c.colega_id,
      colega: c.colega,
      contacto: c.contacto,
      fecha: c.fecha,
      motivo: c.motivo,
      comisionTipo: c.comision_tipo as TipoComision,
      comisionValor: c.comision_valor,
      comisionEstado: c.comision_estado as EstadoComision,
      comisionCobrada: c.comision_cobrada,
      resultado: c.resultado as ResultadoDerivacion,
      trato: c.trato,
      satisfaccion: c.satisfaccion,
    });
    refrescar();
    return { ok: "Derivación guardada.", valores: datos };
  }, datos);
}
export const derivacionAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(derivacionInterna, "guardar la derivación")(prev, fd);

export async function eliminarDerivacionAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await seg.eliminarDerivacion(u.id, id);
  refrescar();
}

/* ---------- Ubicación y ficha ---------- */

async function ubicacionInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaUbicacionCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  const c = p.data;
  return conNegocio(async () => {
    if ((c.lat === "") !== (c.lng === "")) throw new ErrorCrm("Marca el punto en el mapa.");
    await crm.actualizarPersona(u.id, c.persona_id, {
      direccion: c.direccion,
      ubicacion: c.lat === "" ? null : { lat: Number(c.lat), lng: Number(c.lng) },
    });
    refrescar();
    return { ok: c.lat === "" ? "Ubicación quitada." : "Ubicación guardada.", valores: datos };
  }, datos);
}
export const ubicacionAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(ubicacionInterna, "guardar la ubicación")(prev, fd);

async function fichaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaFichaCrm.safeParse(datos);
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
      direccion: c.direccion,
      disponibilidad: c.disponibilidad,
      referidoPor: c.referido_por,
      informeVisible: c.informe_visible === "on",
      ...(c.lat !== "" && c.lng !== "" ? { ubicacion: { lat: Number(c.lat), lng: Number(c.lng) } } : {}),
    });
    refrescar();
    return { ok: "Cambios guardados.", valores: datos };
  }, datos);
}
export const fichaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(fichaInterna, "guardar los cambios")(prev, fd);

export async function informeVisibleAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  if (!id) return;
  await crm.actualizarPersona(u.id, id, { informeVisible: fd.get("visible") === "1" });
  refrescar();
}

/* ---------- Gestiones rápidas (desde las listas) ---------- */

/** «Registrar contacto» en un toque: anota el contacto de hoy y, si quieres, programa el siguiente. */
export async function contactoRapidoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  if (!id) return;
  const dias = Number(fd.get("dias_siguiente") ?? 0);
  await crm.registrarInteraccion(u.id, { personaId: id, tipo: "contacto", canal: String(fd.get("canal") ?? "whatsapp"), nota: "Contacto registrado desde Gestiones." });
  if (Number.isInteger(dias) && dias > 0 && dias <= 90) await crm.programarContacto(u.id, id, sumarDias(hoyLocal(), dias));
  refrescar();
}

export async function posponerContactoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  const dias = Number(fd.get("dias"));
  if (id && Number.isInteger(dias) && dias > 0 && dias <= 90) await crm.programarContacto(u.id, id, sumarDias(hoyLocal(), dias));
  refrescar();
}

export async function etapaRapidaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  const etapa = String(fd.get("etapa"));
  if (id && esEtapa(etapa)) await crm.cambiarEtapa(u.id, id, etapa);
  refrescar();
}

/* ---------- Avisos ---------- */

export async function ocultarAvisoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const clave = String(fd.get("clave") ?? "");
  const dias = Number(fd.get("dias") ?? 1);
  if (clave) await avi.ocultarAviso(u.id, clave, Number.isFinite(dias) ? dias : 1);
  refrescar();
}

/* ---------- Notas de zona ---------- */

async function notaZonaInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await requerirAbogado();
  const datos = datosDeForm(fd);
  const p = esquemaNotaZonaCrm.safeParse(datos);
  if (!p.success) return { errores: erroresPorCampo(p.error), valores: datos };
  await plan.crearNotaZona(u.id, p.data);
  refrescar();
  return { ok: "Nota guardada.", valores: {} };
}
export const notaZonaAccion = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => segura(notaZonaInterna, "guardar la nota")(prev, fd);

export async function eliminarNotaZonaAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("id"));
  if (id) await plan.eliminarNotaZona(u.id, id);
  refrescar();
}

export async function importarYVolverAccion() {
  const u = await requerirAbogado();
  await crm.importarSolicitudes(u.id);
  refrescar();
  redirect("/panel/crm/clientes");
}


/* ---------- Planificación rápida ---------- */

export async function planRapidoAccion(fd: FormData) {
  const u = await requerirAbogado();
  const id = entero(fd.get("persona_id"));
  const fecha = String(fd.get("fecha") ?? "");
  const fuente = String(fd.get("fuente") ?? "");
  if (!id || !esFecha(fecha)) return;
  const validas = ["asesorias", "antiguos", "red", "actividades", "interesados"];
  if (!validas.includes(fuente)) return;
  await crm.crearPlan(u.id, { fuente: fuente as Parameters<typeof crm.crearPlan>[1]["fuente"], fecha, personaId: id });
  refrescar();
}
