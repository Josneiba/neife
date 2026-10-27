import type { Pieza } from "./normas";

/**
 * Lector del repositorio «legalize-cl» (legislación chilena consolidada por la BCN, un archivo Markdown por norma).
 * Es mucho más rápido que leer PDF o bajar XML: el texto ya viene separado por artículo
 * ("##### Artículo 161") y con metadatos al inicio (título, fecha, vigencia).
 */

export type MetaLegalize = {
  titulo: string;
  identificador: string;
  idNorma: string;
  rango: string;
  publicacion: string;
  vigente: boolean;
  fuente: string;
};

export type ArticuloLegalize = {
  numero: string;
  texto: string;
  /** Texto legal al que pertenece cuando el archivo reúne varios (p. ej. el DFL del Código Civil incluye la Ley 14.908). */
  subnorma: string;
  contexto: string;
};

const PREFIJOS_NUMERO = /^(?:Ley\s+N[°º.]?\s*[\d.]+\s+)?Art(?:[íi]culo|\.)\s*(?:\d+[\wº°.]*(?:\s+(?:bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies|decies|[A-Z]))*)?\s*[º°o]?\s*(?:[.:\-–]+\s*|\s+(?=[A-ZÁÉÍÓÚ¿¡"«(]))/i;

function meta(md: string): { meta: MetaLegalize; cuerpo: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  const campos: Record<string, string> = {};
  if (m) for (const l of m[1].split("\n")) {
    const k = l.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (k) campos[k[1]] = k[2].replace(/\\"/g, '"');
  }
  const ident = campos.identifier ?? "";
  return {
    meta: {
      titulo: campos.title ?? "",
      identificador: ident,
      idNorma: ident.replace(/^CL-/, ""),
      rango: campos.rank ?? "",
      publicacion: campos.publication_date ?? "",
      vigente: (campos.status ?? "") === "in_force",
      fuente: campos.source ?? "",
    },
    cuerpo: m ? md.slice(m[0].length) : md,
  };
}

/** Quita lo que no es texto legal: el «Art. 161.» del inicio y las marcas «ART. PRIMERO» pegadas dentro del texto. */
export function limpiarTextoArticulo(t: string): string {
  return t
    .replace(PREFIJOS_NUMERO, "")
    .replace(/\s*\bART\.\s+(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|S[ÉE]PTIMO|OCTAVO|NOVENO|D[ÉE]CIMO|[ÚU]NICO|FINAL)(?:\s+N[°º]\s*\d+)?\b/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizarNumero(n: string): string {
  return n.replace(/\s+/g, " ").trim().replace(/\b(BIS|TER|QUÁTER|QUATER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES|DECIES)\b/gi, (x) => x.toLowerCase());
}

const DEROGADO = /^(?:(?:Art|Artículo)[^\n]{0,40}?[.:\-–]\s*)?(?:Derogado|Suprimido|Sin efecto|Eliminado)\.?$/i;

export function leerLegalize(md: string): { meta: MetaLegalize; articulos: ArticuloLegalize[] } {
  const { meta: m, cuerpo } = meta(md.replace(/\r/g, ""));
  const lineas = cuerpo.split("\n");
  const articulos: ArticuloLegalize[] = [];
  let sub = "";
  let contexto = "";
  let transitorio = false;
  let numero: string | null = null;
  let esMarca = false;
  let buffer: string[] = [];

  const cerrar = () => {
    if (numero === null) return;
    const texto = limpiarTextoArticulo(buffer.join("\n").trim());
    if (!esMarca && !transitorio && texto && !DEROGADO.test(texto) && texto.length > 3) {
      articulos.push({ numero, texto, subnorma: sub, contexto });
    }
    numero = null;
    buffer = [];
  };

  for (const l of lineas) {
    const art = l.match(/^#{5}\s+Art[íi]culo\s+(.+?)\s*$/i);
    if (art) {
      cerrar();
      let etiqueta = art[1];
      const parentesis = etiqueta.match(/^(.*?)\s*\((LEY[^)]*|DECRETO[^)]*|C[ÓO]DIGO[^)]*)\)\s*$/i);
      esMarca = false;
      if (parentesis) {
        // Marca el inicio de otra ley dentro del mismo archivo: este «artículo» solo la presenta.
        sub = parentesis[2].trim();
        etiqueta = parentesis[1];
        esMarca = true;
        transitorio = false;
      }
      numero = normalizarNumero(etiqueta);
      continue;
    }
    const titulo = l.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (titulo) {
      cerrar();
      transitorio = /transitori/i.test(titulo[2]);
      if (!transitorio) contexto = titulo[2].slice(0, 160);
      continue;
    }
    if (numero !== null) buffer.push(l);
  }
  cerrar();
  return { meta: m, articulos };
}

/* ---------- Catálogo: qué normas se cargan y con qué materia ---------- */

export type EntradaCatalogo = {
  /** Archivo del repositorio (CL-123456.md). */
  archivo: string;
  materia: string;
  nombre: string;
  /** Si se indica, solo se toman artículos cuyo número entero esté entre estos límites (para partir un código por materia). */
  rango?: [number, number];
  /** Si se indica, solo se toma lo que viene bajo esta subnorma del archivo. */
  subnorma?: RegExp;
  /** Si es verdadero, se toma todo lo que NO es subnorma ni está fuera de rangos de otras entradas (el cuerpo principal). */
  principal?: boolean;
  /** Excluye estos rangos (usado en el cuerpo principal cuando se parte el código). */
  excluir?: [number, number][];
  /** Se vuelve a descargar de LeyChile en la revisión automática solo si es la norma completa del archivo. */
  revisable?: boolean;
};

export const CATALOGO: EntradaCatalogo[] = [
  // Laboral (solo textos con contenido propio: las leyes que solo modifican otra ya están dentro del texto consolidado)
  { archivo: "CL-207436.md", materia: "laboral", nombre: "Código del Trabajo", revisable: true },
  { archivo: "CL-1002775.md", materia: "laboral", nombre: "Ley 20.351, protección al empleo y capacitación laboral" },
  { archivo: "CL-1039952.md", materia: "laboral", nombre: "Ley 20.585, otorgamiento y uso de licencias médicas" },
  { archivo: "CL-1086882.md", materia: "laboral", nombre: "Ley 20.891, permiso postnatal parental y sala cuna" },
  { archivo: "CL-1103997.md", materia: "laboral", nombre: "Ley 21.015, inclusión laboral de personas con discapacidad" },
  { archivo: "CL-1195215.md", materia: "laboral", nombre: "Ley 21.592, estatuto de protección del denunciante" },
  { archivo: "CL-1134237.md", materia: "laboral", nombre: "Ley 21.165, jornada parcial alternativa para estudiantes trabajadores" },
  // Consumidor
  { archivo: "CL-1160403.md", materia: "consumidor", nombre: "Ley 19.496, protección de los derechos de los consumidores", revisable: true },
  { archivo: "CL-1146340.md", materia: "consumidor", nombre: "Ley 21.236, portabilidad financiera" },
  // Familia
  { archivo: "CL-172986.md", materia: "familia", nombre: "Código Civil", rango: [102, 337] },
  { archivo: "CL-172986.md", materia: "familia", nombre: "Ley 14.908, abandono de familia y pago de pensiones alimenticias", subnorma: /ABANDONO DE FAMILIA/i },
  { archivo: "CL-172986.md", materia: "familia", nombre: "Ley 16.618, Ley de Menores", subnorma: /LEY DE MENORES/i },
  { archivo: "CL-1075210.md", materia: "familia", nombre: "Ley 20.830, Acuerdo de Unión Civil" },
  { archivo: "CL-1215777.md", materia: "familia", nombre: "Ley 21.760, Ley de Adopción" },
  { archivo: "CL-1204220.md", materia: "familia", nombre: "Ley 21.675, prevenir, sancionar y erradicar la violencia contra las mujeres" },
  { archivo: "CL-1173643.md", materia: "familia", nombre: "Ley 21.430, garantías y protección integral de la niñez y adolescencia" },
  // Arriendos
  { archivo: "CL-172986.md", materia: "arriendo", nombre: "Código Civil", rango: [1915, 2021] },
  { archivo: "CL-1174663.md", materia: "arriendo", nombre: "Ley 21.442, nueva Ley de Copropiedad Inmobiliaria", revisable: true },
  // Penal
  { archivo: "CL-1195119.md", materia: "penal", nombre: "Ley 21.595, Ley de Delitos Económicos" },
  { archivo: "CL-1177743.md", materia: "penal", nombre: "Ley 21.459, delitos informáticos" },
  { archivo: "CL-1113932.md", materia: "penal", nombre: "Ley 21.057, entrevistas grabadas en video a menores víctimas de delitos sexuales" },
  { archivo: "CL-1191935.md", materia: "penal", nombre: "Ley 21.565, protección y reparación integral a víctimas de femicidio" },
  { archivo: "CL-1092269.md", materia: "penal", nombre: "Ley 20.931, aplicación efectiva de penas en robo, hurto y receptación" },
  { archivo: "CL-1024319.md", materia: "penal", nombre: "Ley 20.507, tráfico ilícito de migrantes y trata de personas" },
  { archivo: "CL-1218455.md", materia: "penal", nombre: "Ley 21.780, Servicio Nacional de Acceso a la Justicia y Defensoría de Víctimas" },
  // Civil y otras
  { archivo: "CL-172986.md", materia: "civil", nombre: "Código Civil", principal: true, excluir: [[102, 337], [1915, 2021]] },
  { archivo: "CL-1058072.md", materia: "civil", nombre: "Ley 20.720, reorganización y liquidación de empresas y personas deudoras" },
  { archivo: "CL-5594.md", materia: "civil", nombre: "Ley sobre cuentas corrientes bancarias y cheques" },
  { archivo: "CL-1042092.md", materia: "otra", nombre: "Ley 20.609, medidas contra la discriminación" },
  { archivo: "CL-1158549.md", materia: "otra", nombre: "Ley 21.325, Ley de Migración y Extranjería" },
  { archivo: "CL-242302.md", materia: "otra", nombre: "Constitución Política de la República" },
];

/** Leyes base que el repositorio no trae y que conviene importar desde LeyChile (admin: Biblioteca legal). */
export const LEYES_FALTANTES: { nombre: string; materia: string }[] = [
  { nombre: "Ley 18.101, arrendamiento de predios urbanos", materia: "arriendo" },
  { nombre: "Ley 19.968, Tribunales de Familia", materia: "familia" },
  { nombre: "Ley 20.066, violencia intrafamiliar", materia: "familia" },
  { nombre: "Ley 19.947, matrimonio civil", materia: "familia" },
  { nombre: "Código Penal", materia: "penal" },
  { nombre: "Código Procesal Penal", materia: "penal" },
  { nombre: "Código de Procedimiento Civil", materia: "civil" },
];

export type NormaLista = {
  nombre: string;
  materia: string;
  bcnId: string;
  archivo: string;
  version: string;
  fuente: string;
  piezas: Pieza[];
};

function enteroDe(numero: string): number {
  const m = numero.match(/^\d+/);
  return m ? Number(m[0]) : -1;
}

/** Los artículos muy largos se parten por párrafos para que la búsqueda los encuentre y el informe no cite un muro de texto. */
export function partir(numero: string, texto: string, max = 5000): Pieza[] {
  if (texto.length <= max) return [{ numero, texto }];
  const partes: string[] = [];
  let actual = "";
  for (const p of texto.split(/\n{2,}/)) {
    if (actual && actual.length + p.length > max) { partes.push(actual); actual = ""; }
    actual += (actual ? "\n\n" : "") + p;
    while (actual.length > max * 1.6) { partes.push(actual.slice(0, max)); actual = actual.slice(max); }
  }
  if (actual) partes.push(actual);
  return partes.map((t, i) => ({ numero: i === 0 ? numero : `${numero} (parte ${i + 1})`, texto: t }));
}

/** Arma las normas de una entrada del catálogo a partir del archivo ya leído. */
export function armarNorma(e: EntradaCatalogo, md: string): NormaLista | null {
  const { meta: m, articulos } = leerLegalize(md);
  if (!m.vigente) return null;
  let sel = articulos;
  if (e.subnorma) sel = sel.filter((a) => a.subnorma && e.subnorma!.test(a.subnorma));
  else if (e.principal || e.rango) sel = sel.filter((a) => !a.subnorma);
  if (e.rango) sel = sel.filter((a) => { const n = enteroDe(a.numero); return n >= e.rango![0] && n <= e.rango![1]; });
  if (e.excluir) sel = sel.filter((a) => { const n = enteroDe(a.numero); return !e.excluir!.some(([d, h]) => n >= d && n <= h); });
  if (sel.length === 0) return null;
  const completa = !e.subnorma && !e.rango && !e.principal;
  return {
    nombre: e.nombre,
    materia: e.materia,
    bcnId: e.revisable && completa ? m.idNorma : "",
    archivo: e.rango ? `${e.archivo} [arts. ${e.rango[0]}-${e.rango[1]}]` : e.subnorma ? `${e.archivo} [${e.nombre.split(",")[0]}]` : e.principal ? `${e.archivo} [resto]` : e.archivo,
    version: m.publicacion,
    fuente: `legalize-cl (BCN, Ley Chile)${m.fuente ? " · " + m.fuente : ""}`,
    piezas: sel.flatMap((a) => partir(a.numero, a.texto)),
  };
}
