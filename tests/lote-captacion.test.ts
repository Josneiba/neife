import { test } from "node:test";
import assert from "node:assert/strict";
import { plazoDe, sumarDiasHabiles, sumarMeses } from "../lib/plazos";
import { aniosDeServicio, calcularFiniquito } from "../lib/finiquito";
import { aUtcChile, crearIcs } from "../lib/ics";
import { esquemaSolicitud } from "../lib/validators";

test("fecha del hecho rechaza fechas normalizadas", () => {
  const campoFecha = esquemaSolicitud.shape.fecha_hecho;
  assert.equal(campoFecha.safeParse("2026-02-28").success, true);
  assert.equal(campoFecha.safeParse("2026-02-31").success, false);
});

test("días hábiles saltan fines de semana", () => {
  assert.equal(sumarDiasHabiles("2026-11-13", 1), "2026-11-16"); // viernes → lunes
  assert.equal(sumarDiasHabiles("2026-11-13", 5), "2026-11-20");
});

test("meses calendario respetan fin de mes", () => {
  assert.equal(sumarMeses("2026-08-31", 6), "2027-02-28");
  assert.equal(sumarMeses("2026-11-14", 6), "2027-05-14");
});

test("plazo laboral: tonos según días restantes", () => {
  const p = plazoDe("laboral", "2026-09-01", "2026-11-14");
  assert.ok(p);
  assert.equal(p.limite, sumarDiasHabiles("2026-09-01", 60));
  const vencido = plazoDe("laboral", "2026-01-05", "2026-11-14");
  assert.equal(vencido?.tono, "vencido");
  assert.equal(plazoDe("familia", "2026-09-01", "2026-11-14"), null);
  assert.equal(plazoDe("laboral", "", "2026-11-14"), null);
});

test("años de servicio: fracción mayor a 6 meses suma uno; tope 11", () => {
  assert.equal(aniosDeServicio("2020-01-10", "2023-01-10"), 3);
  assert.equal(aniosDeServicio("2020-01-10", "2023-09-10"), 4);
  assert.equal(aniosDeServicio("2020-01-10", "2023-05-10"), 3);
  assert.equal(aniosDeServicio("2000-01-01", "2026-01-01"), 11);
  assert.equal(aniosDeServicio("2026-01-01", "2026-03-01"), 0);
});

test("finiquito por necesidades de la empresa, sin aviso", () => {
  const r = calcularFiniquito({ inicio: "2020-01-10", termino: "2023-01-10", remuneracion: 1_000_000, causal: "necesidades", avisoPrevio: false, diasVacaciones: 6, uf: 40_000 });
  assert.equal(r.total, 3_000_000 + 1_000_000 + 200_000);
});

test("el tope de 90 UF se aplica a las indemnizaciones", () => {
  const r = calcularFiniquito({ inicio: "2020-01-10", termino: "2022-01-10", remuneracion: 5_000_000, causal: "necesidades", avisoPrevio: true, diasVacaciones: 0, uf: 40_000 });
  assert.equal(r.total, 3_600_000 * 2);
});

test("renuncia solo paga vacaciones", () => {
  const r = calcularFiniquito({ inicio: "2020-01-10", termino: "2023-01-10", remuneracion: 900_000, causal: "renuncia", avisoPrevio: false, diasVacaciones: 10, uf: 0 });
  assert.equal(r.total, 300_000);
});

test("hora de Chile a UTC y archivo .ics", () => {
  assert.equal(aUtcChile("2026-11-17", "10:00").toISOString(), "2026-11-17T13:00:00.000Z"); // verano UTC-3
  assert.equal(aUtcChile("2026-07-17", "10:00").toISOString(), "2026-07-17T14:00:00.000Z"); // invierno UTC-4
  const ics = crearIcs({ uid: "x1", fecha: "2026-11-17", horaIni: "10:00", horaFin: "10:30", titulo: "Asesoría, caso K7M4-9QX2" });
  assert.match(ics, /DTSTART:20261117T130000Z/);
  assert.match(ics, /SUMMARY:Asesoría\\, caso K7M4-9QX2/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});
