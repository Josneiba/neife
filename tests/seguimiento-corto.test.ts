import test from "node:test";
import assert from "node:assert/strict";
import { ALFABETO_CODIGO, generarCodigoCorto, normalizarCodigo } from "../lib/codigo-corto";
import { mensajeDeEstado } from "../lib/seguir";
import { coincideNombre } from "../lib/conflictos";

test("el código corto tiene formato XXXX-XXXX y solo usa el alfabeto sin ambiguos", () => {
  for (let i = 0; i < 300; i++) {
    const c = generarCodigoCorto();
    assert.match(c, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    for (const ch of c.replace("-", "")) assert.ok(ALFABETO_CODIGO.includes(ch));
    assert.equal(normalizarCodigo(c), c);
  }
  assert.ok(!/[01ILO]/.test(ALFABETO_CODIGO));
});

test("normalizarCodigo acepta minúsculas, espacios y sin guion", () => {
  assert.equal(normalizarCodigo("k7m4-9qx2"), "K7M4-9QX2");
  assert.equal(normalizarCodigo(" k7m4 9qx2 "), "K7M4-9QX2");
  assert.equal(normalizarCodigo("K7M49QX2"), "K7M4-9QX2");
});

test("normalizarCodigo rechaza lo que no es un código", () => {
  assert.equal(normalizarCodigo(""), null);
  assert.equal(normalizarCodigo("K7M4-9QX"), null);
  assert.equal(normalizarCodigo("K7M4-9QX20"), null);
  assert.equal(normalizarCodigo("K0M4-9QX2"), null); // 0 no existe en el alfabeto
  assert.equal(normalizarCodigo("ILOL-1010"), null);
});

test("normalizarCodigo sigue reconociendo los códigos antiguos CASO-XXXX-XXXX-XXXX", () => {
  assert.equal(normalizarCodigo("caso-a1b2-c3d4-e5f6"), "CASO-A1B2-C3D4-E5F6");
  assert.equal(normalizarCodigo("CASO-ZZZZ-ZZZZ-ZZZZ"), null);
});

const AHORA = Date.parse("2026-11-14T12:00:00Z");
const hace = (horas: number) => new Date(AHORA - horas * 3600_000).toISOString().slice(0, 19).replace("T", " ");
const base = { confirmado: false, anonimizada: false, ahora: AHORA };

test("sin asesor: normal antes de 24 h, alerta después", () => {
  const a = mensajeDeEstado({ ...base, estado: "nueva", conAsesor: false, creadoEn: hace(3), ultimaActividad: hace(3) });
  assert.equal(a.tono, "info");
  assert.match(a.titulo, /a la vista de los asesores/);
  const b = mensajeDeEstado({ ...base, estado: "nueva", conAsesor: false, creadoEn: hace(30), ultimaActividad: hace(30) });
  assert.equal(b.tono, "alerta");
  assert.match(b.mensaje, /30 horas/);
});

test("con asesor que no responde: avisa que no ha revisado el caso", () => {
  const m = mensajeDeEstado({ ...base, estado: "nueva", conAsesor: true, creadoEn: hace(50), ultimaActividad: hace(50) });
  assert.equal(m.tono, "alerta");
  assert.match(m.titulo, /no responde/);
});

test("caso aceptado: alerta solo si pasan más de 5 días sin novedades", () => {
  const ok = mensajeDeEstado({ ...base, estado: "aceptada", conAsesor: true, creadoEn: hace(100), ultimaActividad: hace(20) });
  assert.equal(ok.tono, "ok");
  const viejo = mensajeDeEstado({ ...base, estado: "aceptada", conAsesor: true, creadoEn: hace(400), ultimaActividad: hace(24 * 6) });
  assert.equal(viejo.tono, "alerta");
  assert.match(viejo.mensaje, /6 días/);
});

test("derivada: distingue si el abogado ya confirmó", () => {
  const e = mensajeDeEstado({ ...base, estado: "derivada", conAsesor: true, creadoEn: hace(200), ultimaActividad: hace(10) });
  assert.match(e.titulo, /Esperando al abogado/);
  const c = mensajeDeEstado({ ...base, estado: "derivada", conAsesor: true, confirmado: true, creadoEn: hace(200), ultimaActividad: hace(10) });
  assert.match(c.titulo, /abogado tomó tu caso/);
});

test("el mensaje de un caso anonimizado no promete datos", () => {
  const m = mensajeDeEstado({ ...base, estado: "cerrada", conAsesor: true, creadoEn: hace(1000), ultimaActividad: hace(900), anonimizada: true });
  assert.match(m.mensaje, /eliminados/);
});

test("conflictos: mismo nombre con tildes y orden distinto coincide", () => {
  assert.ok(coincideNombre("José Pérez Soto", "jose perez soto"));
  assert.ok(coincideNombre("Pérez Soto José", "José Pérez Soto"));
  assert.ok(coincideNombre("José Pérez", "José Andrés Pérez Soto"));
});

test("conflictos: no marca coincidencias por una sola palabra o nombres distintos", () => {
  assert.ok(!coincideNombre("José", "José Pérez"));
  assert.ok(!coincideNombre("José Pérez", "José González"));
  assert.ok(!coincideNombre("", "José Pérez"));
});

test("conflictos: empresas se comparan sin sufijos como SpA o Ltda", () => {
  assert.ok(coincideNombre("Constructora Andes SpA", "Constructora Andes Ltda"));
  assert.ok(coincideNombre("Falabella", "falabella"));
  assert.ok(!coincideNombre("Falabella", "Ripley"));
});
