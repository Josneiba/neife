import { auditar, getDb, type Fila } from "../db";
import { cifrar, descifrarSeguro } from "../crypto";
import {
  PASOS_POR_MATERIA,
  esEtapa,
  type CategoriaPaso,
  type EstadoComision,
  type EstadoPaso,
  type ResultadoDerivacion,
  type TipoComision,
} from "./catalogo";
import { esFecha, hoyLocal } from "./fechas";
import { aPersona, cambiarEtapa, ErrorCrm, eventoUnico, obtenerPersona, type PersonaCrm } from "./servicio";
import { citasDePersona } from "./servicio-citas";
import { evaluarCaso, type ContextoCaso, type EvaluacionCaso } from "./progreso";

/* ======================== Requisitos del caso (documentos y trámites) ======================== */

export type Paso = { id: number; personaId: number; texto: string; categoria: CategoriaPaso; estado: EstadoPaso; vence: string };

function aPaso(f: Fila): Paso {
  return {
    id: Number(f.id),
    personaId: Number(f.persona_id),
    texto: descifrarSeguro(String(f.texto_enc), "crm.paso"),
    categoria: String(f.categoria) as CategoriaPaso,
    estado: String(f.estado) as EstadoPaso,
    vence: String(f.vence ?? ""),
  };
}

export async function listarPasos(abogadoId: number, personaId: number): Promise<Paso[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT * FROM crm_pasos WHERE abogado_id = ? AND persona_id = ? ORDER BY (estado = 'listo' OR estado = 'omitido'), id",
    args: [abogadoId, personaId],
  });
  return r.rows.map(aPaso);
}

export async function crearPaso(abogadoId: number, personaId: number, p: { texto: string; categoria?: CategoriaPaso; vence?: string }): Promise<void> {
  const texto = p.texto.trim();
  if (texto.length < 2) throw new ErrorCrm("Escribe el requisito.");
  if (texto.length > 200) throw new ErrorCrm("El requisito es muy largo (máximo 200 caracteres).");
  if (p.vence && !esFecha(p.vence)) throw new ErrorCrm("La fecha no es válida.");
  if (!(await obtenerPersona(personaId, abogadoId))) throw new ErrorCrm("No encontramos a esa persona.");
  const d = await getDb();
  await d.execute({
    sql: "INSERT INTO crm_pasos (abogado_id, persona_id, texto_enc, categoria, vence) VALUES (?, ?, ?, ?, ?)",
    args: [abogadoId, personaId, cifrar(texto, "crm.paso"), p.categoria ?? "documento", p.vence ?? ""],
  });
}

export async function fijarEstadoPaso(abogadoId: number, id: number, estado: EstadoPaso): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "UPDATE crm_pasos SET estado = ? WHERE id = ? AND abogado_id = ?", args: [estado, id, abogadoId] });
  await d.execute({
    sql: "UPDATE crm_personas SET actualizado_en = ahora() WHERE id = (SELECT persona_id FROM crm_pasos WHERE id = ? AND abogado_id = ?)",
    args: [id, abogadoId],
  });
}

export async function eliminarPaso(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_pasos WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/** Agrega la lista sugerida para la materia del cliente (sin repetir lo que ya tiene). Devuelve cuántos agregó. */
export async function agregarPasosSugeridos(abogadoId: number, personaId: number): Promise<number> {
  const p = await obtenerPersona(personaId, abogadoId);
  if (!p) throw new ErrorCrm("No encontramos a esa persona.");
  const existentes = new Set((await listarPasos(abogadoId, personaId)).map((x) => x.texto.toLowerCase()));
  const lista = PASOS_POR_MATERIA[p.materia] ?? PASOS_POR_MATERIA.otra;
  const d = await getDb();
  let n = 0;
  for (const s of lista) {
    if (existentes.has(s.texto.toLowerCase())) continue;
    await d.execute({
      sql: "INSERT INTO crm_pasos (abogado_id, persona_id, texto_enc, categoria) VALUES (?, ?, ?, ?)",
      args: [abogadoId, personaId, cifrar(s.texto, "crm.paso"), s.categoria],
    });
    n++;
  }
  return n;
}

/* ================================ Satisfacción ================================ */

export async function fijarSatisfaccion(abogadoId: number, personaId: number, valor: number, nota = ""): Promise<void> {
  if (!Number.isInteger(valor) || valor < 0 || valor > 5) throw new ErrorCrm("La conformidad va de 1 a 5 estrellas.");
  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE crm_personas SET satisfaccion = ?, satisfaccion_nota_enc = ?, actualizado_en = ahora() WHERE id = ? AND abogado_id = ?",
    args: [valor, nota.trim() ? cifrar(nota.trim().slice(0, 600), "crm.satisfaccion") : "", personaId, abogadoId],
  });
  if (r.rowsAffected === 0) throw new ErrorCrm("No encontramos a esa persona.");
}

/* ================================ Derivaciones ================================ */

export type Derivacion = {
  id: number;
  personaId: number;
  persona: string;
  colegaId: number | null;
  colega: string;
  contacto: string;
  fecha: string;
  motivo: string;
  comisionTipo: TipoComision;
  comisionValor: number;
  comisionEstado: EstadoComision;
  comisionCobrada: number;
  resultado: ResultadoDerivacion;
  trato: string;
  satisfaccion: number;
  actualizadoEn: string;
};

function aDerivacion(f: Fila): Derivacion {
  const dec = (c: string, ctx: string) => (f[c] ? descifrarSeguro(String(f[c]), ctx) : "");
  return {
    id: Number(f.id),
    personaId: Number(f.persona_id),
    persona: f.nombre_enc ? descifrarSeguro(String(f.nombre_enc), "crm.nombre") : "",
    colegaId: f.colega_id == null ? null : Number(f.colega_id),
    colega: dec("colega_enc", "crm.colega"),
    contacto: dec("contacto_enc", "crm.colega"),
    fecha: String(f.fecha),
    motivo: dec("motivo_enc", "crm.derivacion"),
    comisionTipo: String(f.comision_tipo) as TipoComision,
    comisionValor: Number(f.comision_valor),
    comisionEstado: String(f.comision_estado) as EstadoComision,
    comisionCobrada: Number(f.comision_cobrada),
    resultado: String(f.resultado) as ResultadoDerivacion,
    trato: dec("trato_enc", "crm.derivacion"),
    satisfaccion: Number(f.satisfaccion),
    actualizadoEn: String(f.actualizado_en),
  };
}

export type DatosDerivacion = {
  personaId: number;
  colegaId?: number | null;
  colega: string;
  contacto?: string;
  fecha?: string;
  motivo?: string;
  comisionTipo?: TipoComision;
  comisionValor?: number;
  comisionEstado?: EstadoComision;
  comisionCobrada?: number;
  resultado?: ResultadoDerivacion;
  trato?: string;
  satisfaccion?: number;
};

function revisarDerivacion(x: DatosDerivacion) {
  if (!x.colega.trim()) throw new ErrorCrm("Escribe el nombre del colega.");
  const tipo = x.comisionTipo ?? "ninguna";
  const valor = Math.max(0, Math.round(x.comisionValor ?? 0));
  if (tipo === "porcentaje" && valor > 100) throw new ErrorCrm("El porcentaje no puede pasar de 100.");
  if (valor > 1_000_000_000) throw new ErrorCrm("El monto es demasiado alto.");
  if (x.fecha && !esFecha(x.fecha)) throw new ErrorCrm("La fecha no es válida.");
  const sat = x.satisfaccion ?? 0;
  if (!Number.isInteger(sat) || sat < 0 || sat > 5) throw new ErrorCrm("La conformidad va de 1 a 5 estrellas.");
  return { tipo, valor, sat };
}

/** Registra (o actualiza) a qué colega derivaste al cliente. Al crearla, el cliente pasa a «Derivado». */
export async function guardarDerivacion(abogadoId: number, x: DatosDerivacion, hoy = hoyLocal()): Promise<number> {
  const { tipo, valor, sat } = revisarDerivacion(x);
  const p = await obtenerPersona(x.personaId, abogadoId);
  if (!p) throw new ErrorCrm("No encontramos a esa persona.");
  const d = await getDb();
  const previa = await d.execute({ sql: "SELECT id FROM crm_derivaciones WHERE persona_id = ? AND abogado_id = ? ORDER BY id DESC LIMIT 1", args: [x.personaId, abogadoId] });
  const comEstado: EstadoComision = tipo === "ninguna" ? "sin_acuerdo" : (x.comisionEstado ?? "acordada");
  const args = [
    x.colegaId ?? null,
    cifrar(x.colega.trim(), "crm.colega"),
    x.contacto?.trim() ? cifrar(x.contacto.trim(), "crm.colega") : "",
    x.fecha && esFecha(x.fecha) ? x.fecha : hoy,
    x.motivo?.trim() ? cifrar(x.motivo.trim().slice(0, 600), "crm.derivacion") : "",
    tipo,
    valor,
    comEstado,
    comEstado === "cobrada" ? Math.max(0, Math.round(x.comisionCobrada ?? 0)) : 0,
    x.resultado ?? "en_curso",
    x.trato?.trim() ? cifrar(x.trato.trim().slice(0, 800), "crm.derivacion") : "",
    sat,
  ];
  let id: number;
  if (previa.rows[0]) {
    id = Number(previa.rows[0].id);
    await d.execute({
      sql: `UPDATE crm_derivaciones SET colega_id = ?, colega_enc = ?, contacto_enc = ?, fecha = ?, motivo_enc = ?, comision_tipo = ?, comision_valor = ?,
              comision_estado = ?, comision_cobrada = ?, resultado = ?, trato_enc = ?, satisfaccion = ?, actualizado_en = ahora()
            WHERE id = ? AND abogado_id = ?`,
      args: [...args, id, abogadoId],
    });
  } else {
    const r = await d.execute({
      sql: `INSERT INTO crm_derivaciones (colega_id, colega_enc, contacto_enc, fecha, motivo_enc, comision_tipo, comision_valor, comision_estado,
              comision_cobrada, resultado, trato_enc, satisfaccion, abogado_id, persona_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [...args, abogadoId, x.personaId],
    });
    id = Number(r.rows[0].id);
  }
  await d.execute({
    sql: "UPDATE crm_personas SET abogado_destino_enc = ?, actualizado_en = ahora() WHERE id = ? AND abogado_id = ?",
    args: [cifrar(x.colega.trim(), "crm.destino"), x.personaId, abogadoId],
  });
  if (p.etapa !== "derivado" && p.etapa !== "cerrado") await cambiarEtapa(abogadoId, x.personaId, "derivado", hoy);
  if (x.resultado === "aceptado" || x.resultado === "resuelto") {
    const db = await getDb();
    await db.batch([eventoUnico(abogadoId, x.personaId, "derivaciones", x.fecha && esFecha(x.fecha) ? x.fecha : hoy, `derivacion:${x.resultado}`)]);
  }
  await auditar(abogadoId, "crm_derivacion_guardada", "crm_persona", x.personaId);
  return id;
}

export async function derivacionDe(abogadoId: number, personaId: number): Promise<Derivacion | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT v.*, p.nombre_enc FROM crm_derivaciones v JOIN crm_personas p ON p.id = v.persona_id
          WHERE v.abogado_id = ? AND v.persona_id = ? ORDER BY v.id DESC LIMIT 1`,
    args: [abogadoId, personaId],
  });
  return r.rows[0] ? aDerivacion(r.rows[0]) : null;
}

export async function listarDerivaciones(abogadoId: number): Promise<Derivacion[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT v.*, p.nombre_enc FROM crm_derivaciones v JOIN crm_personas p ON p.id = v.persona_id
          WHERE v.abogado_id = ? ORDER BY v.fecha DESC, v.id DESC`,
    args: [abogadoId],
  });
  return r.rows.map(aDerivacion);
}

export async function eliminarDerivacion(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_derivaciones WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/** Abogados verificados de la plataforma a quienes se puede derivar (nombre y perfil público). */
export async function colegasDePlataforma(abogadoId: number): Promise<{ id: number; nombre: string; slug: string }[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT u.id, u.nombre, p.slug FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
          WHERE u.rol = 'abogado' AND u.estado = 'activo' AND u.id <> ? ORDER BY u.nombre LIMIT 200`,
    args: [abogadoId],
  });
  return r.rows.map((f) => ({ id: Number(f.id), nombre: String(f.nombre), slug: String(f.slug ?? "") }));
}

export type ResumenColega = { colega: string; derivaciones: number; aceptadas: number; resueltas: number; satisfaccion: number | null; comisionPorCobrar: number; comisionCobrada: number };

/** Monto de comisión acordado en pesos. Los porcentajes no tienen monto hasta que se cobran. */
export function montoAcordado(v: Derivacion): number {
  return v.comisionTipo === "monto" ? v.comisionValor : 0;
}

export function resumenPorColega(lista: Derivacion[]): ResumenColega[] {
  const mapa = new Map<string, { r: ResumenColega; sat: number[] }>();
  for (const v of lista) {
    const clave = v.colega.trim().toLowerCase();
    const e = mapa.get(clave) ?? { r: { colega: v.colega, derivaciones: 0, aceptadas: 0, resueltas: 0, satisfaccion: null, comisionPorCobrar: 0, comisionCobrada: 0 }, sat: [] };
    e.r.derivaciones++;
    if (v.resultado === "aceptado" || v.resultado === "resuelto") e.r.aceptadas++;
    if (v.resultado === "resuelto") e.r.resueltas++;
    if (v.satisfaccion > 0) e.sat.push(v.satisfaccion);
    if (v.comisionEstado === "acordada") e.r.comisionPorCobrar += montoAcordado(v);
    if (v.comisionEstado === "cobrada") e.r.comisionCobrada += v.comisionCobrada;
    mapa.set(clave, e);
  }
  return [...mapa.values()]
    .map(({ r, sat }) => ({ ...r, satisfaccion: sat.length ? Math.round((sat.reduce((a, b) => a + b, 0) / sat.length) * 10) / 10 : null }))
    .sort((a, b) => b.derivaciones - a.derivaciones);
}

/* =========================== Evaluación del caso (con datos) =========================== */

export async function contextoCaso(abogadoId: number, p: PersonaCrm, hoy = hoyLocal()): Promise<{ ctx: ContextoCaso; pasos: Paso[]; ev: EvaluacionCaso; derivacion: Derivacion | null }> {
  const d = await getDb();
  const [pasos, nAse, citas, deriv] = await Promise.all([
    listarPasos(abogadoId, p.id),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_interacciones WHERE persona_id = ? AND abogado_id = ? AND tipo = 'asesoria'", args: [p.id, abogadoId] }),
    citasDePersona(abogadoId, p.id),
    derivacionDe(abogadoId, p.id),
  ]);
  const aplicables = pasos.filter((x) => x.estado !== "omitido");
  const ctx: ContextoCaso = {
    asesorias: Number(nAse.rows[0]?.n ?? 0),
    pasosTotal: aplicables.length,
    pasosListos: aplicables.filter((x) => x.estado === "listo").length,
    citasFuturas: citas.filter((c) => c.estado === "pendiente" && c.fecha >= hoy).length,
    tieneDerivacion: !!deriv,
  };
  return { ctx, pasos, ev: evaluarCaso(p, ctx, hoy), derivacion: deriv };
}

/** Evalúa a todos los clientes abiertos con solo 4 consultas (para informes y avisos). */
export async function evaluarCartera(abogadoId: number, hoy = hoyLocal()): Promise<{ p: PersonaCrm; ev: EvaluacionCaso; ctx: ContextoCaso }[]> {
  const d = await getDb();
  const [pers, pasos, ases, citas, derivs] = await Promise.all([
    d.execute({ sql: "SELECT * FROM crm_personas WHERE abogado_id = ? ORDER BY actualizado_en DESC", args: [abogadoId] }),
    d.execute({
      sql: `SELECT persona_id, COUNT(*) FILTER (WHERE estado <> 'omitido')::int AS total, COUNT(*) FILTER (WHERE estado = 'listo')::int AS listos
            FROM crm_pasos WHERE abogado_id = ? GROUP BY persona_id`,
      args: [abogadoId],
    }),
    d.execute({ sql: "SELECT persona_id, COUNT(*)::int AS n FROM crm_interacciones WHERE abogado_id = ? AND tipo = 'asesoria' GROUP BY persona_id", args: [abogadoId] }),
    d.execute({ sql: "SELECT persona_id, COUNT(*)::int AS n FROM crm_citas WHERE abogado_id = ? AND estado = 'pendiente' AND fecha >= ? AND persona_id IS NOT NULL GROUP BY persona_id", args: [abogadoId, hoy] }),
    d.execute({ sql: "SELECT DISTINCT persona_id FROM crm_derivaciones WHERE abogado_id = ?", args: [abogadoId] }),
  ]);
  const mp = new Map(pasos.rows.map((f) => [Number(f.persona_id), f]));
  const ma = new Map(ases.rows.map((f) => [Number(f.persona_id), Number(f.n)]));
  const mc = new Map(citas.rows.map((f) => [Number(f.persona_id), Number(f.n)]));
  const md = new Set(derivs.rows.map((f) => Number(f.persona_id)));
  return pers.rows.map((f) => {
    const p = aPersona(f);
    const ps = mp.get(p.id);
    const ctx: ContextoCaso = {
      asesorias: ma.get(p.id) ?? 0,
      pasosTotal: Number(ps?.total ?? 0),
      pasosListos: Number(ps?.listos ?? 0),
      citasFuturas: mc.get(p.id) ?? 0,
      tieneDerivacion: md.has(p.id),
    };
    return { p, ctx, ev: evaluarCaso(p, ctx, hoy) };
  });
}

/* ================================== Línea de tiempo ================================== */

export type ItemLinea = {
  clave: string;
  fecha: string;
  hora?: string;
  tipo: "contacto" | "asesoria" | "reunion" | "audiencia" | "nota" | "hito" | "cita" | "mandato" | "derivacion" | "resuelto" | "creada" | "tarea";
  titulo: string;
  detalle: string;
  estado?: "realizada" | "pendiente" | "no_asistio" | "cancelada" | "sin_respuesta";
};

const TITULO_EVENTO: Record<string, string> = {
  con_hito: "Se fijó la fecha de hito",
  mandatos: "Mandato firmado",
  derivaciones: "Derivado a un colega",
  casos_resueltos: "Caso resuelto",
};

export async function lineaTiempo(abogadoId: number, p: PersonaCrm, hoy = hoyLocal()): Promise<{ proximos: ItemLinea[]; historial: ItemLinea[] }> {
  const d = await getDb();
  const [inter, eventos, citas, tareas] = await Promise.all([
    d.execute({ sql: "SELECT * FROM crm_interacciones WHERE persona_id = ? AND abogado_id = ? ORDER BY fecha DESC, id DESC LIMIT 200", args: [p.id, abogadoId] }),
    d.execute({ sql: "SELECT * FROM crm_eventos WHERE persona_id = ? AND abogado_id = ? AND interaccion_id IS NULL AND tipo IN ('con_hito','mandatos','derivaciones','casos_resueltos') ORDER BY fecha DESC, id DESC", args: [p.id, abogadoId] }),
    citasDePersona(abogadoId, p.id),
    d.execute({ sql: "SELECT * FROM crm_tareas WHERE persona_id = ? AND abogado_id = ? AND hecha = 0 AND vence <> ''", args: [p.id, abogadoId] }),
  ]);
  const proximos: ItemLinea[] = [];
  const historial: ItemLinea[] = [];

  if (p.fechaHito) {
    const it: ItemLinea = { clave: "hito", fecha: p.fechaHito, tipo: "hito", titulo: "Hito programado", detalle: p.tipoHito, estado: "pendiente" };
    (p.fechaHito >= hoy ? proximos : historial).push(it);
  }
  if (p.proximoContacto && p.proximoContacto >= hoy) proximos.push({ clave: "pc", fecha: p.proximoContacto, tipo: "contacto", titulo: "Contactar", detalle: "", estado: "pendiente" });
  for (const t of tareas.rows) {
    proximos.push({ clave: `t${t.id}`, fecha: String(t.vence), tipo: "tarea", titulo: descifrarSeguro(String(t.texto_enc), "crm.tarea"), detalle: "Tarea", estado: "pendiente" });
  }
  for (const c of citas) {
    const it: ItemLinea = { clave: `c${c.id}`, fecha: c.fecha, hora: c.horaIni, tipo: "cita", titulo: c.titulo || "Cita", detalle: c.tipo, estado: c.estado };
    // Las realizadas ya aparecen como registro del historial; aquí solo las pendientes o no concretadas.
    if (c.estado === "pendiente" && c.fecha >= hoy) proximos.push(it);
    else if (c.estado !== "realizada") historial.push(it);
  }
  for (const f of inter.rows) {
    historial.push({
      clave: `i${f.id}`,
      fecha: String(f.fecha),
      tipo: String(f.tipo) as ItemLinea["tipo"],
      titulo: String(f.tipo),
      detalle: f.nota_enc ? descifrarSeguro(String(f.nota_enc), "crm.interaccion") : "",
      estado: "realizada",
    });
  }
  for (const f of eventos.rows) {
    const t = String(f.tipo);
    historial.push({
      clave: `e${f.id}`,
      fecha: String(f.fecha),
      tipo: t === "mandatos" ? "mandato" : t === "derivaciones" ? "derivacion" : t === "casos_resueltos" ? "resuelto" : "hito",
      titulo: TITULO_EVENTO[t] ?? t,
      detalle: "",
    });
  }
  historial.push({ clave: "creada", fecha: p.creadoEn.slice(0, 10), tipo: "creada", titulo: "Ficha creada", detalle: "" });

  proximos.sort((a, b) => (a.fecha + (a.hora ?? "")).localeCompare(b.fecha + (b.hora ?? "")));
  historial.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { proximos, historial };
}

export { esEtapa };
