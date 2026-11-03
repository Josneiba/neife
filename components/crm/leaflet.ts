import type * as LeafletTipos from "leaflet";

export type L = typeof LeafletTipos;

/** Carga Leaflet solo en el navegador (necesita «window»). */
export async function cargarLeaflet(): Promise<L> {
  const m = (await import("leaflet")) as unknown as { default?: L } & L;
  return m.default ?? m;
}

export const CENTRO_CHILE: [number, number] = [-33.4489, -70.6693]; // Santiago

export const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Tipos de mapa gratuitos. Cada dominio debe estar permitido en la CSP (next.config.mjs). */
export const MAPAS = [
  { clave: "calle", nombre: "Calle", url: TILES, maxZoom: 19, extra: "" },
  { clave: "topo", nombre: "Relieve", url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", maxZoom: 17, extra: ' · <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>' },
] as const;
export const ATRIBUCION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

export const COLOR_ETAPA: Record<string, string> = {
  prospecto: "#b59a86",
  contactado: "#71959f",
  en_asesoria: "#436977",
  con_hito: "#d9a400",
  mandato: "#88584e",
  derivado: "#3b4848",
  cerrado: "#4a8a5c",
  perdido: "#c78178",
};
