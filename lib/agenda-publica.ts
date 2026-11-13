import { getDb } from "./db";
import { reservarCita } from "./crm/servicio-citas";
import { esFecha, esHora, hoyLocal, horaAMin, minAHora, sumarDias } from "./crm/fechas";

export type Horario = { activo: boolean; dias: number[]; desde: string; hasta: string; duracion: number };

export const HORARIO_BASE: Horario = { activo: false, dias: [1, 2, 3, 4, 5], desde: "09:00", hasta: "13:00", duracion: 30 };
export const DURACIONES = [20, 30, 45, 60] as const;
const DIAS_ADELANTE = 14;
const diaSemana = (fecha: string) => ((new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

function sanear(valor: unknown): Horario {
  const objeto = valor && typeof valor === "object" ? valor as Record<string, unknown> : {};
  const dias = Array.isArray(objeto.dias)
    ? [...new Set(objeto.dias.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort()
    : HORARIO_BASE.dias;
  let desde = esHora(objeto.desde) ? objeto.desde : HORARIO_BASE.desde;
  let hasta = esHora(objeto.hasta) ? objeto.hasta : HORARIO_BASE.hasta;
  if (horaAMin(hasta) <= horaAMin(desde)) {
    desde = HORARIO_BASE.desde;
    hasta = HORARIO_BASE.hasta;
  }
  const duracion = (DURACIONES as readonly number[]).includes(Number(objeto.duracion))
    ? Number(objeto.duracion)
    : HORARIO_BASE.duracion;
  return { activo: objeto.activo === true, dias, desde, hasta, duracion };
}

function parsearHorario(texto: unknown): Horario {
  if (!texto) return { ...HORARIO_BASE };
  try {
    return sanear(JSON.parse(String(texto)));
  } catch (error) {
    console.error("No se pudo leer el horario de reservas del asesor.", error);
    return { ...HORARIO_BASE };
  }
}

export async function leerHorario(asesorId: number): Promise<Horario> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT horario FROM perfiles WHERE usuario_id = ?", args: [asesorId] });
  return parsearHorario(r.rows[0]?.horario);
}

export async function guardarHorario(asesorId: number, horario: Horario): Promise<void> {
  const d = await getDb();
  await d.execute({
    sql: "UPDATE perfiles SET horario = ? WHERE usuario_id = ?",
    args: [JSON.stringify(sanear(horario)), asesorId],
  });
}

async function huecosConHorario(asesorId: number, horario: Horario, hoy: string): Promise<DiaLibre[]> {
  if (!horario.activo) return [];
  const d = await getDb();
  const desde = sumarDias(hoy, 1);
  const hasta = sumarDias(hoy, DIAS_ADELANTE);
  const ocupadas = await d.execute({
    sql: "SELECT fecha, hora_ini, hora_fin FROM crm_citas WHERE abogado_id = ? AND fecha BETWEEN ? AND ? AND estado <> 'cancelada'",
    args: [asesorId, desde, hasta],
  });
  const resultado: DiaLibre[] = [];
  for (let i = 1; i <= DIAS_ADELANTE; i++) {
    const fecha = sumarDias(hoy, i);
    if (!horario.dias.includes(diaSemana(fecha))) continue;
    const citas = ocupadas.rows.filter((c) => String(c.fecha) === fecha);
    const horas: string[] = [];
    for (let minuto = horaAMin(horario.desde); minuto + horario.duracion <= horaAMin(horario.hasta); minuto += horario.duracion) {
      const fin = minuto + horario.duracion;
      const ocupada = citas.some((c) => horaAMin(String(c.hora_ini)) < fin && horaAMin(String(c.hora_fin)) > minuto);
      if (!ocupada) horas.push(minAHora(minuto));
    }
    if (horas.length) resultado.push({ fecha, horas });
  }
  return resultado;
}

export type DiaLibre = { fecha: string; horas: string[] };

export async function huecosLibres(asesorId: number, hoy = hoyLocal()): Promise<DiaLibre[]> {
  return huecosConHorario(asesorId, await leerHorario(asesorId), hoy);
}

/** Reserva una hora. Devuelve null si la hora dejó de estar disponible. */
export async function reservarHora(p: {
  asesorId: number;
  solicitudId: number;
  codigo: string;
  fecha: string;
  hora: string;
}): Promise<{ fecha: string; horaIni: string } | null> {
  if (!esFecha(p.fecha) || !esHora(p.hora)) return null;
  const horario = await leerHorario(p.asesorId);
  const diasLibres = await huecosConHorario(p.asesorId, horario, hoyLocal());
  if (!diasLibres.some((dia) => dia.fecha === p.fecha && dia.horas.includes(p.hora))) return null;

  const d = await getDb();
  const persona = await d.execute({
    sql: "SELECT id FROM crm_personas WHERE solicitud_id = ? AND abogado_id = ? ORDER BY id LIMIT 1",
    args: [p.solicitudId, p.asesorId],
  });
  const personaId = persona.rows[0] ? Number(persona.rows[0].id) : null;
  const cita = await reservarCita(p.asesorId, {
    tipo: "asesoria",
    fecha: p.fecha,
    horaIni: p.hora,
    horaFin: minAHora(horaAMin(p.hora) + horario.duracion),
    personaId,
    titulo: personaId ? "" : `Caso ${p.codigo}`,
    nota: "Hora reservada por la persona desde su enlace de seguimiento.",
  });
  return cita ? { fecha: p.fecha, horaIni: p.hora } : null;
}

export async function reservaVigente(
  asesorId: number,
  solicitudId: number,
  hoy = hoyLocal(),
): Promise<{ fecha: string; hora: string } | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT c.fecha, c.hora_ini FROM crm_citas c JOIN crm_personas p ON p.id = c.persona_id
           WHERE p.solicitud_id = ? AND c.abogado_id = ? AND c.estado = 'pendiente' AND c.fecha >= ?
           ORDER BY c.fecha, c.hora_ini LIMIT 1`,
    args: [solicitudId, asesorId, hoy],
  });
  return r.rows[0] ? { fecha: String(r.rows[0].fecha), hora: String(r.rows[0].hora_ini) } : null;
}
