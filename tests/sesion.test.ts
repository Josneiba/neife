import { test } from "node:test";
import assert from "node:assert/strict";
import { sesionVigente } from "../lib/auth";

test("mantiene sesiones previas hasta el primer cambio de versión", () => {
  assert.equal(sesionVigente(undefined, 0), true);
  assert.equal(sesionVigente(0, 0), true);
  assert.equal(sesionVigente(0, 1), false);
  assert.equal(sesionVigente("inválida", 0), false);
});
