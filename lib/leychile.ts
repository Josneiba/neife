import { XMLParser } from "fast-xml-parser";
import type { Pieza } from "./normas";

/**
 * Importación desde LeyChile (Biblioteca del Congreso Nacional).
 * Cada norma se publica como XML estructurado en
 *   https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=NÚMERO
 * El número está en la dirección de la norma en leychile.cl (parámetro idNorma= o i=).
 */

const HOST = "www.leychile.cl";
const MAX_BYTES = 40 * 1024 * 1024;

/** Normas habituales cuyo número de norma se comprobó contra el sitio oficial. */
export const NORMAS_HABITUALES: { id: string; nombre: string; materia: string }[] = [
  { id: "207436", nombre: "Código del Trabajo", materia: "laboral" },
  { id: "61438", nombre: "Ley 19.496, protección de los derechos de los consumidores", materia: "consumidor" },
  { id: "229557", nombre: "Ley 19.968, crea los Tribunales de Familia", materia: "familia" },
  { id: "1181003", nombre: "Responsabilidad parental y pago efectivo de deudas de pensiones de alimentos", materia: "familia" },
  { id: "172986", nombre: "Código Civil", materia: "civil" },
];

export function urlNormaLeyChile(idNorma: string): string | null {
  return /^\d{1,9}$/.test(idNorma) ? `https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}` : null;
}

/** Acepta el número solo o una dirección de leychile.cl y devuelve el número de norma. */
export function idNormaDesde(entrada: string): string | null {
  const t = entrada.trim();
  if (/^\d{1,9}$/.test(t)) return t;
  try {
    const u = new URL(t);
    if (!u.hostname.endsWith("leychile.cl") && !u.hostname.endsWith("bcn.cl")) return null;
    const id = u.searchParams.get("idNorma") ?? u.searchParams.get("i");
    return id && /^\d{1,9}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function descargarXml(idNorma: string): Promise<string> {
  if (!/^\d{1,9}$/.test(idNorma)) throw new Error("Número de norma no válido.");
  const url = `https://${HOST}/Consulta/obtxml?opt=7&idNorma=${idNorma}`;
  let r: Response;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(45_000), redirect: "error", headers: { Accept: "application/xml" } });
  } catch {
    throw new Error("No se pudo conectar con LeyChile. Revisa la conexión o intenta más tarde.");
  }
  if (!r.ok) throw new Error(`LeyChile respondió ${r.status}. Revisa el número de norma.`);
  const largo = Number(r.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES) throw new Error("El documento es demasiado grande.");
  const xml = await r.text();
  if (xml.length > MAX_BYTES) throw new Error("El documento es demasiado grande.");
  return xml;
}

export type NormaLeyChile = {
  idNorma: string;
  titulo: string;
  version: string;
  derogada: boolean;
  /** Tipo y número que informa LeyChile, p. ej. «Ley 19968». Sirve para comprobar que es la norma esperada. */
  identificadores: string[];
  piezas: Pieza[];
};

type Nodo = Record<string, unknown>;

function texto(n: unknown): string {
  if (typeof n === "string") return n;
  if (typeof n === "number") return String(n);
  if (n && typeof n === "object") {
    const t = (n as Nodo)["#text"];
    if (typeof t === "string" || typeof t === "number") return String(t);
  }
  return "";
}
function lista<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

const NUMERO =
  /^\s*art[íi]culo\s+([\dº°˚]+(?:\s*(?:bis|ter|qu[aá]ter|quinquies|sexies|septies|octies))?|[a-záéíóúñ]+)/i;

function numeroDe(t: string): string | null {
  const m = NUMERO.exec(t);
  if (!m) return null;
  return m[1].replace(/[º°˚]/g, "").replace(/\s+/g, " ").trim();
}

function limpiarTexto(t: string): string {
  return t
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parsearNorma(xml: string): NormaLeyChile {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
  });
  const raiz = (parser.parse(xml) as Nodo).Norma as Nodo | undefined;
  if (!raiz) throw new Error("El archivo no es una norma de LeyChile.");

  const meta = (raiz.Metadatos ?? {}) as Nodo;
  const titulo = limpiarTexto(texto(meta.TituloNorma)) || "Norma sin título";
  const piezas: Pieza[] = [];
  let sinNumero = 0;

  const recorrer = (nodos: Nodo[]) => {
    for (const n of nodos) {
      if (String(n["@_derogado"] ?? "") === "derogado") continue;
      const tipo = String(n["@_tipoParte"] ?? "");
      const hijos = lista(((n.EstructurasFuncionales ?? {}) as Nodo).EstructuraFuncional as Nodo | Nodo[] | undefined);
      if (tipo === "Artículo") {
        const cuerpo = limpiarTexto(texto(n.Texto));
        if (cuerpo) {
          let numero = numeroDe(cuerpo);
          if (!numero) numero = `s/n ${++sinNumero}`;
          if (String(n["@_transitorio"] ?? "") === "transitorio") numero += " transitorio";
          piezas.push({ numero, texto: cuerpo });
        }
      }
      if (hijos.length) recorrer(hijos);
    }
  };
  recorrer(lista(((raiz.EstructurasFuncionales ?? {}) as Nodo).EstructuraFuncional as Nodo | Nodo[] | undefined));

  const ident = (meta.Identificador ?? {}) as Nodo;
  const tipos = lista(((ident.TiposNumeros ?? {}) as Nodo).TipoNumero as Nodo | Nodo[] | undefined);
  const identificadores = tipos.map((t) => `${texto(t.Tipo)} ${texto(t.Numero)}`.trim()).filter(Boolean);

  return {
    identificadores,
    idNorma: String(raiz["@_normaId"] ?? ""),
    titulo,
    version: String(raiz["@_fechaVersion"] ?? ""),
    derogada: String(raiz["@_derogado"] ?? "") === "derogado",
    piezas,
  };
}
