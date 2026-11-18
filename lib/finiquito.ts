/**
 * Calculadora de finiquito (Chile). Orientación general: el monto real depende del contrato,
 * la causal y los hechos. Todo se calcula en el navegador, sin guardar nada.
 */

export type Causal = "necesidades" | "sin_causa" | "renuncia" | "falta_grave";

export const CAUSALES: { clave: Causal; nombre: string; ayuda: string }[] = [
  { clave: "necesidades", nombre: "Necesidades de la empresa (art. 161)", ayuda: "Corresponde indemnización por años de servicio y, si no avisaron con 30 días, el mes de aviso." },
  { clave: "sin_causa", nombre: "Me despidieron sin causa o la causa no era cierta", ayuda: "Se calcula como el caso anterior; además puede haber un recargo si lo declara un juez (no incluido)." },
  { clave: "renuncia", nombre: "Renuncié o hubo mutuo acuerdo", ayuda: "Solo corresponde pagar las vacaciones pendientes y lo adeudado." },
  { clave: "falta_grave", nombre: "Me despidieron por falta grave (art. 160)", ayuda: "Solo vacaciones pendientes y lo adeudado, salvo que el despido sea declarado injustificado." },
];

export type EntradaFiniquito = {
  inicio: string;
  termino: string;
  remuneracion: number;
  causal: Causal;
  avisoPrevio: boolean;
  diasVacaciones: number;
  /** Valor de la UF en pesos, para el tope de 90 UF; 0 si no se conoce. */
  uf: number;
};

export type LineaFiniquito = { concepto: string; monto: number; detalle: string };
export type ResultadoFiniquito = { lineas: LineaFiniquito[]; total: number; avisos: string[]; anios: number };

/** Años de servicio: los completos, más uno si la fracción pasa de 6 meses. Tope de 11. */
export function aniosDeServicio(inicio: string, termino: string): number {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = termino.split("-").map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  if (meses < 0) return 0;
  const completos = Math.floor(meses / 12);
  const resto = meses % 12;
  return Math.min(11, completos + (resto > 6 || (resto === 6 && d2 > d1) ? 1 : 0));
}

export function calcularFiniquito(e: EntradaFiniquito): ResultadoFiniquito {
  const avisos: string[] = [];
  const lineas: LineaFiniquito[] = [];
  const base = e.uf > 0 ? Math.min(e.remuneracion, e.uf * 90) : e.remuneracion;
  if (e.uf > 0 && e.remuneracion > e.uf * 90) avisos.push("Se aplicó el tope de 90 UF a la remuneración para las indemnizaciones.");
  if (e.uf <= 0) avisos.push("No indicaste el valor de la UF, así que no se aplicó el tope de 90 UF.");

  const anios = aniosDeServicio(e.inicio, e.termino);
  if (e.causal === "necesidades" || e.causal === "sin_causa") {
    if (anios > 0) lineas.push({ concepto: "Indemnización por años de servicio", monto: Math.round(base * anios), detalle: `${anios} año${anios === 1 ? "" : "s"} × 1 mes de remuneración` });
    else avisos.push("Con menos de un año de servicio no corresponde indemnización por años.");
    if (!e.avisoPrevio) lineas.push({ concepto: "Indemnización sustitutiva del aviso previo", monto: Math.round(base), detalle: "No avisaron con 30 días de anticipación: 1 mes de remuneración" });
  }
  if (e.diasVacaciones > 0) {
    lineas.push({ concepto: "Vacaciones pendientes (feriado)", monto: Math.round((e.remuneracion / 30) * e.diasVacaciones), detalle: `${e.diasVacaciones} día${e.diasVacaciones === 1 ? "" : "s"} × valor del día (remuneración ÷ 30)` });
  }
  avisos.push("No incluye remuneraciones impagas, gratificación, horas extra ni cotizaciones adeudadas.");
  const total = lineas.reduce((s, l) => s + l.monto, 0);
  return { lineas, total, avisos, anios };
}
