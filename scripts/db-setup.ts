import { cargarEnv } from "./_env";
cargarEnv();

/** Comprueba la conexión y el esquema ya migrado. Uso: npm run db:setup */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local. Configúrala según .env.example.");
    process.exit(1);
  }
  const { getDb, cerrarDb } = await import("../lib/db");
  try {
    const d = await getDb();
    const r = await d.execute("SELECT COUNT(*) AS n FROM usuarios");
    console.log(`Conexión correcta. Migraciones Prisma listas (${Number(r.rows[0].n)} usuarios).`);
  } catch (e) {
    const t = e instanceof Error ? e.message : String(e);
    console.error("No se pudo conectar o verificar las migraciones:", t);
    if (/password|authentication/i.test(t)) console.error("Revisa la clave en DATABASE_URL (si tiene símbolos, debe ir codificada).");
    if (/ENOTFOUND|ECONNREFUSED|timeout/i.test(t)) console.error("Revisa el host y el puerto. En Supabase usa el «Transaction pooler».");
    process.exit(1);
  } finally {
    await cerrarDb();
  }
}
main();
