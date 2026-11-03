import { getDb, auditar, type Fila } from "../db";
import { cifrar, codigoCaso, descifrarSeguro } from "../crypto";
import {
  CLAVES_ETAPA,
  ETAPAS_ABIERTAS,
  EVENTO_POR_ETAPA,
  FUENTES_PLAN,
  GRUPOS_BASE,
  HOME_MENSUAL,
  HOME_SEMANAL,
  METRICAS,
  esEtapa,
  metaBase,
  metricaDe,
  type EtapaCrm,
  type FuentePlan,
  type MetricaClave,
  type TipoInteraccion,
} from "./catalogo";
import {
  diasEntre,
  esFecha,
  finPeriodo,
  hoyLocal,
  inicioPeriodo,
  sumarDias,
  sumarPeriodos,
  type Periodo,
} from "./fechas";

/**
 * Lógica del CRM: personas, interacciones, metas, tareas, grupos y plan semanal.
 *
 * Reglas que se cumplen aquí (y no en las páginas):
 *  - Todo filtra por abogado_id: un abogado jamás ve ni toca datos de otro.
 *  - Nombre, teléfono, correo y notas se guardan cifrados (mismo cifrado que «solicitudes»).
 *  - Los indicadores se calculan contando crm_eventos; cada acción escribe sus eventos
 *    en la misma transacción que el cambio, así los números nunca quedan desfasados.
 */

/* =============================== Tipos =============================== */

export type PersonaCrm = {
  id: number;
  codigoSeguimiento: string;
  abogadoId: number;
  solicitudId: number | null;
  nombre: string;
  telefono: string;
  email: string;
  nota: string;
  tipo: "natural" | "empresa";
  materia: string;
  region: string;
  comuna: string;
  origen: string;
  etapa: EtapaCrm;
  prioritario: boolean;
  fechaHito: string;
  tipoHito: string;
  proximoContacto: string;
  ultimaAsesoria: string;
  abogadoDestino: string;
  valorEstimado: number;
  direccion: string;
  lat: number | null;
  lng: number | null;
  disponibilidad: string;
  referidoPor: string;
  informeVisible: boolean;
  satisfaccion: number;
  satisfaccionNota: string;
  creadoEn: string;
  actualizadoEn: string;
};

/** «{"lat":-33.4,"lng":-70.6}» → coordenadas, o null si falta o está mal. */
export function leerUbicacion(cifrado: string): { lat: number; lng: number } | null {
  if (!cifrado) return null;
  try {
    const j = JSON.parse(descifrarSeguro(cifrado, "crm.ubicacion"));
    const lat = Number(j.lat);
    const lng = Number(j.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  } catch {
    /* ubicación ilegible: se trata como «sin ubicación» */
  }
  return null;
}

export function aPersona(f: Fila): PersonaCrm {
  const ubi = leerUbicacion(String(f.ubicacion_enc ?? ""));
  const dec = (col: string, ctx: string) => (f[col] ? descifrarSeguro(String(f[col]), ctx) : "");
  const tel = String(f.telefono_enc ?? "");
  const mail = String(f.email_enc ?? "");
  const nota = String(f.nota_enc ?? "");
  const dest = String(f.abogado_destino_enc ?? "");
  return {
    id: Number(f.id),
    codigoSeguimiento: String(f.codigo_seguimiento),
    abogadoId: Number(f.abogado_id),
    solicitudId: f.solicitud_id == null ? null : Number(f.solicitud_id),
    nombre: descifrarSeguro(String(f.nombre_enc), "crm.nombre"),
    telefono: tel ? descifrarSeguro(tel, "crm.telefono") : "",
    email: mail ? descifrarSeguro(mail, "crm.email") : "",
    nota: nota ? descifrarSeguro(nota, "crm.nota") : "",
    tipo: f.tipo === "empresa" ? "empresa" : "natural",
    materia: String(f.materia),
    region: String(f.region),
    comuna: String(f.comuna),
    origen: String(f.origen),
    etapa: esEtapa(f.etapa) ? f.etapa : "prospecto",
    prioritario: Number(f.prioritario) === 1,
    fechaHito: String(f.fecha_hito),
    tipoHito: String(f.tipo_hito),
    proximoContacto: String(f.proximo_contacto),
    ultimaAsesoria: String(f.ultima_asesoria),
    abogadoDestino: dest ? descifrarSeguro(dest, "crm.destino") : "",
    valorEstimado: Number(f.valor_estimado),
    direccion: dec("direccion_enc", "crm.direccion"),
    lat: ubi?.lat ?? null,
    lng: ubi?.lng ?? null,
    disponibilidad: dec("disponibilidad_enc", "crm.disponibilidad"),
    referidoPor: dec("referido_por_enc", "crm.referido"),
    informeVisible: Number(f.informe_visible ?? 1) === 1,
    satisfaccion: Number(f.satisfaccion ?? 0),
    satisfaccionNota: dec("satisfaccion_nota_enc", "crm.satisfaccion"),
    creadoEn: String(f.creado_en),
    actualizadoEn: String(f.actualizado_en),
  };
}

export class ErrorCrm extends Error {}

const NO_ENCONTRADO = "No encontramos a esa persona. Puede que ya no exista.";

/* =============================== Personas =============================== */

export type NuevaPersona = {
  nombre: string;
  codigoSeguimiento?: string;
  telefono?: string;
  email?: string;
  nota?: string;
  tipo?: "natural" | "empresa";
  materia?: string;
  region?: string;
  comuna?: string;
  origen?: string;
  etapa?: EtapaCrm;
  proximoContacto?: string;
  solicitudId?: number | null;
  direccion?: string;
  lat?: number | null;
  lng?: number | null;
  referidoPor?: string;
};

/** Cifra la ubicación redondeada a ~1 m (5 decimales). Sin coordenadas válidas devuelve "". */
export function cifrarUbicacion(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return "";
  return cifrar(JSON.stringify({ lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }), "crm.ubicacion");
}

/** Crea la persona y anota el evento «cliente nuevo» en la misma sentencia (atómico). */
export async function crearPersona(abogadoId: number, p: NuevaPersona, hoy = hoyLocal()): Promise<number> {
  const d = await getDb();
  const r = await d.execute({
    sql: `WITH nuevo AS (
            INSERT INTO crm_personas
              (abogado_id, solicitud_id, codigo_seguimiento, nombre_enc, telefono_enc, email_enc, nota_enc, tipo, materia, region, comuna, origen, etapa, proximo_contacto,
               direccion_enc, ubicacion_enc, referido_por_enc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id)
          INSERT INTO crm_eventos (abogado_id, persona_id, tipo, fecha)
          SELECT ?::int, id, 'consultas_nuevas', ?::text FROM nuevo
          RETURNING persona_id AS id`,
    args: [
      abogadoId,
      p.solicitudId ?? null,
      p.codigoSeguimiento ?? codigoCaso("CRM"),
      cifrar(p.nombre, "crm.nombre"),
      p.telefono ? cifrar(p.telefono, "crm.telefono") : "",
      p.email ? cifrar(p.email, "crm.email") : "",
      p.nota ? cifrar(p.nota, "crm.nota") : "",
      p.tipo ?? "natural",
      p.materia ?? "otra",
      p.region ?? "",
      p.comuna ?? "",
      p.origen ?? "otro",
      p.etapa ?? "prospecto",
      p.proximoContacto && esFecha(p.proximoContacto) ? p.proximoContacto : "",
      p.direccion ? cifrar(p.direccion, "crm.direccion") : "",
      cifrarUbicacion(p.lat, p.lng),
      p.referidoPor ? cifrar(p.referidoPor, "crm.referido") : "",
      abogadoId,
      hoy,
    ],
  });
  const id = Number(r.rows[0]?.id);
  await auditar(abogadoId, "crm_persona_creada", "crm_persona", id);
  return id;
}

export async function obtenerPersona(id: number, abogadoId: number): Promise<PersonaCrm | null> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM crm_personas WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
  return r.rows[0] ? aPersona(r.rows[0]) : null;
}

export type CambiosPersona = Partial<
  Pick<PersonaCrm, "nombre" | "telefono" | "email" | "nota" | "tipo" | "materia" | "region" | "comuna" | "origen" | "prioritario" | "valorEstimado" | "abogadoDestino" | "direccion" | "disponibilidad" | "referidoPor" | "informeVisible">
> & { ubicacion?: { lat: number; lng: number } | null };

export async function actualizarPersona(abogadoId: number, id: number, c: CambiosPersona): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];
  const poner = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    args.push(v);
  };
  if (c.nombre !== undefined) poner("nombre_enc", cifrar(c.nombre, "crm.nombre"));
  if (c.telefono !== undefined) poner("telefono_enc", c.telefono ? cifrar(c.telefono, "crm.telefono") : "");
  if (c.email !== undefined) poner("email_enc", c.email ? cifrar(c.email, "crm.email") : "");
  if (c.nota !== undefined) poner("nota_enc", c.nota ? cifrar(c.nota, "crm.nota") : "");
  if (c.abogadoDestino !== undefined) poner("abogado_destino_enc", c.abogadoDestino ? cifrar(c.abogadoDestino, "crm.destino") : "");
  if (c.direccion !== undefined) poner("direccion_enc", c.direccion ? cifrar(c.direccion, "crm.direccion") : "");
  if (c.disponibilidad !== undefined) poner("disponibilidad_enc", c.disponibilidad ? cifrar(c.disponibilidad, "crm.disponibilidad") : "");
  if (c.referidoPor !== undefined) poner("referido_por_enc", c.referidoPor ? cifrar(c.referidoPor, "crm.referido") : "");
  if (c.informeVisible !== undefined) poner("informe_visible", c.informeVisible ? 1 : 0);
  if (c.ubicacion !== undefined) poner("ubicacion_enc", c.ubicacion ? cifrarUbicacion(c.ubicacion.lat, c.ubicacion.lng) : "");
  if (c.tipo !== undefined) poner("tipo", c.tipo);
  if (c.materia !== undefined) poner("materia", c.materia);
  if (c.region !== undefined) poner("region", c.region);
  if (c.comuna !== undefined) poner("comuna", c.comuna);
  if (c.origen !== undefined) poner("origen", c.origen);
  if (c.prioritario !== undefined) poner("prioritario", c.prioritario ? 1 : 0);
  if (c.valorEstimado !== undefined) poner("valor_estimado", Math.max(0, Math.round(c.valorEstimado)));
  if (sets.length === 0) return;
  const d = await getDb();
  const r = await d.execute({
    sql: `UPDATE crm_personas SET ${sets.join(", ")}, actualizado_en = ahora() WHERE id = ? AND abogado_id = ?`,
    args: [...args, id, abogadoId],
  });
  if (r.rowsAffected === 0) throw new ErrorCrm(NO_ENCONTRADO);
}

export async function eliminarPersona(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  const r = await d.execute({ sql: "DELETE FROM crm_personas WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
  if (r.rowsAffected > 0) await auditar(abogadoId, "crm_persona_eliminada", "crm_persona", id);
}

/** Anota un evento una sola vez por persona (los hitos del embudo no se cuentan dos veces). */
export function eventoUnico(abogadoId: number, personaId: number, tipo: MetricaClave, fecha: string, detalle = "") {
  return {
    sql: `INSERT INTO crm_eventos (abogado_id, persona_id, tipo, fecha, detalle)
          SELECT ?::int, ?::int, ?::text, ?::text, ?::text
          WHERE NOT EXISTS (SELECT 1 FROM crm_eventos WHERE persona_id = ?::int AND tipo = ?::text)`,
    args: [abogadoId, personaId, tipo, fecha, detalle, personaId, tipo],
  };
}

export async function cambiarEtapa(abogadoId: number, id: number, etapa: EtapaCrm, hoy = hoyLocal()): Promise<void> {
  if (!esEtapa(etapa)) throw new ErrorCrm("Etapa no válida.");
  const p = await obtenerPersona(id, abogadoId);
  if (!p) throw new ErrorCrm(NO_ENCONTRADO);
  if (p.etapa === etapa) return;
  const d = await getDb();
  const lote: Parameters<typeof d.batch>[0] = [
    { sql: "UPDATE crm_personas SET etapa = ?, actualizado_en = ahora() WHERE id = ? AND abogado_id = ?", args: [etapa, id, abogadoId] },
  ];
  const ev = EVENTO_POR_ETAPA[etapa];
  if (ev) lote.push(eventoUnico(abogadoId, id, ev, hoy, `etapa:${etapa}`));
  await d.batch(lote);
  await auditar(abogadoId, `crm_etapa_${etapa}`, "crm_persona", id);
}

/** Fija (o quita, con "") la fecha de hito. Al fijarla, el cliente pasa a «Con fecha de hito». */
export async function fijarHito(abogadoId: number, id: number, fecha: string, tipo: string, hoy = hoyLocal()): Promise<void> {
  if (fecha !== "" && !esFecha(fecha)) throw new ErrorCrm("La fecha no es válida.");
  const p = await obtenerPersona(id, abogadoId);
  if (!p) throw new ErrorCrm(NO_ENCONTRADO);
  const d = await getDb();
  const lote: Parameters<typeof d.batch>[0] = [];
  const avanza = fecha !== "" && (["prospecto", "contactado", "en_asesoria"] as EtapaCrm[]).includes(p.etapa);
  lote.push({
    sql: `UPDATE crm_personas SET fecha_hito = ?, tipo_hito = ?, ${avanza ? "etapa = 'con_hito'," : ""} actualizado_en = ahora() WHERE id = ? AND abogado_id = ?`,
    args: [fecha, fecha ? tipo : "", id, abogadoId],
  });
  if (fecha) lote.push(eventoUnico(abogadoId, id, "con_hito", hoy, `hito:${fecha}`));
  await d.batch(lote);
}

export async function programarContacto(abogadoId: number, id: number, fecha: string): Promise<void> {
  if (fecha !== "" && !esFecha(fecha)) throw new ErrorCrm("La fecha no es válida.");
  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE crm_personas SET proximo_contacto = ?, actualizado_en = ahora() WHERE id = ? AND abogado_id = ?",
    args: [fecha, id, abogadoId],
  });
  if (r.rowsAffected === 0) throw new ErrorCrm(NO_ENCONTRADO);
}

export type FiltroClave = "referidos" | "sin_contacto" | "hito_proximo" | "nuevos_mandantes" | "urgentes" | "vencidos" | "por_contactar" | "postventa" | "sin_seguimiento" | "mandatos_por_firmar";

export type FiltroPersonas = {
  q?: string;
  etapa?: EtapaCrm;
  grupoId?: number;
  filtro?: FiltroClave;
  region?: string;
  limite?: number;
};

const ABIERTAS_SQL = ETAPAS_ABIERTAS.map((e) => `'${e}'`).join(",");

/** Condición SQL de cada filtro rápido (una sola definición: la usan la lista y los contadores). */
export function condicionFiltro(filtro: FiltroClave, hoy: string, alias = "p"): { sql: string; args: unknown[] } {
  const a = alias;
  switch (filtro) {
    case "referidos":
      return { sql: `${a}.origen = 'referido' AND ${a}.etapa IN ('prospecto','contactado')`, args: [] };
    case "sin_contacto":
      return { sql: `${a}.etapa IN (${ABIERTAS_SQL}) AND ${a}.actualizado_en <= ahora(-7)`, args: [] };
    case "hito_proximo":
      return { sql: `${a}.fecha_hito <> '' AND ${a}.fecha_hito BETWEEN ? AND ?`, args: [hoy, sumarDias(hoy, 14)] };
    case "nuevos_mandantes":
      return { sql: `${a}.etapa = 'mandato'`, args: [] };
    case "mandatos_por_firmar":
      return { sql: `${a}.etapa = 'con_hito'`, args: [] };
    case "urgentes":
      return { sql: `(${a}.prioritario = 1 OR (${a}.proximo_contacto <> '' AND ${a}.proximo_contacto <= ?)) AND ${a}.etapa IN (${ABIERTAS_SQL})`, args: [hoy] };
    case "vencidos":
      return { sql: `${a}.proximo_contacto <> '' AND ${a}.proximo_contacto <= ? AND ${a}.etapa IN (${ABIERTAS_SQL})`, args: [hoy] };
    case "sin_seguimiento":
      return {
        sql: `${a}.etapa IN (${ABIERTAS_SQL}) AND ((${a}.proximo_contacto <> '' AND ${a}.proximo_contacto <= ?) OR ${a}.actualizado_en <= ahora(-7))`,
        args: [hoy],
      };
    case "por_contactar":
      return { sql: `${a}.etapa = 'prospecto'`, args: [] };
    case "postventa":
      return { sql: `${a}.etapa IN ('mandato','cerrado') AND ${a}.actualizado_en <= ahora(-30)`, args: [] };
  }
}

export async function listarPersonas(abogadoId: number, f: FiltroPersonas = {}, hoy = hoyLocal()): Promise<PersonaCrm[]> {
  const where = ["p.abogado_id = ?"];
  const args: unknown[] = [abogadoId];
  if (f.etapa) {
    where.push("p.etapa = ?");
    args.push(f.etapa);
  }
  if (f.region) {
    where.push("p.region = ?");
    args.push(f.region);
  }
  if (f.grupoId) {
    where.push("EXISTS (SELECT 1 FROM crm_grupo_personas gp WHERE gp.persona_id = p.id AND gp.grupo_id = ?)");
    args.push(f.grupoId);
  }
  if (f.filtro) {
    const c = condicionFiltro(f.filtro, hoy);
    where.push(c.sql);
    args.push(...c.args);
  }
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT p.* FROM crm_personas p WHERE ${where.join(" AND ")}
          ORDER BY (p.fecha_hito <> '') DESC, p.fecha_hito ASC, p.actualizado_en DESC LIMIT ?`,
    args: [...args, f.limite ?? 1000],
  });
  let lista = r.rows.map(aPersona);
  // El nombre está cifrado: la búsqueda por texto se hace aquí, ya descifrado.
  if (f.q?.trim()) {
    const q = sinTildes(f.q.trim());
    const qCodigo = q.replace(/[^a-z0-9]/g, "");
    lista = lista.filter((p) => sinTildes(`${p.nombre} ${p.email} ${p.telefono} ${p.comuna}`).includes(q) || p.codigoSeguimiento.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(qCodigo));
  }
  return lista;
}

export function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Clientes «con avance»: en asesoría o con hito, los de fecha más cercana primero. */
export async function personasConAvance(abogadoId: number, limite = 8): Promise<PersonaCrm[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT * FROM crm_personas WHERE abogado_id = ? AND etapa IN ('en_asesoria','con_hito')
          ORDER BY (fecha_hito <> '') DESC, fecha_hito ASC, ultima_asesoria DESC, actualizado_en DESC LIMIT ?`,
    args: [abogadoId, limite],
  });
  return r.rows.map(aPersona);
}

/* ========================= Interacciones y notas ========================= */

export type Interaccion = {
  id: number;
  personaId: number;
  tipo: TipoInteraccion;
  canal: string;
  fecha: string;
  conColega: boolean;
  nota: string;
  creadoEn: string;
};

export type NuevaInteraccion = {
  personaId: number;
  tipo: TipoInteraccion;
  canal?: string;
  fecha?: string;
  conColega?: boolean;
  nota?: string;
};

/** Anota una interacción y los eventos que cuentan para los indicadores. Todo en una transacción. */
export async function registrarInteraccion(abogadoId: number, i: NuevaInteraccion, hoy = hoyLocal()): Promise<number> {
  const p = await obtenerPersona(i.personaId, abogadoId);
  if (!p) throw new ErrorCrm(NO_ENCONTRADO);
  const fecha = i.fecha && esFecha(i.fecha) ? i.fecha : hoy;
  if (fecha > sumarDias(hoy, 1)) throw new ErrorCrm("Esa fecha todavía no llega. Para lo que viene, usa «Próximo contacto» o la fecha de hito.");
  const conColega = i.tipo === "asesoria" && !!i.conColega;

  const tipos: MetricaClave[] = [];
  if (i.tipo === "asesoria") {
    tipos.push("asesorias");
    if (conColega) tipos.push("asesorias_con_colega");
  }
  if (i.tipo === "reunion" || i.tipo === "audiencia") tipos.push("reuniones");

  const d = await getDb();
  const lote: Parameters<typeof d.batch>[0] = [
    {
      sql: `WITH nueva AS (
              INSERT INTO crm_interacciones (abogado_id, persona_id, tipo, canal, fecha, con_colega, nota_enc)
              VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id)
            INSERT INTO crm_eventos (abogado_id, persona_id, interaccion_id, tipo, fecha)
            SELECT ?::int, ?::int, nueva.id, t, ?::text FROM nueva, unnest(?::text[]) AS t`,
      args: [
        abogadoId,
        i.personaId,
        i.tipo,
        i.canal ?? "",
        fecha,
        conColega ? 1 : 0,
        i.nota ? cifrar(i.nota, "crm.interaccion") : "",
        abogadoId,
        i.personaId,
        fecha,
        tipos,
      ],
    },
  ];

  // Efectos sobre la ficha: etapa, última asesoría.
  const sets: string[] = ["actualizado_en = ahora()"];
  const argsP: unknown[] = [];
  if (i.tipo === "asesoria") {
    sets.push("ultima_asesoria = CASE WHEN ultima_asesoria < ? THEN ? ELSE ultima_asesoria END");
    argsP.push(fecha, fecha);
    if (p.etapa === "prospecto" || p.etapa === "contactado") sets.push("etapa = 'en_asesoria'");
  } else if (i.tipo === "contacto" && p.etapa === "prospecto") {
    sets.push("etapa = 'contactado'");
  }
  lote.push({ sql: `UPDATE crm_personas SET ${sets.join(", ")} WHERE id = ? AND abogado_id = ?`, args: [...argsP, i.personaId, abogadoId] });

  const res = await d.batch(lote);
  void res;
  const ult = await d.execute({
    sql: "SELECT id FROM crm_interacciones WHERE persona_id = ? AND abogado_id = ? ORDER BY id DESC LIMIT 1",
    args: [i.personaId, abogadoId],
  });
  return Number(ult.rows[0]?.id);
}

export async function listarInteracciones(personaId: number, abogadoId: number, limite = 60): Promise<Interaccion[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT * FROM crm_interacciones WHERE persona_id = ? AND abogado_id = ? ORDER BY fecha DESC, id DESC LIMIT ?`,
    args: [personaId, abogadoId, limite],
  });
  return r.rows.map(aInteraccion);
}

function aInteraccion(f: Fila): Interaccion {
  const nota = String(f.nota_enc ?? "");
  return {
    id: Number(f.id),
    personaId: Number(f.persona_id),
    tipo: String(f.tipo) as TipoInteraccion,
    canal: String(f.canal),
    fecha: String(f.fecha),
    conColega: Number(f.con_colega) === 1,
    nota: nota ? descifrarSeguro(nota, "crm.interaccion") : "",
    creadoEn: String(f.creado_en),
  };
}

/** Borra una interacción; sus eventos se borran solos y los indicadores se corrigen. */
export async function eliminarInteraccion(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_interacciones WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

export type NotaRapida = Interaccion & { persona: string };

export async function listarNotas(abogadoId: number, limite = 100): Promise<NotaRapida[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT i.*, p.nombre_enc FROM crm_interacciones i JOIN crm_personas p ON p.id = i.persona_id
          WHERE i.abogado_id = ? AND i.tipo = 'nota' ORDER BY i.fecha DESC, i.id DESC LIMIT ?`,
    args: [abogadoId, limite],
  });
  return r.rows.map((f) => ({ ...aInteraccion(f), persona: descifrarSeguro(String(f.nombre_enc), "crm.nombre") }));
}

/* =============================== Metas =============================== */

/** Metas vigentes de todos los indicadores para un período: la más reciente con inicio <= período. */
export async function metasVigentes(abogadoId: number, periodo: Periodo, inicio: string): Promise<Record<MetricaClave, number>> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT DISTINCT ON (metrica) metrica, objetivo FROM crm_metas
          WHERE abogado_id = ? AND periodo = ? AND inicio <= ? ORDER BY metrica, inicio DESC`,
    args: [abogadoId, periodo, inicio],
  });
  const guardadas = new Map(r.rows.map((f) => [String(f.metrica), Number(f.objetivo)]));
  const salida = {} as Record<MetricaClave, number>;
  for (const m of METRICAS) salida[m.clave] = guardadas.get(m.clave) ?? metaBase(m.clave, periodo);
  return salida;
}

/** Fija la meta desde el inicio del período indicado (rige ese período y los siguientes hasta que la cambies). */
export async function fijarMeta(abogadoId: number, metrica: MetricaClave, periodo: Periodo, inicio: string, objetivo: number): Promise<void> {
  const def = metricaDe(metrica);
  if (!def.periodos.includes(periodo)) throw new ErrorCrm("Ese indicador no tiene meta para ese período.");
  if (!Number.isInteger(objetivo) || objetivo < 0 || objetivo > 10_000) throw new ErrorCrm("La meta debe ser un número entero entre 0 y 10.000.");
  const ini = inicioPeriodo(periodo, inicio);
  const d = await getDb();
  await d.execute({
    sql: `INSERT INTO crm_metas (abogado_id, metrica, periodo, inicio, objetivo) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (abogado_id, metrica, periodo, inicio) DO UPDATE SET objetivo = EXCLUDED.objetivo`,
    args: [abogadoId, metrica, periodo, ini, objetivo],
  });
}

/* ============================== Medición ============================== */

export type Conteos = Record<MetricaClave, number>;

function conteoVacio(): Conteos {
  const c = {} as Conteos;
  for (const m of METRICAS) c[m.clave] = 0;
  return c;
}

/**
 * Cuenta todos los indicadores para varios períodos con UNA consulta.
 * «personas» cuenta clientes distintos; «eventos» cuenta cada vez que ocurrió.
 */
export async function contarPeriodos(abogadoId: number, periodo: Periodo, inicios: string[]): Promise<Record<string, Conteos>> {
  const salida: Record<string, Conteos> = {};
  for (const i of inicios) salida[i] = conteoVacio();
  if (inicios.length === 0) return salida;
  const desde = inicios.reduce((a, b) => (a < b ? a : b));
  const hasta = finPeriodo(periodo, inicios.reduce((a, b) => (a > b ? a : b)));
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT fecha, tipo, persona_id FROM crm_eventos WHERE abogado_id = ? AND fecha BETWEEN ? AND ?",
    args: [abogadoId, desde, hasta],
  });
  const vistos = new Map<string, Set<number>>();
  for (const f of r.rows) {
    const ini = inicioPeriodo(periodo, String(f.fecha));
    const c = salida[ini];
    if (!c) continue;
    const tipo = String(f.tipo) as MetricaClave;
    const def = METRICAS.find((m) => m.clave === tipo);
    if (!def) continue;
    if (def.modo === "eventos") c[tipo] += 1;
    else {
      const clave = `${ini}|${tipo}`;
      const set = vistos.get(clave) ?? new Set<number>();
      const pid = Number(f.persona_id);
      if (!set.has(pid)) {
        set.add(pid);
        vistos.set(clave, set);
        c[tipo] += 1;
      }
    }
  }
  return salida;
}

export type PuntoHistorial = { inicio: string; real: number; meta: number };

/** Últimos n períodos (el actual al final) con lo logrado y la meta de cada uno. */
export async function historial(abogadoId: number, metrica: MetricaClave, periodo: Periodo, inicioActual: string, n = 6): Promise<PuntoHistorial[]> {
  const inicios = Array.from({ length: n }, (_, k) => sumarPeriodos(periodo, inicioActual, k - (n - 1)));
  const [conteos, metas] = await Promise.all([contarPeriodos(abogadoId, periodo, inicios), metasPorInicio(abogadoId, metrica, periodo, inicios)]);
  return inicios.map((inicio, k) => ({ inicio, real: conteos[inicio][metrica], meta: metas[k] }));
}

async function metasPorInicio(abogadoId: number, metrica: MetricaClave, periodo: Periodo, inicios: string[]): Promise<number[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT inicio, objetivo FROM crm_metas WHERE abogado_id = ? AND metrica = ? AND periodo = ? ORDER BY inicio",
    args: [abogadoId, metrica, periodo],
  });
  const filas = r.rows.map((f) => ({ inicio: String(f.inicio), objetivo: Number(f.objetivo) }));
  return inicios.map((ini) => {
    let v = metaBase(metrica, periodo);
    for (const f of filas) if (f.inicio <= ini) v = f.objetivo;
    return v;
  });
}

export type FilaDetalle = { fecha: string; personaId: number | null; persona: string };

/** «Real: 3 ▾»: quién y cuándo aportó a este indicador en el período. */
export async function detalleMetrica(abogadoId: number, metrica: MetricaClave, desde: string, hasta: string): Promise<FilaDetalle[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT e.fecha, e.persona_id, p.nombre_enc FROM crm_eventos e LEFT JOIN crm_personas p ON p.id = e.persona_id
          WHERE e.abogado_id = ? AND e.tipo = ? AND e.fecha BETWEEN ? AND ? ORDER BY e.fecha DESC, e.id DESC LIMIT 300`,
    args: [abogadoId, metrica, desde, hasta],
  });
  const modo = metricaDe(metrica).modo;
  const vistos = new Set<number>();
  const salida: FilaDetalle[] = [];
  for (const f of r.rows) {
    const pid = f.persona_id == null ? null : Number(f.persona_id);
    if (modo === "personas" && pid != null) {
      if (vistos.has(pid)) continue;
      vistos.add(pid);
    }
    salida.push({ fecha: String(f.fecha), personaId: pid, persona: f.nombre_enc ? descifrarSeguro(String(f.nombre_enc), "crm.nombre") : "Cliente eliminado" });
  }
  return salida;
}

export type GrupoPotencial = { titulo: string; personas: PersonaCrm[] };

type Regla = { titulo: string; donde: string; args?: unknown[] };

/** «Potencial»: a quién puedes mover para lograr la meta, según el indicador. */
export async function potencial(abogadoId: number, metrica: MetricaClave, periodo: Periodo, inicio: string, hoy = hoyLocal()): Promise<GrupoPotencial[]> {
  const fin = finPeriodo(periodo, inicio);
  const hace7 = sumarDias(hoy, -7);
  const hace14 = sumarDias(hoy, -14);
  const hace30 = sumarDias(hoy, -30);
  const reglas: Regla[] = (() => {
    switch (metrica) {
      case "consultas_nuevas":
        return [
          { titulo: "Prospectos por contactar", donde: "p.etapa = 'prospecto'" },
          { titulo: "Contactados que aún no reciben asesoría", donde: "p.etapa = 'contactado'" },
        ];
      case "asesorias":
      case "asesorias_con_colega":
        return [
          {
            titulo: "Asesoría planificada en este período",
            donde: "EXISTS (SELECT 1 FROM crm_planes pl WHERE pl.persona_id = p.id AND pl.fuente = 'asesorias' AND pl.fecha BETWEEN ? AND ?)",
            args: [inicio, fin],
          },
          { titulo: "En asesoría, sin sesión hace 7 días o más", donde: "p.etapa = 'en_asesoria' AND p.ultima_asesoria <= ?", args: [hace7] },
        ];
      case "reuniones":
        return [
          { titulo: "Con hito en este período", donde: "p.fecha_hito BETWEEN ? AND ?", args: [inicio, fin] },
          {
            titulo: "Asistieron a una reunión en los últimos 30 días",
            donde: "EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'reuniones' AND e.fecha >= ?)",
            args: [hace30],
          },
        ];
      case "con_hito":
        return [
          { titulo: "Ya tienen fecha de hito", donde: "p.fecha_hito >= ?", args: [hoy] },
          {
            titulo: "En asesoría y listos para fijar fecha",
            donde: "p.etapa = 'en_asesoria' AND (SELECT COUNT(*) FROM crm_interacciones i WHERE i.persona_id = p.id AND i.tipo = 'asesoria') >= 2",
          },
        ];
      case "mandatos":
        return [
          { titulo: "Con fecha de hito (listos para firmar)", donde: "p.etapa = 'con_hito'" },
          { titulo: "En asesoría activa", donde: "p.etapa = 'en_asesoria' AND p.ultima_asesoria >= ?", args: [hace14] },
        ];
      case "derivaciones":
        return [{ titulo: "En asesoría (posibles derivaciones)", donde: "p.etapa = 'en_asesoria'" }];
      case "casos_resueltos":
        return [
          { titulo: "Con mandato firmado (por cerrar)", donde: "p.etapa = 'mandato'" },
          { titulo: "Derivados con seguimiento pendiente", donde: "p.etapa = 'derivado'" },
        ];
    }
  })();
  const d = await getDb();
  const salida: GrupoPotencial[] = [];
  for (const r of reglas) {
    const res = await d.execute({
      sql: `SELECT p.* FROM crm_personas p WHERE p.abogado_id = ? AND ${r.donde}
            ORDER BY p.fecha_hito DESC, p.actualizado_en DESC LIMIT 15`,
      args: [abogadoId, ...(r.args ?? [])],
    });
    salida.push({ titulo: r.titulo, personas: res.rows.map(aPersona) });
  }
  return salida;
}

/* ========================== Portada (Inicio) ========================== */

export type ResumenInicio = {
  hoy: string;
  semana: { inicio: string; fin: string; real: Conteos; meta: Conteos };
  mes: { inicio: string; fin: string; real: Conteos; meta: Conteos };
  dia: { real: number; meta: number };
  avanzan: PersonaCrm[];
  abiertos: {
    citas: number;
    referidos: number;
    mandatosPendientes: number;
    vencidos: number;
    porContactar: number;
    postventa: number;
    tareas: number;
    notas: number;
  };
};

export async function resumenInicio(abogadoId: number, hoy = hoyLocal()): Promise<ResumenInicio> {
  const iniSemana = inicioPeriodo("semana", hoy);
  const iniMes = inicioPeriodo("mes", hoy);
  const d = await getDb();
  const [cSemana, cMes, cDia, mSemana, mMes, mDia, avanzan, ab, tar, notas] = await Promise.all([
    contarPeriodos(abogadoId, "semana", [iniSemana]),
    contarPeriodos(abogadoId, "mes", [iniMes]),
    contarPeriodos(abogadoId, "dia", [hoy]),
    metasVigentes(abogadoId, "semana", iniSemana),
    metasVigentes(abogadoId, "mes", iniMes),
    metasVigentes(abogadoId, "dia", hoy),
    personasConAvance(abogadoId, 6),
    d.execute({
      sql: `SELECT
              COUNT(*) FILTER (WHERE fecha_hito <> '' AND fecha_hito BETWEEN ? AND ?)::int AS citas,
              COUNT(*) FILTER (WHERE origen = 'referido' AND etapa IN ('prospecto','contactado'))::int AS referidos,
              COUNT(*) FILTER (WHERE etapa = 'con_hito')::int AS mandatos_pendientes,
              COUNT(*) FILTER (WHERE proximo_contacto <> '' AND proximo_contacto <= ? AND etapa IN (${ABIERTAS_SQL}))::int AS vencidos,
              COUNT(*) FILTER (WHERE etapa = 'prospecto')::int AS por_contactar,
              COUNT(*) FILTER (WHERE etapa IN ('mandato','cerrado') AND actualizado_en <= ahora(-30))::int AS postventa
            FROM crm_personas WHERE abogado_id = ?`,
      args: [hoy, sumarDias(hoy, 14), hoy, abogadoId],
    }),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_tareas WHERE abogado_id = ? AND hecha = 0", args: [abogadoId] }),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_interacciones WHERE abogado_id = ? AND tipo = 'nota'", args: [abogadoId] }),
  ]);
  const f = ab.rows[0] ?? {};
  return {
    hoy,
    semana: { inicio: iniSemana, fin: finPeriodo("semana", iniSemana), real: cSemana[iniSemana], meta: mSemana },
    mes: { inicio: iniMes, fin: finPeriodo("mes", iniMes), real: cMes[iniMes], meta: mMes },
    dia: { real: cDia[hoy].consultas_nuevas, meta: mDia.consultas_nuevas },
    avanzan,
    abiertos: {
      citas: Number(f.citas ?? 0),
      referidos: Number(f.referidos ?? 0),
      mandatosPendientes: Number(f.mandatos_pendientes ?? 0),
      vencidos: Number(f.vencidos ?? 0),
      porContactar: Number(f.por_contactar ?? 0),
      postventa: Number(f.postventa ?? 0),
      tareas: Number(tar.rows[0]?.n ?? 0),
      notas: Number(notas.rows[0]?.n ?? 0),
    },
  };
}

export { HOME_MENSUAL, HOME_SEMANAL };

/* =============================== Tareas =============================== */

export type Tarea = { id: number; personaId: number | null; persona: string; texto: string; vence: string; hecha: boolean };

export async function crearTarea(abogadoId: number, t: { texto: string; personaId?: number | null; vence?: string }): Promise<number> {
  if (t.vence && !esFecha(t.vence)) throw new ErrorCrm("La fecha de la tarea no es válida.");
  if (t.personaId && !(await obtenerPersona(t.personaId, abogadoId))) throw new ErrorCrm(NO_ENCONTRADO);
  const d = await getDb();
  const r = await d.execute({
    sql: "INSERT INTO crm_tareas (abogado_id, persona_id, texto_enc, vence) VALUES (?, ?, ?, ?) RETURNING id",
    args: [abogadoId, t.personaId ?? null, cifrar(t.texto, "crm.tarea"), t.vence ?? ""],
  });
  return Number(r.lastInsertRowid);
}

export async function listarTareas(abogadoId: number, opts: { incluirHechas?: boolean; desde?: string; hasta?: string } = {}): Promise<Tarea[]> {
  const where = ["t.abogado_id = ?"];
  const args: unknown[] = [abogadoId];
  if (!opts.incluirHechas) where.push("t.hecha = 0");
  if (opts.desde && opts.hasta) {
    where.push("t.vence BETWEEN ? AND ?");
    args.push(opts.desde, opts.hasta);
  }
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT t.*, p.nombre_enc FROM crm_tareas t LEFT JOIN crm_personas p ON p.id = t.persona_id
          WHERE ${where.join(" AND ")} ORDER BY t.hecha, (t.vence = ''), t.vence, t.id DESC LIMIT 300`,
    args,
  });
  return r.rows.map((f) => ({
    id: Number(f.id),
    personaId: f.persona_id == null ? null : Number(f.persona_id),
    persona: f.nombre_enc ? descifrarSeguro(String(f.nombre_enc), "crm.nombre") : "",
    texto: descifrarSeguro(String(f.texto_enc), "crm.tarea"),
    vence: String(f.vence),
    hecha: Number(f.hecha) === 1,
  }));
}

export async function alternarTarea(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "UPDATE crm_tareas SET hecha = 1 - hecha WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

export async function eliminarTarea(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_tareas WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/* =============================== Grupos =============================== */

export type GrupoCrm = { id: number; nombre: string; orden: number; personas: number };

/** Crea los grupos base la primera vez que el abogado entra al CRM. */
export async function asegurarGrupos(abogadoId: number): Promise<void> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT 1 FROM crm_grupos WHERE abogado_id = ? LIMIT 1", args: [abogadoId] });
  if (r.rows.length > 0) return;
  await d.batch(
    GRUPOS_BASE.map((nombre, i) => ({
      sql: "INSERT INTO crm_grupos (abogado_id, nombre, orden) VALUES (?, ?, ?) ON CONFLICT (abogado_id, nombre) DO NOTHING",
      args: [abogadoId, nombre, i],
    })),
  );
}

export async function listarGrupos(abogadoId: number): Promise<GrupoCrm[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT g.id, g.nombre, g.orden, COUNT(gp.persona_id)::int AS personas
          FROM crm_grupos g LEFT JOIN crm_grupo_personas gp ON gp.grupo_id = g.id
          WHERE g.abogado_id = ? GROUP BY g.id ORDER BY g.orden, g.id`,
    args: [abogadoId],
  });
  return r.rows.map((f) => ({ id: Number(f.id), nombre: String(f.nombre), orden: Number(f.orden), personas: Number(f.personas) }));
}

export async function crearGrupo(abogadoId: number, nombre: string): Promise<void> {
  const d = await getDb();
  const r = await d.execute({
    sql: `INSERT INTO crm_grupos (abogado_id, nombre, orden)
          VALUES (?, ?, COALESCE((SELECT MAX(orden) + 1 FROM crm_grupos WHERE abogado_id = ?), 0))
          ON CONFLICT (abogado_id, nombre) DO NOTHING`,
    args: [abogadoId, nombre, abogadoId],
  });
  if (r.rowsAffected === 0) throw new ErrorCrm("Ya tienes un grupo con ese nombre.");
}

export async function eliminarGrupo(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_grupos WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/** Mueve un grupo una posición hacia arriba o abajo (reemplaza el arrastrar y soltar en pantallas táctiles). */
export async function moverGrupo(abogadoId: number, id: number, dir: "arriba" | "abajo"): Promise<void> {
  const grupos = await listarGrupos(abogadoId);
  const i = grupos.findIndex((g) => g.id === id);
  const j = dir === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= grupos.length) return;
  const orden = grupos.map((g) => g.id);
  [orden[i], orden[j]] = [orden[j], orden[i]];
  const d = await getDb();
  await d.batch(orden.map((gid, k) => ({ sql: "UPDATE crm_grupos SET orden = ? WHERE id = ? AND abogado_id = ?", args: [k, gid, abogadoId] })));
}

export async function alternarGrupoPersona(abogadoId: number, grupoId: number, personaId: number): Promise<void> {
  const d = await getDb();
  const ok = await d.execute({
    sql: `SELECT (SELECT 1 FROM crm_grupos WHERE id = ? AND abogado_id = ?) AS g, (SELECT 1 FROM crm_personas WHERE id = ? AND abogado_id = ?) AS p`,
    args: [grupoId, abogadoId, personaId, abogadoId],
  });
  if (!ok.rows[0]?.g || !ok.rows[0]?.p) throw new ErrorCrm(NO_ENCONTRADO);
  const del = await d.execute({ sql: "DELETE FROM crm_grupo_personas WHERE grupo_id = ? AND persona_id = ?", args: [grupoId, personaId] });
  if (del.rowsAffected === 0) await d.execute({ sql: "INSERT INTO crm_grupo_personas (grupo_id, persona_id) VALUES (?, ?)", args: [grupoId, personaId] });
}

export async function gruposDePersona(abogadoId: number, personaId: number): Promise<number[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT gp.grupo_id FROM crm_grupo_personas gp JOIN crm_grupos g ON g.id = gp.grupo_id WHERE gp.persona_id = ? AND g.abogado_id = ?`,
    args: [personaId, abogadoId],
  });
  return r.rows.map((f) => Number(f.grupo_id));
}

/* ============================ Plan semanal ============================ */

export type Plan = { id: number; personaId: number | null; persona: string; fuente: FuentePlan; fecha: string; texto: string; hecho: boolean };

export async function crearPlan(abogadoId: number, p: { fuente: FuentePlan; fecha: string; texto?: string; personaId?: number | null }): Promise<void> {
  if (!esFecha(p.fecha)) throw new ErrorCrm("La fecha no es válida.");
  if (!FUENTES_PLAN.some((f) => f.clave === p.fuente)) throw new ErrorCrm("Elige de dónde vendrá.");
  if (p.personaId && !(await obtenerPersona(p.personaId, abogadoId))) throw new ErrorCrm(NO_ENCONTRADO);
  if (!p.personaId && !p.texto?.trim()) throw new ErrorCrm("Escribe el plan o elige a una persona.");
  const d = await getDb();
  await d.execute({
    sql: "INSERT INTO crm_planes (abogado_id, persona_id, fuente, fecha, texto_enc) VALUES (?, ?, ?, ?, ?)",
    args: [abogadoId, p.personaId ?? null, p.fuente, p.fecha, p.texto ? cifrar(p.texto, "crm.plan") : ""],
  });
}

export async function listarPlanes(abogadoId: number, desde: string, hasta: string): Promise<Plan[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT pl.*, p.nombre_enc FROM crm_planes pl LEFT JOIN crm_personas p ON p.id = pl.persona_id
          WHERE pl.abogado_id = ? AND pl.fecha BETWEEN ? AND ? ORDER BY pl.fecha, pl.hecho, pl.id`,
    args: [abogadoId, desde, hasta],
  });
  return r.rows.map((f) => ({
    id: Number(f.id),
    personaId: f.persona_id == null ? null : Number(f.persona_id),
    persona: f.nombre_enc ? descifrarSeguro(String(f.nombre_enc), "crm.nombre") : "",
    fuente: String(f.fuente) as FuentePlan,
    fecha: String(f.fecha),
    texto: f.texto_enc ? descifrarSeguro(String(f.texto_enc), "crm.plan") : "",
    hecho: Number(f.hecho) === 1,
  }));
}

export async function alternarPlan(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "UPDATE crm_planes SET hecho = 1 - hecho WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

export async function eliminarPlan(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_planes WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/** Cuántos planes hay por fuente en un rango (para «Planes para encontrar»). */
export async function contarPlanes(abogadoId: number, desde: string, hasta: string): Promise<Record<FuentePlan, number>> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT fuente, COUNT(*)::int AS n FROM crm_planes WHERE abogado_id = ? AND fecha BETWEEN ? AND ? AND hecho = 0 GROUP BY fuente",
    args: [abogadoId, desde, hasta],
  });
  const salida = { asesorias: 0, antiguos: 0, red: 0, actividades: 0, interesados: 0 } as Record<FuentePlan, number>;
  for (const f of r.rows) salida[String(f.fuente) as FuentePlan] = Number(f.n);
  return salida;
}

/* ============================ Agenda y zonas ============================ */

export type ItemAgenda = {
  fecha: string;
  tipo: "hito" | "contacto" | "tarea" | "plan";
  titulo: string;
  detalle: string;
  personaId: number | null;
  hecho?: boolean;
};

export async function agenda(abogadoId: number, desde: string, hasta: string): Promise<ItemAgenda[]> {
  const d = await getDb();
  const [hitos, contactos, tareas, planes] = await Promise.all([
    d.execute({
      sql: "SELECT * FROM crm_personas WHERE abogado_id = ? AND fecha_hito BETWEEN ? AND ? AND etapa IN ('con_hito','mandato','en_asesoria')",
      args: [abogadoId, desde, hasta],
    }),
    d.execute({
      sql: `SELECT * FROM crm_personas WHERE abogado_id = ? AND proximo_contacto BETWEEN ? AND ? AND etapa IN (${ABIERTAS_SQL})`,
      args: [abogadoId, desde, hasta],
    }),
    listarTareas(abogadoId, { desde, hasta }),
    listarPlanes(abogadoId, desde, hasta),
  ]);
  const items: ItemAgenda[] = [];
  for (const f of hitos.rows) {
    const p = aPersona(f);
    items.push({ fecha: p.fechaHito, tipo: "hito", titulo: p.nombre, detalle: p.tipoHito || "hito", personaId: p.id });
  }
  for (const f of contactos.rows) {
    const p = aPersona(f);
    items.push({ fecha: p.proximoContacto, tipo: "contacto", titulo: p.nombre, detalle: "Contactar", personaId: p.id });
  }
  for (const t of tareas) items.push({ fecha: t.vence, tipo: "tarea", titulo: t.texto, detalle: t.persona, personaId: t.personaId, hecho: t.hecha });
  for (const pl of planes) {
    const f = FUENTES_PLAN.find((x) => x.clave === pl.fuente)?.nombre ?? "";
    items.push({ fecha: pl.fecha, tipo: "plan", titulo: pl.persona || pl.texto, detalle: f, personaId: pl.personaId, hecho: pl.hecho });
  }
  return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type FilaZona = { region: string; comuna: string; total: number; abiertos: number; porEtapa: Partial<Record<EtapaCrm, number>> };

export async function zonas(abogadoId: number): Promise<FilaZona[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT region, comuna, etapa, COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? GROUP BY region, comuna, etapa`,
    args: [abogadoId],
  });
  const mapa = new Map<string, FilaZona>();
  for (const f of r.rows) {
    const region = String(f.region);
    const comuna = String(f.comuna);
    const clave = `${region}|${comuna}`;
    const z = mapa.get(clave) ?? { region, comuna, total: 0, abiertos: 0, porEtapa: {} };
    const etapa = String(f.etapa) as EtapaCrm;
    const n = Number(f.n);
    z.total += n;
    if (ETAPAS_ABIERTAS.includes(etapa)) z.abiertos += n;
    z.porEtapa[etapa] = n;
    mapa.set(clave, z);
  }
  return [...mapa.values()].sort((a, b) => b.abiertos - a.abiertos || b.total - a.total);
}

/* ================================ Informes ================================ */

export type Embudo = { total: number; asesoria: number; hito: number; mandato: number; derivado: number; resuelto: number };

/** Embudo de los clientes que entraron desde `desde`: cuántos llegaron a cada paso. */
export async function embudo(abogadoId: number, desde: string): Promise<Embudo> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'asesorias'))::int AS asesoria,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'con_hito'))::int AS hito,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'mandatos'))::int AS mandato,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'derivaciones'))::int AS derivado,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM crm_eventos e WHERE e.persona_id = p.id AND e.tipo = 'casos_resueltos'))::int AS resuelto
          FROM crm_personas p WHERE p.abogado_id = ? AND p.creado_en >= ?`,
    args: [abogadoId, desde],
  });
  const f = r.rows[0] ?? {};
  return {
    total: Number(f.total ?? 0),
    asesoria: Number(f.asesoria ?? 0),
    hito: Number(f.hito ?? 0),
    mandato: Number(f.mandato ?? 0),
    derivado: Number(f.derivado ?? 0),
    resuelto: Number(f.resuelto ?? 0),
  };
}

export async function conteoPorEtapa(abogadoId: number): Promise<Record<EtapaCrm, number>> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT etapa, COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? GROUP BY etapa", args: [abogadoId] });
  const salida = {} as Record<EtapaCrm, number>;
  for (const e of CLAVES_ETAPA) salida[e] = 0;
  for (const f of r.rows) salida[String(f.etapa) as EtapaCrm] = Number(f.n);
  return salida;
}

/* ====================== Importar desde «solicitudes» ====================== */

const ETAPA_DE_SOLICITUD: Record<string, EtapaCrm> = {
  nueva: "prospecto",
  aceptada: "en_asesoria",
  informe: "en_asesoria",
  entregada: "en_asesoria",
  derivada: "derivado",
  cerrada: "cerrado",
  rechazada: "perdido",
};

/** Cuántos casos de «solicitudes» aún no están en el CRM. */
export async function solicitudesPorImportar(abogadoId: number): Promise<number> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT COUNT(*)::int AS n FROM solicitudes s WHERE s.asesor_id = ? AND s.anonimizada_en = ''
          AND NOT EXISTS (SELECT 1 FROM crm_personas p WHERE p.solicitud_id = s.id)`,
    args: [abogadoId],
  });
  return Number(r.rows[0]?.n ?? 0);
}

/**
 * Trae al CRM los casos que el abogado ya tiene en «solicitudes» (una vez por caso).
 * Los datos se descifran con su contexto original y se vuelven a cifrar con el del CRM.
 */
export async function importarSolicitudes(abogadoId: number, solicitudId?: number): Promise<number> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT s.* FROM solicitudes s
          WHERE s.asesor_id = ? AND s.anonimizada_en = ''
            AND (?::int IS NULL OR s.id = ?::int)
            AND NOT EXISTS (SELECT 1 FROM crm_personas p WHERE p.solicitud_id = s.id)
          ORDER BY s.id`,
    args: [abogadoId, solicitudId ?? null, solicitudId ?? null],
  });
  let n = 0;
  for (const s of r.rows) {
    const nombre = descifrarSeguro(String(s.nombre_enc), "solicitud.nombre");
    if (nombre.startsWith("[no se pudo")) continue;
    const etapa = ETAPA_DE_SOLICITUD[String(s.estado)] ?? "prospecto";
    const creada = String(s.creado_en).slice(0, 10);
    const actual = String(s.actualizado_en).slice(0, 10);
    const email = s.email_enc ? descifrarSeguro(String(s.email_enc), "solicitud.email") : "";
    const tel = s.telefono_enc ? descifrarSeguro(String(s.telefono_enc), "solicitud.telefono") : "";
    const id = await crearPersona(
      abogadoId,
      {
        nombre,
        email,
        telefono: tel,
        materia: String(s.materia),
        region: String(s.region),
        origen: ["web", "referido", "whatsapp", "llamada"].includes(String(s.origen)) ? String(s.origen) : "otro",
        etapa,
        proximoContacto: String(s.proximo_contacto ?? ""),
        solicitudId: Number(s.id),
        codigoSeguimiento: String(s.codigo_seguimiento),
      },
      creada,
    );
    // Conserva la antigüedad real del caso para que el historial de indicadores tenga sentido.
    await d.execute({ sql: "UPDATE crm_personas SET creado_en = ?, actualizado_en = ? WHERE id = ?", args: [String(s.creado_en), String(s.actualizado_en), id] });
    const ev = etapa === "derivado" && Number(s.abogado_confirmado) === 1 ? "derivaciones" : EVENTO_POR_ETAPA[etapa];
    if (ev) await d.batch([eventoUnico(abogadoId, id, ev, actual, "importado")]);
    n++;
  }
  if (n > 0) await auditar(abogadoId, "crm_importar_solicitudes", "crm_persona", null);
  return n;
}

export { diasEntre };
