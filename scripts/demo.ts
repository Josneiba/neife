import { cargarEnv } from "./_env";
cargarEnv();

/**
 * Datos de demostración para ver el sitio funcionando (SOLO desarrollo).
 *  - un administrador, un asesor ya verificado, una norma de ejemplo y una solicitud.
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("npm run demo no se puede usar en producción.");
    process.exit(1);
  }
  const { readFileSync } = await import("node:fs");
  const { getDb } = await import("../lib/db");
  const { hashClave } = await import("../lib/auth");
  const { cifrar, codigoAleatorio } = await import("../lib/crypto");
  const { crearNorma } = await import("../lib/normas");

  const d = await getDb();
  const claveAdmin = "AdminDemo-2026";
  const claveAsesor = "AsesorDemo-2026";

  async function usuario(email: string, nombre: string, rol: string, clave: string, estado: string) {
    const e = await d.execute({ sql: "SELECT id FROM usuarios WHERE email = ?", args: [email] });
    if (e.rows[0]) return Number(e.rows[0].id);
    const r = await d.execute({
      sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, ?, ?, ?)",
      args: [email, await hashClave(clave), rol, nombre, estado],
    });
    return Number(r.lastInsertRowid);
  }

  await usuario("admin@neife.test", "Administrador Demo", "admin", claveAdmin, "activo");
  const asesorId = await usuario("asesor@neife.test", "Asesor de Demostración", "abogado", claveAsesor, "activo");

  const p = await d.execute({ sql: "SELECT 1 FROM perfiles WHERE usuario_id = ?", args: [asesorId] });
  if (!p.rows[0]) {
    await d.execute({
      sql: `INSERT INTO perfiles (usuario_id, slug, titulo, registro, materias, ubicacion, bio, precio_informe, instrucciones_pago)
            VALUES (?, 'asesor-demo', 'Estudiante de Derecho', 'Universidad de ejemplo', 'laboral,familia', 'Región Metropolitana, atención online',
                    'Este es un perfil de demostración. Aquí el asesor cuenta quién es, qué casos orienta y cómo trabaja.', 3000,
                    'Transferencia a la cuenta que indique el asesor. Envía el comprobante por correo.')`,
      args: [asesorId],
    });
  }

  const n = await d.execute("SELECT COUNT(*) AS c FROM normas");
  if (Number(n.rows[0].c) === 0) {
    const archivos: [string, string, string][] = [
      ["Norma de ejemplo (no es una ley real)", "laboral", "norma-de-ejemplo.txt"],
      ["Ley mock de arriendo de viviendas (no es una ley real)", "arriendo", "mock-arriendos.txt"],
      ["Ley mock de familia y alimentos (no es una ley real)", "familia", "mock-familia.txt"],
    ];
    for (const [nombre, materia, archivo] of archivos) {
      const r = await crearNorma({ nombre, materia, fuente: "", archivo, usuarioId: null, texto: readFileSync(`ejemplos/${archivo}`, "utf8") });
      console.log(`Norma de ejemplo cargada: ${nombre}, ${r.piezas} artículos.`);
    }
  }

  const s = await d.execute("SELECT COUNT(*) AS c FROM solicitudes");
  if (Number(s.rows[0].c) === 0) {
    const { obtenerSolicitudAsesor, agregarPendientes, registrarEvento, listarPendientes } = await import("../lib/datos");
    const { borradorDeInforme } = await import("../lib/informe");
    const { PLANTILLAS } = await import("../lib/materias");

    type Caso = {
      nombre: string; email: string; tel: string; materia: keyof typeof PLANTILLAS; region: string;
      urgencia: string; presupuesto: string; relato: string; estado: string; hechos?: number;
      derivarOk?: boolean; destino?: string; motivo?: string; final?: boolean; entregado?: boolean; dias: number;
      confirmado?: boolean; contacto?: number; resultado?: string;
    };
    const casos: Caso[] = [
      { nombre: "Camila Rojas Soto", email: "camila.rojas@mail.test", tel: "+56 9 5555 1111", materia: "laboral", region: "Valparaíso", urgencia: "pronto", presupuesto: "$20.000 a $50.000", estado: "nueva", dias: 0,
        relato: "Trabajé dos años en una tienda de retail. Me despidieron el lunes por necesidades de la empresa y no me entregaron carta de aviso. Todavía no me pagan el finiquito ni las vacaciones." },
      { nombre: "Pedro Díaz Mora", email: "pedro.diaz@mail.test", tel: "", materia: "arriendo", region: "Metropolitana de Santiago", urgencia: "urgente", presupuesto: "Hasta $20.000", estado: "aceptada", hechos: 2, dias: 1, contacto: -1,
        relato: "El dueño del departamento me subió el arriendo de un mes para otro sin avisar y amenaza con cortar la luz y cambiar la cerradura si no pago. Tengo contrato por escrito y dejé garantía de un mes. Hay filtraciones y humedad hace meses." },
      { nombre: "Ñandú Muñoz Vera", email: "nandu@mail.test", tel: "22 333 4444", materia: "familia", region: "Biobío", urgencia: "normal", presupuesto: "Busco opciones gratuitas", estado: "informe", hechos: 6, final: true, derivarOk: true, dias: 8,
        relato: "El papá de mi hijo de cinco años dejó de pagar la pensión de alimentos hace cuatro meses y no responde los mensajes. Quiero saber si puedo demandar sin abogado y qué le puede pasar si no paga." },
      { nombre: "Javiera Soto Pino", email: "javiera.soto@mail.test", tel: "+56 9 4444 2222", materia: "consumidor", region: "Coquimbo", urgencia: "pronto", presupuesto: "$50.000 a $150.000", estado: "entregada", hechos: 8, final: true, entregado: true, derivarOk: true, dias: 5, contacto: 2,
        relato: "Compré un refrigerador por internet que llegó con falla de fábrica. La tienda se niega a cambiarlo y me dice que ya pasó el plazo. Tengo la boleta y los correos del reclamo." },
      { nombre: "Tomás Vega Lara", email: "tomas.vega@mail.test", tel: "+56 9 3333 8888", materia: "laboral", region: "Maule", urgencia: "normal", presupuesto: "Prefiero conversarlo", estado: "derivada", hechos: 8, final: true, entregado: true, derivarOk: true, destino: "Abogado Ricardo Fuentes, estudio Fuentes y Cía.", dias: 9,
        relato: "Mi empleador no pagó mis cotizaciones previsionales durante un año y ahora me despidió. Quiero reclamar y no sé por dónde partir." },
      { nombre: "Rodrigo Silva Cea", email: "rodrigo.silva@mail.test", tel: "+56 9 2222 7777", materia: "arriendo", region: "Valparaíso", urgencia: "pronto", presupuesto: "$20.000 a $50.000", estado: "derivada", hechos: 8, final: true, entregado: true, derivarOk: true, destino: "Abogada Paula Henríquez", confirmado: true, dias: 2, contacto: 4,
        relato: "Mi arrendador no me devuelve la garantía después de entregar el departamento en buen estado. Tengo fotos y el acta de entrega." },
      { nombre: "Marta Pino Rojas", email: "marta.pino@mail.test", tel: "", materia: "civil", region: "Ñuble", urgencia: "normal", presupuesto: "Hasta $20.000", estado: "cerrada", hechos: 8, final: true, entregado: true, derivarOk: true, dias: 20, resultado: "con_abogado", confirmado: true, destino: "Abogada Paula Henríquez",
        relato: "Presté dinero a un conocido con un pagaré y no ha pagado las cuotas. Quiero saber qué opciones tengo para cobrarle." },
      { nombre: "Luis Araya Gómez", email: "luis.araya@mail.test", tel: "", materia: "penal", region: "Los Lagos", urgencia: "urgente", presupuesto: "Prefiero conversarlo", estado: "rechazada", motivo: "Esta materia requiere un abogado penalista de inmediato. Acude a la Defensoría Penal Pública.", dias: 2,
        relato: "Me llegó una citación a declarar en la fiscalía por una denuncia en mi contra y no sé qué hacer ni qué derechos tengo." },
    ];

    for (const c of casos) {
      const codigo = codigoAleatorio();
      const hace = `ahora(-${c.dias})`;
      const r = await d.execute({
        sql: `INSERT INTO solicitudes (codigo, asesor_id, materia, region, urgencia, presupuesto, relato_enc, nombre_enc, email_enc,
                telefono_enc, estado, motivo_rechazo, derivar_ok, abogado_destino_enc, creado_en, actualizado_en)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${hace}, ${hace})`,
        args: [
          codigo, asesorId, c.materia, c.region, c.urgencia, c.presupuesto,
          cifrar(c.relato, "solicitud.relato"), cifrar(c.nombre, "solicitud.nombre"), cifrar(c.email, "solicitud.email"),
          c.tel ? cifrar(c.tel, "solicitud.telefono") : "", c.estado, c.motivo ?? "", c.derivarOk ? 1 : 0,
          c.destino ? cifrar(c.destino, "solicitud.abogado") : "",
        ],
      });
      const id = Number(r.lastInsertRowid);
      await registrarEvento(id, "etapa", "Recibida");
      if (c.estado !== "nueva") await registrarEvento(id, "etapa", c.estado === "rechazada" ? "Rechazada" : "En contacto");
      if (!["nueva", "rechazada"].includes(c.estado)) {
        const plantilla = PLANTILLAS[c.materia];
        const textos = [...plantilla.datos, ...plantilla.documentos];
        await agregarPendientes(id, textos);
        const hechos = c.hechos ?? 0;
        if (hechos > 0) {
          const pend = await listarPendientes(id);
          for (const p of pend.slice(0, hechos)) await d.execute({ sql: "UPDATE pendientes SET hecho = 1 WHERE id = ?", args: [p.id] });
        }
        if (hechos > 0) await registrarEvento(id, "nota", "Hablamos por teléfono y me envió parte de los documentos.");
      }
      if (["informe", "entregada", "derivada", "cerrada"].includes(c.estado)) {
        const sol = await obtenerSolicitudAsesor(id, asesorId);
        if (sol) {
          const contenido = await borradorDeInforme(sol, []);
          await d.execute({
            sql: "INSERT INTO informes (solicitud_id, asesor_id, contenido_enc, estado, entregado) VALUES (?, ?, ?, ?, ?)",
            args: [id, asesorId, cifrar(JSON.stringify(contenido), "informe.contenido"), c.final ? "final" : "borrador", c.entregado ? 1 : 0],
          });
          await registrarEvento(id, "etapa", "Informe en curso");
          if (c.entregado) await registrarEvento(id, "etapa", "Informe entregado");
        }
      }
      if (c.estado === "derivada") {
        await registrarEvento(id, "etapa", "Derivada");
        await registrarEvento(id, "nota", `Derivada a ${String(c.destino).replace(/\.$/, "")}.`);
        if (c.confirmado) await registrarEvento(id, "nota", `${c.destino} confirmó que toma el caso.`);
      }
      await d.execute({
        sql: "UPDATE solicitudes SET abogado_confirmado = ?, proximo_contacto = ?, resultado = ? WHERE id = ?",
        args: [c.confirmado ? 1 : 0, c.contacto === undefined ? "" : new Date(Date.now() + c.contacto * 86400000).toISOString().slice(0, 10), c.resultado ?? "", id],
      });
      if (c.estado === "cerrada") await registrarEvento(id, "etapa", "Cerrada");
    }
    console.log(`${casos.length} casos de ejemplo creados, en distintas etapas.`);
  }

  console.log("\nCuentas de demostración:");
  console.log(`  Administrador:  admin@neife.test   /  ${claveAdmin}`);
  console.log(`  Asesor:         asesor@neife.test  /  ${claveAsesor}`);
}
main().then(async () => { const { cerrarDb } = await import("../lib/db"); await cerrarDb(); process.exit(0); }).catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
