import { getDb } from "./db";
import {
  listarPendientes,
  listarSeguimiento,
  obtenerInformePorSolicitud,
  obtenerPerfil,
  obtenerSolicitudAsesor,
  type ContenidoInforme,
  type Pendiente,
  type Perfil,
  type Solicitud,
} from "./datos";
import { listarDocumentos } from "./documentos-datos";
import { aPersona, listarInteracciones, type Interaccion, type PersonaCrm } from "./crm/servicio";
import { nombreInteraccion } from "./crm/catalogo";

/** Todo lo que se sabe de un caso, reunido de la solicitud, el informe, el CRM y el historial. */
export type Expediente = {
  solicitud: Solicitud;
  asesor: Perfil | null;
  informe: { contenido: ContenidoInforme; entregado: boolean; actualizadoEn: string } | null;
  pendientes: Pendiente[];
  documentosLeidos: string[];
  persona: PersonaCrm | null;
  actuaciones: Actuacion[];
};

export type Actuacion = { fecha: string; titulo: string; detalle: string; interna: boolean };

export type Hito = { texto: string; hecho: boolean };

const lleno = (t: string | undefined) => Boolean(t && t.trim().length > 0);

export async function reunirExpediente(solicitudId: number, asesorId: number): Promise<Expediente | null> {
  const solicitud = await obtenerSolicitudAsesor(solicitudId, asesorId);
  if (!solicitud) return null;
  const d = await getDb();
  const [asesor, informeFila, pendientes, eventos, documentos, filaPersona] = await Promise.all([
    obtenerPerfil(asesorId),
    obtenerInformePorSolicitud(solicitudId),
    listarPendientes(solicitudId),
    listarSeguimiento(solicitudId),
    listarDocumentos(solicitudId, asesorId),
    d.execute({ sql: "SELECT * FROM crm_personas WHERE solicitud_id = ? AND abogado_id = ? ORDER BY id LIMIT 1", args: [solicitudId, asesorId] }),
  ]);
  const persona = filaPersona.rows[0] ? aPersona(filaPersona.rows[0]) : null;
  const interacciones: Interaccion[] = persona ? await listarInteracciones(persona.id, asesorId, 200) : [];

  const actuaciones: Actuacion[] = [
    ...eventos.map((e) => ({
      fecha: e.creadoEn.slice(0, 10),
      titulo: e.tipo === "etapa" ? `Cambio de etapa: ${e.texto}` : "Nota del caso",
      detalle: e.tipo === "etapa" ? "" : e.texto,
      interna: e.tipo === "nota",
    })),
    ...interacciones.map((i) => ({
      fecha: i.fecha.slice(0, 10),
      titulo: `${nombreInteraccion(i.tipo)}${i.canal ? ` (${i.canal})` : ""}${i.conColega ? " con colega" : ""}`,
      detalle: i.nota,
      interna: true,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    solicitud,
    asesor,
    informe: informeFila ? { contenido: informeFila.contenido, entregado: informeFila.entregado, actualizadoEn: informeFila.actualizadoEn } : null,
    pendientes,
    documentosLeidos: documentos.filter((x) => x.pasado).map((x) => x.nombre),
    persona,
    actuaciones,
  };
}

/** Avance del expediente: cada dato nuevo que el asesor registra completa un hito y el PDF lo refleja. */
export function calcularAvance(e: Expediente): { porcentaje: number; hitos: Hito[]; etapa: string } {
  const c = e.informe?.contenido;
  const abiertos = e.pendientes.filter((p) => !p.hecho).length;
  const hitos: Hito[] = [
    { texto: "Solicitud recibida y registrada", hecho: true },
    { texto: "Caso tomado por un asesor", hecho: e.solicitud.estado !== "nueva" },
    { texto: "Primer contacto con la persona", hecho: e.actuaciones.some((a) => a.interna) || (e.persona ? e.persona.etapa !== "prospecto" : false) },
    { texto: "Antecedentes y documentos reunidos", hecho: e.documentosLeidos.length > 0 || (e.pendientes.length > 0 && abiertos === 0) },
    { texto: "Objeto de la consulta y hechos analizados", hecho: lleno(c?.objeto) && (lleno(c?.resumen) || lleno(c?.cronologia)) },
    { texto: "Fundamentos de derecho identificados", hecho: Boolean(c && (c.normas.some((n) => n.incluir) || c.derechos.length > 0)) },
    { texto: "Vías de acción y plazos definidos", hecho: lleno(c?.vias) && lleno(c?.plazos) },
    { texto: "Conclusiones redactadas", hecho: lleno(c?.conclusiones) },
    { texto: "Informe final entregado a la persona", hecho: Boolean(e.informe?.entregado) },
  ];
  const hechos = hitos.filter((h) => h.hecho).length;
  const etapa = e.informe?.entregado ? "Informe final" : hechos <= 2 ? "Recepción de antecedentes" : hechos <= 5 ? "En análisis" : "En redacción del informe";
  return { porcentaje: Math.round((hechos / hitos.length) * 100), hitos, etapa };
}
