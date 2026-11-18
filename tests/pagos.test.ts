import test from "node:test";
import assert from "node:assert/strict";
import { rutValido, formatearRut, numeroCuentaValido, ocultarCuenta, operacionValida, fechaTransferenciaValida, limpiarRut } from "../lib/pagos";

test("RUT: dígito verificador módulo 11", () => {
  assert.equal(rutValido("12.345.678-5"), true);
  assert.equal(rutValido("11.111.111-1"), true);
  assert.equal(rutValido("7.654.321-6"), true);
  assert.equal(rutValido("12.345.678-9"), false);
  assert.equal(rutValido("1-9"), false);
  assert.equal(rutValido(""), false);
  assert.equal(rutValido("12345678-K"), false);
});

test("RUT: K y formato", () => {
  assert.equal(rutValido("10.000.013-K"), true);
  assert.equal(rutValido("10000013-k"), true);
  assert.equal(formatearRut("123456785"), "12.345.678-5");
  assert.equal(limpiarRut("12.345.678-5"), "123456785");
});

test("número de cuenta: solo dígitos entre 6 y 20", () => {
  assert.equal(numeroCuentaValido("123456789"), true);
  assert.equal(numeroCuentaValido("12 3456-789"), true);
  assert.equal(numeroCuentaValido("12345"), false);
  assert.equal(numeroCuentaValido("12345abc678"), false);
  assert.equal(numeroCuentaValido("4".repeat(21)), false);
});

test("cuenta oculta muestra solo los últimos 4", () => {
  assert.equal(ocultarCuenta("123456789"), "••••6789");
  assert.equal(ocultarCuenta("12"), "12");
});

test("operación y fecha de la transferencia", () => {
  assert.equal(operacionValida("ABC-12345"), true);
  assert.equal(operacionValida("12"), false);
  assert.equal(operacionValida("<script>"), false);
  const hoy = new Date("2026-11-16T15:00:00Z");
  assert.equal(fechaTransferenciaValida("2026-11-16", hoy), true);
  assert.equal(fechaTransferenciaValida("2026-11-10", hoy), true);
  assert.equal(fechaTransferenciaValida("2026-11-17", hoy), false);
  assert.equal(fechaTransferenciaValida("2026-08-18", hoy), true);
  assert.equal(fechaTransferenciaValida("2026-08-17", hoy), false);
  assert.equal(fechaTransferenciaValida("2026-12-20", hoy), false);
  assert.equal(fechaTransferenciaValida("2026-01-01", hoy), false);
  assert.equal(fechaTransferenciaValida("16-11-2026", hoy), false);
  assert.equal(fechaTransferenciaValida("2026-02-31", hoy), false);
});
