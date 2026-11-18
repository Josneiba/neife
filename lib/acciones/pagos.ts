"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, auditar } from "../db";
import { requerirAbogado, ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { obtenerSolicitudPorCodigo, registrarEvento } from "../datos";
import { urlSitio } from "../sitio";
import { pesos } from "../formato";
import {
  BANCOS, TIPOS_CUENTA, ESTADOS_PARA_COBRAR, rutValido, formatearRut, numeroCuentaValido,
  operacionValida, fechaTransferenciaValida,
} from "../pagos";
import { cifrarCuenta, cifrarOperacion } from "../pagos-datos";

const texto = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

/** El asesor guarda dónde recibir transferencias. Todo queda cifrado; no se piden tarjetas. */
export async function guardarCuentaDeposito(fd: FormData) {
  const u = await requerirAbogado();
  const volver = "/panel/perfil";
  if (!(await permitir(`cuenta:${u.id}`, 10, 60 * 60 * 1000))) redirect(`${volver}?cuenta=limite#t-pagos`);
  const banco = texto(fd, "banco", 60);
  const tipo = texto(fd, "tipo", 20);
  const numero = texto(fd, "numero", 30).replace(/[\s-]/g, "");
  const rut = texto(fd, "rut", 14);
  const titular = texto(fd, "titular", 80);
  const correo = texto(fd, "correo", 120);
  if (!(BANCOS as readonly string[]).includes(banco) || !TIPOS_CUENTA.some(([k]) => k === tipo)) redirect(`${volver}?cuenta=banco#t-pagos`);
  if (!numeroCuentaValido(numero)) redirect(`${volver}?cuenta=numero#t-pagos`);
  if (!rutValido(rut)) redirect(`${volver}?cuenta=rut#t-pagos`);
  if (titular.length < 3) redirect(`${volver}?cuenta=titular#t-pagos`);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) redirect(`${volver}?cuenta=correo#t-pagos`);
  const c = cifrarCuenta({ banco, tipo, numero, rut: formatearRut(rut), titular, correo });
  const d = await getDb();
  await d.execute({
    sql: `INSERT INTO cuentas_deposito (usuario_id, banco, tipo, numero_enc, rut_enc, titular_enc, correo_enc, actualizado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ahora())
          ON CONFLICT (usuario_id) DO UPDATE SET banco = excluded.banco, tipo = excluded.tipo, numero_enc = excluded.numero_enc,
            rut_enc = excluded.rut_enc, titular_enc = excluded.titular_enc, correo_enc = excluded.correo_enc, actualizado_en = ahora()`,
    args: [u.id, banco, tipo, c.numero, c.rut, c.titular, c.correo],
  });
  await auditar(u.id, "cuenta_deposito_guardada", "usuario", u.id);
  revalidatePath(volver);
  redirect(`${volver}?cuenta=ok#t-pagos`);
}

export async function borrarCuentaDeposito() {
  const u = await requerirAbogado();
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM cuentas_deposito WHERE usuario_id = ?", args: [u.id] });
  await auditar(u.id, "cuenta_deposito_borrada", "usuario", u.id);
  revalidatePath("/panel/perfil");
  redirect("/panel/perfil?cuenta=borrada#t-pagos");
}

/** El asesor crea un cobro en un caso suyo. La persona lo ve en su seguimiento. */
export async function crearCobro(fd: FormData) {
  const u = await requerirAbogado();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) redirect("/panel");
  const volver = `/panel/solicitudes/${id}`;
  const concepto = texto(fd, "concepto", 120);
  const montoTexto = String(fd.get("monto") ?? "").trim();
  const monto = /^\d{1,8}$/.test(montoTexto) ? Number(montoTexto) : Number.NaN;
  if (concepto.length < 3) redirect(`${volver}?cobro=concepto#t-cobros`);
  if (!Number.isInteger(monto) || monto < 1000 || monto > 50_000_000) redirect(`${volver}?cobro=monto#t-cobros`);
  if (!(await permitir(`cobro:${u.id}`, 30, 60 * 60 * 1000))) redirect(`${volver}?cobro=limite#t-cobros`);
  const d = await getDb();
  const f = (await d.execute({ sql: "SELECT id, codigo, estado FROM solicitudes WHERE id = ? AND asesor_id = ? AND anonimizada_en = ''", args: [id, u.id] })).rows[0];
  if (!f || !ESTADOS_PARA_COBRAR.includes(String(f.estado))) redirect(volver);
  const cuenta = (await d.execute({ sql: "SELECT 1 FROM cuentas_deposito WHERE usuario_id = ?", args: [u.id] })).rows[0];
  if (!cuenta) redirect(`${volver}?cobro=sincuenta#t-cobros`);
  const abiertos = Number((await d.execute({ sql: "SELECT COUNT(*) AS n FROM cobros WHERE solicitud_id = ? AND estado IN ('pendiente','comprobante')", args: [id] })).rows[0]?.n ?? 0);
  if (abiertos >= 5) redirect(`${volver}?cobro=muchos#t-cobros`);
  const r = await d.execute({ sql: "INSERT INTO cobros (solicitud_id, asesor_id, concepto, monto) VALUES (?, ?, ?, ?) RETURNING id", args: [id, u.id, concepto, monto] });
  await registrarEvento(id, "nota", `Creaste un cobro: ${concepto} (${pesos(monto)}).`);
  await auditar(u.id, "cobro_creado", "cobro", Number(r.rows[0].id));
  const codigo = String(f.codigo);
  after(async () => {
    const s = await obtenerSolicitudPorCodigo(codigo);
    if (s?.email.includes("@")) await correos.cobroNuevo(s.email, u.nombre, concepto, pesos(monto), `${urlSitio()}/seguimiento/${codigo}`);
  });
  revalidatePath(volver);
  redirect(`${volver}?cobro=ok#t-cobros`);
}

async function cobroDelAsesor(fd: FormData, asesorId: number) {
  const cobroId = Number(fd.get("cobro"));
  if (!Number.isInteger(cobroId)) redirect("/panel");
  const d = await getDb();
  const f = (await d.execute({
    sql: `SELECT c.id, c.solicitud_id, c.estado, c.concepto, s.codigo FROM cobros c JOIN solicitudes s ON s.id = c.solicitud_id
          WHERE c.id = ? AND c.asesor_id = ?`,
    args: [cobroId, asesorId],
  })).rows[0];
  if (!f) redirect("/panel");
  return { d, cobroId, solicitudId: Number(f.solicitud_id), estado: String(f.estado), concepto: String(f.concepto), codigo: String(f.codigo) };
}

export async function marcarCobroPagado(fd: FormData) {
  const u = await requerirAbogado();
  const c = await cobroDelAsesor(fd, u.id);
  const volver = `/panel/solicitudes/${c.solicitudId}`;
  if (c.estado === "pendiente" || c.estado === "comprobante") {
    await c.d.execute({ sql: "UPDATE cobros SET estado = 'pagado', pagado_en = ahora() WHERE id = ?", args: [c.cobroId] });
    await registrarEvento(c.solicitudId, "nota", `Confirmaste el pago: ${c.concepto}.`);
    await auditar(u.id, "cobro_pagado", "cobro", c.cobroId);
    after(async () => {
      const s = await obtenerSolicitudPorCodigo(c.codigo);
      if (s?.email.includes("@")) await correos.pagoConfirmado(s.email, u.nombre, c.concepto, `${urlSitio()}/seguimiento/${c.codigo}`);
    });
  }
  revalidatePath(volver);
  redirect(`${volver}?cobro=pagado#t-cobros`);
}

export async function anularCobro(fd: FormData) {
  const u = await requerirAbogado();
  const c = await cobroDelAsesor(fd, u.id);
  const volver = `/panel/solicitudes/${c.solicitudId}`;
  if (c.estado === "pendiente" || c.estado === "comprobante") {
    await c.d.execute({ sql: "UPDATE cobros SET estado = 'anulado' WHERE id = ?", args: [c.cobroId] });
    await registrarEvento(c.solicitudId, "nota", `Anulaste el cobro: ${c.concepto}.`);
    await auditar(u.id, "cobro_anulado", "cobro", c.cobroId);
  }
  revalidatePath(volver);
  redirect(`${volver}?cobro=anulado#t-cobros`);
}

/** La persona avisa que ya transfirió (fecha y número de operación). El asesor lo confirma. */
export async function informarTransferencia(fd: FormData) {
  const codigo = String(fd.get("codigo") ?? "").slice(0, 64);
  const volver = `/seguimiento/${encodeURIComponent(codigo)}`;
  const s = await obtenerSolicitudPorCodigo(codigo);
  const cobroId = Number(fd.get("cobro"));
  if (!s || s.anonimizada || !s.asesorId || !Number.isInteger(cobroId)) redirect(volver);
  const fecha = texto(fd, "fecha", 10);
  const operacion = texto(fd, "operacion", 40);
  if (!fechaTransferenciaValida(fecha)) redirect(`${volver}?pago=fecha#t-pagos`);
  if (!operacionValida(operacion)) redirect(`${volver}?pago=operacion#t-pagos`);
  if (!(await permitir(`transferencia:${await ipActual()}`, 10, 60 * 60 * 1000))) redirect(`${volver}?pago=limite#t-pagos`);
  const d = await getDb();
  const r = await d.execute({
    sql: `UPDATE cobros SET estado = 'comprobante', operacion_enc = ?, fecha_transferencia = ?, aviso_en = ahora()
           WHERE id = ? AND solicitud_id = ? AND asesor_id = ? AND estado IN ('pendiente','comprobante') RETURNING concepto, monto`,
    args: [cifrarOperacion(operacion), fecha, cobroId, s.id, s.asesorId],
  });
  const f = r.rows[0];
  if (!f) redirect(volver);
  await registrarEvento(s.id, "nota", `La persona informó una transferencia (${pesos(Number(f.monto))}): ${String(f.concepto)}.`);
  await auditar(s.clienteId, "transferencia_informada", "cobro", cobroId);
  const asesorId = s.asesorId;
  after(async () => {
    const a = (await d.execute({ sql: "SELECT email FROM usuarios WHERE id = ?", args: [asesorId] })).rows[0];
    if (a) await correos.transferenciaInformada(String(a.email), `La persona del caso ${s.codigoSeguimiento} informó una transferencia de ${pesos(Number(f.monto))}.`, `${urlSitio()}/panel/solicitudes/${s.id}`);
  });
  redirect(`${volver}?pago=ok#t-pagos`);
}
