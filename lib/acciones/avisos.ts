"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requerirAbogado } from "../guards";
import { getDb } from "../db";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { urlSitio } from "../sitio";
import { guardarAlertas, type Alertas } from "../alertas";
import { guardarHorario, reservarHora, reservaVigente, type Horario } from "../agenda-publica";
import { guardarResena } from "../resenas";
import { obtenerSolicitudPorCodigo, registrarEvento } from "../datos";
import { limpiarDatosPersonales } from "../limpiar";
import { fechaDMA } from "../crm/fechas";

function urgenciasDesde(valor: string): string[] {
  return valor === "urgente" ? ["urgente"] : valor === "pronto" ? ["urgente", "pronto"] : [];
}

function lista(fd: FormData, nombre: string): string[] {
  return fd.getAll(nombre).map(String);
}

export async function guardarMisAvisos(fd: FormData) {
  const usuario = await requerirAbogado();
  const alertas: Alertas = {
    activas: fd.get("activas") === "1",
    materias: lista(fd, "materias"),
    presupuestos: lista(fd, "presupuestos"),
    regiones: lista(fd, "regiones"),
    urgencias: urgenciasDesde(String(fd.get("urgencia_min") ?? "")),
    minimo: Number(fd.get("minimo") ?? 0),
  };
  await guardarAlertas(usuario.id, alertas);
  revalidatePath("/panel/perfil");
  redirect("/panel/perfil?avisos=ok");
}

export async function guardarFiltrosComoAvisos(fd: FormData) {
  const usuario = await requerirAbogado();
  const uno = (nombre: string) => {
    const valor = String(fd.get(nombre) ?? "");
    return valor ? [valor] : [];
  };
  await guardarAlertas(usuario.id, {
    activas: true,
    materias: uno("materia"),
    presupuestos: uno("presupuesto"),
    regiones: uno("region"),
    urgencias: uno("urgencia"),
    minimo: 0,
  });
  redirect("/panel/bandeja?avisos=ok");
}

export async function guardarMiHorario(fd: FormData) {
  const usuario = await requerirAbogado();
  const horario: Horario = {
    activo: fd.get("activo") === "1",
    dias: lista(fd, "dias").map(Number),
    desde: String(fd.get("desde") ?? ""),
    hasta: String(fd.get("hasta") ?? ""),
    duracion: Number(fd.get("duracion") ?? 30),
  };
  await guardarHorario(usuario.id, horario);
  revalidatePath("/panel/perfil");
  redirect("/panel/perfil?horario=ok");
}

export async function reservarMiHora(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "");
  const volver = `/seguimiento/${encodeURIComponent(codigo)}`;
  const solicitud = await obtenerSolicitudPorCodigo(codigo);
  if (!solicitud || solicitud.anonimizada || !solicitud.asesorId ||
      !["aceptada", "informe", "entregada"].includes(solicitud.estado)) redirect(volver);
  if (!(await permitir(`reserva:${solicitud.id}`, 5, 24 * 3600 * 1000))) redirect(`${volver}?hora=limite`);
  if (await reservaVigente(solicitud.asesorId, solicitud.id)) redirect(`${volver}?hora=ya`);

  const [fecha, hora] = String(fd.get("hora") ?? "").split("|");
  const reserva = await reservarHora({
    asesorId: solicitud.asesorId,
    solicitudId: solicitud.id,
    codigo: solicitud.codigo,
    fecha: fecha ?? "",
    hora: hora ?? "",
  });
  if (!reserva) redirect(`${volver}?hora=ocupada`);
  await registrarEvento(solicitud.id, "nota", `Hora reservada: ${fechaDMA(reserva.fecha)} a las ${reserva.horaIni}.`);

  after(async () => {
    const d = await getDb();
    const fila = (await d.execute({
      sql: "SELECT email FROM usuarios WHERE id = ?",
      args: [solicitud.asesorId],
    })).rows[0];
    if (fila) {
      await correos.horaReservada(
        String(fila.email),
        `${fechaDMA(reserva.fecha)} a las ${reserva.horaIni}`,
        `${urlSitio()}/panel/crm/agenda`,
      );
    }
    if (solicitud.email.includes("@")) {
      await correos.avance(
        solicitud.email,
        `Reservaste tu hora: ${fechaDMA(reserva.fecha)} a las ${reserva.horaIni}. Tu asesor la verá en su agenda.`,
        `${urlSitio()}/seguimiento/${solicitud.codigo}`,
      );
    }
  });
  redirect(`${volver}?hora=ok`);
}

export async function enviarResena(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "");
  const volver = `/seguimiento/${encodeURIComponent(codigo)}`;
  const solicitud = await obtenerSolicitudPorCodigo(codigo);
  const estrellas = Number(fd.get("estrellas"));
  if (!solicitud || !solicitud.asesorId ||
      !["entregada", "derivada", "cerrada"].includes(solicitud.estado) ||
      !Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) redirect(volver);
  if (!(await permitir(`resena:${solicitud.id}`, 3, 24 * 3600 * 1000))) redirect(`${volver}?resena=ya`);

  const comentario = limpiarDatosPersonales(String(fd.get("comentario") ?? ""))
    .texto
    .replace(/\S+@\S+/g, "[correo omitido]")
    .replace(/\+?\d[\d\s-]{7,}/g, "[teléfono omitido]")
    .slice(0, 400);
  const guardada = await guardarResena({
    solicitudId: solicitud.id,
    asesorId: solicitud.asesorId,
    estrellas,
    comentario,
  });
  if (!guardada) redirect(`${volver}?resena=ya`);
  revalidatePath("/asesoria");
  redirect(`${volver}?resena=ok`);
}
