import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Conecta el módulo CRM con este proyecto (seguro de repetir):
 *   1. prisma/migrations → agrega las tablas crm_* desde db/crm.sql
 *   2. panel/layout      → agrega «CRM» al menú lateral del panel
 *   3. package.json      → agrega el comando «npm run demo:crm»
 *
 *   npx tsx scripts/instalar-crm.ts --dry-run    (solo muestra qué haría)
 *   npx tsx scripts/instalar-crm.ts              (lo aplica; guarda copias *.bak-crm)
 */

const seco = process.argv.includes("--dry-run");
const MIGRACION = "20261031000000_crm";
let cambios = 0;

function parchar(archivo: string, f: (t: string) => string | null) {
  if (!existsSync(archivo)) {
    console.log(`✗ No encuentro ${archivo}. ¿Estás en la carpeta raíz del proyecto?`);
    process.exitCode = 1;
    return;
  }
  const antes = readFileSync(archivo, "utf8");
  const despues = f(antes);
  if (despues === null || despues === antes) {
    console.log(`= ${archivo}: ya estaba listo.`);
    return;
  }
  cambios++;
  if (seco) return console.log(`→ ${archivo}: se modificaría.`);
  copyFileSync(archivo, `${archivo}.bak-crm`);
  writeFileSync(archivo, despues);
  console.log(`✓ ${archivo}: listo (copia en ${archivo}.bak-crm).`);
}

const archivoMigracion = `prisma/migrations/${MIGRACION}/migration.sql`;
if (!existsSync("db/crm.sql")) {
  console.log("✗ No encuentro db/crm.sql. Descomprime primero el ZIP en la raíz del proyecto.");
  process.exitCode = 1;
} else if (existsSync(archivoMigracion)) {
  console.log(`= ${archivoMigracion}: ya estaba listo.`);
} else {
  cambios++;
  if (seco) {
    console.log(`→ ${archivoMigracion}: se crearía desde db/crm.sql.`);
  } else {
    mkdirSync(`prisma/migrations/${MIGRACION}`, { recursive: true });
    copyFileSync("db/crm.sql", archivoMigracion);
    console.log(`✓ ${archivoMigracion}: listo.`);
  }
}

parchar("app/(panel)/panel/layout.tsx", (t) => {
  if (t.includes('href: "/panel/crm"')) return null;
  const linea = /^(\s*)\{ href: "\/panel", texto: "Casos".*\},\s*$/m.exec(t);
  if (!linea) {
    console.log("✗ panel/layout.tsx: no encontré la línea de «Casos». Agrega el enlace a mano (ver INTEGRACION.md, paso 4).");
    return null;
  }
  return t.replace(linea[0], `${linea[0]}\n${linea[1]}{ href: "/panel/crm", texto: "CRM", icono: "usuarios" },`);
});

parchar("package.json", (t) => {
  const j = JSON.parse(t);
  if (j.scripts?.["demo:crm"]) return null;
  j.scripts["demo:crm"] = "tsx scripts/demo-crm.ts";
  return JSON.stringify(j, null, 2) + "\n";
});

console.log(seco ? `\nSimulación: ${cambios} archivo(s) cambiarían.` : `\nListo: ${cambios} archivo(s) modificados. Siguiente: npm run typecheck && npm run dev`);
