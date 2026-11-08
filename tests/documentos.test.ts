import { test } from "node:test";
import assert from "node:assert/strict";
import { analizarTexto, detectarArticulos, detectarRuts } from "../lib/documentos";

const CARTA = `Santiago, 12 de marzo de 2024
Señor Juan Pérez Soto, RUT 12.345.678-5
Comunico a usted que hemos resuelto poner término a su contrato de trabajo, a contar del 15/03/2024, por la causal del artículo 161 inciso primero del Código del Trabajo, necesidades de la empresa.
Los hechos en que se funda la causal son la reestructuración de la sucursal. Se pagará indemnización sustitutiva por $1.250.000 y feriado proporcional por $380.500. Cotizaciones previsionales no se encuentran al día. Ver también arts. 162 y 163 del Código del Trabajo.`;

test("carta de despido: tipo, fechas, montos, RUT y artículos", () => {
  const a = analizarTexto(CARTA, 1);
  assert.equal(a.tipo, "carta_despido");
  assert.deepEqual(a.fechas.map((f) => f.iso), ["2024-03-12", "2024-03-15"]);
  assert.ok(a.montos.includes("$1.250.000") && a.montos.includes("$380.500"));
  assert.deepEqual(a.ruts, ["12.345.678-5"]);
  const arts = a.articulos.map((x) => `${x.norma} ${x.numero}`);
  assert.ok(arts.includes("Código del Trabajo 161") && arts.includes("Código del Trabajo 162") && arts.includes("Código del Trabajo 163"));
  assert.ok(a.lineasClave.length >= 1);
});

test("RUT con dígito incorrecto no se acepta", () => {
  assert.deepEqual(detectarRuts("RUT 12.345.678-9 y 12.345.678-5"), ["12.345.678-5"]);
});

test("artículos de leyes por número y sin norma identificable", () => {
  const r = detectarArticulos("Infringe el artículo 12 de la Ley N° 19.496 y el artículo 28 de la ley 19.496. También el artículo 99 sin más datos.");
  assert.deepEqual(r.map((x) => `${x.norma} ${x.numero}`), ["Ley 19.496 12", "Ley 19.496 28"]);
});

test("sentencia: causa, tribunal, partes", () => {
  const a = analizarTexto(`SENTENCIA DEFINITIVA\nSantiago, 3 de junio de 2023\nRIT O-1234-2023\n1° Juzgado de Letras del Trabajo de Santiago\nVistos: demandante: María González Rojas; demandado: Comercial Andes Limitada.\nSe condena a la demandada a pagar $2.400.000 por indemnización. Se rechaza la demanda de nulidad del despido.`);
  assert.equal(a.tipo, "sentencia");
  assert.deepEqual(a.causa, ["RIT O-1234-2023"]);
  assert.match(a.tribunal, /Juzgado de Letras del Trabajo de Santiago/);
  assert.ok(a.partes.some((p) => p.rol === "demandante" && /María González Rojas/.test(p.nombre)));
});

import { aplicarComparacionVersion, parsearNorma } from "../lib/leychile";
import { coincideConFuente, fuentePorClave, FUENTES_WEB } from "../lib/fuentes";

const xml = (titulo: string, tipo: string, numero: string) => `<?xml version="1.0"?><Norma normaId="999" fechaVersion="2024-01-01"><Metadatos><Identificador><TiposNumeros><TipoNumero><Tipo>${tipo}</Tipo><Numero>${numero}</Numero></TipoNumero></TiposNumeros></Identificador><TituloNorma>${titulo}</TituloNorma></Metadatos><EstructurasFuncionales><EstructuraFuncional tipoParte="Artículo"><Texto>Artículo 1°.- Texto.</Texto></EstructuraFuncional></EstructurasFuncionales></Norma>`;

test("LeyChile parser recognizes abbreviated article headings", () => {
  const documento = xml("Código de ejemplo", "Código", "")
    .replace("Artículo 1°.- Texto.", "Art\uFFFDculo 2° Texto.")
    .replace(
      "</EstructuraFuncional></EstructurasFuncionales>",
      "</EstructuraFuncional><EstructuraFuncional tipoParte=\"Artículo\"><Texto>Art 3° Otro texto.</Texto></EstructuraFuncional></EstructurasFuncionales>",
    );
  const norma = parsearNorma(documento);
  assert.deepEqual(norma.piezas.map((pieza) => pieza.numero), ["2", "3"]);
  assert.match(norma.piezas[0].texto, /Artículo 2°/);
});

test("LeyChile applies official version diffs only when the old text matches", () => {
  const actual = [{ numero: "497", texto: "Art. 497. Texto anterior. Párrafo nuevo & vigente." }];
  const pares = [
    [
      [{ t: "Art. 497. Texto anterior.<br>" }],
      [{ t: "Art. 497. Texto anterior.<br>" }, { c: "a", t: "Párrafo nuevo &amp; vigente.<br>" }],
    ],
  ];

  const actualizado = aplicarComparacionVersion([{ numero: "497", texto: "Art. 497. Texto anterior." }], pares);
  assert.match(actualizado[0].texto, /Párrafo nuevo & vigente/);
  assert.deepEqual(aplicarComparacionVersion(actual, pares), actual);
  assert.throws(
    () => aplicarComparacionVersion([{ numero: "497", texto: "Texto distinto." }], pares),
    /no coincide con la versión anterior/,
  );
});

test("fuentes web: solo se acepta la norma esperada", () => {
  const penal = fuentePorClave("codigo-penal")!;
  const n1 = parsearNorma(xml("CÓDIGO PENAL", "Código", ""));
  assert.ok(coincideConFuente(penal, n1.titulo, n1.identificadores));
  const cpp = parsearNorma(xml("CÓDIGO PROCESAL PENAL", "Ley", "19696"));
  assert.ok(!coincideConFuente(penal, cpp.titulo, cpp.identificadores), "el Código Procesal Penal no pasa por el Código Penal");
  const fam = fuentePorClave("ley-19968")!;
  const l = parsearNorma(xml("CREA LOS TRIBUNALES DE FAMILIA", "Ley", "19968"));
  assert.deepEqual(l.identificadores, ["Ley 19968"]);
  assert.ok(coincideConFuente(fam, l.titulo, l.identificadores));
  const otra = parsearNorma(xml("ESTABLECE NORMAS SOBRE PROTECCIÓN DE LOS DERECHOS DE LOS CONSUMIDORES", "Ley", "19496"));
  for (const f of FUENTES_WEB) assert.ok(!coincideConFuente(f, otra.titulo, otra.identificadores), `${f.clave} no debe aceptar la ley de consumidores`);
});
