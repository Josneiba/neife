import { getDb } from "../db";
import { nombreMateria } from "../materias";
import { nombreOrigenCrm } from "./catalogo";
import { finPeriodo, hoyLocal } from "./fechas";
import { contarPeriodos, metasVigentes, type Conteos } from "./servicio";
import { listarDerivaciones, montoAcordado } from "./servicio-seguimiento";

export type ResumenMensual = {
  inicio: string;
  fin: string;
  real: Conteos;
  meta: Conteos;
  porOrigen: { nombre: string; n: number }[];
  porMateria: { nombre: string; n: number }[];
  derivaciones: { n: number; aceptadas: number; comisionAcordada: number; comisionCobrada: number };
  satisfaccion: { promedio: number | null; n: number };
};

/** Datos del informe del mes: lo logrado frente a la meta y de dónde llegaron los clientes. */
export async function resumenMensual(abogadoId: number, inicio: string): Promise<ResumenMensual> {
  const fin = finPeriodo("mes", inicio);
  const d = await getDb();
  const [real, meta, origen, materia, derivs, sat] = await Promise.all([
    contarPeriodos(abogadoId, "mes", [inicio]),
    metasVigentes(abogadoId, "mes", inicio),
    d.execute({ sql: "SELECT origen, COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? AND substr(creado_en, 1, 10) BETWEEN ? AND ? GROUP BY origen ORDER BY n DESC", args: [abogadoId, inicio, fin] }),
    d.execute({ sql: "SELECT materia, COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? AND substr(creado_en, 1, 10) BETWEEN ? AND ? GROUP BY materia ORDER BY n DESC", args: [abogadoId, inicio, fin] }),
    listarDerivaciones(abogadoId),
    d.execute({ sql: "SELECT AVG(satisfaccion)::float AS prom, COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? AND satisfaccion > 0 AND actualizado_en >= ? AND substr(actualizado_en, 1, 10) <= ?", args: [abogadoId, inicio, fin] }),
  ]);
  const delMes = derivs.filter((v) => v.fecha >= inicio && v.fecha <= fin);
  return {
    inicio,
    fin,
    real: real[inicio],
    meta,
    porOrigen: origen.rows.map((f) => ({ nombre: nombreOrigenCrm(String(f.origen)), n: Number(f.n) })),
    porMateria: materia.rows.map((f) => ({ nombre: nombreMateria(String(f.materia)), n: Number(f.n) })),
    derivaciones: {
      n: delMes.length,
      aceptadas: delMes.filter((v) => v.resultado === "aceptado" || v.resultado === "resuelto").length,
      comisionAcordada: delMes.reduce((a, v) => a + montoAcordado(v), 0),
      comisionCobrada: delMes.filter((v) => v.comisionEstado === "cobrada").reduce((a, v) => a + v.comisionCobrada, 0),
    },
    satisfaccion: { promedio: sat.rows[0]?.prom == null ? null : Math.round(Number(sat.rows[0].prom) * 10) / 10, n: Number(sat.rows[0]?.n ?? 0) },
  };
}

export const hoy = hoyLocal;

export type FilaOrigen = { origen: string; total: number; avanzaron: number; cerrados: number };

export async function embudoPorOrigen(abogadoId: number): Promise<{ filas: FilaOrigen[]; tomados30: number }> {
  const d = await getDb();
  const [clientes, tomados] = await Promise.all([
    d.execute({
      sql: `SELECT origen, COUNT(*)::int AS total,
                   SUM(CASE WHEN etapa IN ('mandato','derivado','cerrado') THEN 1 ELSE 0 END)::int AS avanzaron,
                   SUM(CASE WHEN etapa = 'cerrado' THEN 1 ELSE 0 END)::int AS cerrados
              FROM crm_personas WHERE abogado_id = ? AND creado_en >= ahora(-90)
             GROUP BY origen ORDER BY total DESC`,
      args: [abogadoId],
    }),
    d.execute({
      sql: "SELECT COUNT(*)::int AS n FROM solicitudes WHERE asesor_id = ? AND tomada_en <> '' AND tomada_en >= ahora(-30)",
      args: [abogadoId],
    }),
  ]);
  return {
    filas: clientes.rows.map((fila) => ({
      origen: nombreOrigenCrm(String(fila.origen)),
      total: Number(fila.total),
      avanzaron: Number(fila.avanzaron),
      cerrados: Number(fila.cerrados),
    })),
    tomados30: Number(tomados.rows[0]?.n ?? 0),
  };
}
