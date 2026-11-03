import { ETAPAS_ABIERTAS, nombreHito, type EtapaCrm } from "./catalogo";
import { diasEntre } from "./fechas";
import type { PersonaCrm } from "./servicio";

/**
 * Cuánto está «listo» un caso y qué falta. Es una función pura (sin base de datos):
 * la usan la ficha, los informes, las notificaciones y las pruebas.
 */

export type ContextoCaso = {
  asesorias: number;
  pasosTotal: number; // sin contar los «no aplica»
  pasosListos: number;
  citasFuturas: number;
  tieneDerivacion: boolean;
};

export type Faltante = { clave: string; texto: string };

export type EvaluacionCaso = {
  pct: number;
  faltantes: Faltante[];
  siguiente: string;
  /** 85 % o más: el informe de avance ya se puede mostrar al cliente. */
  listo: boolean;
  /** Entre 65 % y 84 %: falta poco. */
  casiListo: boolean;
};

export const ORDEN_ETAPA: Record<EtapaCrm, number> = {
  prospecto: 0,
  contactado: 1,
  en_asesoria: 2,
  con_hito: 3,
  mandato: 4,
  derivado: 5,
  cerrado: 6,
  perdido: -1,
};

export function evaluarCaso(p: PersonaCrm, c: ContextoCaso, hoy: string): EvaluacionCaso {
  const orden = ORDEN_ETAPA[p.etapa];
  const abierta = ETAPAS_ABIERTAS.includes(p.etapa);
  const faltantes: Faltante[] = [];
  let ganado = 0;
  let total = 0;
  const criterio = (aplica: boolean, peso: number, cumplido: number, clave: string, texto: string) => {
    if (!aplica) return;
    total += peso;
    ganado += peso * cumplido;
    if (cumplido < 1) faltantes.push({ clave, texto });
  };

  criterio(true, 10, p.telefono || p.email ? 1 : 0, "contacto", "Falta un teléfono o correo de contacto");
  criterio(true, 5, p.materia !== "otra" ? 1 : 0, "materia", "Falta indicar la materia del caso");
  criterio(true, 5, p.comuna ? 1 : 0, "zona", "Falta la comuna");
  criterio(true, 20, c.asesorias > 0 ? 1 : 0, "asesoria", "Aún no hay una asesoría registrada");
  criterio(
    orden >= 2 || c.asesorias > 0,
    20,
    c.pasosTotal === 0 ? 0 : c.pasosListos / c.pasosTotal,
    "requisitos",
    c.pasosTotal === 0 ? "Faltan definir los documentos y trámites del caso" : `Faltan ${c.pasosTotal - c.pasosListos} requisito(s) por completar`,
  );
  criterio(orden >= 2 && p.etapa !== "perdido", 15, p.fechaHito || orden >= 4 ? 1 : 0, "hito", "Falta fijar una fecha de hito");
  criterio(c.asesorias > 0, 10, p.satisfaccion > 0 ? 1 : 0, "satisfaccion", "Falta registrar si el cliente quedó conforme");
  criterio(abierta, 15, p.proximoContacto || (p.fechaHito && p.fechaHito >= hoy) || c.citasFuturas > 0 ? 1 : 0, "proximo", "Falta definir el próximo paso (contacto o cita)");
  criterio(p.etapa === "derivado", 15, c.tieneDerivacion ? 1 : 0, "derivacion", "Falta registrar a qué colega lo derivaste y la comisión");

  const pct = total === 0 ? 100 : Math.round((100 * ganado) / total);
  return { pct, faltantes, siguiente: siguientePaso(p, c, hoy), listo: pct >= 85, casiListo: pct >= 65 && pct < 85 };
}

/** Una frase con lo siguiente que conviene hacer con este cliente. */
export function siguientePaso(p: PersonaCrm, c: ContextoCaso, hoy: string): string {
  switch (p.etapa) {
    case "perdido":
      return "Retomar el contacto si aparece una nueva oportunidad";
    case "cerrado":
      return p.satisfaccion > 0 ? "Pedir una recomendación" : "Pedir su opinión sobre la asesoría";
    case "derivado":
      return c.tieneDerivacion ? "Hacer seguimiento con el colega" : "Registrar a qué colega lo derivaste";
    case "mandato":
      return c.pasosTotal - c.pasosListos > 0 ? "Reunir los documentos pendientes" : "Avanzar con el primer trámite";
    case "con_hito": {
      if (!p.fechaHito) return "Confirmar la fecha del hito";
      const d = diasEntre(hoy, p.fechaHito);
      const cuando = d < 0 ? "ya pasó: actualiza el caso" : d === 0 ? "es hoy" : d === 1 ? "es mañana" : `faltan ${d} días`;
      return `Preparar ${nombreHito(p.tipoHito).toLowerCase()} (${cuando})`;
    }
    case "en_asesoria":
      return c.asesorias === 0 ? "Registrar la primera asesoría" : "Fijar fecha de hito o proponer el mandato";
    case "contactado":
      return "Agendar la primera asesoría";
    default:
      return "Hacer el primer contacto";
  }
}
