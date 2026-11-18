"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, auditar } from "../db";
import { requerirAbogado, ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { obtenerSolicitudPorCodigo, registrarEvento } from "../datos";
import { cambiarEtapa, importarSolicitudes } from "../crm/servicio";
import { urlSitio } from "../sitio";

const ESTADOS_MANDATO = ["aceptada", "informe", "entregada"];

/** El asesor escribe qué hará y a qué honorarios; la persona lo acepta desde su seguimiento. */
export async function proponerMandato(fd: FormData) {
  const u = await requerirAbogado();
  const id = Number(fd.get("id"));
  const texto = String(fd.get("texto") ?? "").trim();
  const volver = `/panel/solicitudes/${id}`;
  if (!Number.isInteger(id)) redirect("/panel");
  if (texto.length < 20 || texto.length > 800) redirect(`${volver}?mandato=texto`);
  const d = await getDb();
  const f = (await d.execute({ sql: "SELECT id, codigo, estado, mandato_en FROM solicitudes WHERE id = ? AND asesor_id = ?", args: [id, u.id] })).rows[0];
  if (!f || !ESTADOS_MANDATO.includes(String(f.estado)) || String(f.mandato_en)) redirect(volver);
  await d.execute({ sql: "UPDATE solicitudes SET mandato_propuesto = ?, actualizado_en = ahora() WHERE id = ?", args: [texto, id] });
  await registrarEvento(id, "nota", "Propusiste un mandato. Falta que la persona lo acepte.");
  await auditar(u.id, "mandato_propuesto", "solicitud", id);
  const codigo = String(f.codigo);
  after(async () => {
    const s = await obtenerSolicitudPorCodigo(codigo);
    if (s?.email.includes("@")) await correos.mandatoPropuesto(s.email, u.nombre, `${urlSitio()}/seguimiento/${codigo}`);
  });
  revalidatePath(volver);
  redirect(`${volver}?mandato=ok`);
}

/** La persona acepta el mandato. Queda registrado en el seguimiento y en el CRM del asesor. */
export async function aceptarMandato(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "").slice(0, 64);
  const volver = `/seguimiento/${encodeURIComponent(codigo)}`;
  const s = await obtenerSolicitudPorCodigo(codigo);
  if (!s || s.anonimizada || !s.asesorId || !s.mandatoPropuesto || s.mandatoEn) redirect(volver);
  if (fd.get("acepto") !== "on") redirect(`${volver}?mandato=marca`);
  if (!(await permitir(`mandato:${await ipActual()}`, 10, 60 * 60 * 1000))) redirect(`${volver}?mandato=limite`);
  const d = await getDb();
  const asesorId = s.asesorId;
  try {
    await importarSolicitudes(asesorId, s.id);
    const persona = (await d.execute({
      sql: "SELECT id FROM crm_personas WHERE solicitud_id = ? AND abogado_id = ? ORDER BY id LIMIT 1",
      args: [s.id, asesorId],
    })).rows[0];
    if (!persona) throw new Error("La solicitud no tiene una persona asociada en el CRM.");
    await cambiarEtapa(asesorId, Number(persona.id), "mandato");
  } catch (error) {
    console.error("No se pudo sincronizar la aceptación del mandato con el CRM.", error);
    redirect(`${volver}?mandato=error`);
  }
  const actualizacion = await d.execute({
    sql: "UPDATE solicitudes SET mandato_en = ahora(), actualizado_en = ahora() WHERE id = ? AND mandato_en = ''",
    args: [s.id],
  });
  if (actualizacion.rowsAffected === 0) redirect(`${volver}?mandato=aceptado`);
  await registrarEvento(s.id, "nota", "La persona aceptó el mandato desde su seguimiento.");
  await auditar(s.clienteId, "mandato_aceptado", "solicitud", s.id);
  after(async () => {
    const a = (await d.execute({ sql: "SELECT email FROM usuarios WHERE id = ?", args: [asesorId] })).rows[0];
    if (a) await correos.mandatoAceptado(String(a.email), `La persona del caso ${s.codigoSeguimiento} aceptó tu mandato.`, `${urlSitio()}/panel/solicitudes/${s.id}`);
  });
  redirect(`${volver}?mandato=aceptado`);
}
