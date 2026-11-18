/** Datos de depósito y cobros por transferencia. Sin tarjetas: nada de esto es un medio de pago en línea. */
import { diasEntre, esFecha, hoyLocal } from "./crm/fechas";

export const BANCOS = [
  "Banco de Chile", "BancoEstado", "Banco Santander", "BCI", "Scotiabank", "Banco Itaú", "Banco Falabella",
  "Banco Security", "Banco BICE", "Banco Consorcio", "Banco Ripley", "Banco Internacional",
  "Coopeuch", "Tenpo Prepago", "Mercado Pago (cuenta vista)", "Mach / BCI Prepago", "Otro banco",
] as const;

export const TIPOS_CUENTA = [
  ["corriente", "Cuenta corriente"],
  ["vista", "Cuenta vista / Cuenta RUT"],
  ["ahorro", "Cuenta de ahorro"],
] as const;

export const ESTADOS_COBRO = ["pendiente", "comprobante", "pagado", "anulado"] as const;
export type EstadoCobro = (typeof ESTADOS_COBRO)[number];

export const ETIQUETA_COBRO: Record<EstadoCobro, string> = {
  pendiente: "Por pagar",
  comprobante: "Transferencia informada",
  pagado: "Pagado",
  anulado: "Anulado",
};

/** Estados del caso en que un asesor puede cobrar. */
export const ESTADOS_PARA_COBRAR = ["aceptada", "informe", "entregada", "derivada"];

export function limpiarRut(r: string): string {
  return r.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Valida un RUT chileno con su dígito verificador (módulo 11). */
export function rutValido(r: string): boolean {
  const l = limpiarRut(r);
  if (l.length < 8 || l.length > 9) return false;
  const cuerpo = l.slice(0, -1);
  const dv = l.slice(-1);
  let suma = 0;
  let m = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * m;
    m = m === 7 ? 2 : m + 1;
  }
  const r11 = 11 - (suma % 11);
  const esperado = r11 === 11 ? "0" : r11 === 10 ? "K" : String(r11);
  return dv === esperado;
}

export function formatearRut(r: string): string {
  const l = limpiarRut(r);
  if (l.length < 2) return r;
  const cuerpo = l.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${l.slice(-1)}`;
}

/** Solo dígitos, entre 6 y 20 (los bancos chilenos usan entre 8 y 16). */
export function numeroCuentaValido(n: string): boolean {
  return /^\d{6,20}$/.test(n.replace(/[\s-]/g, ""));
}

export function ocultarCuenta(n: string): string {
  const s = n.replace(/\s/g, "");
  return s.length <= 4 ? s : `••••${s.slice(-4)}`;
}

export function operacionValida(o: string): boolean {
  return /^[A-Za-z0-9-]{4,40}$/.test(o.trim());
}

/** La fecha de la transferencia no puede ser futura ni de hace más de 90 días. */
export function fechaTransferenciaValida(f: string, hoy = new Date()): boolean {
  if (!esFecha(f)) return false;
  const dias = diasEntre(f, hoyLocal(hoy));
  return dias >= 0 && dias <= 90;
}
