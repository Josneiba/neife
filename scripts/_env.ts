import { existsSync } from "node:fs";

/** Carga .env.local (si existe) para los scripts de consola. */
export function cargarEnv() {
  for (const archivo of [".env.local", ".env"]) {
    if (existsSync(archivo)) {
      process.loadEnvFile(archivo);
      return;
    }
  }
}
