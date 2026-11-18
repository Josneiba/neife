import { getDb, auditar } from "./db";
import { cifrar, descifrarSeguro } from "./crypto";
import type { EstadoCobro } from "./pagos";

export type CuentaDeposito = { banco: string; tipo: string; numero: string; rut: string; titular: string; correo: string };
export type Cobro = {
  id: number;
  concepto: string;
  monto: number;
  estado: EstadoCobro;
  operacion: string;
  fechaTransferencia: string;
  creadoEn: string;
  pagadoEn: string;
};

const CTX = { numero: "cuenta.numero", rut: "cuenta.rut", titular: "cuenta.titular", correo: "cuenta.correo", op: "cobro.operacion" };

export function cifrarCuenta(c: CuentaDeposito) {
  return {
    numero: cifrar(c.numero, CTX.numero),
    rut: cifrar(c.rut, CTX.rut),
    titular: cifrar(c.titular, CTX.titular),
    correo: c.correo ? cifrar(c.correo, CTX.correo) : "",
  };
}

export function cifrarOperacion(o: string) {
  return cifrar(o, CTX.op);
}

/** Cuenta completa y descifrada. Solo para mostrarla a la persona que debe pagar. */
export async function leerCuenta(usuarioId: number): Promise<CuentaDeposito | null> {
  const d = await getDb();
  const f = (await d.execute({ sql: "SELECT * FROM cuentas_deposito WHERE usuario_id = ?", args: [usuarioId] })).rows[0];
  if (!f) return null;
  return {
    banco: String(f.banco),
    tipo: String(f.tipo),
    numero: descifrarSeguro(String(f.numero_enc), CTX.numero),
    rut: descifrarSeguro(String(f.rut_enc), CTX.rut),
    titular: descifrarSeguro(String(f.titular_enc), CTX.titular),
    correo: f.correo_enc ? descifrarSeguro(String(f.correo_enc), CTX.correo) : "",
  };
}

/** Para el perfil del asesor: el número sale oculto; lo completo no vuelve a la pantalla. */
export async function resumenCuenta(usuarioId: number) {
  const c = await leerCuenta(usuarioId);
  if (!c) return null;
  return { banco: c.banco, tipo: c.tipo, titular: c.titular, rut: c.rut, correo: c.correo, ultimos: c.numero.replace(/\s/g, "").slice(-4) };
}

export async function cobrosDeSolicitud(solicitudId: number): Promise<Cobro[]> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM cobros WHERE solicitud_id = ? ORDER BY id DESC", args: [solicitudId] });
  return r.rows.map((f) => ({
    id: Number(f.id),
    concepto: String(f.concepto),
    monto: Number(f.monto),
    estado: String(f.estado) as EstadoCobro,
    operacion: f.operacion_enc ? descifrarSeguro(String(f.operacion_enc), CTX.op) : "",
    fechaTransferencia: String(f.fecha_transferencia),
    creadoEn: String(f.creado_en),
    pagadoEn: String(f.pagado_en),
  }));
}

/**
 * Datos de depósito para quien tiene un cobro por pagar. Solo se leen si hay un cobro pendiente
 * o con transferencia informada, y cada lectura queda en la auditoría.
 */
export async function datosParaPagar(solicitudId: number, asesorId: number, quienVe: number | null) {
  const d = await getDb();
  const cobros = await d.execute({
    sql: "SELECT DISTINCT asesor_id FROM cobros WHERE solicitud_id = ? AND estado IN ('pendiente','comprobante')",
    args: [solicitudId],
  });
  if (!cobros.rows.length || cobros.rows.some((c) => Number(c.asesor_id) !== asesorId)) return null;
  const cuenta = await leerCuenta(asesorId);
  if (cuenta) await auditar(quienVe, "cuenta_deposito_vista", "solicitud", solicitudId);
  return cuenta;
}

export async function tieneCuentaDeposito(usuarioId: number): Promise<boolean> {
  const d = await getDb();
  return Boolean((await d.execute({ sql: "SELECT 1 FROM cuentas_deposito WHERE usuario_id = ?", args: [usuarioId] })).rows[0]);
}
