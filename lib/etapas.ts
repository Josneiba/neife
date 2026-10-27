/** Etapas de un caso, en orden. «rechazada» queda fuera de la línea. */
export const ETAPAS = [
  { clave: "nueva", nombre: "Recibida" },
  { clave: "aceptada", nombre: "En contacto" },
  { clave: "informe", nombre: "Informe en curso" },
  { clave: "entregada", nombre: "Informe entregado" },
  { clave: "derivada", nombre: "Derivada" },
  { clave: "cerrada", nombre: "Cerrada" },
] as const;

export type Estado = (typeof ETAPAS)[number]["clave"] | "rechazada";

export const TOTAL_ETAPAS = ETAPAS.length;

export function nombreEtapa(estado: string): string {
  if (estado === "rechazada") return "Rechazada";
  return ETAPAS.find((e) => e.clave === estado)?.nombre ?? estado;
}

/** Número de avance (1 a 6). 0 si fue rechazada. */
export function avance(estado: string): number {
  const i = ETAPAS.findIndex((e) => e.clave === estado);
  return i < 0 ? 0 : i + 1;
}

export type ContextoCaso = {
  estado: string;
  derivarOk: boolean;
  abogadoDestino: string;
  abogadoConfirmado?: boolean;
  pendientesAbiertos: number;
  informe: { estado: "borrador" | "final"; entregado: boolean } | null;
};

export type SiguientePaso = {
  texto: string;
  /** Clave de la acción principal que ofrece la ficha del caso. */
  accion: "aceptar" | "informe" | "editar-informe" | "entregar" | "derivar" | "confirmar" | "cerrar" | "ninguna";
};

export function siguientePaso(c: ContextoCaso): SiguientePaso {
  switch (c.estado) {
    case "nueva":
      return { texto: "Aceptar o rechazar la solicitud", accion: "aceptar" };
    case "aceptada":
      return c.pendientesAbiertos > 0
        ? { texto: `Reunir ${c.pendientesAbiertos} antecedente${c.pendientesAbiertos === 1 ? "" : "s"} y preparar el informe`, accion: "informe" }
        : { texto: "Preparar el informe", accion: "informe" };
    case "informe":
      if (c.informe?.estado === "final") return { texto: "Entregar el informe", accion: "entregar" };
      return { texto: "Terminar el informe y marcarlo como final", accion: "editar-informe" };
    case "entregada":
      return c.derivarOk
        ? { texto: "Derivar a un abogado del rubro", accion: "derivar" }
        : { texto: "Confirmar con la persona si autoriza derivar su caso", accion: "derivar" };
    case "derivada":
      return c.abogadoConfirmado
        ? { texto: "Abogado confirmado: registrar el resultado y cerrar", accion: "cerrar" }
        : { texto: "Esperando que el abogado confirme que toma el caso", accion: "confirmar" };
    default:
      return { texto: "Sin pasos pendientes", accion: "ninguna" };
  }
}

export const RESULTADOS = [
  { clave: "con_abogado", nombre: "Con abogado" },
  { clave: "informe_entregado", nombre: "Solo informe entregado" },
  { clave: "sin_respuesta", nombre: "Sin respuesta de la persona" },
  { clave: "desistio", nombre: "La persona desistió" },
] as const;

export function nombreResultado(c: string): string {
  return RESULTADOS.find((r) => r.clave === c)?.nombre ?? "";
}

/** Estado de seguimiento del abogado asociado. */
export function estadoAbogado(c: { estado: string; abogadoDestino: string; abogadoConfirmado: boolean }): "sin" | "esperando" | "confirmado" {
  if (c.abogadoConfirmado) return "confirmado";
  if (c.estado === "derivada" && c.abogadoDestino) return "esperando";
  return "sin";
}

/** Días desde una fecha (YYYY-MM-DD o ISO). */
export function diasDesde(f: string, ahora = Date.now()): number {
  const t = Date.parse(f.includes("T") || f.includes(" ") ? f.replace(" ", "T") + (f.endsWith("Z") ? "" : "Z") : f + "T00:00:00");
  return Math.floor((ahora - t) / 86400000);
}

/** Qué le falta al caso para llegar a la derivación. Cada ítem es una línea corta. */
export function faltantes(c: ContextoCaso, pendientes: string[]): string[] {
  if (c.estado === "rechazada" || c.estado === "cerrada") return [];
  const f: string[] = [];
  if (c.estado === "nueva") return ["Revisar la solicitud"];
  for (const p of pendientes) f.push(p);
  if (!c.informe || c.informe.estado !== "final") f.push("Informe final");
  else if (!c.informe.entregado) f.push("Entregar el informe");
  if (!c.derivarOk && c.estado !== "derivada") f.push("Autorización de la persona para derivar");
  if (!c.abogadoDestino && c.estado !== "derivada") f.push("Abogado de destino");
  return f;
}
