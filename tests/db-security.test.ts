import { test } from "node:test";
import assert from "node:assert/strict";
import { opcionesConexionSegura } from "../lib/db";

test("no permite rebajar TLS en una conexión remota mediante parámetros del URL", () => {
  const opciones = opcionesConexionSegura(
    "postgres://user:pass@db.example.test/neife?sslmode=disable&ssl=0",
  );
  const url = new URL(opciones.connectionString);
  assert.equal(url.searchParams.has("sslmode"), false);
  assert.equal(url.searchParams.has("ssl"), false);
  assert.deepEqual(opciones.ssl, { rejectUnauthorized: true });
});

test("permite conexiones sin TLS solo para hosts locales", () => {
  const opciones = opcionesConexionSegura(
    "postgres://user@localhost/neife?sslmode=disable",
  );
  assert.equal(new URL(opciones.connectionString).searchParams.get("sslmode"), "disable");
  assert.equal(opciones.ssl, false);
});

test("mantiene la conexión local por defecto de PostgreSQL sin TLS", () => {
  const opciones = opcionesConexionSegura("postgres://user@/neife");
  assert.equal(opciones.ssl, false);
});

test("el bypass de certificados requiere activación explícita", () => {
  const opciones = opcionesConexionSegura("postgres://user@db.example.test/neife", true);
  assert.deepEqual(opciones.ssl, { rejectUnauthorized: false });
});
