import { cargarEnv } from "./_env";
cargarEnv();

/**
 * Borra solicitudes cerradas o rechazadas con más de N meses (por defecto 12),
 * junto con sus informes. En Vercel se ejecuta mensualmente; también puede correrse a mano.
 * Uso: npm run limpiar -- 12
 */
async function main() {
  const meses = Number(process.argv[2] ?? 12);
  if (!Number.isFinite(meses) || meses < 1) {
    console.error("Indica un número de meses válido. Ej: npm run limpiar -- 12");
    process.exit(1);
  }
  const { eliminarSolicitudesAntiguas } = await import("../lib/limpieza");
  const { cerrarDb } = await import("../lib/db");
  try {
    console.log(`Solicitudes borradas: ${await eliminarSolicitudesAntiguas(meses)}`);
  } finally {
    await cerrarDb();
  }
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
