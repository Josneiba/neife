import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync, readFileSync } from "node:fs";
import PDFDocument from "pdfkit";

// Las pruebas usan un Postgres local (TEST_DATABASE_URL) y aplican la baseline en un esquema aislado.
const BASE = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/neife";
const ESQUEMA_PRUEBA = `t_${process.pid}`;
process.env.DATABASE_URL = `${BASE}${BASE.includes("?") ? "&" : "?"}options=-c%20search_path%3D${ESQUEMA_PRUEBA}`;
before(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: BASE });
  await c.connect();
  await c.query(`CREATE SCHEMA ${ESQUEMA_PRUEBA}`);
  await c.query(`SET search_path TO "${ESQUEMA_PRUEBA}"`);
  await c.query('CREATE TABLE "_prisma_migrations" (migration_name TEXT NOT NULL, finished_at TIMESTAMPTZ, rolled_back_at TIMESTAMPTZ)');
  await c.query(readFileSync("prisma/migrations/0_baseline/migration.sql", "utf8"));
  await c.query(readFileSync("prisma/migrations/20261027000000_registro_version_terminos/migration.sql", "utf8"));
  await c.query(readFileSync("prisma/migrations/20261030000000_verificacion_email/migration.sql", "utf8"));
  await c.query('INSERT INTO "_prisma_migrations" (migration_name, finished_at) VALUES (\'0_baseline\', now())');
  await c.query('INSERT INTO "_prisma_migrations" (migration_name, finished_at) VALUES (\'20261027000000_registro_version_terminos\', now())');
  await c.query('INSERT INTO "_prisma_migrations" (migration_name, finished_at) VALUES (\'20261030000000_verificacion_email\', now())');
  await c.end();
});
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.SESSION_SECRET = randomBytes(48).toString("base64url");

after(async () => {
  const { cerrarDb } = await import("../lib/db");
  await cerrarDb();
  const { Client } = await import("pg");
  const c = new Client({ connectionString: BASE });
  await c.connect();
  await c.query(`DROP SCHEMA ${ESQUEMA_PRUEBA} CASCADE`);
  await c.query("SET search_path TO public");
  await c.end();
});

test("cifrado: ida y vuelta, y falla si cambia el contexto o el dato", async () => {
  const { cifrar, descifrar } = await import("../lib/crypto");
  const c = cifrar("Me despidieron sin aviso", "solicitud.relato");
  assert.ok(c.startsWith("v1:"));
  assert.ok(!c.includes("despidieron"));
  assert.equal(descifrar(c, "solicitud.relato"), "Me despidieron sin aviso");
  assert.throws(() => descifrar(c, "solicitud.email"));
  const roto = c.slice(0, -4) + (c.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.throws(() => descifrar(roto, "solicitud.relato"));
  assert.notEqual(cifrar("igual", "x"), cifrar("igual", "x"), "cada cifrado usa un IV distinto");
});

test("términos: el borrador no se confunde con una versión publicada", async () => {
  const { TERMINOS_BASE, leerTerminos, validarContenidoTerminos } = await import("../lib/terminos");
  const base = await leerTerminos();
  assert.equal(base.publicado, false);
  assert.equal(base.version, 0);
  assert.ok(TERMINOS_BASE.includes("[[COMPLETAR:"));
  assert.match(validarContenidoTerminos("texto corto") ?? "", /demasiado corto/);

  const contenido = TERMINOS_BASE.replace(/\[\[[^\]]+\]\]/g, "Responsable legal verificado");
  assert.equal(validarContenidoTerminos(contenido), undefined);
  const borradorAdjunto = `${"Términos de uso. ".repeat(40)}
    Última actualización: [día, mes y año]
    Titular: [nombre completo o razón social]
    RUT: [RUT del titular]
    Domicilio: [domicilio comercial o legal]
    Correo electrónico: [correo de contacto]`;
  assert.match(validarContenidoTerminos(borradorAdjunto) ?? "", /campos pendientes entre corchetes/);
  const db = await import("../lib/db").then((m) => m.getDb());
  await db.execute({
    sql: "INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor",
    args: ["terminos_publicados", JSON.stringify({ version: 3, publicadoEn: "2026-06-04T12:00:00.000Z", contenido })],
  });
  const publicado = await leerTerminos();
  assert.equal(publicado.publicado, true);
  assert.equal(publicado.version, 3);
  assert.equal(publicado.contenido, contenido);
  await db.execute({ sql: "DELETE FROM meta WHERE clave = ?", args: ["terminos_publicados"] });
});

test("limpieza de datos personales", async () => {
  const { limpiarDatosPersonales } = await import("../lib/limpiar");
  const r = limpiarDatosPersonales(
    "Mi RUT es 12.345.678-5, escríbeme a juan.perez@correo.cl o llama al +56 9 8765 4321. Trabajé 3 años.",
  );
  assert.ok(!r.texto.includes("12.345.678"));
  assert.ok(!r.texto.includes("juan.perez"));
  assert.ok(!r.texto.includes("8765"));
  assert.equal(r.quitados, 3);
  assert.ok(r.texto.includes("Trabajé 3 años"));
});

test("separa artículos con distintos formatos de encabezado", async () => {
  const { dividirArticulos } = await import("../lib/normas");
  const texto = [
    "Preámbulo que se ignora",
    "Artículo 1°.- Primer texto",
    "que sigue en otra línea.",
    "Art. 2.- Segundo texto, que cita el artículo 5 de otra ley.",
    "ARTÍCULO 3º",
    "Tercer texto en línea aparte.",
    "Artículo 3 bis.- Texto bis.",
    "el artículo 12 del código dice algo y no es un encabezado.",
  ].join("\n");
  const { modo, piezas } = dividirArticulos(texto);
  assert.equal(modo, "articulos");
  assert.deepEqual(
    piezas.map((p) => p.numero),
    ["1", "2", "3", "3 bis"],
  );
  assert.ok(piezas[0].texto.startsWith("Primer texto que sigue en otra línea"));
  assert.ok(piezas[3].texto.includes("no es un encabezado"));
});

test("los títulos y capítulos no quedan pegados al artículo anterior", async () => {
  const { dividirArticulos } = await import("../lib/normas");
  const texto = [
    "Artículo 1°.- Primer texto.",
    "TÍTULO II. DE LAS REMUNERACIONES",
    "Artículo 2°.- Segundo texto.",
    "Párrafo 3° De los plazos",
    "Artículo 3°.- Tercer texto.",
    "CAPÍTULO PRIMERO",
    "Artículo 4°.- Cuarto texto, que dice título claro y sin mayúsculas.",
  ].join("\n");
  const { piezas } = dividirArticulos(texto);
  assert.equal(piezas.length, 4);
  assert.equal(piezas[0].texto, "Primer texto.");
  assert.equal(piezas[1].texto, "Segundo texto.");
  assert.equal(piezas[2].texto, "Tercer texto.");
  assert.ok(piezas[3].texto.includes("título claro"));
});

test("documentos sin artículos se guardan por secciones", async () => {
  const { dividirArticulos } = await import("../lib/normas");
  const parrafo = "Texto de un informe sin artículos numerados. ".repeat(20);
  const { modo, piezas } = dividirArticulos([parrafo, parrafo, parrafo, parrafo].join("\n\n"));
  assert.equal(modo, "secciones");
  assert.ok(piezas.length >= 2);
});

test("carga la norma de ejemplo y encuentra los artículos correctos", async () => {
  const { crearNorma, buscarArticulos, eliminarNorma } = await import("../lib/normas");
  const texto = readFileSync("ejemplos/norma-de-ejemplo.txt", "utf8");
  const r = await crearNorma({ nombre: "Ejemplo", materia: "laboral", fuente: "", archivo: "x.txt", usuarioId: null, texto, bcnId: "123456" });
  assert.equal(r.modo, "articulos");
  assert.equal(r.piezas, 9);

  // "despedido / despido" y "finiquito": deben salir los artículos 1-4, no los de pensiones
  const a = await buscarArticulos("Me despidieron sin carta de aviso y no me pagaron el finiquito", { materia: "laboral" });
  assert.ok(a.length > 0);
  assert.equal(a[0].bcnId, "123456");
  assert.ok(["2", "3"].includes(a[0].numero), `el primero fue el artículo ${a[0].numero}`);
  assert.ok(!a.slice(0, 3).some((x) => x.numero === "8" || x.numero === "9"));

  // pensión de alimentos
  const b = await buscarArticulos("mi ex no paga la pensión de alimentos de mi hijo");
  assert.ok(["8", "9"].includes(b[0].numero), `el primero fue el artículo ${b[0].numero}`);

  // filtro por materia: familia no tiene nada cargado
  assert.equal((await buscarArticulos("despido", { materia: "familia" })).length, 0);
  // consulta de puras palabras comunes
  assert.deepEqual(await buscarArticulos("yo no es la de"), []);
  // caracteres raros no rompen la consulta
  await buscarArticulos('despido" OR * NEAR( ) -- ;');

  await eliminarNorma(r.normaId);
  assert.equal((await buscarArticulos("despido")).length, 0, "al borrar la norma se borra también del índice");
});

test("sugerencias: un relato de arriendo no recibe artículos de familia por fallback", async () => {
  const { crearNorma, buscarArticulos, eliminarNorma } = await import("../lib/normas");
  const familia = await crearNorma({
    nombre: "Ley mock familia",
    materia: "familia",
    fuente: "",
    archivo: "mock-familia.txt",
    usuarioId: null,
    texto: readFileSync("ejemplos/mock-familia.txt", "utf8"),
  });
  const arriendo = await crearNorma({
    nombre: "Ley mock arriendo",
    materia: "arriendo",
    fuente: "",
    archivo: "mock-arriendos.txt",
    usuarioId: null,
    texto: readFileSync("ejemplos/mock-arriendos.txt", "utf8"),
  });
  const relatoArriendo =
    "Mi arrendador no repara las filtraciones graves del departamento pese a mis reclamos escritos y quiero conocer mis opciones.";

  assert.deepEqual(await buscarArticulos(relatoArriendo, { materia: "familia" }), []);
  assert.ok((await buscarArticulos(relatoArriendo, { materia: "arriendo" })).length > 0);
  assert.deepEqual(await buscarArticulos(relatoArriendo, { materia: "otra" }), []);
  assert.deepEqual(
    await buscarArticulos(
      "Tengo un problema con un contrato y no sé qué área legal corresponde; necesito conocer mis opciones.",
      { materia: "otra" },
    ),
    [],
  );

  await eliminarNorma(familia.normaId);
  await eliminarNorma(arriendo.normaId);
});

test("lee un PDF real y lo separa por artículo", async () => {
  const { extraerTexto, dividirArticulos } = await import("../lib/normas");
  const pdf: Buffer = await new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4" });
    const trozos: Buffer[] = [];
    doc.on("data", (t: Buffer) => trozos.push(t));
    doc.on("end", () => resolve(Buffer.concat(trozos)));
    doc.fontSize(12).text("Artículo 1°.- El arrendador entregará la propiedad en buen estado.");
    doc.text("Artículo 2°.- El arrendatario pagará la renta dentro de los primeros cinco días del mes.");
    doc.text("Artículo 3°.- La garantía será devuelta al término del contrato.");
    doc.end();
  });
  const texto = await extraerTexto(pdf, "ley.pdf");
  const { modo, piezas } = dividirArticulos(texto);
  assert.equal(modo, "articulos");
  assert.equal(piezas.length, 3);
  assert.ok(piezas[1].texto.includes("renta"));
});

test("genera el PDF del informe con tildes y artículos", async () => {
  const { generarPdf } = await import("../lib/informe-pdf");
  const { contenidoVacio } = await import("../lib/datos");
  const { extraerTexto } = await import("../lib/normas");
  const buf = await generarPdf({
    folio: "ABCD1234",
    fecha: "17 de octubre de 2026",
    asesorNombre: "Asesor de Prueba",
    asesorTitulo: "Estudiante de Derecho",
    contenido: {
      ...contenidoVacio(),
      materia: "laboral",
      resumen: "Me despidieron sin aviso y no recibí el finiquito. ¿Qué plazo tengo?",
      normas: [
        { articuloId: 1, norma: "Norma de ejemplo", numero: "2", texto: "El empleador deberá entregar una carta de aviso. ".repeat(60), incluir: true, comentario: "Revisar fecha de la carta." },
        { articuloId: 2, norma: "Otra", numero: "9", texto: "No debe aparecer.", incluir: false, comentario: "" },
      ],
      puntos: "Verificar el plazo para reclamar.",
      documentos: ["Contrato de trabajo", "Liquidaciones de sueldo"],
      preguntas: ["¿Qué plazos corren en mi situación?"],
      abogadoDestino: "Abogada Ejemplo",
      observaciones: "",
    },
  });
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  const texto = await extraerTexto(buf, "informe.pdf");
  assert.ok(texto.includes("Informe de orientación"));
  assert.ok(texto.includes("Me despidieron sin aviso"));
  assert.ok(texto.includes("Norma de ejemplo"));
  assert.ok(!texto.includes("No debe aparecer"));
  assert.ok(texto.includes("Folio ABCD1234"));
});

test("el límite de intentos corta después del máximo", async () => {
  const { permitir } = await import("../lib/ratelimit");
  const r: boolean[] = [];
  for (let i = 0; i < 5; i++) r.push(await permitir("prueba", 3, 1000));
  assert.deepEqual(r, [true, true, true, false, false]);
});

test("etapas: avance, siguiente paso y faltantes", async () => {
  const { avance, siguientePaso, faltantes } = await import("../lib/etapas");
  assert.equal(avance("nueva"), 1);
  assert.equal(avance("cerrada"), 6);
  assert.equal(avance("rechazada"), 0);
  const base = { estado: "aceptada", derivarOk: false, abogadoDestino: "", pendientesAbiertos: 2, informe: null };
  assert.equal(siguientePaso(base).accion, "informe");
  assert.equal(siguientePaso({ ...base, estado: "informe", informe: { estado: "final", entregado: false } }).accion, "entregar");
  assert.equal(siguientePaso({ ...base, estado: "entregada", derivarOk: true }).accion, "derivar");
  const f = faltantes(base, ["Contrato de trabajo"]);
  assert.ok(f.includes("Contrato de trabajo") && f.includes("Informe final") && f.includes("Abogado de destino"));
  assert.deepEqual(faltantes({ ...base, estado: "cerrada" }, []), []);
});

test("etapas: abogado asociado, resultado y días", async () => {
  const { siguientePaso, estadoAbogado, nombreResultado, diasDesde } = await import("../lib/etapas");
  const d = { estado: "derivada", derivarOk: true, abogadoDestino: "Abogada X", pendientesAbiertos: 0, informe: null };
  assert.equal(siguientePaso(d).accion, "confirmar");
  assert.equal(siguientePaso({ ...d, abogadoConfirmado: true }).accion, "cerrar");
  assert.equal(estadoAbogado({ estado: "derivada", abogadoDestino: "X", abogadoConfirmado: false }), "esperando");
  assert.equal(estadoAbogado({ estado: "derivada", abogadoDestino: "X", abogadoConfirmado: true }), "confirmado");
  assert.equal(estadoAbogado({ estado: "entregada", abogadoDestino: "", abogadoConfirmado: false }), "sin");
  assert.equal(nombreResultado("con_abogado"), "Con abogado");
  assert.equal(diasDesde("2026-10-10", Date.parse("2026-10-17T12:00:00")), 7);
});

test("db: traduce ? a $n, fechas e id devuelto", async () => {
  const { traducir } = await import("../lib/db");
  const t = traducir("INSERT INTO pendientes (solicitud_id, texto_enc) VALUES (?, ?)", [1, "x"]);
  assert.equal(t.texto, "INSERT INTO pendientes (solicitud_id, texto_enc) VALUES ($1, $2) RETURNING id");
  assert.equal(traducir("UPDATE solicitudes SET actualizado_en = datetime('now') WHERE id = ?").texto, "UPDATE solicitudes SET actualizado_en = ahora() WHERE id = $1");
  assert.ok(!traducir("INSERT INTO perfiles (usuario_id) VALUES (?)").texto.includes("RETURNING"));
});

test("limpieza: rechaza plazos menores a un mes", async () => {
  const { eliminarSolicitudesAntiguas } = await import("../lib/limpieza");
  await assert.rejects(eliminarSolicitudesAntiguas(0), /número de meses válido/);
});

test("tokens: valen una sola vez y vencen", async () => {
  const { getDb } = await import("../lib/db");
  const { crearCodigoIngreso, crearToken, gastarCodigoIngreso, tokenValido, gastarToken } = await import("../lib/tokens");
  const d = await getDb();
  const u = await d.execute({ sql: "INSERT INTO usuarios (email, password_hash, rol, nombre) VALUES (?, 'x', 'cliente', 'T')", args: ["tok@mail.test"] });
  const id = Number(u.lastInsertRowid);
  const t = await crearToken(id, "recuperar", 60);
  assert.equal(await tokenValido(t, "recuperar"), id);
  assert.equal(await tokenValido(t, "otro"), null);
  assert.equal(await gastarToken(t, "recuperar"), id);
  assert.equal(await gastarToken(t, "recuperar"), null, "segundo uso rechazado");
  const vencido = await crearToken(id, "recuperar", -1);
  assert.equal(await tokenValido(vencido, "recuperar"), null);
  const codigo = await crearCodigoIngreso(id, "tok@mail.test");
  assert.match(codigo, /^\d{6}$/);
  assert.equal(await gastarCodigoIngreso(codigo, "otro@mail.test"), null, "el código queda ligado al correo");
  assert.equal(await gastarCodigoIngreso(codigo, "tok@mail.test"), id);
  assert.equal(await gastarCodigoIngreso(codigo, "tok@mail.test"), null, "el código solo se usa una vez");
  const anterior = await crearCodigoIngreso(id, "tok@mail.test");
  await crearCodigoIngreso(id, "tok@mail.test");
  assert.equal(await gastarCodigoIngreso(anterior, "tok@mail.test"), null, "un código nuevo invalida el anterior");
  const codigoVencido = await crearCodigoIngreso(id, "tok@mail.test", -1);
  assert.equal(await gastarCodigoIngreso(codigoVencido, "tok@mail.test"), null, "el código vencido no se acepta");
});

test("errores: traduce fallas técnicas a frases claras", async () => {
  const { mensajeError } = await import("../lib/errores");
  assert.match(mensajeError(new Error("connect ECONNREFUSED 127.0.0.1:5432"), "guardar"), /conectarnos/);
  assert.match(mensajeError(new Error("algo raro"), "guardar tu solicitud"), /No pudimos guardar tu solicitud/);
});

test("biblioteca: detecta la materia y nombra el archivo", async () => {
  const { detectarMateria, detectarMateriaRelato, nombreDeArchivo } = await import("../lib/materia-auto");
  const { normalizarConsulta } = await import("../lib/normas");
  assert.equal(detectarMateria("El empleador deberá pagar la remuneración y el finiquito del trabajador. Despido, cotizaciones previsionales, jornada y feriado del trabajador.", "Código del Trabajo"), "laboral");
  assert.equal(detectarMateria("El arrendador y el arrendatario acuerdan la renta del arriendo de la vivienda; desahucio y garantía del inmueble arrendado.", "Ley de arrendamiento"), "arriendo");
  assert.equal(detectarMateria("Texto sin relación con ninguna materia en particular, sobre jardines y plantas.", "Apuntes"), "otra");
  assert.equal(detectarMateriaRelato("Me despidieron y no me han pagado el finiquito ni las remuneraciones pendientes."), "laboral");
  assert.equal(detectarMateriaRelato("Me ecahon del tabjo, no me apado el finiquito."), "laboral");
  assert.equal(detectarMateriaRelato("No sé cuál es el problema legal; quiero saber qué puedo hacer."), null);
  assert.match(normalizarConsulta("Me ecahon del tabjo, no me apado el finiquito."), /echaron del trabajo, no me pagado el finiquito/);
  assert.match(normalizarConsulta("No sé cuál es el problema legal; quiero saber qué puedo hacer."), /quiero saber/);
  assert.equal(nombreDeArchivo("ley_19496-consumidor.pdf"), "Ley 19496 consumidor");
});

test("biblioteca: la revisión reemplaza solo lo que cambió de versión y anota las fallas", async () => {
  const { getDb } = await import("../lib/db");
  const { crearNorma } = await import("../lib/normas");
  const { revisarNormas } = await import("../lib/revision-normas");
  const xml = (version: string, texto: string) => `<?xml version="1.0" encoding="UTF-8"?>
<Norma xmlns="http://www.leychile.cl/esquemas" normaId="555" fechaVersion="${version}" derogado="no derogado">
 <Metadatos><TituloNorma>LEY DE REVISION</TituloNorma></Metadatos>
 <EstructurasFuncionales><EstructuraFuncional tipoParte="Artículo" idParte="1" derogado="no derogado"><Texto>Artículo 1°.- ${texto}</Texto></EstructuraFuncional></EstructurasFuncionales>
</Norma>`;
  await crearNorma({ nombre: "Ley de revisión", materia: "civil", fuente: "", archivo: "x.xml", usuarioId: null, piezas: [{ numero: "1", texto: "Texto viejo" }], bcnId: "555", version: "2020-01-01" });
  const mismo = await revisarNormas({ descargar: async () => xml("2020-01-01", "Texto viejo") });
  assert.equal(mismo.sinCambios, 1);
  assert.equal(mismo.actualizadas.length, 0);
  const cambio = await revisarNormas({ descargar: async () => xml("2026-05-05", "Texto nuevo vigente") });
  assert.deepEqual(cambio.actualizadas, ["Ley de revisión"]);
  const d = await getDb();
  const r = await d.execute("SELECT n.version, a.texto FROM normas n JOIN articulos a ON a.norma_id = n.id WHERE n.bcn_id = '555'");
  assert.equal(r.rows.length, 1);
  assert.equal(String(r.rows[0].version), "2026-05-05");
  assert.match(String(r.rows[0].texto), /nuevo/);
  const falla = await revisarNormas({ descargar: async () => { throw new Error("sin conexión"); } });
  assert.equal(falla.fallidas.length, 1);
  const e = await d.execute("SELECT error_revision FROM normas WHERE bcn_id = '555'");
  assert.match(String(e.rows[0].error_revision), /sin conexión/);
});

test("LeyChile: lee el XML por artículo, omite derogados y reconoce el número", async () => {
  const { parsearNorma, idNormaDesde, urlNormaLeyChile, NORMAS_HABITUALES } = await import("../lib/leychile");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Norma xmlns="http://www.leychile.cl/esquemas" normaId="999" fechaVersion="2026-07-23" derogado="no derogado">
 <Metadatos><TituloNorma>LEY DE PRUEBA</TituloNorma></Metadatos>
 <EstructurasFuncionales>
  <EstructuraFuncional tipoParte="Título" idParte="1" derogado="no derogado">
   <Texto>TITULO I</Texto>
   <EstructurasFuncionales>
    <EstructuraFuncional tipoParte="Artículo" idParte="2" derogado="no derogado"><Texto>Artículo 1º.- El trabajador tendrá derecho a feriado.</Texto></EstructuraFuncional>
    <EstructuraFuncional tipoParte="Artículo" idParte="3" derogado="derogado"><Texto>Artículo 2º.- Derogado.</Texto></EstructuraFuncional>
    <EstructuraFuncional tipoParte="Artículo" idParte="4" derogado="no derogado"><Texto>Artículo 3º bis.- El empleador pagará el finiquito.</Texto></EstructuraFuncional>
    <EstructuraFuncional tipoParte="Art&#237;culo" idParte="6" derogado="no derogado"><Texto>Art&#237;culo 4&#186;.- El trabajador recibir&#225; finiquito.</Texto></EstructuraFuncional>
   </EstructurasFuncionales>
  </EstructuraFuncional>
  <EstructuraFuncional tipoParte="Artículo" transitorio="transitorio" idParte="5" derogado="no derogado"><Texto>Artículo primero.- Esta ley rige desde su publicación.</Texto></EstructuraFuncional>
 </EstructurasFuncionales>
</Norma>`;
  const n = parsearNorma(xml);
  assert.equal(n.titulo, "LEY DE PRUEBA");
  assert.equal(n.version, "2026-07-23");
  assert.deepEqual(n.piezas.map((p) => p.numero), ["1", "3 bis", "4", "primero transitorio"]);
  assert.ok(n.piezas[1].texto.includes("finiquito"));
  assert.ok(n.piezas[2].texto.includes("recibirá finiquito"));
  assert.equal(parsearNorma(xml.replace('fechaVersion="2026-07-23"', 'fechaVersion="2222-02-02"')).version, "");
  assert.equal(idNormaDesde("207436"), "207436");
  assert.equal(idNormaDesde("https://www.bcn.cl/leychile/navegar?idNorma=207436&idVersion=2026"), "207436");
  assert.equal(idNormaDesde("https://www.bcn.cl/leychile/navegar?i=1181003"), "1181003");
  assert.equal(idNormaDesde("https://malo.example.com/?idNorma=1"), null);
  assert.equal(idNormaDesde("https://evilbcn.cl/leychile/navegar?idNorma=1"), null);
  assert.equal(urlNormaLeyChile("207436"), "https://www.bcn.cl/leychile/navegar?idNorma=207436");
  assert.equal(
    urlNormaLeyChile(NORMAS_HABITUALES.find((n) => n.nombre === "Código Penal")?.id ?? ""),
    "https://www.bcn.cl/leychile/navegar?idNorma=1984",
  );
  assert.equal(
    urlNormaLeyChile("172986", "8720734"),
    "https://www.bcn.cl/leychile/navegar?idNorma=172986&idParte=8720734",
  );
  assert.equal(urlNormaLeyChile(""), null);
  assert.equal(urlNormaLeyChile("207436&next=example"), null);
  assert.throws(() => parsearNorma("<otra/>"));
});

test("meta semanal y embudo: cuentan solo lo de los últimos 7 y 30 días; borrar elimina todo el caso", async () => {
  const { getDb } = await import("../lib/db");
  const { cifrar } = await import("../lib/crypto");
  const { resumenSemana } = await import("../lib/datos");
  const { embudo30 } = await import("../lib/admin-datos");
  const d = await getDb();
  const u = await d.execute({
    sql: "INSERT INTO usuarios (email, nombre, password_hash, rol, estado) VALUES (?, ?, ?, 'abogado', 'activo')",
    args: ["meta@test.cl", "Meta", "x"],
  });
  const uid = Number(u.rows[0].id);
  await d.execute({ sql: "INSERT INTO perfiles (usuario_id, slug, meta_semanal) VALUES (?, ?, 2)", args: [uid, "meta-test"] });
  const nueva = async (codigo: string, confirmado: number, dias: number) => {
    const r = await d.execute({
      sql: `INSERT INTO solicitudes (codigo, asesor_id, materia, relato_enc, nombre_enc, email_enc, abogado_confirmado, creado_en, actualizado_en)
            VALUES (?, ?, 'laboral', ?, ?, ?, ?, ahora(?), ahora(?))`,
      args: [codigo, uid, cifrar("r", "solicitud.relato"), cifrar("n", "solicitud.nombre"), cifrar("e@e.cl", "solicitud.email"), confirmado, -dias, -dias],
    });
    return Number(r.rows[0].id);
  };
  await nueva("A1", 1, 1);
  await nueva("A2", 1, 20);
  const id3 = await nueva("A3", 0, 2);
  const s = await resumenSemana(uid);
  assert.deepEqual(s, { nuevas: 2, confirmados: 1, meta: 2 });
  const e = await embudo30();
  assert.equal(e[1].n, 3);
  assert.equal(e[4].n, 2);
  await d.execute({ sql: "INSERT INTO pendientes (solicitud_id, texto_enc) VALUES (?, ?)", args: [id3, cifrar("x", "pendiente.texto")] });
  await d.execute({ sql: "DELETE FROM solicitudes WHERE id = ?", args: [id3] });
  const resto = await d.execute({ sql: "SELECT COUNT(*) AS n FROM pendientes WHERE solicitud_id = ?", args: [id3] });
  assert.equal(Number(resto.rows[0].n), 0);
});

test("informe: completitud según la estructura de un dictamen y cronología desde el relato", async () => {
  const { completitudInforme, cronologiaDesdeRelato } = await import("../lib/informe-completitud");
  const { contenidoVacio } = await import("../lib/datos");
  const vacio = completitudInforme(contenidoVacio(), 0);
  assert.equal(vacio.total, 8);
  assert.ok(vacio.faltan.includes("Conclusiones y recomendaciones"));
  const crono = cronologiaDesdeRelato("Trabajé desde 2021. Me despidieron el 12 de marzo sin aviso. Estoy muy angustiado. Hace tres meses no me pagan.");
  assert.ok(crono.includes("12 de marzo") && crono.includes("2021") && !crono.includes("angustiado"));
  const c = { ...contenidoVacio(), objeto: "Orientar sobre un despido sin causal", resumen: "x".repeat(50), cronologia: "12/03 despido",
    derechos: ["a"], vias: "Inspección del Trabajo", plazos: "60 días hábiles", conclusiones: "Podría aplicar el Código del Trabajo.", abogadoDestino: "Laboral",
    normas: [{ articuloId: 1, norma: "CT", numero: "161", texto: "t", incluir: true, comentario: "" }] };
  assert.equal(completitudInforme(c, 0).hechos, 8);
  assert.equal(completitudInforme(c, 2).hechos, 7);
});

test("privacidad: anonimiza al terminar, salvo que la persona pida conservar los datos", async () => {
  const { getDb } = await import("../lib/db");
  const { cifrar } = await import("../lib/crypto");
  const { purgarTerminadas } = await import("../lib/privacidad");
  const d = await getDb();
  const asesor = (await d.execute("SELECT id FROM usuarios WHERE email = 'meta@test.cl'")).rows[0];
  const crear = async (codigo: string, estado: string, conservar: number, confirmado: number, dias: number) => {
    const r = await d.execute({
      sql: `INSERT INTO solicitudes (codigo, asesor_id, materia, relato_enc, nombre_enc, email_enc, estado, conservar_datos, abogado_confirmado, actualizado_en)
            VALUES (?, ?, 'laboral', ?, ?, ?, ?, ?, ?, ahora(?))`,
      args: [codigo, Number(asesor.id), cifrar("relato", "solicitud.relato"), cifrar("Ana", "solicitud.nombre"), cifrar("a@a.cl", "solicitud.email"), estado, conservar, confirmado, -dias],
    });
    const id = Number(r.rows[0].id);
    await d.execute({ sql: "INSERT INTO pendientes (solicitud_id, texto_enc) VALUES (?, ?)", args: [id, cifrar("p", "pendiente.texto")] });
    return id;
  };
  const a = await crear("P1", "cerrada", 0, 0, 20);       // se anonimiza
  const b = await crear("P2", "cerrada", 1, 0, 20);       // la persona pidió conservar
  const c = await crear("P3", "derivada", 0, 1, 20);      // abogado confirmado: se anonimiza
  const e = await crear("P4", "derivada", 0, 0, 20);      // aún sin confirmar: se queda
  const f = await crear("P5", "cerrada", 0, 0, 3);        // dentro de los días de gracia: se queda
  const n = await purgarTerminadas();
  assert.equal(n, 2);
  const estado = async (id: number) => (await d.execute({ sql: "SELECT anonimizada_en FROM solicitudes WHERE id = ?", args: [id] })).rows[0].anonimizada_en;
  assert.notEqual(await estado(a), "");
  assert.notEqual(await estado(c), "");
  for (const id of [b, e, f]) assert.equal(await estado(id), "");
  const pend = await d.execute({ sql: "SELECT COUNT(*) AS n FROM pendientes WHERE solicitud_id IN (?, ?)", args: [a, c] });
  assert.equal(Number(pend.rows[0].n), 0);
});

test("leyes base: carga rápida e idempotente, y la búsqueda encuentra lo pertinente", async () => {
  const { leerPaqueteBase, cargarNormasLista } = await import("../lib/biblioteca-base");
  const { buscarArticulos, esModificatorio } = await import("../lib/normas");
  const normas = leerPaqueteBase();
  assert.ok(normas.length >= 25);
  const t0 = Date.now();
  const r1 = await cargarNormasLista(normas);
  assert.ok(r1.creadas >= 25 && r1.articulos > 4000);
  assert.ok(Date.now() - t0 < 30000, "la carga completa debe ser de segundos");
  const r2 = await cargarNormasLista(normas);
  assert.equal(r2.creadas + r2.actualizadas, 0);
  assert.equal(r2.sinCambios, r1.creadas);

  const t1 = Date.now();
  const r = await buscarArticulos("Me despidieron sin carta de aviso y no me pagaron el finiquito.", { materia: "laboral", limite: 8 });
  assert.ok(Date.now() - t1 < 1500);
  assert.ok(r.some((x) => x.norma.startsWith("Código del Trabajo") && ["162", "168", "177"].includes(x.numero)));
  assert.equal(r[0].numero, "177", "el finiquito debe priorizar su artículo específico");
  assert.ok(!r.some((x) => ["163 bis", "32", "197 bis"].includes(x.numero) || x.norma.startsWith("Ley 20.351")));
  assert.ok(r.every((x) => !esModificatorio(x.texto)), "no se devuelven artículos que solo modifican otra ley");
  const soloSueldo = await buscarArticulos("No me han pagado el sueldo ni las remuneraciones que me deben.", { materia: "laboral", limite: 8 });
  assert.ok(!soloSueldo.some((x) => x.numero === "63 bis"), "el pago del finiquito no se sugiere si no hay término laboral descrito");
  const c = await buscarArticulos("Me cobran una deuda de hace siete años, ¿prescribió?", { materia: "civil", limite: 8 });
  assert.ok(c.some((x) => x.norma.startsWith("Código Civil") && x.numero === "2515"));
});

test("documentos: se guardan cifrados, se pasan al informe sin pisar y se borran al anonimizar", async () => {
  const { getDb } = await import("../lib/db");
  const { cifrar } = await import("../lib/crypto");
  const { analizarTexto } = await import("../lib/documentos");
  const { guardarDocumento, listarDocumentos, fusionarEnInforme } = await import("../lib/documentos-datos");
  const { contenidoVacio } = await import("../lib/datos");
  const { anonimizarSolicitud } = await import("../lib/privacidad");
  const d = await getDb();
  const u = await d.execute({ sql: "INSERT INTO usuarios (email, nombre, password_hash, rol, estado) VALUES (?, ?, 'x', 'abogado', 'activo') RETURNING id", args: ["doc@mail.test", "Abg"] });
  const asesor = Number(u.rows[0].id);
  const s = await d.execute({
    sql: `INSERT INTO solicitudes (codigo, asesor_id, materia, relato_enc, nombre_enc, email_enc) VALUES ('DOC1', ?, 'laboral', ?, ?, ?) RETURNING id`,
    args: [asesor, cifrar("r", "solicitud.relato"), cifrar("n", "solicitud.nombre"), cifrar("e@e.cl", "solicitud.email")],
  });
  const sid = Number(s.rows[0].id);
  const a = analizarTexto("Santiago, 12 de marzo de 2024. Comunico a usted el término de su contrato por necesidades de la empresa, artículo 161 del Código del Trabajo. Indemnización de $1.250.000.");
  const id = await guardarDocumento(sid, asesor, "carta.pdf", a);
  const crudo = await d.execute({ sql: "SELECT nombre_enc, resultado_enc FROM documentos WHERE id = ?", args: [id] });
  assert.ok(!String(crudo.rows[0].nombre_enc).includes("carta") && !String(crudo.rows[0].resultado_enc).includes("1.250.000"));
  const lista = await listarDocumentos(sid, asesor);
  assert.equal(lista[0].nombre, "carta.pdf");

  const base = { ...contenidoVacio(), cronologia: "01/01/2020 — Inicio de la relación laboral.", puntos: "Mi nota." };
  const { contenido } = await fusionarEnInforme(base, "carta.pdf", lista[0].analisis);
  assert.ok(contenido.cronologia.startsWith("01/01/2020") && contenido.cronologia.includes("12/03/2024"));
  assert.ok(contenido.normas.some((n) => n.norma.startsWith("Código del Trabajo") && n.numero === "161"));
  assert.ok(contenido.puntos.startsWith("Mi nota."));
  const otra = await fusionarEnInforme(contenido, "carta.pdf", lista[0].analisis);
  assert.equal(otra.contenido.normas.length, contenido.normas.length, "no duplica");

  await anonimizarSolicitud(sid);
  assert.equal((await listarDocumentos(sid, asesor)).length, 0);
});
