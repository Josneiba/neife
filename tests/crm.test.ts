import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

// Igual que nucleo.test.ts: Postgres local y un esquema propio que se borra al terminar.
const BASE = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5433/neife";
const ESQUEMA = `tcrm_${process.pid}`;
process.env.DATABASE_URL = `${BASE}${BASE.includes("?") ? "&" : "?"}options=-c%20search_path%3D${ESQUEMA}`;
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.SESSION_SECRET = randomBytes(48).toString("base64url");

before(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: BASE });
  await c.connect();
  await c.query(`CREATE SCHEMA ${ESQUEMA}`);
  await c.end();
});
after(async () => {
  const { cerrarDb } = await import("../lib/db");
  await cerrarDb();
  const { Client } = await import("pg");
  const c = new Client({ connectionString: BASE });
  await c.connect();
  await c.query(`DROP SCHEMA ${ESQUEMA} CASCADE`);
  await c.end();
});

/* ---------- Fechas (puras) ---------- */

test("la semana va de lunes a domingo", async () => {
  const f = await import("../lib/crm/fechas");
  assert.equal(f.inicioSemana("2026-10-30"), "2026-10-26"); // viernes
  assert.equal(f.inicioSemana("2026-11-01"), "2026-10-26"); // domingo
  assert.equal(f.inicioSemana("2026-10-26"), "2026-10-26"); // lunes
  assert.equal(f.finPeriodo("semana", "2026-10-26"), "2026-11-01");
});

test("mes, desplazamientos y fechas inválidas", async () => {
  const f = await import("../lib/crm/fechas");
  assert.equal(f.inicioPeriodo("mes", "2026-10-30"), "2026-10-01");
  assert.equal(f.finPeriodo("mes", "2026-02-01"), "2026-02-28");
  assert.equal(f.sumarPeriodos("mes", "2026-01-01", -1), "2025-12-01");
  assert.equal(f.sumarPeriodos("semana", "2026-10-26", -1), "2026-10-19");
  assert.equal(f.esFecha("2026-02-31"), false);
  assert.equal(f.esFecha("2026-10-30"), true);
  assert.equal(f.esFecha("30-10-2026"), false);
});

test("hoyLocal usa la hora de Chile aunque el servidor esté en UTC", async () => {
  const f = await import("../lib/crm/fechas");
  // 01:30 UTC del 31 de octubre = 22:30 del 30 en Santiago (UTC-3).
  assert.equal(f.hoyLocal(new Date("2026-10-31T01:30:00Z")), "2026-10-30");
  assert.equal(f.hoyLocal(new Date("2026-10-31T12:00:00Z")), "2026-10-31");
});

/* ---------- Servicio (con base de datos) ---------- */

async function dosAbogados() {
  const { getDb } = await import("../lib/db");
  const d = await getDb();
  const ids: number[] = [];
  for (const n of ["a", "b"]) {
    const r = await d.execute({
      sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, 'x', 'abogado', ?, 'activo')",
      args: [`${n}-${Date.now()}-${Math.random()}@t.test`, `Abogado ${n}`],
    });
    ids.push(Number(r.lastInsertRowid));
  }
  return ids;
}

test("crear cliente anota el evento y los datos quedan cifrados", async () => {
  const crm = await import("../lib/crm/servicio");
  const { getDb } = await import("../lib/db");
  const [a] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Cliente Prueba", telefono: "+56 9 1111 2222", materia: "laboral" }, "2026-10-28");
  const otroId = await crm.crearPersona(a, { nombre: "Cliente Prueba", materia: "laboral" }, "2026-10-28");
  const crudo = await (await getDb()).execute({ sql: "SELECT nombre_enc, telefono_enc FROM crm_personas WHERE id = ?", args: [id] });
  assert.ok(String(crudo.rows[0].nombre_enc).startsWith("v1:"));
  assert.ok(!String(crudo.rows[0].telefono_enc).includes("1111"));
  const p = await crm.obtenerPersona(id, a);
  assert.equal(p?.nombre, "Cliente Prueba");
  assert.equal(p?.telefono, "+56 9 1111 2222");
  assert.match(p?.codigoSeguimiento ?? "", /^CRM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.notEqual(p?.codigoSeguimiento, (await crm.obtenerPersona(otroId, a))?.codigoSeguimiento);
  assert.equal((await crm.listarPersonas(a, { q: p!.codigoSeguimiento })).length, 1);
  assert.equal((await crm.listarPersonas(a, { q: p!.codigoSeguimiento.replace(/-/g, "") })).length, 1);
  const c = await crm.contarPeriodos(a, "semana", ["2026-10-26"]);
  assert.equal(c["2026-10-26"].consultas_nuevas, 1);
});

test("un abogado no puede ver ni modificar a los clientes de otro", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a, b] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Solo de A" });
  assert.equal(await crm.obtenerPersona(id, b), null);
  assert.equal((await crm.listarPersonas(b)).length, 0);
  await assert.rejects(() => crm.cambiarEtapa(b, id, "mandato"), /No encontramos/);
  await assert.rejects(() => crm.registrarInteraccion(b, { personaId: id, tipo: "asesoria" }), /No encontramos/);
  await crm.eliminarPersona(b, id); // no borra nada
  assert.ok(await crm.obtenerPersona(id, a));
  // y el conteo de b no se contamina con los eventos de a
  const c = await crm.contarPeriodos(b, "mes", ["2026-10-01"]);
  assert.equal(c["2026-10-01"].consultas_nuevas, 0);
});

test("asesorías cuentan cada vez; reuniones y mandatos cuentan clientes distintos", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const hoy = "2026-10-30";
  const p1 = await crm.crearPersona(a, { nombre: "Uno" }, hoy);
  const p2 = await crm.crearPersona(a, { nombre: "Dos" }, hoy);
  await crm.registrarInteraccion(a, { personaId: p1, tipo: "asesoria", fecha: "2026-10-27" }, hoy);
  await crm.registrarInteraccion(a, { personaId: p1, tipo: "asesoria", fecha: "2026-10-29", conColega: true }, hoy);
  await crm.registrarInteraccion(a, { personaId: p1, tipo: "reunion", fecha: "2026-10-28" }, hoy);
  await crm.registrarInteraccion(a, { personaId: p1, tipo: "audiencia", fecha: "2026-10-29" }, hoy);
  await crm.registrarInteraccion(a, { personaId: p2, tipo: "reunion", fecha: "2026-10-29" }, hoy);
  const c = (await crm.contarPeriodos(a, "semana", ["2026-10-26"]))["2026-10-26"];
  assert.equal(c.asesorias, 2);
  assert.equal(c.asesorias_con_colega, 1);
  assert.equal(c.reuniones, 2); // p1 (2 veces) + p2 = 2 clientes distintos
  assert.equal((await crm.obtenerPersona(p1, a))?.etapa, "en_asesoria");
  assert.equal((await crm.obtenerPersona(p1, a))?.ultimaAsesoria, "2026-10-29");
});

test("los hitos del embudo se cuentan una sola vez por cliente", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Embudo" }, "2026-10-26");
  await crm.cambiarEtapa(a, id, "mandato", "2026-10-27");
  await crm.cambiarEtapa(a, id, "en_asesoria", "2026-10-28");
  await crm.cambiarEtapa(a, id, "mandato", "2026-10-29"); // vuelve a firmar: no cuenta otra vez
  const c = (await crm.contarPeriodos(a, "semana", ["2026-10-26"]))["2026-10-26"];
  assert.equal(c.mandatos, 1);
  await assert.rejects(() => crm.fijarHito(a, id, "2026-13-45", "audiencia"), /fecha no es válida/);
});

test("fijar fecha de hito mueve al cliente a «Con fecha de hito»", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Hito" }, "2026-10-26");
  await crm.fijarHito(a, id, "2026-11-05", "audiencia", "2026-10-27");
  const p = await crm.obtenerPersona(id, a);
  assert.equal(p?.etapa, "con_hito");
  assert.equal(p?.fechaHito, "2026-11-05");
  assert.equal((await crm.contarPeriodos(a, "semana", ["2026-10-26"]))["2026-10-26"].con_hito, 1);
});

test("borrar una interacción corrige los indicadores", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const hoy = "2026-10-30";
  const id = await crm.crearPersona(a, { nombre: "Borrar" }, hoy);
  const i = await crm.registrarInteraccion(a, { personaId: id, tipo: "asesoria", fecha: hoy }, hoy);
  assert.equal((await crm.contarPeriodos(a, "dia", [hoy]))[hoy].asesorias, 1);
  await crm.eliminarInteraccion(a, i);
  assert.equal((await crm.contarPeriodos(a, "dia", [hoy]))[hoy].asesorias, 0);
});

test("no se puede registrar algo en el futuro", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Futuro" });
  await assert.rejects(() => crm.registrarInteraccion(a, { personaId: id, tipo: "asesoria", fecha: "2099-01-01" }, "2026-10-30"), /todavía no llega/);
});

test("la meta rige desde su período hacia adelante y hay valor base", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  assert.equal((await crm.metasVigentes(a, "semana", "2026-10-26")).consultas_nuevas, 6); // base
  await crm.fijarMeta(a, "consultas_nuevas", "semana", "2026-10-28", 9); // se normaliza al lunes 26
  assert.equal((await crm.metasVigentes(a, "semana", "2026-10-19")).consultas_nuevas, 6);
  assert.equal((await crm.metasVigentes(a, "semana", "2026-10-26")).consultas_nuevas, 9);
  assert.equal((await crm.metasVigentes(a, "semana", "2026-11-09")).consultas_nuevas, 9);
  await assert.rejects(() => crm.fijarMeta(a, "consultas_nuevas", "semana", "2026-10-26", -1), /entero/);
  await assert.rejects(() => crm.fijarMeta(a, "casos_resueltos", "semana", "2026-10-26", 2), /no tiene meta/);
  const h = await crm.historial(a, "consultas_nuevas", "semana", "2026-11-02", 3);
  assert.deepEqual(h.map((x) => x.meta), [6, 9, 9]);
});

test("tareas, grupos y planes", async () => {
  const crm = await import("../lib/crm/servicio");
  const [a, b] = await dosAbogados();
  const pid = await crm.crearPersona(a, { nombre: "Grupo" });
  const t = await crm.crearTarea(a, { texto: "Pedir documentos", personaId: pid, vence: "2026-11-02" });
  assert.equal((await crm.listarTareas(a)).length, 1);
  await crm.alternarTarea(b, t); // otro abogado: sin efecto
  assert.equal((await crm.listarTareas(a)).length, 1);
  await crm.alternarTarea(a, t);
  assert.equal((await crm.listarTareas(a)).length, 0);
  await crm.asegurarGrupos(a);
  await crm.asegurarGrupos(a); // no duplica
  const gs = await crm.listarGrupos(a);
  assert.equal(gs.length, 8);
  await crm.alternarGrupoPersona(a, gs[0].id, pid);
  assert.equal((await crm.listarPersonas(a, { grupoId: gs[0].id })).length, 1);
  await assert.rejects(() => crm.alternarGrupoPersona(b, gs[0].id, pid), /No encontramos/);
  await assert.rejects(() => crm.crearGrupo(a, gs[0].nombre), /Ya tienes/);
  await crm.crearPlan(a, { fuente: "red", fecha: "2026-11-02", texto: "Café con colega" });
  assert.equal((await crm.contarPlanes(a, "2026-10-26", "2026-11-01")).red, 0);
  assert.equal((await crm.contarPlanes(a, "2026-11-02", "2026-11-08")).red, 1);
});

test("importar un caso aceptado pasa los datos cifrados, cuenta el cliente nuevo y no duplica", async () => {
  const crm = await import("../lib/crm/servicio");
  const { getDb } = await import("../lib/db");
  const { cifrar } = await import("../lib/crypto");
  const [a] = await dosAbogados();
  const d = await getDb();
  const otro = await d.execute({
    sql: `INSERT INTO solicitudes (codigo, codigo_seguimiento, asesor_id, materia, relato_enc, nombre_enc, email_enc, telefono_enc, estado)
          VALUES (?, ?, ?, 'familia', ?, ?, ?, '', 'aceptada')`,
    args: [`cod-${Date.now()}-otro`, `CASO-otro-${Date.now()}`, a, cifrar("relato", "solicitud.relato"), cifrar("Otra Persona Web", "solicitud.nombre"), cifrar("otra@ejemplo.test", "solicitud.email")],
  });
  const codigoSeguimiento = `CASO-web-${Date.now()}`;
  const actual = await d.execute({
    sql: `INSERT INTO solicitudes (codigo, codigo_seguimiento, asesor_id, materia, relato_enc, nombre_enc, email_enc, telefono_enc, estado)
          VALUES (?, ?, ?, 'familia', ?, ?, ?, '', 'aceptada')`,
    args: [`cod-${Date.now()}`, codigoSeguimiento, a, cifrar("relato", "solicitud.relato"), cifrar("Persona Web", "solicitud.nombre"), cifrar("w@ejemplo.test", "solicitud.email")],
  });
  assert.equal(await crm.solicitudesPorImportar(a), 2);
  assert.equal(await crm.importarSolicitudes(a, actual.lastInsertRowid), 1);
  assert.equal(await crm.importarSolicitudes(a, actual.lastInsertRowid), 0);
  const personas = await crm.listarPersonas(a);
  assert.equal(personas.length, 1);
  const [p] = personas;
  assert.equal(p.nombre, "Persona Web");
  assert.equal(p.email, "w@ejemplo.test");
  assert.equal(p.etapa, "en_asesoria");
  assert.equal(p.origen, "web");
  assert.equal(p.codigoSeguimiento, codigoSeguimiento); // se conserva el código de la solicitud
  const { hoyLocal, inicioSemana } = await import("../lib/crm/fechas");
  const conteos = await crm.contarPeriodos(a, "semana", [inicioSemana(hoyLocal())]);
  assert.equal(conteos[inicioSemana(hoyLocal())].consultas_nuevas, 1);
  assert.equal(await crm.solicitudesPorImportar(a), 1);
});

test("las tablas crm_ tienen la seguridad por filas activada", async () => {
  const { getDb } = await import("../lib/db");
  const d = await getDb();
  const r = await d.execute(
    `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema() AND c.relkind = 'r' AND c.relname LIKE 'crm\\_%' AND NOT c.relrowsecurity`,
  );
  assert.deepEqual(r.rows, []);
});

/* ======================= v2: progreso, citas, derivaciones, avisos, mapa ======================= */

test("evaluarCaso: sube con los datos y marca «casi listo» / «listo»", async () => {
  const { evaluarCaso } = await import("../lib/crm/progreso");
  const crm = await import("../lib/crm/servicio");
  const [a] = await dosAbogados();
  const id = await crm.crearPersona(a, { nombre: "Prueba Progreso", materia: "laboral", comuna: "Maipú", region: "Metropolitana de Santiago", origen: "web", tipo: "natural" });
  const p = (await crm.obtenerPersona(id, a))!;
  const vacio = evaluarCaso(p, { asesorias: 0, pasosTotal: 0, pasosListos: 0, citasFuturas: 0, tieneDerivacion: false }, "2026-11-01");
  const lleno = evaluarCaso(p, { asesorias: 2, pasosTotal: 4, pasosListos: 4, citasFuturas: 1, tieneDerivacion: false }, "2026-11-01");
  assert.ok(lleno.pct > vacio.pct);
  assert.ok(vacio.faltantes.length > lleno.faltantes.length);
  assert.ok(vacio.pct >= 0 && lleno.pct <= 100);
  assert.equal(vacio.listo, false);
});

test("citas: se crean, avisan cruces y «realizada» crea el registro (y deja de contarlo al revertir)", async () => {
  const crm = await import("../lib/crm/servicio");
  const citas = await import("../lib/crm/servicio-citas");
  const [a, b] = await dosAbogados();
  const pid = await crm.crearPersona(a, { nombre: "Cita Cliente", materia: "familia", origen: "web", tipo: "natural" });
  const hoy = "2026-11-01";
  const c1 = await citas.crearCita(a, { tipo: "asesoria", fecha: hoy, horaIni: "10:00", horaFin: "11:00", personaId: pid });
  const c2 = await citas.crearCita(a, { tipo: "reunion", fecha: hoy, horaIni: "10:30", horaFin: "11:30", personaId: pid });
  assert.equal(c1.cruces, 0);
  assert.equal(c2.cruces, 1);
  await assert.rejects(() => citas.crearCita(a, { tipo: "asesoria", fecha: hoy, horaIni: "12:00", horaFin: "11:00", personaId: pid }));
  assert.equal((await citas.listarCitas(a, hoy, hoy)).length, 2);
  assert.equal((await citas.listarCitas(b, hoy, hoy)).length, 0, "otro abogado no ve las citas");
  await citas.cambiarEstadoCita(a, c1.id, "realizada", hoy);
  const ints = await crm.listarInteracciones(pid, a);
  assert.equal(ints.filter((i) => i.tipo === "asesoria").length, 1);
  await citas.cambiarEstadoCita(a, c1.id, "pendiente", hoy);
  assert.equal((await crm.listarInteracciones(pid, a)).filter((i) => i.tipo === "asesoria").length, 0);
});

test("derivaciones: cuenta al aceptar al colega y resume comisiones", async () => {
  const crm = await import("../lib/crm/servicio");
  const seg = await import("../lib/crm/servicio-seguimiento");
  const { hoyLocal, inicioSemana } = await import("../lib/crm/fechas");
  const [a, b] = await dosAbogados();
  const pid = await crm.crearPersona(a, { nombre: "Derivado Uno", materia: "penal", origen: "web", tipo: "natural" });
  await assert.rejects(() => seg.guardarDerivacion(a, { personaId: pid, colega: "X", comisionTipo: "porcentaje", comisionValor: 150 }));
  const hoy = hoyLocal();
  await seg.guardarDerivacion(a, { personaId: pid, colega: "Abg. Pérez", comisionTipo: "monto", comisionValor: 100000, comisionEstado: "acordada", resultado: "en_curso", satisfaccion: 0 }, hoy);
  assert.equal((await crm.obtenerPersona(pid, a))!.etapa, "derivado");
  let conteos = await crm.contarPeriodos(a, "semana", [inicioSemana(hoy)]);
  assert.equal(conteos[inicioSemana(hoy)].derivaciones, 0, "una derivación pendiente no cuenta como conexión aceptada");
  await seg.guardarDerivacion(a, { personaId: pid, colega: "Abg. Pérez", comisionTipo: "monto", comisionValor: 100000, comisionEstado: "cobrada", comisionCobrada: 80000, resultado: "aceptado", satisfaccion: 5 }, hoy);
  await seg.guardarDerivacion(a, { personaId: pid, colega: "Abg. Pérez", comisionTipo: "monto", comisionValor: 100000, comisionEstado: "cobrada", comisionCobrada: 80000, resultado: "aceptado", satisfaccion: 5 }, hoy);
  conteos = await crm.contarPeriodos(a, "semana", [inicioSemana(hoy)]);
  assert.equal(conteos[inicioSemana(hoy)].derivaciones, 1, "aceptar y volver a guardar no duplica el indicador");
  const lista = await seg.listarDerivaciones(a);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].colega, "Abg. Pérez");
  const r = seg.resumenPorColega(lista);
  assert.equal(r[0].comisionPorCobrar, 0);
  assert.equal(r[0].comisionCobrada, 80000);
  assert.equal(r[0].satisfaccion, 5);
  const informes = await import("../lib/crm/servicio-informes");
  const mensual = await informes.resumenMensual(a, `${hoy.slice(0, 7)}-01`);
  assert.equal(mensual.derivaciones.comisionAcordada, 100000);
  assert.equal(mensual.derivaciones.comisionCobrada, 80000);
  assert.equal((await seg.listarDerivaciones(b)).length, 0);
});

test("ubicación: se guarda cifrada y se lee redondeada", async () => {
  const crm = await import("../lib/crm/servicio");
  const { getDb } = await import("../lib/db");
  const [a] = await dosAbogados();
  const pid = await crm.crearPersona(a, { nombre: "Mapa Uno", materia: "civil", origen: "web", tipo: "natural", lat: -33.4567891, lng: -70.6543219 });
  const p = (await crm.obtenerPersona(pid, a))!;
  assert.equal(p.lat, -33.45679);
  assert.equal(p.lng, -70.65432);
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT ubicacion_enc FROM crm_personas WHERE id = ?", args: [pid] });
  assert.ok(!String(r.rows[0].ubicacion_enc).includes("33.45"), "no queda en claro");
});

test("avisos y segmentos de planificación", async () => {
  const crm = await import("../lib/crm/servicio");
  const av = await import("../lib/crm/servicio-avisos");
  const plan = await import("../lib/crm/servicio-planificacion");
  const [a] = await dosAbogados();
  const hoy = "2026-11-01";
  await crm.crearPersona(a, { nombre: "Sin Contacto", materia: "laboral", origen: "web", tipo: "natural" }, "2026-10-01");
  const lista = await av.avisos(a, { hoy, hora: "09:00" });
  assert.ok(lista.length >= 1);
  await av.ocultarAviso(a, lista[0].clave, 1, hoy);
  const despues = await av.avisos(a, { hoy, hora: "09:00" });
  assert.equal(despues.length, lista.length - 1);
  const ini = "2026-10-26";
  const segs = await plan.segmentos(a, ini, hoy);
  assert.ok(segs.every((s) => s.conPlan <= s.total));
  const cont = await av.contadoresGestion(a, hoy);
  assert.equal(typeof cont.sin_seguimiento, "number");
});
