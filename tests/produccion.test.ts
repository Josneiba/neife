import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { cronAutorizado } from "../lib/cron";

test("cronAutorizado valida el secreto y rechaza secretos ausentes o distintos", () => {
  const anterior = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "secreto-de-prueba";
  try {
    assert.equal(
      cronAutorizado(new NextRequest("https://neife.test/api/cron", {
        headers: { authorization: "Bearer secreto-de-prueba" },
      })),
      true,
    );
    assert.equal(
      cronAutorizado(new NextRequest("https://neife.test/api/cron", {
        headers: { authorization: "Bearer no-coincide" },
      })),
      false,
    );
    assert.equal(
      cronAutorizado(new NextRequest("https://neife.test/api/cron")),
      false,
    );
  } finally {
    if (anterior === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = anterior;
  }
});

test("cronAutorizado falla de forma segura si no hay secreto configurado", () => {
  const anterior = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    assert.equal(
      cronAutorizado(new NextRequest("https://neife.test/api/cron", {
        headers: { authorization: "Bearer cualquiera" },
      })),
      false,
    );
  } finally {
    if (anterior !== undefined) process.env.CRON_SECRET = anterior;
  }
});
