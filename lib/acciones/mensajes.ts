"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requerirAbogado, ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { obtenerSolicitudPorCodigo } from "../datos";
import { urlSitio } from "../sitio";
import { guardarMensaje, MAX_MENSAJE } from "../mensajes-datos";

const ESTADOS_CON_HILO = ["nueva", "aceptada", "informe", "entregada", "derivada"];

function limpiar(fd: FormData): string {
  const valor = fd.get("texto");
  return typeof valor === "string" ? valor.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim() : "";
}

export async function enviarMensajeAsesor(fd: FormData): Promise<void> {
  const u = await requerirAbogado();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) redirect("/panel");
  const volver = `/panel/solicitudes/${id}`;
  const texto = limpiar(fd);
  if (!texto.length) redirect(`${volver}?msg=vacio#t-mensajes`);
  if (texto.length > MAX_MENSAJE) redirect(`${volver}?msg=largo#t-mensajes`);
  if (!(await permitir(`mensaje-asesor:${u.id}`, 60, 60 * 60 * 1000))) redirect(`${volver}?msg=limite#t-mensajes`);

  const d = await getDb();
  const f = (await d.execute({
    sql: "SELECT id, codigo, estado FROM solicitudes WHERE id = ? AND asesor_id = ? AND anonimizada_en = ''",
    args: [id, u.id],
  })).rows[0];
  if (!f || !ESTADOS_CON_HILO.includes(String(f.estado))) redirect(volver);
  const { yaHabiaSinLeer } = await guardarMensaje(id, "asesor", texto);
  const codigo = String(f.codigo);
  if (!yaHabiaSinLeer) {
    after(async () => {
      const s = await obtenerSolicitudPorCodigo(codigo);
      if (s?.email.includes("@")) {
        await correos.mensajeNuevo(s.email, u.nombre, `${urlSitio()}/seguimiento/${codigo}#t-mensajes`);
      }
    });
  }
  revalidatePath(volver);
  redirect(`${volver}?msg=ok#t-mensajes`);
}

export async function enviarMensajePersona(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "").slice(0, 64);
  const volver = `/seguimiento/${encodeURIComponent(codigo)}`;
  const s = await obtenerSolicitudPorCodigo(codigo);
  if (!s || s.anonimizada || !s.asesorId || !ESTADOS_CON_HILO.includes(s.estado)) redirect(volver);
  const texto = limpiar(fd);
  if (!texto.length) redirect(`${volver}?msg=vacio#t-mensajes`);
  if (texto.length > MAX_MENSAJE) redirect(`${volver}?msg=largo#t-mensajes`);
  const ip = await ipActual();
  if (
    !(await permitir(`mensaje-persona-ip:${ip}`, 40, 60 * 60 * 1000)) ||
    !(await permitir(`mensaje-persona:${s.id}`, 40, 24 * 60 * 60 * 1000))
  ) {
    redirect(`${volver}?msg=limite#t-mensajes`);
  }

  const { yaHabiaSinLeer } = await guardarMensaje(s.id, "persona", texto);
  const asesorId = s.asesorId;
  if (!yaHabiaSinLeer) {
    after(async () => {
      const d = await getDb();
      const a = (await d.execute({ sql: "SELECT email FROM usuarios WHERE id = ?", args: [asesorId] })).rows[0];
      if (a) {
        await correos.mensajeNuevo(
          String(a.email),
          `La persona del caso ${s.codigoSeguimiento}`,
          `${urlSitio()}/panel/solicitudes/${s.id}#t-mensajes`,
        );
      }
    });
  }
  revalidatePath(volver);
  redirect(`${volver}?msg=ok#t-mensajes`);
}
