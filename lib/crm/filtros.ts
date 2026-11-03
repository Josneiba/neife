import type { PersonaCrm } from "./servicio";

/** Filtros de la lista de clientes (y del mapa). Viven en la dirección de la página: se pueden compartir y guardar. */
export type FiltrosClientes = {
  f: string; // filtro rápido (referidos, sin_seguimiento…)
  e: string[]; // etapas
  m: string[]; // materias
  r: string[]; // regiones
  o: string[]; // orígenes
  g: number[]; // grupos
  t: "" | "con" | "sin"; // teléfono
  s: string; // orden
  c: string[]; // campos que se muestran en cada fila
  q: string;
};

export const ORDENES = [
  { clave: "estado", nombre: "Estado" },
  { clave: "nombre", nombre: "Nombre" },
  { clave: "asesoria", nombre: "Última asesoría" },
  { clave: "hito", nombre: "Fecha de hito" },
  { clave: "creado", nombre: "Más recientes" },
] as const;

export const CAMPOS = [
  { clave: "materia", nombre: "Materia" },
  { clave: "hito", nombre: "Fecha de hito" },
  { clave: "asesoria", nombre: "Última asesoría" },
  { clave: "contacto", nombre: "Teléfono y correo" },
  { clave: "zona", nombre: "Comuna y región" },
  { clave: "origen", nombre: "Cómo llegó" },
] as const;
export const CAMPOS_POR_DEFECTO = ["materia", "hito", "asesoria"];

type SP = Record<string, string | undefined>;
const lista = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

export function leerFiltros(sp: SP): FiltrosClientes {
  return {
    f: sp.f ?? "",
    e: lista(sp.e),
    m: lista(sp.m),
    r: lista(sp.r),
    o: lista(sp.o),
    g: lista(sp.g).map(Number).filter((n) => Number.isInteger(n) && n > 0),
    t: sp.t === "con" || sp.t === "sin" ? sp.t : "",
    s: ORDENES.some((o) => o.clave === sp.s) ? (sp.s as string) : "estado",
    c: sp.c ? lista(sp.c) : CAMPOS_POR_DEFECTO,
    q: (sp.q ?? "").slice(0, 80),
  };
}

/** ¿Hay algún filtro puesto? (el orden y los campos mostrados no cuentan). */
export function hayFiltros(x: FiltrosClientes): boolean {
  return !!(x.f || x.e.length || x.m.length || x.r.length || x.o.length || x.g.length || x.t || x.q);
}

export function aQuery(x: FiltrosClientes): string {
  const p = new URLSearchParams();
  if (x.f) p.set("f", x.f);
  if (x.e.length) p.set("e", x.e.join(","));
  if (x.m.length) p.set("m", x.m.join(","));
  if (x.r.length) p.set("r", x.r.join(","));
  if (x.o.length) p.set("o", x.o.join(","));
  if (x.g.length) p.set("g", x.g.join(","));
  if (x.t) p.set("t", x.t);
  if (x.s !== "estado") p.set("s", x.s);
  if (x.c.join() !== CAMPOS_POR_DEFECTO.join()) p.set("c", x.c.join(","));
  if (x.q) p.set("q", x.q);
  return p.toString();
}

export function aplicarFiltros(personas: PersonaCrm[], x: FiltrosClientes): PersonaCrm[] {
  let l = personas.filter(
    (p) =>
      (!x.e.length || x.e.includes(p.etapa)) &&
      (!x.m.length || x.m.includes(p.materia)) &&
      (!x.r.length || x.r.includes(p.region)) &&
      (!x.o.length || x.o.includes(p.origen)) &&
      (x.t === "" || (x.t === "con" ? !!p.telefono : !p.telefono)),
  );
  const cmp: Record<string, (a: PersonaCrm, b: PersonaCrm) => number> = {
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    asesoria: (a, b) => (b.ultimaAsesoria || "").localeCompare(a.ultimaAsesoria || ""),
    hito: (a, b) => (a.fechaHito || "9999").localeCompare(b.fechaHito || "9999"),
    creado: (a, b) => b.creadoEn.localeCompare(a.creadoEn),
  };
  if (cmp[x.s]) l = [...l].sort(cmp[x.s]);
  return l;
}
