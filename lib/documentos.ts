/**
 * Lectura de documentos que la persona o la contraparte le envía al abogado (carta de despido, contrato, demanda,
 * sentencia, liquidación de sueldo…). Es un extractor de reglas, sin IA: busca lo que un abogado marcaría con
 * destacador para armar el informe. Todo se muestra como «detectado», para que el abogado lo confirme.
 */

export type TipoDocumento =
  | "carta_despido" | "finiquito" | "contrato_trabajo" | "liquidacion" | "contrato_arriendo"
  | "demanda" | "sentencia" | "resolucion" | "notificacion" | "carta_cobranza" | "otro";

export const NOMBRE_TIPO: Record<TipoDocumento, string> = {
  carta_despido: "Carta de despido",
  finiquito: "Finiquito",
  contrato_trabajo: "Contrato de trabajo",
  liquidacion: "Liquidación de sueldo",
  contrato_arriendo: "Contrato de arriendo",
  demanda: "Demanda o escrito",
  sentencia: "Sentencia",
  resolucion: "Resolución judicial",
  notificacion: "Notificación",
  carta_cobranza: "Cobranza",
  otro: "Documento",
};

export type ArticuloCitado = { norma: string; numero: string };
export type FechaDetectada = { iso: string; texto: string; contexto: string };
export type AnalisisDocumento = {
  tipo: TipoDocumento;
  paginas: number;
  caracteres: number;
  fechas: FechaDetectada[];
  montos: string[];
  ruts: string[];
  causa: string[]; // RIT / ROL / RUC
  tribunal: string;
  partes: { rol: string; nombre: string }[];
  articulos: ArticuloCitado[];
  lineasClave: string[];
};

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const dos = (n: number) => String(n).padStart(2, "0");
function iso(d: number, m: number, a: number): string {
  if (a < 100) a += a > 50 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || a < 1950 || a > 2100) return "";
  return `${a}-${dos(m)}-${dos(d)}`;
}

export function limpiar(texto: string): string {
  return texto.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function contextoDe(texto: string, pos: number, largo: number): string {
  const ini = Math.max(texto.lastIndexOf("\n", pos - 1) + 1, pos - 90);
  const fin = Math.min(pos + largo + 70, texto.indexOf("\n", pos + largo) === -1 ? texto.length : texto.indexOf("\n", pos + largo));
  return texto.slice(ini, fin).replace(/\s+/g, " ").trim();
}

export function detectarFechas(texto: string): FechaDetectada[] {
  const salida: FechaDetectada[] = [];
  const vistos = new Set<string>();
  const poner = (f: string, t: string, pos: number) => {
    if (!f) return;
    const k = f + "|" + t;
    if (vistos.has(k)) return;
    vistos.add(k);
    salida.push({ iso: f, texto: t, contexto: contextoDe(texto, pos, t.length) });
  };
  const re1 = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de(?:l)?\s+)?(\d{4})\b/gi;
  for (const m of texto.matchAll(re1)) poner(iso(+m[1], MESES[m[2].toLowerCase()], +m[3]), m[0], m.index ?? 0);
  const re2 = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\b/g;
  for (const m of texto.matchAll(re2)) poner(iso(+m[1], +m[2], +m[3]), m[0], m.index ?? 0);
  return salida.sort((a, b) => a.iso.localeCompare(b.iso)).slice(0, 20);
}

export function detectarMontos(texto: string): string[] {
  const set = new Set<string>();
  for (const m of texto.matchAll(/\$\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?|\$\s?\d{4,}\b|\b\d{1,3}(?:\.\d{3})*(?:,\d+)?\s?(?:UF|U\.F\.|UTM)\b/g)) set.add(m[0].replace(/\s+/g, " ").trim());
  return [...set].slice(0, 15);
}

function digitoRut(cuerpo: string): string {
  let suma = 0, mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * mult; mult = mult === 7 ? 2 : mult + 1; }
  const r = 11 - (suma % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
}

/** Solo RUT con dígito verificador correcto: así no se confunde con otros números. */
export function detectarRuts(texto: string): string[] {
  const set = new Set<string>();
  for (const m of texto.matchAll(/\b(\d{1,2}(?:\.\d{3}){2}|\d{7,8})-([\dkK])\b/g)) {
    const cuerpo = m[1].replace(/\./g, "");
    if (digitoRut(cuerpo) === m[2].toUpperCase()) set.add(`${Number(cuerpo).toLocaleString("es-CL")}-${m[2].toUpperCase()}`);
  }
  return [...set].slice(0, 8);
}

export function detectarCausa(texto: string): string[] {
  const set = new Set<string>();
  for (const m of texto.matchAll(/\b(RIT|ROL|RUC|Rol\s+Interno)\s*(?:N[°º.]?\s*)?:?\s*([A-Z]?-?\d{1,6}-\d{4}(?:-\d)?)/g)) set.add(`${m[1].toUpperCase().startsWith("ROL") || m[1].startsWith("Rol") ? "ROL" : m[1]} ${m[2]}`);
  return [...set].slice(0, 6);
}

const TRIBUNALES = /\b((?:\d{1,2}[°º]?\s+)?(?:Juzgado\s+(?:de\s+)?(?:Letras\s+(?:del\s+Trabajo|de\s+Familia|en\s+lo\s+Civil|y\s+Garant[ií]a)|Civil|de\s+Familia|de\s+Garant[ií]a|de\s+Cobranza\s+Laboral\s+y\s+Previsional)|Juzgado\s+del\s+Trabajo|Corte\s+de\s+Apelaciones|Corte\s+Suprema|Tribunal\s+de\s+Juicio\s+Oral\s+en\s+lo\s+Penal|Juzgado\s+de\s+Polic[ií]a\s+Local)(?:\s+de\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)?)?)/;

export function detectarTribunal(texto: string): string {
  const m = texto.match(TRIBUNALES);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

const ROLES = "demandante|demandado|demandada|requirente|requerido|requerida|recurrente|recurrido|arrendador|arrendadora|arrendatario|arrendataria|trabajador|trabajadora|empleador|empleadora|deudor|deudora|acreedor|acreedora|vendedor|comprador|querellante|querellado|denunciante|denunciado";

export function detectarPartes(texto: string): { rol: string; nombre: string }[] {
  const salida: { rol: string; nombre: string }[] = [];
  const vistos = new Set<string>();
  const re = new RegExp(`\\b(${ROLES})\\s*[:\\-–]\\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+(?:\\s+(?:de|del|la|los|las|y|e)?\\s*[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+){1,5})`, "gi");
  for (const m of texto.matchAll(re)) {
    const nombre = m[2].trim().replace(/\s+/g, " ");
    const k = m[1].toLowerCase() + nombre.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    salida.push({ rol: m[1].toLowerCase(), nombre });
  }
  return salida.slice(0, 8);
}

const NORMAS_NOMBRADAS: [RegExp, string][] = [
  [/c[oó]digo\s+del\s+trabajo|\bC\.?\s?T\.?\b/i, "Código del Trabajo"],
  [/c[oó]digo\s+civil|\bC\.?\s?C\.?\b(?!\w)/i, "Código Civil"],
  [/c[oó]digo\s+penal/i, "Código Penal"],
  [/c[oó]digo\s+procesal\s+penal/i, "Código Procesal Penal"],
  [/c[oó]digo\s+de\s+procedimiento\s+civil/i, "Código de Procedimiento Civil"],
  [/constituci[oó]n/i, "Constitución Política de la República"],
];

/**
 * Artículos citados: «artículo 160 N° 7 del Código del Trabajo», «art. 12 de la Ley N° 19.496», «arts. 161 y 168 del Código del Trabajo».
 * Se devuelven como {norma, numero}; el sistema los busca luego en la biblioteca.
 */
export function detectarArticulos(texto: string): ArticuloCitado[] {
  const salida: ArticuloCitado[] = [];
  const vistos = new Set<string>();
  const re = /\bart(?:[ií]culos?|s?\.)\s*((?:\d{1,4}\s?(?:bis|ter|quáter|quater)?(?:\s*(?:,|y|e|o)\s*)?)+)((?:(?!\bart(?:[ií]culos?|s?\.))[^;\n]){0,80}?)(?=\.\s|\.$|[;\n]|$|\s+y\s+(?:el\s+)?art)/gi;
  for (const m of texto.matchAll(re)) {
    const numeros = [...m[1].matchAll(/(\d{1,4})\s?(bis|ter|quáter|quater)?/gi)].map((x) => (x[1] + (x[2] ? " " + x[2].toLowerCase() : "")).trim());
    const resto = m[2] ?? "";
    let norma = "";
    const ley = resto.match(/\bley\s*(?:n[°º.]?\s*)?(\d{1,2}\.\d{3})/i);
    if (ley) norma = `Ley ${ley[1]}`;
    else for (const [r, nombre] of NORMAS_NOMBRADAS) if (r.test(resto)) { norma = nombre; break; }
    if (!norma) continue; // sin norma identificable no se puede ubicar el artículo
    for (const n of numeros) {
      const k = norma + "|" + n;
      if (!vistos.has(k)) { vistos.add(k); salida.push({ norma, numero: n }); }
    }
  }
  return salida.slice(0, 20);
}

const CLAVES = /\b(resuelv[eo]|ordena|condena|rechaza|acoge|se\s+declara|t[eé]ngase|apercib|plazo\s+de|dentro\s+de\s+(?:\d+|cinco|diez|quince|treinta|sesenta)|d[ií]as\s+h[aá]biles|d[ií]as\s+corridos|aud?iencia|comparecer|notific|pr[eé]stese|indemnizaci[oó]n|incumpl|deuda|adeuda|mora|despid|t[eé]rmino\s+del?\s+contrato|necesidades\s+de\s+la\s+empresa|causal|desahucio|restituir|embargo|prescrip|multa)\b/i;

export function lineasClave(texto: string, max = 12): string[] {
  const frases = texto.replace(/\n+/g, " ").split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ0-9"«])/);
  const salida: string[] = [];
  const vistos = new Set<string>();
  for (const f of frases) {
    const t = f.trim();
    if (t.length < 30 || t.length > 420 || !CLAVES.test(t)) continue;
    const k = t.slice(0, 80).toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    salida.push(t);
    if (salida.length >= max) break;
  }
  return salida;
}

export function detectarTipo(texto: string): TipoDocumento {
  const t = texto.slice(0, 6000).toLowerCase();
  const tiene = (...re: RegExp[]) => re.some((r) => r.test(t));
  if (tiene(/finiquito/, /pago\s+y\s+recibo/ ) && tiene(/t[eé]rmino\s+(?:del\s+)?contrato|declara\s+recibir|otorga\s+el\s+m[aá]s\s+amplio/)) return "finiquito";
  if (tiene(/carta\s+de\s+(?:aviso\s+de\s+)?(?:t[eé]rmino|despido)/, /comunico\s+a\s+usted\s+que.{0,80}(?:t[eé]rmino|despid)/, /art[ií]culo\s+16[0-3]/) && tiene(/hechos\s+en\s+que\s+se\s+funda|necesidades\s+de\s+la\s+empresa|causal|aviso\s+de\s+t[eé]rmino/)) return "carta_despido";
  if (tiene(/sentencia\s+definitiva|vistos\s*[:,]|y\s+teniendo\s+presente|se\s+declara\s*:|se\s+condena/) && tiene(/sentencia/)) return "sentencia";
  if (tiene(/liquidaci[oó]n\s+de\s+(?:sueldo|remuneraciones)/, /total\s+haberes/, /descuentos\s+previsionales/)) return "liquidacion";
  if (tiene(/contrato\s+de\s+trabajo/) && tiene(/empleador/, /trabajador/)) return "contrato_trabajo";
  if (tiene(/contrato\s+de\s+(?:arrendamiento|arriendo)/, /arrendador/) && tiene(/arrendatari[oa]/, /renta/)) return "contrato_arriendo";
  if (tiene(/en\s+lo\s+principal/, /\botros[ií]\s*:/, /por\s+tanto,?\s+(?:y\s+)?(?:en\s+m[eé]rito|ruego)/, /^\s*(?:demanda|querella|recurso)\b/)) return "demanda";
  if (tiene(/cobranza/, /deuda\s+vencida/, /regularice\s+su\s+(?:deuda|situaci[oó]n)/, /\bmora\b/) && tiene(/\$\s?\d/, /monto/)) return "carta_cobranza";
  if (tiene(/notificaci[oó]n/, /por\s+cédula|por\s+carta\s+certificada/)) return "notificacion";
  if (tiene(/\bresuelvo\b|t[eé]ngase\s+presente|c[uú]mplase|notif[ií]quese|a\s+lo\s+principal\s*:/, /proveyendo/)) return "resolucion";
  return "otro";
}

export function analizarTexto(textoCrudo: string, paginas = 0): AnalisisDocumento {
  const texto = limpiar(textoCrudo);
  return {
    tipo: detectarTipo(texto),
    paginas,
    caracteres: texto.length,
    fechas: detectarFechas(texto),
    montos: detectarMontos(texto),
    ruts: detectarRuts(texto),
    causa: detectarCausa(texto),
    tribunal: detectarTribunal(texto),
    partes: detectarPartes(texto),
    articulos: detectarArticulos(texto),
    lineasClave: lineasClave(texto),
  };
}
