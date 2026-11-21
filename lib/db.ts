import { Pool, type PoolClient } from "pg";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Base de datos PostgreSQL (Supabase en producción, cualquier Postgres en local).
 * Prisma administra el esquema y verifica que todas las migraciones estén aplicadas.
 *
 * La interfaz (execute / batch) es deliberadamente pequeña: el resto del código
 * escribe SQL con "?" y esta capa lo traduce a $1, $2…
 */

export type Fila = Record<string, unknown>;
export type Resultado = { rows: Fila[]; rowsAffected: number; lastInsertRowid: number | undefined };
export type Sentencia = string | { sql: string; args?: unknown[] };

/** Tablas cuyo id numérico se devuelve tras un INSERT. */
const CON_ID = new Set(["usuarios", "solicitudes", "informes", "pendientes", "seguimiento", "normas", "articulos", "auditoria", "consultas_log"]);

export function traducir(sql: string, args: unknown[] = []): { texto: string; valores: unknown[] } {
  let n = 0;
  let texto = sql
    .replace(/datetime\('now'\)/g, "ahora()")
    .replace(/datetime\('now',\s*'-(\d+) days'\)/g, "ahora(-$1)")
    .replace(/\?/g, () => `$${++n}`);
  const ins = /^\s*INSERT\s+INTO\s+(\w+)/i.exec(texto);
  if (ins && CON_ID.has(ins[1].toLowerCase()) && !/RETURNING/i.test(texto)) texto += " RETURNING id";
  return { texto, valores: args };
}

type Ejecutor = Pick<Pool | PoolClient, "query">;

async function correr(c: Ejecutor, sentencia: Sentencia): Promise<Resultado> {
  const { sql, args } = typeof sentencia === "string" ? { sql: sentencia, args: [] } : sentencia;
  const { texto, valores } = traducir(sql, args);
  const r = await c.query(texto, valores as unknown[]);
  const id = /^\s*INSERT/i.test(texto) && r.rows[0] && "id" in r.rows[0] ? Number(r.rows[0].id) : undefined;
  return { rows: r.rows as Fila[], rowsAffected: r.rowCount ?? 0, lastInsertRowid: id };
}

export type Db = {
  execute(s: Sentencia): Promise<Resultado>;
  /** Corre varias sentencias juntas: o se guardan todas o ninguna. */
  batch(s: Sentencia[], modo?: string): Promise<Resultado[]>;
};

type Global = typeof globalThis & { __neifePool?: Pool; __neifeListo?: Promise<void> };
const g = globalThis as Global;

export function opcionesConexionSegura(url: string, permitirNoValidado = false) {
  const normalizada = url.replace(/^(postgres(?:ql)?:\/\/[^/?#]*@)(?=\/)/i, "$1localhost");
  const connection = new URL(normalizada);
  const hosts = (connection.searchParams.get("host") ?? connection.hostname)
    .split(",")
    .map((host) => host.replace(/^\[|\]$/g, "").toLowerCase());
  const local = hosts.length > 0 && hosts.every(
    (host) => !host || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("/"),
  );
  if (!local) {
    // Connection-string SSL flags can override Pool's ssl option in node-postgres.
    // Remove downgrade/disable flags so remote connections always use verified TLS.
    connection.searchParams.delete("sslmode");
    connection.searchParams.delete("ssl");
  }
  return {
    connectionString: connection.toString(),
    ssl: local ? false : { rejectUnauthorized: !permitirNoValidado },
  };
}

function crearPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL (la cadena de conexión de Supabase o de tu Postgres). Mira .env.example.");
  }
  return new Pool({
    ...opcionesConexionSegura(url, process.env.DB_TLS_PERMITIR_NO_VALIDO === "1"),
    // En Vercel cada instancia usa pocas conexiones; Supabase las agrupa en su pooler.
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 8_000,
  });
}

async function verificarMigraciones(pool: Pool) {
  const carpeta = join(process.cwd(), "prisma", "migrations");
  const esperadas = readdirSync(carpeta, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (esperadas.length === 0) throw new Error("No hay migraciones Prisma en prisma/migrations.");

  let r;
  try {
    r = await pool.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
  } catch (e) {
    throw new Error("Falta el historial de Prisma. Ejecuta `npm run db:migrate` antes de iniciar Neife.", { cause: e });
  }
  const aplicadas = new Set(
    r.rows
      .filter((f) => f.finished_at && !f.rolled_back_at)
      .map((f) => String(f.migration_name)),
  );
  const incompletas = r.rows
    .filter((f) => !f.finished_at && !f.rolled_back_at)
    .map((f) => String(f.migration_name));
  const pendientes = esperadas.filter((nombre) => !aplicadas.has(nombre));
  if (incompletas.length || pendientes.length) {
    const faltan = pendientes.length ? ` Pendientes: ${pendientes.join(", ")}.` : "";
    const fallaron = incompletas.length ? ` Incompletas: ${incompletas.join(", ")}.` : "";
    throw new Error(`El esquema de la base no está al día.${faltan}${fallaron} Ejecuta \`npm run db:migrate\`.`);
  }
}

/** Devuelve la base de datos lista para usar después de verificar las migraciones. */
export async function getDb(): Promise<Db> {
  if (!g.__neifePool) g.__neifePool = crearPool();
  const pool = g.__neifePool;
  if (!g.__neifeListo) {
    g.__neifeListo = verificarMigraciones(pool);
    g.__neifeListo.catch(() => {
      g.__neifeListo = undefined;
    });
  }
  await g.__neifeListo;
  return {
    execute: (s) => correr(pool, s),
    async batch(lista) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const salida: Resultado[] = [];
        for (const s of lista) salida.push(await correr(c, s));
        await c.query("COMMIT");
        return salida;
      } catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

/** Cierra las conexiones (para scripts de consola). */
export async function cerrarDb() {
  await g.__neifePool?.end();
  g.__neifePool = undefined;
  g.__neifeListo = undefined;
}

/** Registro simple de acciones sensibles (quién vio o cambió qué). */
export async function auditar(
  usuarioId: number | null,
  accion: string,
  entidad = "",
  entidadId: number | null = null,
) {
  const d = await getDb();
  await d.execute({
    sql: "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id) VALUES (?, ?, ?, ?)",
    args: [usuarioId, accion, entidad, entidadId],
  });
}
