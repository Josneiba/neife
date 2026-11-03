import { getDb, type Fila } from "../db";
import { cifrar, descifrarSeguro } from "../crypto";
import { CITAS_QUE_REGISTRAN, esEstadoCita, esTipoCita, type EstadoCita, type TipoCita, type TipoInteraccion } from "./catalogo";
import { ahoraLocal, esFecha, esHora, hoyLocal, horaAMin, minAHora } from "./fechas";
import { ErrorCrm, eliminarInteraccion, obtenerPersona, registrarInteraccion } from "./servicio";

/**
 * Citas: lo que ocurre un día a una hora (asesorías, reuniones, audiencias, contactos, eventos).
 * Al darla por «realizada», una cita de asesoría/reunión/audiencia/contacto queda en el historial
 * del cliente y suma a los indicadores, igual que si la hubieras registrado a mano.
 */

export type Cita = {
  id: number;
  personaId: number | null;
  persona: string;
  tipo: TipoCita;
  titulo: string;
  nota: string;
  canal: string;
  fecha: string;
  horaIni: string;
  horaFin: string;
  estado: EstadoCita;
  interaccionId: number | null;
};

function aCita(f: Fila): Cita {
  const t = String(f.titulo_enc ?? "");
  const n = String(f.nota_enc ?? "");
  const nombre = f.nombre_enc ? descifrarSeguro(String(f.nombre_enc), "crm.nombre") : "";
  return {
    id: Number(f.id),
    personaId: f.persona_id == null ? null : Number(f.persona_id),
    persona: nombre,
    tipo: esTipoCita(f.tipo) ? f.tipo : "evento",
    titulo: t ? descifrarSeguro(t, "crm.cita") : "",
    nota: n ? descifrarSeguro(n, "crm.cita") : "",
    canal: String(f.canal ?? ""),
    fecha: String(f.fecha),
    horaIni: String(f.hora_ini),
    horaFin: String(f.hora_fin),
    estado: esEstadoCita(f.estado) ? f.estado : "pendiente",
    interaccionId: f.interaccion_id == null ? null : Number(f.interaccion_id),
  };
}

export type NuevaCita = {
  tipo: TipoCita;
  fecha: string;
  horaIni: string;
  horaFin?: string;
  personaId?: number | null;
  titulo?: string;
  nota?: string;
  canal?: string;
};

function validar(c: NuevaCita): { horaFin: string } {
  if (!esTipoCita(c.tipo)) throw new ErrorCrm("Elige el tipo de cita.");
  if (!esFecha(c.fecha)) throw new ErrorCrm("Elige el día.");
  if (!esHora(c.horaIni)) throw new ErrorCrm("Elige la hora de inicio.");
  const fin = c.horaFin && esHora(c.horaFin) ? c.horaFin : minAHora(Math.min(horaAMin(c.horaIni) + 60, 24 * 60 - 1));
  if (horaAMin(fin) <= horaAMin(c.horaIni)) throw new ErrorCrm("La hora de término debe ser después de la de inicio.");
  if (c.tipo === "evento" && !c.titulo?.trim() && !c.personaId) throw new ErrorCrm("Ponle un título al evento.");
  if (c.tipo !== "evento" && !c.personaId && !c.titulo?.trim()) throw new ErrorCrm("Elige al cliente o escribe un título.");
  return { horaFin: fin };
}

/** Crea la cita. Devuelve su id y cuántas otras citas se cruzan con esa hora (para avisar, no para impedir). */
export async function crearCita(abogadoId: number, c: NuevaCita): Promise<{ id: number; cruces: number }> {
  const { horaFin } = validar(c);
  if (c.personaId) {
    const p = await obtenerPersona(c.personaId, abogadoId);
    if (!p) throw new ErrorCrm("No encontramos a esa persona.");
  }
  const d = await getDb();
  const cruces = await d.execute({
    sql: `SELECT COUNT(*)::int AS n FROM crm_citas WHERE abogado_id = ? AND fecha = ? AND estado <> 'cancelada' AND hora_ini < ? AND hora_fin > ?`,
    args: [abogadoId, c.fecha, horaFin, c.horaIni],
  });
  const r = await d.execute({
    sql: `INSERT INTO crm_citas (abogado_id, persona_id, tipo, titulo_enc, nota_enc, canal, fecha, hora_ini, hora_fin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [
      abogadoId,
      c.personaId ?? null,
      c.tipo,
      c.titulo?.trim() ? cifrar(c.titulo.trim(), "crm.cita") : "",
      c.nota?.trim() ? cifrar(c.nota.trim(), "crm.cita") : "",
      c.canal ?? "",
      c.fecha,
      c.horaIni,
      horaFin,
    ],
  });
  return { id: Number(r.rows[0].id), cruces: Number(cruces.rows[0]?.n ?? 0) };
}

export async function obtenerCita(abogadoId: number, id: number): Promise<Cita | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT c.*, p.nombre_enc FROM crm_citas c LEFT JOIN crm_personas p ON p.id = c.persona_id WHERE c.id = ? AND c.abogado_id = ?`,
    args: [id, abogadoId],
  });
  return r.rows[0] ? aCita(r.rows[0]) : null;
}

export async function listarCitas(abogadoId: number, desde: string, hasta: string): Promise<Cita[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT c.*, p.nombre_enc FROM crm_citas c LEFT JOIN crm_personas p ON p.id = c.persona_id
          WHERE c.abogado_id = ? AND c.fecha BETWEEN ? AND ? ORDER BY c.fecha, c.hora_ini, c.id`,
    args: [abogadoId, desde, hasta],
  });
  return r.rows.map(aCita);
}

export async function citasDePersona(abogadoId: number, personaId: number): Promise<Cita[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT c.*, p.nombre_enc FROM crm_citas c LEFT JOIN crm_personas p ON p.id = c.persona_id
          WHERE c.abogado_id = ? AND c.persona_id = ? ORDER BY c.fecha DESC, c.hora_ini DESC, c.id DESC`,
    args: [abogadoId, personaId],
  });
  return r.rows.map(aCita);
}

export async function actualizarCita(abogadoId: number, id: number, c: NuevaCita): Promise<void> {
  const previa = await obtenerCita(abogadoId, id);
  if (!previa) throw new ErrorCrm("No encontramos esa cita.");
  if (previa.estado === "realizada") throw new ErrorCrm("Esa cita ya se dio por realizada. Vuelve a marcarla como pendiente para editarla.");
  const { horaFin } = validar(c);
  const d = await getDb();
  await d.execute({
    sql: `UPDATE crm_citas SET persona_id = ?, tipo = ?, titulo_enc = ?, nota_enc = ?, canal = ?, fecha = ?, hora_ini = ?, hora_fin = ?
          WHERE id = ? AND abogado_id = ?`,
    args: [
      c.personaId ?? null,
      c.tipo,
      c.titulo?.trim() ? cifrar(c.titulo.trim(), "crm.cita") : "",
      c.nota?.trim() ? cifrar(c.nota.trim(), "crm.cita") : "",
      c.canal ?? "",
      c.fecha,
      c.horaIni,
      horaFin,
      id,
      abogadoId,
    ],
  });
}

/** Cambia el estado. «Realizada» crea el registro en el historial; salir de «realizada» lo borra. */
export async function cambiarEstadoCita(abogadoId: number, id: number, estado: EstadoCita, hoy = hoyLocal()): Promise<void> {
  if (!esEstadoCita(estado)) throw new ErrorCrm("Estado no válido.");
  const c = await obtenerCita(abogadoId, id);
  if (!c) throw new ErrorCrm("No encontramos esa cita.");
  if (c.estado === estado) return;
  const d = await getDb();
  let interaccionId: number | null = c.interaccionId;

  if (estado === "realizada") {
    if (c.fecha > ahoraLocal().fecha) {
      throw new ErrorCrm("Esa cita todavía no llega. Márcala como realizada cuando ocurra.");
    }
    if (c.personaId && CITAS_QUE_REGISTRAN.includes(c.tipo)) {
      interaccionId = await registrarInteraccion(
        abogadoId,
        { personaId: c.personaId, tipo: c.tipo as TipoInteraccion, canal: c.canal, fecha: c.fecha, nota: c.nota || c.titulo },
        hoy,
      );
    }
  } else if (c.estado === "realizada" && c.interaccionId) {
    await eliminarInteraccion(abogadoId, c.interaccionId);
    interaccionId = null;
  }
  await d.execute({ sql: "UPDATE crm_citas SET estado = ?, interaccion_id = ? WHERE id = ? AND abogado_id = ?", args: [estado, interaccionId, id, abogadoId] });
}

export async function eliminarCita(abogadoId: number, id: number): Promise<void> {
  const c = await obtenerCita(abogadoId, id);
  if (!c) return;
  if (c.estado === "realizada" && c.interaccionId) await eliminarInteraccion(abogadoId, c.interaccionId);
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM crm_citas WHERE id = ? AND abogado_id = ?", args: [id, abogadoId] });
}

/** Citas pendientes desde ahora, para avisos y portada. */
export async function citasPendientes(abogadoId: number, desde: string, hasta: string): Promise<Cita[]> {
  const todas = await listarCitas(abogadoId, desde, hasta);
  const { fecha, hora } = ahoraLocal();
  return todas.filter((c) => c.estado === "pendiente" && (c.fecha > fecha || (c.fecha === fecha && c.horaFin > hora)));
}
