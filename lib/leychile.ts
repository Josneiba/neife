import { SaxesParser } from "saxes";
import type { Pieza } from "./normas";

/**
 * Importación desde LeyChile (Biblioteca del Congreso Nacional).
 * Cada norma se publica como XML estructurado en
 *   https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=NÚMERO
 * El número está en la dirección de la norma en leychile.cl (parámetro idNorma= o i=).
 */

const HOST = "www.leychile.cl";
const HOST_ACTUAL = "nuevo.leychile.cl";
const MAX_BYTES = 64 * 1024 * 1024;

/** Normas habituales cuyo número de norma se comprobó contra el sitio oficial. */
export const NORMAS_HABITUALES: { id: string; nombre: string; materia: string }[] = [
  { id: "207436", nombre: "Código del Trabajo", materia: "laboral" },
  { id: "1984", nombre: "Código Penal", materia: "penal" },
  { id: "176595", nombre: "Código Procesal Penal", materia: "penal" },
  { id: "22740", nombre: "Código de Procedimiento Civil", materia: "civil" },
  { id: "29526", nombre: "Ley 18.101, arrendamiento de predios urbanos", materia: "arriendo" },
  { id: "61438", nombre: "Ley 19.496, protección de los derechos de los consumidores", materia: "consumidor" },
  { id: "229557", nombre: "Ley 19.968, crea los Tribunales de Familia", materia: "familia" },
  { id: "225128", nombre: "Ley 19.947, matrimonio civil", materia: "familia" },
  { id: "242648", nombre: "Ley 20.066, violencia intrafamiliar", materia: "familia" },
  { id: "141599", nombre: "Ley 19.628, sobre protección de la vida privada", materia: "otra" },
  { id: "1209272", nombre: "Ley 21.719, protección y tratamiento de datos personales", materia: "otra" },
  { id: "1181003", nombre: "Responsabilidad parental y pago efectivo de deudas de pensiones de alimentos", materia: "familia" },
  { id: "172986", nombre: "Código Civil", materia: "civil" },
];

const FUENTES_LEGALES_VERIFICADAS: { id: string; nombre: string; materia: string; parte?: string }[] = [
  ...NORMAS_HABITUALES,
  {
    id: "172986",
    parte: "8720734",
    nombre: "Ley 14.908, abandono de familia y pago de pensiones alimenticias",
    materia: "familia",
  },
];

export function urlNormaLeyChile(idNorma: string, idParte?: string): string | null {
  if (!/^\d{1,9}$/.test(idNorma) || (idParte !== undefined && !/^\d{1,9}$/.test(idParte))) return null;
  return `https://www.bcn.cl/leychile/navegar?idNorma=${idNorma}${idParte ? `&idParte=${idParte}` : ""}`;
}

export function fuenteVerificadaPorNombre(nombre: string) {
  return FUENTES_LEGALES_VERIFICADAS.find((norma) => norma.nombre === nombre);
}

/** Acepta el número solo o una dirección de leychile.cl y devuelve el número de norma. */
export function idNormaDesde(entrada: string): string | null {
  const t = entrada.trim();
  if (/^\d{1,9}$/.test(t)) return t;
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    const oficial = ["leychile.cl", "bcn.cl"].some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
    if (!oficial) return null;
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
  if (Buffer.byteLength(xml, "utf8") > MAX_BYTES) throw new Error("El documento es demasiado grande.");
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

const ENTIDADES_XML: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodificarEntidadesXml(valor: string): string {
  return valor
    .replace(/&#(\d+);/g, (entidad, codigo: string) => {
      const punto = Number(codigo);
      return Number.isInteger(punto) && punto >= 0 && punto <= 0x10ffff
        ? String.fromCodePoint(punto)
        : entidad;
    })
    .replace(/&#x([0-9a-f]+);/gi, (entidad, codigo: string) => {
      const punto = Number.parseInt(codigo, 16);
      return Number.isInteger(punto) && punto >= 0 && punto <= 0x10ffff
        ? String.fromCodePoint(punto)
        : entidad;
    })
    .replace(/&(amp|lt|gt|quot|apos);/g, (entidad, nombre: string) => ENTIDADES_XML[nombre] ?? entidad);
}

const NUMERO =
  /^\s*art(?:[íi\uFFFD]culo|\.)?\s+([\dº°˚]+(?:\s*(?:bis|ter|qu[aá]ter|quinquies|sexies|septies|octies))?|[a-záéíóúñ]+)/i;

function numeroDe(t: string): string | null {
  const m = NUMERO.exec(t);
  if (!m) return null;
  return m[1].replace(/[º°˚]/g, "").replace(/\s+/g, " ").trim();
}

function limpiarTexto(t: string): string {
  return t
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function corregirEncabezadoArticulo(t: string): string {
  return t.replace(/^(\s*)Art\uFFFDculo(?=\s)/i, "$1Artículo");
}

export function parsearNorma(xml: string): NormaLeyChile {
  type Elemento = { derogada: boolean };
  type Articulo = { nivel: number; texto: string; nivelTexto: number | null; transitorio: boolean };
  type Identificador = {
    nivel: number;
    tipo: string;
    numero: string;
    campo: "tipo" | "numero" | null;
    nivelCampo: number | null;
    textoCampo: string;
  };
  const elementos: Elemento[] = [];
  const articulos: Articulo[] = [];
  const identificadores: string[] = [];
  const piezas: Pieza[] = [];
  let idNorma = "";
  let version = "";
  let derogada = false;
  let titulo = "";
  let textoTitulo = "";
  let nivelTitulo: number | null = null;
  let vioNorma = false;
  let sinNumero = 0;
  const datosIdentificador: Identificador[] = [];
  let errorXml: Error | undefined;
  const parser = new SaxesParser({ xmlns: false, position: false });

  parser.on("opentag", (tag) => {
    const nombre = tag.name.split(":").pop() ?? tag.name;
    const nivel = elementos.length;
    const ancestroDerogado = elementos.at(-1)?.derogada ?? false;
    const attrs = tag.attributes;
    elementos.push({
      derogada: ancestroDerogado || (nombre === "EstructuraFuncional" && decodificarEntidadesXml(attrs.derogado ?? "") === "derogado"),
    });

    if (nombre === "Norma") {
      vioNorma = true;
      idNorma = attrs.normaId ?? "";
      version = attrs.fechaVersion ?? "";
      derogada = attrs.derogado === "derogado";
    } else if (nombre === "TituloNorma") {
      textoTitulo = "";
      nivelTitulo = nivel;
    } else if (nombre === "TipoNumero") {
      datosIdentificador.push({ nivel, tipo: "", numero: "", campo: null, nivelCampo: null, textoCampo: "" });
    } else if (nombre === "Tipo" || nombre === "Numero") {
      const actual = datosIdentificador.at(-1);
      if (actual) {
        actual.campo = nombre === "Tipo" ? "tipo" : "numero";
        actual.nivelCampo = nivel;
        actual.textoCampo = "";
      }
    } else if (
      nombre === "EstructuraFuncional" &&
      !elementos.at(-1)?.derogada &&
      decodificarEntidadesXml(attrs.tipoParte ?? "") === "Artículo"
    ) {
      articulos.push({ nivel, texto: "", nivelTexto: null, transitorio: decodificarEntidadesXml(attrs.transitorio ?? "") === "transitorio" });
    } else if (nombre === "Texto" && articulos.at(-1)?.nivel === nivel - 1 && !elementos.at(-1)?.derogada) {
      articulos.at(-1)!.nivelTexto = nivel;
    }
  });

  const agregarTexto = (fragmento: string) => {
    if (nivelTitulo !== null) textoTitulo += fragmento;
    const identificador = datosIdentificador.at(-1);
    if (identificador?.nivelCampo !== null && identificador?.nivelCampo !== undefined) identificador.textoCampo += fragmento;
    const articulo = articulos.at(-1);
    if (articulo?.nivelTexto !== null && articulo?.nivelTexto !== undefined) articulo.texto += fragmento;
  };
  parser.on("text", agregarTexto);
  parser.on("cdata", agregarTexto);
  parser.on("closetag", (tag) => {
    const nombre = tag.name.split(":").pop() ?? tag.name;
    const nivel = elementos.length - 1;
    if (nombre === "TituloNorma" && nivelTitulo === nivel) {
      titulo = limpiarTexto(decodificarEntidadesXml(textoTitulo));
      nivelTitulo = null;
    } else if ((nombre === "Tipo" || nombre === "Numero") && datosIdentificador.at(-1)?.nivelCampo === nivel) {
      const actual = datosIdentificador.at(-1)!;
      if (actual.campo === "tipo") actual.tipo = limpiarTexto(decodificarEntidadesXml(actual.textoCampo));
      if (actual.campo === "numero") actual.numero = limpiarTexto(decodificarEntidadesXml(actual.textoCampo));
      actual.campo = null;
      actual.nivelCampo = null;
      actual.textoCampo = "";
    } else if (nombre === "TipoNumero" && datosIdentificador.at(-1)?.nivel === nivel) {
      const actual = datosIdentificador.pop()!;
      const valor = `${actual.tipo} ${actual.numero}`.trim();
      if (valor) identificadores.push(valor);
    } else if (nombre === "Texto" && articulos.at(-1)?.nivelTexto === nivel) {
      articulos.at(-1)!.nivelTexto = null;
    } else if (nombre === "EstructuraFuncional" && articulos.at(-1)?.nivel === nivel) {
      const articulo = articulos.pop()!;
      const cuerpo = limpiarTexto(corregirEncabezadoArticulo(decodificarEntidadesXml(articulo.texto)));
      if (cuerpo) {
        let numero = numeroDe(cuerpo);
        if (!numero) numero = `s/n ${++sinNumero}`;
        if (articulo.transitorio) numero += " transitorio";
        piezas.push({ numero, texto: cuerpo });
      }
    }
    elementos.pop();
  });
  parser.on("error", (error) => {
    errorXml ??= error;
  });
  parser.write(xml).close();
  if (errorXml) throw errorXml;
  if (!vioNorma) throw new Error("El archivo no es una norma de LeyChile.");

  return {
    identificadores,
    idNorma,
    titulo: titulo || "Norma sin título",
    version: version === "2222-02-02" ? "" : version,
    derogada,
    piezas,
  };
}

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

async function obtenerJsonOficial(url: URL, consulta: string): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      signal: AbortSignal.timeout(45_000),
      redirect: "error",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(`No se pudo consultar ${consulta} en LeyChile. Revisa la conexión o intenta más tarde.`);
  }
  if (!respuesta.ok) throw new Error(`LeyChile respondió ${respuesta.status} al consultar ${consulta}.`);
  try {
    return await respuesta.json();
  } catch {
    throw new Error(`LeyChile entregó datos inválidos al consultar ${consulta}.`);
  }
}

function textoDesdeHtmlOficial(html: string): string {
  const entidades = html
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…");
  return limpiarTexto(
    decodificarEntidadesXml(
      entidades
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:div|p|li|tr|blockquote|h[1-6])\s*>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function normalizarTextoComparacion(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizarNumeroArticulo(numero: string): string {
  return numero.toLowerCase().replace(/[º°˚]/g, "").replace(/\s+/g, " ").trim();
}

function ordenarArticulo(numero: string): [number, number] | null {
  const m = /^(\d+)(?:\s+(bis|ter|quater|quinquies|sexies|septies|octies))?$/i.exec(numero);
  if (!m) return null;
  const sufijos: Record<string, number> = {
    "": 0,
    bis: 1,
    ter: 2,
    quater: 3,
    quinquies: 4,
    sexies: 5,
    septies: 6,
    octies: 7,
  };
  return [Number(m[1]), sufijos[m[2]?.toLowerCase() ?? ""] ?? 8];
}

function insertarPiezaOrdenada(piezas: Pieza[], pieza: Pieza): void {
  const ordenNueva = ordenarArticulo(pieza.numero);
  let indice = -1;
  if (ordenNueva) {
    indice = piezas.findIndex((actual) => {
      const ordenActual = ordenarArticulo(actual.numero);
      return ordenActual !== null && (ordenActual[0] > ordenNueva[0] ||
        (ordenActual[0] === ordenNueva[0] && ordenActual[1] > ordenNueva[1]));
    });
    if (indice < 0) indice = piezas.findIndex((actual) => actual.numero.toLowerCase() === "final");
  }
  piezas.splice(indice < 0 ? piezas.length : indice, 0, pieza);
}

/** Aplica a las piezas los cambios que BCN reporta entre dos versiones de una norma. */
export function aplicarComparacionVersion(piezas: Pieza[], pares: unknown): Pieza[] {
  if (!Array.isArray(pares)) throw new Error("LeyChile entregó una comparación de versiones inválida.");
  const resultado = piezas.map((pieza) => ({ ...pieza }));

  for (const par of pares) {
    if (!Array.isArray(par) || par.length !== 2) {
      throw new Error("LeyChile entregó un cambio de versión inválido.");
    }
    const leerBloque = (valor: unknown): string => {
      if (!Array.isArray(valor)) throw new Error("LeyChile entregó un texto de comparación inválido.");
      const fragmentos: string[] = [];
      for (const fragmento of valor) {
        if (!esRegistro(fragmento) || typeof fragmento.t !== "string") {
          throw new Error("LeyChile entregó un fragmento de comparación inválido.");
        }
        fragmentos.push(fragmento.t);
      }
      return textoDesdeHtmlOficial(fragmentos.join("\n"));
    };

    const textoAnterior = leerBloque(par[0]);
    const textoNuevo = leerBloque(par[1]);
    const numeroAnterior = numeroDe(textoAnterior);
    const numeroNuevo = numeroDe(textoNuevo);
    if (!numeroAnterior && !numeroNuevo) {
      if (/^\s*art/i.test(textoAnterior) || /^\s*art/i.test(textoNuevo)) {
        throw new Error("No se pudo identificar el artículo modificado por LeyChile.");
      }
      continue;
    }

    const numeroAnteriorNormalizado = numeroAnterior ? normalizarNumeroArticulo(numeroAnterior) : null;
    const numeroNuevoNormalizado = numeroNuevo ? normalizarNumeroArticulo(numeroNuevo) : null;
    const indiceAnterior = numeroAnteriorNormalizado
      ? resultado.findIndex((pieza) => normalizarNumeroArticulo(pieza.numero) === numeroAnteriorNormalizado)
      : -1;
    const indiceNuevo = numeroNuevoNormalizado
      ? resultado.findIndex((pieza) => normalizarNumeroArticulo(pieza.numero) === numeroNuevoNormalizado)
      : -1;
    const textoAnteriorNormalizado = normalizarTextoComparacion(textoAnterior);
    const textoNuevoNormalizado = normalizarTextoComparacion(textoNuevo);

    if (!textoNuevo) {
      if (indiceAnterior >= 0) {
        if (normalizarTextoComparacion(resultado[indiceAnterior].texto) !== textoAnteriorNormalizado) {
          throw new Error(`El artículo ${numeroAnterior} de la biblioteca no coincide con la versión anterior de LeyChile.`);
        }
        resultado.splice(indiceAnterior, 1);
      }
      continue;
    }
    if (!numeroNuevo || !numeroNuevoNormalizado) {
      throw new Error("No se pudo identificar el artículo vigente entregado por LeyChile.");
    }

    if (indiceNuevo >= 0 && normalizarTextoComparacion(resultado[indiceNuevo].texto) === textoNuevoNormalizado) {
      if (indiceAnterior >= 0 && indiceAnterior !== indiceNuevo) {
        if (normalizarTextoComparacion(resultado[indiceAnterior].texto) !== textoAnteriorNormalizado) {
          throw new Error(`El artículo ${numeroAnterior} de la biblioteca no coincide con la versión anterior de LeyChile.`);
        }
        resultado.splice(indiceAnterior, 1);
      }
      continue;
    }
    if (indiceAnterior >= 0) {
      if (normalizarTextoComparacion(resultado[indiceAnterior].texto) !== textoAnteriorNormalizado) {
        throw new Error(`El artículo ${numeroAnterior} de la biblioteca no coincide con la versión anterior de LeyChile.`);
      }
      if (indiceNuevo >= 0 && indiceNuevo !== indiceAnterior) {
        throw new Error(`El artículo ${numeroNuevo} ya existe con otro texto en la biblioteca.`);
      }
      resultado[indiceAnterior] = { numero: numeroNuevo, texto: textoNuevo };
      continue;
    }
    if (indiceNuevo >= 0) {
      throw new Error(`El artículo ${numeroNuevo} no coincide con ninguna versión de LeyChile.`);
    }
    insertarPiezaOrdenada(resultado, { numero: numeroNuevo, texto: textoNuevo });
  }

  return resultado;
}

/** Descarga la norma y valida su texto frente a la versión vigente que informa BCN. */
export async function descargarNormaActual(idNorma: string): Promise<NormaLeyChile> {
  const norma = parsearNorma(await descargarXml(idNorma));
  if (norma.idNorma && norma.idNorma !== idNorma) {
    throw new Error("LeyChile devolvió otra norma distinta a la pedida. No se importó nada.");
  }
  if (!norma.version) {
    throw new Error("LeyChile no informó una fecha de versión verificable. No se importó para evitar publicar un texto posiblemente desactualizado.");
  }

  const urlActual = new URL(`https://${HOST_ACTUAL}/servicios/Navegar/get_norma_json`);
  urlActual.search = new URLSearchParams({
    idNorma,
    idVersion: "",
    idLey: "",
    tipoVersion: "",
    cve: "",
    agrupa_partes: "1",
    r: "",
  }).toString();
  const datosActuales = await obtenerJsonOficial(urlActual, "la versión vigente");
  const metadatos = esRegistro(datosActuales) && esRegistro(datosActuales.metadatos) ? datosActuales.metadatos : null;
  const versionActual = metadatos && esRegistro(metadatos.vigencia) ? metadatos.vigencia.inicio_vigencia : null;
  if (typeof versionActual !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(versionActual)) {
    throw new Error("LeyChile no informó una fecha de versión vigente válida.");
  }
  if (metadatos && metadatos.id_norma && String(metadatos.id_norma) !== idNorma) {
    throw new Error("LeyChile devolvió metadatos de otra norma. No se importó nada.");
  }
  const derogadaActual = metadatos?.derogado === true ||
    (typeof metadatos?.derogado === "string" && metadatos.derogado.toLowerCase() === "derogado");
  if (norma.version > versionActual) {
    throw new Error("La versión del XML es posterior a la versión vigente informada por LeyChile. No se actualizó la biblioteca.");
  }
  if (norma.version === versionActual) return { ...norma, derogada: derogadaActual };

  const urlComparacion = new URL(`https://${HOST_ACTUAL}/servicios/Navegar/get_textos_comparar_versiones`);
  urlComparacion.search = new URLSearchParams({
    idNorma,
    version1: norma.version,
    version2: versionActual,
    idParte: "",
    idParte2: "",
  }).toString();
  const comparacion = await obtenerJsonOficial(urlComparacion, "los cambios entre versiones");
  if (!esRegistro(comparacion) || !Array.isArray(comparacion.pares)) {
    throw new Error("LeyChile no entregó los cambios entre versiones. No se actualizó la biblioteca.");
  }

  return {
    ...norma,
    piezas: aplicarComparacionVersion(norma.piezas, comparacion.pares),
    version: versionActual,
    derogada: derogadaActual,
  };
}
