import { getDb } from "./db";

/**
 * Normas que NO vienen en el repositorio legalize-cl y que se piden a la web oficial (LeyChile, BCN).
 * Lista cerrada: la aplicación no busca ni descarga nada fuera de ella. Cada entrada trae un patrón con el que se
 * comprueba que el enlace pegado corresponde de verdad a esa ley, para no cargar una norma equivocada.
 */
export type FuenteWeb = {
  clave: string;
  nombre: string; // nombre con que queda en la biblioteca
  prefijo: string; // con qué empieza el nombre de la norma ya cargada
  materia: string;
  patron: RegExp; // se prueba contra el título y los identificadores que informa LeyChile
  /** Sin esta norma, la materia no puede orientarse bien: a la persona no se le muestran resultados parciales. */
  esencial?: boolean;
};

export const FUENTES_WEB: FuenteWeb[] = [
  { clave: "ley-18101", nombre: "Ley 18.101, arrendamiento de predios urbanos", prefijo: "Ley 18.101", materia: "arriendo", patron: /\b18\.?101\b|arrendamiento de predios urbanos/i },
  { clave: "ley-19968", nombre: "Ley 19.968, Tribunales de Familia", prefijo: "Ley 19.968", materia: "familia", patron: /\b19\.?968\b|tribunales de familia/i },
  { clave: "ley-20066", nombre: "Ley 20.066, violencia intrafamiliar", prefijo: "Ley 20.066", materia: "familia", patron: /\b20\.?066\b|violencia intrafamiliar/i },
  { clave: "ley-19947", nombre: "Ley 19.947, matrimonio civil", prefijo: "Ley 19.947", materia: "familia", patron: /\b19\.?947\b|matrimonio civil/i },
  { clave: "codigo-penal", nombre: "Código Penal", prefijo: "Código Penal", materia: "penal", esencial: true, patron: /^\s*c[oó]digo\s+penal\s*$/i },
  { clave: "codigo-procesal-penal", nombre: "Código Procesal Penal", prefijo: "Código Procesal Penal", materia: "penal", patron: /c[oó]digo\s+procesal\s+penal/i },
  { clave: "codigo-procedimiento-civil", nombre: "Código de Procedimiento Civil", prefijo: "Código de Procedimiento Civil", materia: "civil", patron: /c[oó]digo\s+de\s+procedimiento\s+civil/i },
];

export function fuentePorClave(clave: string): FuenteWeb | undefined {
  return FUENTES_WEB.find((f) => f.clave === clave);
}

/** ¿El título o los identificadores de la norma descargada corresponden a la fuente esperada? */
export function coincideConFuente(f: FuenteWeb, titulo: string, identificadores: string[]): boolean {
  const lista = [titulo, ...identificadores];
  // El Código Penal exige título exacto: «Código Procesal Penal» no debe pasar por él.
  return lista.some((t) => f.patron.test(t));
}

/** Estado de cada fuente: cargada o no, para el admin. */
export async function estadoFuentes(): Promise<{ fuente: FuenteWeb; cargada: boolean }[]> {
  const d = await getDb();
  const r = await d.execute("SELECT nombre FROM normas");
  const nombres = r.rows.map((f) => String(f.nombre).toLowerCase());
  return FUENTES_WEB.map((fuente) => ({ fuente, cargada: nombres.some((n) => n.startsWith(fuente.prefijo.toLowerCase())) }));
}

/** Nombres de las normas esperadas para una materia que aún no están cargadas. */
export async function normasFaltantes(materia: string): Promise<string[]> {
  const est = await estadoFuentes();
  return est.filter((e) => !e.cargada && e.fuente.materia === materia).map((e) => e.fuente.nombre.split(",")[0]);
}

/** Normas esenciales de la materia que faltan (si hay alguna, no se muestran resultados parciales a la persona). */
export async function esencialesFaltantes(materia: string): Promise<string[]> {
  const est = await estadoFuentes();
  return est.filter((e) => !e.cargada && e.fuente.esencial && e.fuente.materia === materia).map((e) => e.fuente.nombre.split(",")[0]);
}
