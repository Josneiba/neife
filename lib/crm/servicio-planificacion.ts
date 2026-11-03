import { getDb } from "../db";
import { cifrar, descifrarSeguro } from "../crypto";
import { SEGMENTOS_PLAN, type SegmentoPlan } from "./catalogo";
import { diasEntre, etiquetaPeriodo, finPeriodo, hoyLocal, inicioPeriodo, sumarPeriodos, type Periodo } from "./fechas";
import { contarPeriodos, listarPersonas, metasVigentes, type Conteos, type PersonaCrm } from "./servicio";
import { citasPendientes } from "./servicio-citas";

/** Semana anterior, actual y siguiente de «Clientes nuevos» (real / meta), como «2/5  2/7  0/6» de la referencia. */
export async function semanasEncontrar(abogadoId: number, hoy = hoyLocal()) {
  const actual = inicioPeriodo("semana", hoy);
  const inicios = [sumarPeriodos("semana", actual, -1), actual, sumarPeriodos("semana", actual, 1)];
  const [real, ...metas] = await Promise.all([contarPeriodos(abogadoId, "semana", inicios), ...inicios.map((i) => metasVigentes(abogadoId, "semana", i))]);
  return inicios.map((inicio, i) => ({
    inicio,
    etiqueta: etiquetaPeriodo("semana", inicio),
    real: (real[inicio] as Conteos).consultas_nuevas,
    meta: metas[i].consultas_nuevas,
    actual: inicio === actual,
  }));
}

export function enSegmento(p: PersonaCrm, seg: SegmentoPlan, hoy: string): boolean {
  switch (seg) {
    case "nuevos_mandantes":
      return p.etapa === "mandato";
    case "con_hito":
      return !!p.fechaHito && ["en_asesoria", "con_hito", "mandato"].includes(p.etapa);
    case "asesoria_reciente":
      return !!p.ultimaAsesoria && diasEntre(p.ultimaAsesoria, hoy) <= 14 && ["en_asesoria", "con_hito", "mandato"].includes(p.etapa);
    case "en_asesoria":
      return p.etapa === "en_asesoria" && !p.fechaHito;
    case "interesados":
      return p.etapa === "prospecto" || p.etapa === "contactado";
    case "derivados":
      return p.etapa === "derivado";
    case "antiguos":
      return p.etapa === "cerrado" || p.etapa === "perdido";
    case "referentes":
      return p.satisfaccion >= 4;
  }
}

/** Ids de clientes que ya tienen algo planeado en la semana (plan, cita, contacto o hito). */
export async function conPlanEnSemana(abogadoId: number, inicio: string): Promise<Set<number>> {
  const fin = finPeriodo("semana", inicio);
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT persona_id AS id FROM crm_planes WHERE abogado_id = ? AND fecha BETWEEN ? AND ? AND persona_id IS NOT NULL
          UNION SELECT persona_id FROM crm_citas WHERE abogado_id = ? AND fecha BETWEEN ? AND ? AND estado <> 'cancelada' AND persona_id IS NOT NULL
          UNION SELECT id FROM crm_personas WHERE abogado_id = ? AND (proximo_contacto BETWEEN ? AND ? OR fecha_hito BETWEEN ? AND ?)`,
    args: [abogadoId, inicio, fin, abogadoId, inicio, fin, abogadoId, inicio, fin, inicio, fin],
  });
  return new Set(r.rows.map((f) => Number(f.id)));
}

export async function segmentos(abogadoId: number, inicio: string, hoy = hoyLocal()) {
  const [todas, plan] = await Promise.all([listarPersonas(abogadoId, { limite: 1000 }, hoy), conPlanEnSemana(abogadoId, inicio)]);
  return SEGMENTOS_PLAN.map((s) => {
    const miembros = todas.filter((p) => enSegmento(p, s.clave, hoy));
    return { ...s, total: miembros.length, conPlan: miembros.filter((p) => plan.has(p.id)).length };
  });
}

export async function personasDeSegmento(abogadoId: number, seg: SegmentoPlan, inicio: string, hoy = hoyLocal()) {
  const [todas, plan] = await Promise.all([listarPersonas(abogadoId, { limite: 1000 }, hoy), conPlanEnSemana(abogadoId, inicio)]);
  return todas.filter((p) => enSegmento(p, seg, hoy)).map((p) => ({ p, conPlan: plan.has(p.id) }));
}

export async function asesoriasAgendadas(abogadoId: number, inicio: string, periodo: Periodo = "semana") {
  const c = await citasPendientes(abogadoId, inicio, finPeriodo(periodo, inicio));
  return c.filter((x) => x.tipo === "asesoria").length;
}

/* ============================ Notas de zona ============================ */

export type NotaZona = { id: number; region: string; comuna: string; texto: string; creadoEn: string };

export async function listarNotasZona(abogadoId: number): Promise<NotaZona[]> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM crm_zona_notas WHERE abogado_id = ? ORDER BY comuna, id DESC", args: [abogadoId] });
  return r.rows.map((f) => ({ id: Number(f.id), region: String(f.region), comuna: String(f.comuna), texto: descifrarSeguro(String(f.texto_enc), "crm.zona"), creadoEn: String(f.creado_en) }));
}

export async function crearNotaZona(abogadoId: number, n: { region: string; comuna: string; texto: string }): Promise<void> {
  const d = await getDb();
  await d.execute({
    sql: "INSERT INTO crm_zona_notas (abogado_id, region, comuna, texto_enc) VALUES (?, ?, ?, ?)",
    args: [abogadoId, n.region, n.comuna.trim(), cifrar(n.texto.trim(), "crm.zona")],
  });
}

export async function eliminarNotaZona(abogadoId: number, id: number): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_zona_notas WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}
