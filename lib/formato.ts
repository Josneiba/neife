/** Las fechas de la base vienen en UTC como "2026-10-17 15:30:00". */
function aFecha(iso: string): Date {
  return new Date(iso.replace(" ", "T") + "Z");
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(aFecha(iso));
}

export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(aFecha(iso));
}

export function pesos(n: number): string {
  if (n === 0) return "Gratis";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

/** Número corto que se le muestra a la persona para referirse a su solicitud. */
export function folio(codigo: string): string {
  return codigo.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** «hace 3 h», «ayer», «12 oct». Para la columna «Actualizado» de las tablas. */
export function hace(iso: string): string {
  const ms = Date.now() - aFecha(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return fechaCorta(iso);
}

export function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(aFecha(iso));
}

/** Tiempo corto desde una fecha: «5 min», «3 h», «2 d». */
export function espera(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - aFecha(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h`;
  return `${Math.floor(min / 1440)} d`;
}
