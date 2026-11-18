import { listarBandeja, listarCasos } from "./datos";
import { listarCitas, type Cita } from "./crm/servicio-citas";
import { plazoDe, type Plazo } from "./plazos";

const ABIERTOS = ["nueva", "aceptada", "informe", "entregada", "derivada"];

export type PlazoCaso = { id: number; codigo: string; nombre: string; plazo: Plazo };

export type DatosHoy = {
  citas: Cita[];
  bandeja: number;
  bandejaViejas: number;
  porResponder: number;
  vencidos: number;
  plazos: PlazoCaso[];
};

/** Lo que el asesor debe mirar hoy: citas, solicitudes sin tomar, contactos vencidos y plazos por vencer. */
export async function datosHoy(asesorId: number, hoy: string): Promise<DatosHoy> {
  const [citas, bandeja, casos] = await Promise.all([listarCitas(asesorId, hoy, hoy), listarBandeja(asesorId), listarCasos(asesorId)]);
  const abiertos = casos.filter((c) => ABIERTOS.includes(c.solicitud.estado));
  const plazos = abiertos
    .map((c) => ({ id: c.solicitud.id, codigo: c.solicitud.codigoSeguimiento, nombre: c.solicitud.nombre, plazo: plazoDe(c.solicitud.materia, c.solicitud.fechaHecho, hoy) }))
    .filter((x): x is PlazoCaso => x.plazo !== null && x.plazo.tono !== "ok")
    .sort((a, b) => a.plazo.restantes - b.plazo.restantes)
    .slice(0, 3);
  return {
    citas: citas.filter((c) => c.estado !== "cancelada"),
    bandeja: bandeja.length,
    bandejaViejas: bandeja.filter((b) => b.sinTomar24h).length,
    porResponder: casos.filter((c) => c.solicitud.estado === "nueva").length,
    vencidos: abiertos.filter((c) => !!c.solicitud.proximoContacto && c.solicitud.proximoContacto <= hoy).length,
    plazos,
  };
}
