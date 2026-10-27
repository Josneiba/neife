import { cargarEnv } from "./_env";
cargarEnv();
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";

/**
 * Biblioteca legal desde legalize-cl.
 *   npm run biblioteca -- empaquetar <carpeta-del-repo>   crea biblioteca/base.json.gz (se hace una vez, o al actualizar el repo)
 *   npm run biblioteca -- cargar [--forzar]               carga biblioteca/base.json.gz en la base de datos
 *   npm run biblioteca -- cargar <carpeta-del-repo>       carga directo desde el repo, sin paquete
 */
const ARCHIVO = "biblioteca/base.json.gz";

async function normasDesdeRepo(carpeta: string) {
  const { CATALOGO, armarNorma } = await import("../lib/legalize");
  const cl = existsSync(join(carpeta, "cl")) ? join(carpeta, "cl") : carpeta;
  const cache = new Map<string, string>();
  const normas = [];
  for (const e of CATALOGO) {
    const ruta = join(cl, e.archivo);
    if (!existsSync(ruta)) { console.warn(`  falta ${e.archivo} (${e.nombre})`); continue; }
    if (!cache.has(e.archivo)) cache.set(e.archivo, readFileSync(ruta, "utf8"));
    const n = armarNorma(e, cache.get(e.archivo)!);
    if (n) normas.push(n); else console.warn(`  sin artículos vigentes: ${e.nombre}`);
  }
  return normas;
}

async function main() {
  const [orden, ...resto] = process.argv.slice(2);
  const forzar = resto.includes("--forzar");
  const carpeta = resto.find((a) => !a.startsWith("--"));
  if (orden === "empaquetar") {
    if (!carpeta) throw new Error("Indica la carpeta del repositorio legalize-cl.");
    const normas = await normasDesdeRepo(carpeta);
    mkdirSync(dirname(ARCHIVO), { recursive: true });
    writeFileSync(ARCHIVO, gzipSync(JSON.stringify({ generado: new Date().toISOString(), origen: "legalize-cl", normas })));
    console.log(`Paquete creado: ${normas.length} normas, ${normas.reduce((a, n) => a + n.piezas.length, 0)} artículos → ${ARCHIVO}`);
  } else if (orden === "cargar") {
    const { cargarNormasLista } = await import("../lib/biblioteca-base");
    const { cerrarDb } = await import("../lib/db");
    const t0 = Date.now();
    const normas = carpeta
      ? await normasDesdeRepo(carpeta)
      : (() => {
          if (!existsSync(ARCHIVO)) throw new Error(`No existe ${ARCHIVO}. Usa «empaquetar» primero o indica la carpeta del repo.`);
          return JSON.parse(gunzipSync(readFileSync(ARCHIVO)).toString("utf8")).normas;
        })();
    const r = await cargarNormasLista(normas, { forzar });
    console.log(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${r.creadas} nuevas, ${r.actualizadas} actualizadas, ${r.sinCambios} sin cambios, ${r.articulos} artículos cargados.`);
    await cerrarDb();
  } else {
    console.log("Uso: npm run biblioteca -- empaquetar <repo> | cargar [carpeta-repo] [--forzar]");
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
