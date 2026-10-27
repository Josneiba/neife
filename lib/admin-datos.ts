import { getDb } from "./db";
import { MATERIAS } from "./materias";

const num = (v: unknown) => Number(v ?? 0);

/** Todo lo que ve el administrador son cantidades. Nunca nombres, relatos ni datos de contacto de las personas. */
export async function resumenAdmin() {
  const d = await getDb();
  const [casos, asesores, normas, cobertura, consultas] = await Promise.all([
    d.execute(`SELECT COUNT(*) AS total,
                SUM(CASE WHEN creado_en >= ahora(-7) THEN 1 ELSE 0 END) AS semana,
                SUM(CASE WHEN estado = 'nueva' THEN 1 ELSE 0 END) AS nuevas,
                SUM(CASE WHEN estado = 'nueva' AND creado_en < ahora(-1) THEN 1 ELSE 0 END) AS sin_responder,
                SUM(CASE WHEN estado IN ('aceptada','informe','entregada','derivada') THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado = 'cerrada' THEN 1 ELSE 0 END) AS cerrados,
                SUM(CASE WHEN resultado = 'con_abogado' THEN 1 ELSE 0 END) AS con_abogado
           FROM solicitudes`),
    d.execute(`SELECT SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
           FROM usuarios WHERE rol = 'abogado'`),
    d.execute(`SELECT COUNT(*) AS documentos,
                (SELECT COUNT(*) FROM articulos) AS articulos,
                SUM(CASE WHEN bcn_id <> '' AND revisada_en < ahora(-14) THEN 1 ELSE 0 END) AS sin_revisar,
                SUM(CASE WHEN error_revision <> '' THEN 1 ELSE 0 END) AS con_error,
                SUM(CASE WHEN modo = 'secciones' THEN 1 ELSE 0 END) AS en_secciones
           FROM normas`),
    d.execute(`SELECT n.materia, COUNT(DISTINCT n.id) AS documentos, COUNT(a.id) AS articulos
           FROM normas n LEFT JOIN articulos a ON a.norma_id = n.id GROUP BY n.materia`),
    d.execute(`SELECT materia, COUNT(*) AS total, SUM(CASE WHEN resultados = 0 THEN 1 ELSE 0 END) AS vacias
           FROM consultas_log WHERE creado_en >= ahora(-30) GROUP BY materia`),
  ]);
  const c = casos.rows[0], a = asesores.rows[0], n = normas.rows[0];
  const porMateria = new Map(cobertura.rows.map((f) => [String(f.materia), f]));
  const consultaMateria = new Map(consultas.rows.map((f) => [String(f.materia), f]));
  return {
    casos: {
      total: num(c.total), semana: num(c.semana), nuevas: num(c.nuevas), sinResponder: num(c.sin_responder),
      activos: num(c.activos), cerrados: num(c.cerrados), conAbogado: num(c.con_abogado),
    },
    asesores: { activos: num(a.activos), pendientes: num(a.pendientes) },
    biblioteca: {
      documentos: num(n.documentos), articulos: num(n.articulos), sinRevisar: num(n.sin_revisar),
      conError: num(n.con_error), enSecciones: num(n.en_secciones),
    },
    cobertura: MATERIAS.filter((m) => m.clave !== "otra").map((m) => {
      const f = porMateria.get(m.clave);
      const q = consultaMateria.get(m.clave);
      const consultasN = num(q?.total);
      return {
        clave: m.clave, nombre: m.nombre, documentos: num(f?.documentos), articulos: num(f?.articulos),
        consultas: consultasN, sinResultado: num(q?.vacias),
      };
    }),
  };
}

/** Embudo de los últimos 30 días: cuántas personas avanzan en cada paso. Solo cantidades. */
export async function embudo30() {
  const d = await getDb();
  const [c, s] = await Promise.all([
    d.execute("SELECT COUNT(*) AS n FROM consultas_log WHERE creado_en >= ahora(-30)"),
    d.execute(`SELECT COUNT(*) AS solicitudes,
        SUM(CASE WHEN estado <> 'nueva' AND estado <> 'rechazada' THEN 1 ELSE 0 END) AS contactadas,
        SUM(CASE WHEN estado IN ('entregada','derivada','cerrada') THEN 1 ELSE 0 END) AS informe,
        SUM(CASE WHEN abogado_confirmado = 1 OR resultado = 'con_abogado' THEN 1 ELSE 0 END) AS con_abogado
      FROM solicitudes WHERE creado_en >= ahora(-30)`),
  ]);
  const f = s.rows[0];
  const pasos = [
    { nombre: "Consultas de orientación", n: num(c.rows[0].n) },
    { nombre: "Pidieron contacto", n: num(f.solicitudes) },
    { nombre: "Contactadas por el asesor", n: num(f.contactadas) },
    { nombre: "Informe entregado", n: num(f.informe) },
    { nombre: "Con abogado", n: num(f.con_abogado) },
  ];
  return pasos.map((p, i) => ({
    ...p,
    pct: i === 0 || pasos[i - 1].n === 0 ? null : Math.round((p.n / pasos[i - 1].n) * 100),
  }));
}

export type Chequeo = { nombre: string; estado: "ok" | "aviso" | "mal"; detalle: string };

/** Estado de la instalación. Nunca muestra valores de claves, solo si existen. */
export async function estadoSistema(): Promise<Chequeo[]> {
  const r: Chequeo[] = [];
  const t0 = Date.now();
  try {
    const d = await getDb();
    await d.execute("SELECT 1");
    r.push({ nombre: "Base de datos", estado: "ok", detalle: `Conectada (${Date.now() - t0} ms)` });
  } catch {
    r.push({ nombre: "Base de datos", estado: "mal", detalle: "No responde. Revisa DATABASE_URL y el estado de Supabase." });
  }
  const hay = (v?: string) => Boolean(v && v.length > 0);
  r.push(/^[0-9a-fA-F]{64}$/.test(process.env.DATA_ENCRYPTION_KEY ?? "")
    ? { nombre: "Cifrado de datos", estado: "ok", detalle: "Clave configurada. Guarda una copia fuera del servidor." }
    : { nombre: "Cifrado de datos", estado: "mal", detalle: "Falta DATA_ENCRYPTION_KEY o es inválida." });
  r.push(hay(process.env.RESEND_API_KEY)
    ? { nombre: "Correos (Resend)", estado: process.env.EMAIL_FROM?.includes("resend.dev") || !process.env.EMAIL_FROM ? "aviso" : "ok",
        detalle: process.env.EMAIL_FROM?.includes("resend.dev") || !process.env.EMAIL_FROM ? "Con remitente de pruebas: solo llegan a tu propio correo. Verifica tu dominio." : "Listo con tu dominio." }
    : { nombre: "Correos (Resend)", estado: "mal", detalle: "Falta RESEND_API_KEY: no salen avisos ni recuperación de contraseña." });
  r.push(hay(process.env.CRON_SECRET)
    ? { nombre: "Tareas automáticas", estado: "ok", detalle: "Avisos, revisión de leyes y tareas de privacidad/retención programados." }
    : { nombre: "Tareas automáticas", estado: "aviso", detalle: "Falta CRON_SECRET: no correrán los avisos, la revisión de leyes ni las tareas de privacidad." });
  r.push(hay(process.env.DIRECT_URL) || (!process.env.VERCEL && hay(process.env.DATABASE_URL))
    ? { nombre: "Migraciones Prisma", estado: "ok", detalle: "Conexión de migraciones configurada." }
    : { nombre: "Migraciones Prisma", estado: "aviso", detalle: "Configura DIRECT_URL para aplicar migraciones en producción." });
  r.push(hay(process.env.CONTACT_EMAIL)
    ? { nombre: "Contacto público", estado: "ok", detalle: "Correo de contacto configurado." }
    : { nombre: "Contacto público", estado: "aviso", detalle: "Configura CONTACT_EMAIL antes de publicar el sitio." });
  r.push(hay(process.env.GOOGLE_CLIENT_ID) && hay(process.env.GOOGLE_CLIENT_SECRET)
    ? { nombre: "Ingreso con Google", estado: "ok", detalle: "Activo." }
    : { nombre: "Ingreso con Google", estado: "aviso", detalle: "Desactivado (opcional)." });
  r.push(hay(process.env.SITE_URL) && !process.env.SITE_URL!.includes("localhost")
    ? { nombre: "Dirección del sitio", estado: "ok", detalle: process.env.SITE_URL! }
    : { nombre: "Dirección del sitio", estado: "aviso", detalle: "SITE_URL apunta a tu computador: los enlaces de los correos no servirán." });
  return r;
}

export async function actividadReciente(limite = 80) {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT a.id, a.accion, a.entidad, a.entidad_id, a.creado_en, u.nombre, u.rol
            FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.accion <> 'solicitud_vista'
           ORDER BY a.id DESC LIMIT ?`,
    args: [limite],
  });
  return r.rows.map((f) => ({
    id: num(f.id), accion: String(f.accion), entidad: String(f.entidad), entidadId: f.entidad_id === null ? null : num(f.entidad_id),
    creadoEn: String(f.creado_en), quien: f.nombre ? `${f.nombre} (${f.rol})` : "Visitante",
  }));
}
