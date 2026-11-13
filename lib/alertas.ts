import { getDb } from "./db";
import { descifrarSeguro } from "./crypto";
import { correos } from "./correo";
import { urlSitio } from "./sitio";
import { completitud } from "./solicitud-calidad";
import { MATERIAS, PRESUPUESTOS, REGIONES, URGENCIAS, nombreMateria, nombreUrgencia } from "./materias";

export type Alertas = {
  activas: boolean;
  materias: string[];
  presupuestos: string[];
  regiones: string[];
  urgencias: string[];
  minimo: number;
};

export const ALERTAS_BASE: Alertas = { activas: true, materias: [], presupuestos: [], regiones: [], urgencias: [], minimo: 0 };

function sanear(valor: unknown): Alertas {
  const objeto = valor && typeof valor === "object" ? valor as Record<string, unknown> : {};
  const lista = (dato: unknown, validos: readonly string[]) =>
    Array.isArray(dato) ? [...new Set(dato.map(String).filter((x) => validos.includes(x)))] : [];
  const minimo = Number(objeto.minimo);
  return {
    activas: objeto.activas !== false,
    materias: lista(objeto.materias, MATERIAS.map((m) => m.clave)),
    presupuestos: lista(objeto.presupuestos, PRESUPUESTOS),
    regiones: lista(objeto.regiones, REGIONES),
    urgencias: lista(objeto.urgencias, URGENCIAS.map((u) => u.clave)),
    minimo: Number.isFinite(minimo) ? Math.max(0, Math.min(100, Math.round(minimo / 5) * 5)) : 0,
  };
}

function parsear(t: unknown): Alertas {
  if (!t) return { ...ALERTAS_BASE };
  try {
    return sanear(JSON.parse(String(t)));
  } catch (error) {
    console.error("No se pudieron leer los avisos guardados del asesor.", error);
    return { ...ALERTAS_BASE };
  }
}

export async function leerAlertas(asesorId: number): Promise<Alertas> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT alertas FROM perfiles WHERE usuario_id = ?", args: [asesorId] });
  return parsear(r.rows[0]?.alertas);
}

export async function guardarAlertas(asesorId: number, alertas: Alertas): Promise<void> {
  const d = await getDb();
  await d.execute({ sql: "UPDATE perfiles SET alertas = ? WHERE usuario_id = ?", args: [JSON.stringify(sanear(alertas)), asesorId] });
}

export type CasoParaAviso = { materia: string; presupuesto: string; region: string; urgencia: string; relato: string };

export function coincide(alertas: Alertas, caso: CasoParaAviso): boolean {
  if (!alertas.activas) return false;
  if (alertas.materias.length && !alertas.materias.includes(caso.materia)) return false;
  if (alertas.urgencias.length && !alertas.urgencias.includes(caso.urgencia)) return false;
  if (alertas.presupuestos.length && caso.presupuesto && !alertas.presupuestos.includes(caso.presupuesto)) return false;
  if (alertas.regiones.length && caso.region && !alertas.regiones.includes(caso.region)) return false;
  return !alertas.minimo || completitud(caso).puntaje >= alertas.minimo;
}

export function hayFiltros(alertas: Alertas): boolean {
  return alertas.materias.length + alertas.presupuestos.length + alertas.regiones.length + alertas.urgencias.length > 0 ||
    alertas.minimo > 0 || !alertas.activas;
}

/** Avisa solo a los asesores que coinciden; el correo no expone relato ni datos personales. */
export async function avisarCasoAbierto(solicitudId: number, excluirAsesor?: number): Promise<number> {
  const d = await getDb();
  const sr = await d.execute({
    sql: "SELECT id, materia, presupuesto, region, urgencia, relato_enc FROM solicitudes WHERE id = ? AND asesor_id IS NULL AND estado = 'nueva'",
    args: [solicitudId],
  });
  const fila = sr.rows[0];
  if (!fila) return 0;
  const caso: CasoParaAviso = {
    materia: String(fila.materia),
    presupuesto: String(fila.presupuesto ?? ""),
    region: String(fila.region ?? ""),
    urgencia: String(fila.urgencia ?? "normal"),
    relato: descifrarSeguro(String(fila.relato_enc), "solicitud.relato"),
  };
  const calidad = completitud(caso);
  const asesores = await d.execute(
    "SELECT u.id, u.email, p.alertas FROM usuarios u LEFT JOIN perfiles p ON p.usuario_id = u.id WHERE u.rol = 'abogado' AND u.estado = 'activo'",
  );
  let enviados = 0;
  for (const asesor of asesores.rows) {
    if (excluirAsesor && Number(asesor.id) === excluirAsesor) continue;
    const alertas = parsear(asesor.alertas);
    if (!coincide(alertas, caso)) continue;
    const resumen = [
      `Tipo de caso: ${nombreMateria(caso.materia)}`,
      `Urgencia: ${nombreUrgencia(caso.urgencia)}`,
      `Presupuesto: ${caso.presupuesto || "no indicado"}`,
      `Región: ${caso.region || "no indicada"}`,
      `Información: ${calidad.puntaje} de 100`,
    ].join("\n");
    const enviado = await correos.casoAbierto(
      String(asesor.email),
      resumen,
      `${urlSitio()}/panel/bandeja/${solicitudId}`,
    );
    if (enviado) enviados++;
  }
  return enviados;
}
