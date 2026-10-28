import * as snowballNs from "snowball-stemmers";
import { getDb } from "./db";

/**
 * Biblioteca legal: guarda leyes, informes y otros documentos separados por artículo
 * y permite buscarlos por texto en español (sin servicios externos, sin costo).
 *
 * Cómo busca: cada artículo se guarda también como "raíces" de palabras
 * (despedido, despido y despidos quedan como "desped"/"despid"…), y la búsqueda
 * compara las raíces del relato contra las del artículo, ordenando por relevancia.
 */

// El paquete es CommonJS: según quién lo cargue (Next, tsx) la función viene en "default" o en la raíz.
const snowball = ((snowballNs as unknown as { default?: typeof snowballNs }).default ?? snowballNs) as typeof snowballNs;
const stemmer = snowball.newStemmer("spanish");

const STOPWORDS = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes asi aun aunque bajo bien cada casi como con contra cual cuales cuando de del desde donde dos el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estaba estaban estan estar este esto estos fue fueron ha había habia han hasta hay la las le les lo los mas me mi mis mucho muy ni no nos nosotros nuestro o os otra otras otro otros para pero poco por porque que quien quienes se sea sean segun ser si sido sin sobre solo son su sus tambien tan tanto te tengo tiene tienen todo todos tu tus un una unas uno unos usted va ya yo estoy fui mi mis tuve tuvo hice hizo hecho dijo dice dicen legal legales debe deben deber debera deberan puede pueden poder podra podran"
  ).split(" "),
);

function sinTildes(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function tokens(texto: string): string[] {
  return texto.toLowerCase().match(/[a-záéíóúüñ0-9]+/g) ?? [];
}

/** Convierte un texto en sus raíces, listas para el índice de búsqueda. */
export function raices(texto: string, quitarComunes = true): string[] {
  const salida: string[] = [];
  for (const t of tokens(texto)) {
    if (quitarComunes && (STOPWORDS.has(sinTildes(t)) || t.length < 3)) continue;
    salida.push(sinTildes(stemmer.stem(t)));
  }
  return salida;
}

/* ---------- Lectura de archivos ---------- */

export const EXTENSIONES_PERMITIDAS = ["pdf", "txt", "html", "htm", "xml"] as const;

function decodificarEntidades(t: string): string {
  return t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function textoDeMarcado(marcado: string): string {
  return decodificarEntidades(
    marcado
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<\/(p|div|li|tr|h[1-6]|texto|parrafo|articulo|encabezado)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

export async function extraerTexto(contenido: Buffer, nombreArchivo: string): Promise<string> {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(contenido));
      const { text } = await extractText(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join("\n") : text;
    } catch {
      throw new Error("No pudimos leer este PDF. Puede estar dañado o protegido con contraseña. Prueba guardándolo de nuevo como PDF o usa el texto en TXT.");
    }
  }
  const crudo = contenido.toString("utf8");
  if (ext === "html" || ext === "htm" || ext === "xml") return textoDeMarcado(crudo);
  if (ext === "txt") return crudo;
  throw new Error("Formato no permitido. Usa PDF, TXT, HTML o XML.");
}

/* ---------- Separar por artículo ---------- */

export type Pieza = { numero: string; texto: string };

const ENCABEZADO =
  /^\s*(?:art[íi]culo|art\.)\s*(\d+)\s*[°º˚]?\s*(bis|ter|qu[aá]ter|quinquies)?\s*(?:[.\-–—:]+\s*|$)(.*)$/i;

// Encabezados de estructura que separan artículos ("TÍTULO II", "Párrafo 3°", "CAPÍTULO PRIMERO"…).
const ESTRUCTURA =
  /^\s*(?:libro|t[íi]tulo|cap[íi]tulo|p[áa]rrafo|secci[óo]n)\s+(?:[ivxlcdm]+\b|\d+|preliminar|final|[úu]nico|primero|segundo|tercero|cuarto|quinto|sexto|s[ée]ptimo|octavo|noveno|d[ée]cimo)/i;

function limpiarBloque(lineas: string[]): string {
  return lineas
    .join("\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/([^\n])\n(?!\n)/g, "$1 ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

export function dividirArticulos(texto: string): { modo: "articulos" | "secciones"; piezas: Pieza[] } {
  const lineas = texto.replace(/\r/g, "").split("\n");
  const piezas: Pieza[] = [];
  let numero: string | null = null;
  let actual: string[] = [];

  const cerrar = () => {
    if (numero !== null) {
      const t = limpiarBloque(actual);
      if (t.length > 0) piezas.push({ numero, texto: t.slice(0, 12000) });
    }
  };

  for (const linea of lineas) {
    if (ESTRUCTURA.test(linea) && !ENCABEZADO.test(linea)) {
      // Un título o capítulo corta el artículo anterior: no debe quedar pegado a su texto.
      cerrar();
      numero = null;
      actual = [];
      continue;
    }
    const m = ENCABEZADO.exec(linea);
    if (m) {
      cerrar();
      numero = m[2] ? `${m[1]} ${m[2].toLowerCase()}` : m[1];
      actual = m[3] ? [m[3]] : [];
    } else if (numero !== null) {
      actual.push(linea);
    }
  }
  cerrar();

  if (piezas.length >= 3) return { modo: "articulos", piezas };

  // Documento sin artículos (informe, circular, sentencia…): se parte en secciones.
  const parrafos = texto
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => limpiarBloque(p.split("\n")))
    .filter((p) => p.length > 0);
  const secciones: Pieza[] = [];
  let buffer = "";
  for (const p of parrafos) {
    if (buffer && buffer.length + p.length > 1500) {
      secciones.push({ numero: `Sección ${secciones.length + 1}`, texto: buffer });
      buffer = p;
    } else {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    }
  }
  if (buffer) secciones.push({ numero: `Sección ${secciones.length + 1}`, texto: buffer.slice(0, 12000) });
  return { modo: "secciones", piezas: secciones };
}

/* ---------- Guardar y buscar ---------- */

/** Inserta artículos de a miles con una sola consulta por grupo (unnest): decenas de veces más rápido que uno por uno. */
export async function insertarArticulos(normaId: number, piezas: Pieza[]) {
  const d = await getDb();
  const TAMANO = 1500;
  for (let i = 0; i < piezas.length; i += TAMANO) {
    const g = piezas.slice(i, i + TAMANO);
    await d.execute({
      sql: `INSERT INTO articulos (norma_id, numero, texto, busqueda)
            SELECT ?::int, u.n, u.t, u.b FROM unnest(?::text[], ?::text[], ?::text[]) AS u(n, t, b)`,
      args: [normaId, g.map((p) => p.numero), g.map((p) => p.texto), g.map((p) => raices(`${p.numero} ${p.texto}`, false).join(" "))],
    });
  }
}

export async function crearNorma(p: {
  nombre: string;
  materia: string;
  fuente: string;
  archivo: string;
  usuarioId: number | null;
  texto?: string;
  /** Artículos ya separados (por ejemplo, desde el XML de LeyChile). */
  piezas?: Pieza[];
  bcnId?: string;
  version?: string;
}): Promise<{ normaId: number; piezas: number; modo: "articulos" | "secciones" }> {
  const { modo, piezas } = p.piezas
    ? { modo: "articulos" as const, piezas: p.piezas }
    : dividirArticulos(p.texto ?? "");
  if (piezas.length === 0) throw new Error("No se encontró texto en el archivo (¿es un PDF escaneado como imagen?).");

  const d = await getDb();
  const r = await d.execute({
    sql: "INSERT INTO normas (nombre, materia, fuente, archivo, subido_por, bcn_id, version, modo, revisada_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ahora())",
    args: [p.nombre, p.materia, p.fuente, p.archivo, p.usuarioId, p.bcnId ?? "", p.version ?? "", modo],
  });
  const normaId = Number(r.lastInsertRowid);

  try {
    await insertarArticulos(normaId, piezas);
  } catch (e) {
    await eliminarNorma(normaId);
    throw e;
  }
  return { normaId, piezas: piezas.length, modo };
}

export async function eliminarNorma(id: number) {
  const d = await getDb();
  await d.execute({ sql: "DELETE FROM normas WHERE id = ?", args: [id] });
}

export type Norma = {
  id: number;
  nombre: string;
  materia: string;
  fuente: string;
  archivo: string;
  bcnId: string;
  version: string;
  creado_en: string;
  total: number;
  modo: string;
  revisadaEn: string;
  errorRevision: string;
};

export async function listarNormas(): Promise<Norma[]> {
  const d = await getDb();
  const r = await d.execute(
    `SELECT n.id, n.nombre, n.materia, n.fuente, n.archivo, n.bcn_id, n.version, n.creado_en, n.modo, n.revisada_en, n.error_revision,
            (SELECT COUNT(*) FROM articulos a WHERE a.norma_id = n.id) AS total
       FROM normas n ORDER BY n.creado_en DESC, n.id DESC`,
  );
  return r.rows.map((f) => ({
    id: Number(f.id),
    nombre: String(f.nombre),
    materia: String(f.materia),
    fuente: String(f.fuente),
    archivo: String(f.archivo),
    bcnId: String(f.bcn_id),
    version: String(f.version),
    creado_en: String(f.creado_en),
    total: Number(f.total),
    modo: String(f.modo),
    revisadaEn: String(f.revisada_en),
    errorRevision: String(f.error_revision),
  }));
}

export type Resultado = {
  id: number;
  numero: string;
  texto: string;
  norma: string;
  normaId: number;
  bcnId: string;
  materia: string;
  /** Dónde se tomó el texto y de qué versión (p. ej. BCN Ley Chile). */
  fuente: string;
  version: string;
};

/* ---------- Búsqueda ---------- */

import { VOCABULARIO, CABECERA } from "./vocabulario";

type ReglaVocab = { si: Set<string>; agrega: string[]; materia?: string };
let reglas: ReglaVocab[] | null = null;
let palabrasReferencia: string[] | null = null;
const PALABRAS_JURIDICAS_CORREGIBLES =
  "trabajo trabajador trabajadora empleador despido despidieron despedido echaron finiquito pagado pagaron sueldo salario remuneración remuneraciones cotización cotizaciones previsionales pensión alimentos divorcio arriendo arrendador arrendatario desalojo garantía consumidor proveedor producto sernac estafa estafaron robo robaron hurto herencia prescripción denuncia querella";

function reglasVocab(): ReglaVocab[] {
  if (!reglas) reglas = VOCABULARIO.map((r) => ({ si: new Set(raices(r.si, false)), agrega: raices(r.agrega), materia: r.materia }));
  return reglas;
}

function referenciaCorreccion(): string[] {
  if (!palabrasReferencia) {
    palabrasReferencia = [...new Set(PALABRAS_JURIDICAS_CORREGIBLES.toLowerCase().match(/[a-záéíóúüñ]+/g))].map(sinTildes);
  }
  return palabrasReferencia;
}

function distanciaEdicion(a: string, b: string): number {
  const matriz = Array.from({ length: a.length + 1 }, (_, i) => {
    const fila = new Array<number>(b.length + 1);
    fila[0] = i;
    return fila;
  });
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matriz[i][j] = Math.min(matriz[i][j], matriz[i - 2][j - 2] + 1);
      }
    }
  }
  return matriz[a.length][b.length];
}

/** Corrige solo palabras con una coincidencia cercana y única dentro del vocabulario jurídico conocido. */
export function normalizarConsulta(consulta: string): string {
  const referencia = referenciaCorreccion();
  const contieneIndicadorEspecifico = /\b(?:finiquit\w*|despid\w*|echaron|trabaj\w*|empleador\w*|arriend\w*|alimentos|estaf\w*|sernac)\b/i.test(
    sinTildes(consulta.toLowerCase()),
  );
  const distanciaMaxima = contieneIndicadorEspecifico ? 2 : 1;
  return consulta.replace(/[a-záéíóúüñ]{5,}/gi, (original) => {
    const palabra = sinTildes(original.toLowerCase());
    if (referencia.includes(palabra)) return original;
    let mejor: string | null = null;
    let distancia = 3;
    let empate = false;
    for (const candidata of referencia) {
      if (Math.abs(candidata.length - palabra.length) > 2) continue;
      const actual = distanciaEdicion(palabra, candidata);
      if (actual < distancia) {
        mejor = candidata;
        distancia = actual;
        empate = false;
      } else if (actual === distancia) {
        empate = true;
      }
    }
    return mejor && !empate && distancia <= distanciaMaxima ? mejor : original;
  });
}

/** Artículos que solo modifican otra ley («Introdúcense las siguientes modificaciones…»): no sirven como fundamento. */
export function esModificatorio(texto: string): boolean {
  const ini = texto.slice(0, 220).replace(/^[\s"“«]+/, "");
  return /^(modificaciones?\b|(introdúc|agrég|modific|reempl|incorpór|sustitú|interc|deróg|suprím|elimín|añád)\w*)/i.test(ini) ||
    /^[^.]{0,120}\.\s*(introdúc|agrég|modific|reempl|incorpór|sustitú|interc|deróg|suprím)\w*\s/i.test(ini);
}

/** Palabras de la consulta con su peso: las de la persona pesan 1, las que agrega el vocabulario jurídico, 0,45. */
function terminosConsulta(consulta: string, materia?: string): Map<string, number> {
  const base = [...new Set(raices(normalizarConsulta(consulta)))].filter((s) => /^[a-z0-9ñ]+$/.test(s));
  const pesos = new Map<string, number>(base.map((s) => [s, 1]));
  const propias = new Set(base);
  for (const r of reglasVocab()) {
    if (r.materia && materia && r.materia !== materia) continue;
    if (![...propias].some((t) => r.si.has(t))) continue;
    for (const t of r.agrega) if (/^[a-z0-9ñ]+$/.test(t) && !pesos.has(t)) pesos.set(t, 0.45);
  }
  return pesos;
}

/**
 * Búsqueda en dos pasos, toda en la base de datos (sin leer archivos):
 *  1) el índice de texto trae unos 800 artículos candidatos;
 *  2) se ordenan con BM25 (las palabras raras valen más que «contrato» o «trabajo») y se premia a los artículos
 *     que cubren más palabras distintas del relato.
 */
export async function buscarArticulos(
  consulta: string,
  opciones: { materia?: string; limite?: number } = {},
): Promise<Resultado[]> {
  if (opciones.materia === "otra") return [];
  const materiaBusqueda = opciones.materia;
  const filtraMateria = Boolean(materiaBusqueda);
  const pesos = terminosConsulta(consulta, materiaBusqueda);
  const terminos = [...pesos.keys()].slice(0, 40);
  if (terminos.length === 0) return [];
  const limite = Math.min(Math.max(opciones.limite ?? 8, 1), 30);
  const match = terminos.join(" | ");

  const d = await getDb();
  const [cand, dfs, total] = await Promise.all([
    d.execute({
      sql: `SELECT a.id, a.numero, a.texto, a.busqueda, n.id AS norma_id, n.nombre AS norma, n.bcn_id, n.materia, n.fuente, n.version
              FROM articulos a JOIN normas n ON n.id = a.norma_id
             WHERE a.busqueda_tsv @@ to_tsquery('simple', ?) ${filtraMateria ? "AND n.materia = ?" : ""}
             ORDER BY ts_rank(a.busqueda_tsv, to_tsquery('simple', ?)) DESC, a.id
             LIMIT 800`,
      args: filtraMateria ? [match, opciones.materia!, match] : [match, match],
    }),
    d.execute({
      sql: `SELECT s AS t, (SELECT COUNT(*) FROM articulos a WHERE a.busqueda_tsv @@ to_tsquery('simple', s)) AS n FROM unnest(?::text[]) AS s`,
      args: [terminos],
    }),
    d.execute("SELECT COUNT(*) AS n FROM articulos"),
  ]);
  if (cand.rows.length === 0) return [];
  const N = Math.max(Number(total.rows[0].n), 1);
  const idf = new Map<string, number>(dfs.rows.map((f) => [String(f.t), Math.log(1 + (N - Number(f.n) + 0.5) / (Number(f.n) + 0.5))]));

  const docs = cand.rows.map((f) => {
    const toks = String(f.busqueda).split(" ").filter(Boolean);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { f, tf, len: toks.length };
  });
  const avg = docs.reduce((a, x) => a + x.len, 0) / docs.length || 1;
  const k1 = 1.4, b = 0.6;
  const propias = terminos.filter((t) => pesos.get(t) === 1).length;
  const coberturaMinima = Math.min(2, propias || 1);
  const consultaNormalizada = sinTildes(normalizarConsulta(consulta).toLowerCase());
  const hablaDeDespido = /\b(?:despid\w*|echaron|terminaron|termino)\b/.test(consultaNormalizada);
  const hablaDeFiniquito = /\bfiniquit\w*\b/.test(consultaNormalizada);
  const hablaDeRemuneracionesImpagas = /\b(?:pag\w*|remuner\w*|sueldo\w*|salario\w*)\b/.test(consultaNormalizada);
  const hablaDeHorasExtra = /\b(?:horas?\s+extra\w*|sobretiempo|jornada)\b/.test(consultaNormalizada);
  const hablaDeInsolvencia = /\b(?:quiebr\w*|insolvenc\w*|concursal\w*|liquidacion de empresa)\b/.test(consultaNormalizada);
  const hablaDeCapacitacion = /\b(?:capacit\w*|formacion profesional|franquicia tributaria)\b/.test(consultaNormalizada);
  const hablaDeActividadMaritima = /\b(?:tripul\w*|nave\w*|buque\w*|maritim\w*)\b/.test(consultaNormalizada);
  const hablaDeVacaciones = /\b(?:vacacion\w*|feriado\w*)\b/.test(consultaNormalizada);
  const hablaDeTrabajoPorDia = /\b(?:por dia|diario|diaria|a trato|por pieza)\b/.test(consultaNormalizada);
  const hablaDePlataformas = /\b(?:plataforma\w*|aplicacion\w*|repartidor\w*|conductor\w*)\b/.test(consultaNormalizada);
  const hablaDeJornadaEspecial = /\b(?:jornada\w*|domingo\w*|festivo\w*|descanso semanal)\b/.test(consultaNormalizada);
  const hablaDeMaternidad = /\b(?:postnatal|prenatal|parental|sala cuna|maternidad|lactancia)\b/.test(consultaNormalizada);

  const puntuados = docs.map(({ f, tf, len }) => {
    let s = 0, cubiertas = 0;
    for (const t of terminos) {
      const x = tf.get(t) ?? 0;
      if (!x) continue;
      const w = pesos.get(t) ?? 1;
      if (w === 1) cubiertas++;
      s += w * (idf.get(t) ?? 0) * ((x * (k1 + 1)) / (x + k1 * (1 - b + (b * len) / avg)));
    }
    // Los códigos y la Constitución son la regla general; las leyes que los modifican, más acotadas, pesan un poco menos.
    const general = /^(Código|Constitución)/.test(String(f.norma)) ? 1.0 : 1;
    const nombreNorma = String(f.norma);
    const numero = String(f.numero).toLowerCase();
    const codigoTrabajo = nombreNorma.startsWith("Código del Trabajo");
    const fueraDeContexto =
      (codigoTrabajo && numero === "163 bis" && !hablaDeInsolvencia) ||
      (codigoTrabajo && numero === "32" && !hablaDeHorasExtra) ||
      (codigoTrabajo && ["45", "71"].includes(numero) && !(numero === "45" ? hablaDeTrabajoPorDia : hablaDeVacaciones)) ||
      (codigoTrabajo && ["98", "128"].includes(numero) && !hablaDeActividadMaritima) ||
      (codigoTrabajo && numero === "152 quáter v" && !hablaDePlataformas) ||
      (codigoTrabajo && numero === "38" && !hablaDeJornadaEspecial) ||
      (codigoTrabajo && numero === "197 bis" && !hablaDeMaternidad) ||
      (codigoTrabajo && numero === "63 bis" && !hablaDeDespido) ||
      (/^Ley 20\.351\b/.test(nombreNorma) && !hablaDeCapacitacion) ||
      (/^Ley 21\.165\b/.test(nombreNorma) && !/\bestudiant\w*|\bestudi\w*/.test(consultaNormalizada)) ||
      (/^Ley 20\.585\b/.test(nombreNorma) && !/\blicencia\w*|\bmedic\w*/.test(consultaNormalizada)) ||
      (/^Ley 20\.891\b/.test(nombreNorma) && !/\bpostnatal\b|\bprenatal\b|\bsala cuna\b/.test(consultaNormalizada)) ||
      (/^Ley 21\.015\b/.test(nombreNorma) && !/\bdiscapacidad\w*|\binclusion laboral\b/.test(consultaNormalizada)) ||
      (/^Ley 21\.592\b/.test(nombreNorma) && !/\bdenunciante\w*|\bdenunciar\w*/.test(consultaNormalizada));
    let ajusteTema = 1;
    if (codigoTrabajo && hablaDeDespido && ["162", "168", "169"].includes(numero)) ajusteTema *= 2.4;
    if (codigoTrabajo && hablaDeFiniquito && numero === "177") ajusteTema *= 6;
    if (codigoTrabajo && hablaDeRemuneracionesImpagas && numero === "63 bis") ajusteTema *= 2.4;
    return { f, cubiertas, s: fueraDeContexto ? 0 : s * general * (0.6 + 0.8 * (cubiertas / propias)) * ajusteTema };
  });
  puntuados.sort((p, q) => q.s - p.s || Number(p.f.id) - Number(q.f.id));

  // Variedad: ninguna ley ocupa más de dos tercios de la lista, para no devolver solo una norma cuando hay varias pertinentes.
  const topeNorma = Math.max(2, Math.ceil(limite * 0.65));
  const porNorma = new Map<string, number>();
  const vistos = new Set<string>();
  const salida: Resultado[] = [];
  const aplazados: Resultado[] = [];
  const aResultado = (f: Record<string, unknown>): Resultado => ({
    id: Number(f.id),
    numero: String(f.numero),
    texto: String(f.texto),
    norma: String(f.norma),
    normaId: Number(f.norma_id),
    bcnId: String(f.bcn_id ?? ""),
    materia: String(f.materia),
    fuente: String(f.fuente ?? ""),
    version: String(f.version ?? ""),
  });
  for (const { f, cubiertas, s } of puntuados) {
    if (cubiertas < coberturaMinima) continue;
    if (esModificatorio(String(f.texto))) continue;
    if (s <= 0) continue;
    const clave = String(f.texto).slice(0, 160);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const n = porNorma.get(String(f.norma_id)) ?? 0;
    if (n >= topeNorma) {
      aplazados.push(aResultado(f));
      continue;
    }
    porNorma.set(String(f.norma_id), n + 1);
    salida.push(aResultado(f));
    if (salida.length >= limite) break;
  }
  for (const r of aplazados) if (salida.length < limite) salida.push(r);

  // Artículos de cabecera del tema, si la norma está cargada: entran después de los dos primeros resultados.
  const raicesConsulta = new Set(raices(normalizarConsulta(consulta), false));
  const cabeceras: [string, string][] = [];
  for (const c of CABECERA) {
    if (c.materia && materiaBusqueda && c.materia !== materiaBusqueda) continue;
    if (!raices(c.si, false).some((t) => raicesConsulta.has(t))) continue;
    cabeceras.push(...c.arts);
  }
  if (cabeceras.length) {
    const ya = new Set(salida.map((r) => `${r.norma}|${r.numero}`));
    const nuevos: Resultado[] = [];
    for (const [nombre, numero] of cabeceras.slice(0, 4)) {
      const r = await d.execute({
        sql: `SELECT a.id, a.numero, a.texto, n.id AS norma_id, n.nombre AS norma, n.bcn_id, n.materia, n.fuente, n.version
                FROM articulos a JOIN normas n ON n.id = a.norma_id
               WHERE n.nombre LIKE ? AND a.numero = ? ORDER BY a.id LIMIT 1`,
        args: [`${nombre}%`, numero],
      });
      if (r.rows[0] && !ya.has(`${r.rows[0].norma}|${r.rows[0].numero}`)) nuevos.push(aResultado(r.rows[0]));
    }
    if (nuevos.length) {
      salida.splice(Math.min(2, salida.length), 0, ...nuevos);
      salida.length = Math.min(salida.length, limite);
    }
  }
  return salida;
}

export async function obtenerArticulo(id: number): Promise<Resultado | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT a.id, a.numero, a.texto, n.id AS norma_id, n.nombre AS norma, n.bcn_id, n.materia, n.fuente, n.version
            FROM articulos a JOIN normas n ON n.id = a.norma_id WHERE a.id = ?`,
    args: [id],
  });
  const f = r.rows[0];
  if (!f) return null;
  return {
    id: Number(f.id),
    numero: String(f.numero),
    texto: String(f.texto),
    norma: String(f.norma),
    normaId: Number(f.norma_id),
    bcnId: String(f.bcn_id ?? ""),
    materia: String(f.materia),
    fuente: String(f.fuente ?? ""),
    version: String(f.version ?? ""),
  };
}

/** Texto corto para citar de dónde viene un artículo: «BCN Ley Chile, versión del 2024-05-01 · https://…». */
export function textoFuente(fuente: string, version: string): string {
  const url = fuente.match(/https?:\/\/\S+/)?.[0] ?? "";
  return ["BCN Ley Chile", version ? `versión del ${version}` : "", url].filter(Boolean).join(", ").replace(/, (https?:)/, " · $1");
}
