import { test } from "node:test";
import assert from "node:assert/strict";
import { ALERTAS_BASE, coincide, hayFiltros } from "../lib/alertas";
import { guiaDe, GUIAS } from "../lib/guias";
import { completitud } from "../lib/solicitud-calidad";

const caso = {
  materia: "laboral",
  presupuesto: "Hasta $20.000",
  region: "Metropolitana de Santiago",
  urgencia: "pronto",
  relato: "Me despidieron el 08-11-2026 sin carta. Trabajé 4 años y me deben $1.200.000 de finiquito, además de vacaciones. Quiero saber qué plazo tengo para reclamar.",
};

test("completitud puntúa relatos concretos y señala información faltante", () => {
  const completa = completitud(caso);
  assert.ok(completa.puntaje >= 75);
  assert.equal(completa.nivel, "completa");
  const básica = completitud({ relato: "ayuda", presupuesto: "Prefiero conversarlo", region: "", urgencia: "normal" });
  assert.equal(básica.nivel, "basica");
  assert.ok(básica.falta.length >= 3);
});

test("avisos sin filtros coinciden con todos los casos y filtros restringen", () => {
  assert.equal(coincide(ALERTAS_BASE, caso), true);
  assert.equal(hayFiltros(ALERTAS_BASE), false);
  assert.equal(coincide({ ...ALERTAS_BASE, materias: ["familia"] }, caso), false);
  assert.equal(coincide({ ...ALERTAS_BASE, materias: ["laboral"], presupuestos: ["Hasta $20.000"] }, caso), true);
  assert.equal(coincide({ ...ALERTAS_BASE, presupuestos: ["Más de $150.000"] }, caso), false);
});

test("avisos no excluyen casos que no indican región y respetan desactivación y mínimo", () => {
  assert.equal(coincide({ ...ALERTAS_BASE, regiones: ["Biobío"] }, { ...caso, region: "" }), true);
  assert.equal(coincide({ ...ALERTAS_BASE, regiones: ["Biobío"] }, caso), false);
  assert.equal(coincide({ ...ALERTAS_BASE, activas: false }, caso), false);
  assert.equal(coincide({ ...ALERTAS_BASE, minimo: 90 }, { ...caso, relato: "corto" }), false);
  assert.equal(hayFiltros({ ...ALERTAS_BASE, activas: false }), true);
});

test("guías válidas y cartas generan contenido sin aceptar claves heredadas", () => {
  assert.deepEqual(Object.keys(GUIAS).sort(), ["arriendo", "consumidor", "familia", "laboral"]);
  assert.equal(guiaDe("__proto__"), null);
  for (const guia of Object.values(GUIAS)) {
    if (!guia.carta) continue;
    const valores = Object.fromEntries(guia.carta.campos.map((campo) => [campo.nombre, `valor-${campo.nombre}`]));
    assert.ok(guia.carta.cuerpo(valores).join(" ").includes("valor-nombre"));
  }
});
