import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Instala (o actualiza a la v2) el módulo CRM de Neife. Se puede repetir sin problema:
 * lo que ya está listo se salta.
 *
 *   1. prisma/migrations/...    → instala la migración incremental desde db/crm.sql
 *   2. app/(panel)/panel/layout → nuevo cascarón con menú de hamburguesa (instalacion/panel-layout.tsx)
 *   3. app/(panel)/panel/page   → deja «Casos» tal como era (instalacion/panel-page.tsx)
 *   4. next.config.mjs          → permite el mapa de OpenStreetMap en la política de seguridad (CSP)
 *   5. package.json             → leaflet + comando «npm run demo:crm»
 *   6. borra el archivo obsoleto de la v1 (components/crm/BarraCrm.tsx)
 *
 *   npx tsx scripts/instalar-crm.ts --dry-run    (solo muestra qué haría)
 *   npx tsx scripts/instalar-crm.ts              (lo aplica; guarda copias *.bak-crm)
 */

const seco = process.argv.includes("--dry-run");
const MIGRACION = "prisma/migrations/20261103000000_crm_v2/migration.sql";
const MIGRACION_SEGUIMIENTO = "prisma/migrations/20261103190000_crm_ticket_seguimiento/migration.sql";
const MIGRACION_CORTA = "prisma/migrations/20261103200000_codigo_seguimiento_corto/migration.sql";
let cambios = 0;

function copia(archivo: string) {
  let destino = `${archivo}.bak-crm`;
  if (existsSync(destino)) destino = `${archivo}.bak-crm2`; // no pisar la copia de la v1
  copyFileSync(archivo, destino);
  return destino;
}

function parchar(archivo: string, f: (t: string) => string | null): boolean {
  if (!existsSync(archivo)) {
    console.log(`✗ No encuentro ${archivo}. ¿Estás en la carpeta raíz del proyecto?`);
    process.exitCode = 1;
    return false;
  }
  const antes = readFileSync(archivo, "utf8");
  const despues = f(antes);
  if (despues === null || despues === antes) {
    console.log(`= ${archivo}: ya estaba listo.`);
    return false;
  }
  cambios++;
  if (seco) {
    console.log(`→ ${archivo}: se modificaría.`);
    return true;
  }
  const b = copia(archivo);
  writeFileSync(archivo, despues);
  console.log(`✓ ${archivo}: listo (copia en ${b}).`);
  return true;
}

function reemplazarConArchivo(destino: string, origen: string) {
  if (!existsSync(origen)) {
    console.log(`✗ Falta ${origen} (viene dentro del ZIP).`);
    process.exitCode = 1;
    return;
  }
  const nuevo = readFileSync(origen, "utf8");
  parchar(destino, () => nuevo);
}

// 1. Migración Prisma
if (!existsSync("db/crm.sql")) {
  console.log("✗ Falta db/crm.sql. Descomprime el ZIP en la raíz del proyecto antes de instalar.");
  process.exit(1);
}
const sqlCrm = readFileSync("db/crm.sql", "utf8").replace(/\r\n/g, "\n");
const inicioV2 = sqlCrm.search(/^-- v2:.*$/m);
if (inicioV2 < 0) {
  console.log("✗ No encontré la sección incremental v2 en db/crm.sql.");
  process.exitCode = 1;
} else {
  const inicioV3 = sqlCrm.search(/^-- v3:.*$/m);
  const inicioV4 = sqlCrm.search(/^-- v4:.*$/m);
  const migracion = sqlCrm.slice(inicioV2, inicioV3 < 0 ? (inicioV4 < 0 ? undefined : inicioV4) : inicioV3).trimStart();
  if (existsSync(MIGRACION)) {
    if (readFileSync(MIGRACION, "utf8").trimEnd() === migracion.trimEnd()) {
      console.log(`= ${MIGRACION}: ya estaba lista.`);
    } else {
      console.log(`✗ ${MIGRACION}: ya existe con otro contenido; no la voy a sobrescribir.`);
      process.exitCode = 1;
    }
  } else {
    cambios++;
    if (seco) {
      console.log(`→ ${MIGRACION}: se crearía.`);
    } else {
      mkdirSync(dirname(MIGRACION), { recursive: true });
      writeFileSync(MIGRACION, migracion);
      console.log(`✓ ${MIGRACION}: creada.`);
    }
  }
  if (inicioV3 >= 0) {
    const seguimiento = sqlCrm.slice(inicioV3, inicioV4 < 0 ? undefined : inicioV4).trimStart();
    if (existsSync(MIGRACION_SEGUIMIENTO)) {
      if (readFileSync(MIGRACION_SEGUIMIENTO, "utf8").replace(/\r\n/g, "\n").trimEnd() === seguimiento.trimEnd()) {
        console.log(`= ${MIGRACION_SEGUIMIENTO}: ya estaba lista.`);
      } else {
        console.log(`✗ ${MIGRACION_SEGUIMIENTO}: ya existe con otro contenido; no la voy a sobrescribir.`);
        process.exitCode = 1;
      }
    } else {
      cambios++;
      if (seco) {
        console.log(`→ ${MIGRACION_SEGUIMIENTO}: se crearía.`);
      } else {
        mkdirSync(dirname(MIGRACION_SEGUIMIENTO), { recursive: true });
        writeFileSync(MIGRACION_SEGUIMIENTO, seguimiento);
        console.log(`✓ ${MIGRACION_SEGUIMIENTO}: creada.`);
      }
    }
  }
  if (inicioV4 >= 0) {
    const codigoCorto = sqlCrm.slice(inicioV4).trimStart();
    if (existsSync(MIGRACION_CORTA)) {
      if (readFileSync(MIGRACION_CORTA, "utf8").replace(/\r\n/g, "\n") === codigoCorto) {
        console.log(`= ${MIGRACION_CORTA}: ya estaba lista.`);
      } else {
        console.log(`✗ ${MIGRACION_CORTA}: ya existe con otro contenido; no la voy a sobrescribir.`);
        process.exitCode = 1;
      }
    } else {
      cambios++;
      if (seco) {
        console.log(`→ ${MIGRACION_CORTA}: se crearía.`);
      } else {
        mkdirSync(dirname(MIGRACION_CORTA), { recursive: true });
        writeFileSync(MIGRACION_CORTA, codigoCorto);
        console.log(`✓ ${MIGRACION_CORTA}: creada.`);
      }
    }
  }
}

// 2 y 3. Cascarón y Resumen
reemplazarConArchivo("app/(panel)/panel/layout.tsx", "instalacion/panel-layout.tsx");
reemplazarConArchivo("app/(panel)/panel/page.tsx", "instalacion/panel-page.tsx");
// (la v2.0 movía Casos a /panel/casos; en la v2.1 vuelve a /panel)
if (existsSync("app/(panel)/panel/casos/page.tsx")) {
  cambios++;
  if (seco) console.log("→ app/(panel)/panel/casos/page.tsx: se borraría (Casos vuelve a /panel).");
  else {
    unlinkSync("app/(panel)/panel/casos/page.tsx");
    console.log("✓ app/(panel)/panel/casos/page.tsx: borrado.");
  }
}

// 5. Política de seguridad para el mapa
parchar("next.config.mjs", (t) => {
  let s = t;
  if (!s.includes("tile.openstreetmap.org")) s = s.replace(`"img-src 'self' data:"`, `"img-src 'self' data: https://tile.openstreetmap.org https://*.tile.opentopomap.org https://tile.opentopomap.org"`);
  if (s.includes("https://tile.openstreetmap.org") && !s.includes("opentopomap.org")) s = s.replace("https://tile.openstreetmap.org", "https://tile.openstreetmap.org https://*.tile.opentopomap.org https://tile.opentopomap.org");
  if (!s.includes("nominatim.openstreetmap.org")) s = s.replace(`"connect-src 'self'"`, `"connect-src 'self' https://nominatim.openstreetmap.org"`);
  if (!s.includes("geolocation=(self)")) s = s.replace("geolocation=()", "geolocation=(self)");
  if (!s.includes("tile.openstreetmap.org") || !s.includes("nominatim.openstreetmap.org") || !s.includes("geolocation=(self)")) {
    console.log("✗ next.config.mjs: no pude configurar toda la política de seguridad del mapa.");
    process.exitCode = 1;
    return null;
  }
  return s;
});

// 6. package.json
parchar("package.json", (t) => {
  const j = JSON.parse(t);
  let c = false;
  j.scripts ??= {};
  j.dependencies ??= {};
  j.devDependencies ??= {};
  if (!j.scripts["demo:crm"]) ((j.scripts["demo:crm"] = "tsx scripts/demo-crm.ts"), (c = true));
  if (!j.dependencies.leaflet) ((j.dependencies.leaflet = "^1.9.4"), (c = true));
  if (!j.devDependencies["@types/leaflet"]) ((j.devDependencies["@types/leaflet"] = "^1.9.12"), (c = true));
  return c ? JSON.stringify(j, null, 2) + "\n" : null;
});

// 7. Obsoletos de la v1
for (const f of ["components/crm/BarraCrm.tsx"]) {
  if (existsSync(f)) {
    cambios++;
    if (seco) console.log(`→ ${f}: se borraría (ya no se usa).`);
    else {
      unlinkSync(f);
      console.log(`✓ ${f}: borrado (ya no se usa).`);
    }
  }
}

console.log(
  seco
    ? `\nSimulación: ${cambios} cambio(s).`
    : `\nListo: ${cambios} cambio(s). Siguiente: npm install && npm run db:migrate && npm run typecheck && npm run dev`,
);
