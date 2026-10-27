import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

/**
 * Crea .env.local con claves nuevas la primera vez.
 * Si el archivo ya existe, solo completa lo que falte (nunca cambia claves existentes,
 * porque cambiar DATA_ENCRYPTION_KEY dejaría ilegibles los datos ya guardados).
 */
const ARCHIVO = ".env.local";

const base = existsSync(ARCHIVO)
  ? readFileSync(ARCHIVO, "utf8")
  : readFileSync(".env.example", "utf8");

function poner(texto: string, nombre: string, valor: string): { texto: string; cambio: boolean } {
  const re = new RegExp(`^${nombre}=(.*)$`, "m");
  const m = re.exec(texto);
  if (m && (m[1].trim() !== "" || valor === "")) return { texto, cambio: false };
  if (m) return { texto: texto.replace(re, `${nombre}=${valor}`), cambio: true };
  return { texto: texto.trimEnd() + `\n${nombre}=${valor}\n`, cambio: true };
}

let texto = base;
const cambios: string[] = [];
for (const [nombre, valor] of [
  ["DATA_ENCRYPTION_KEY", randomBytes(32).toString("hex")],
  ["SESSION_SECRET", randomBytes(48).toString("base64url")],
  ["CRON_SECRET", randomBytes(24).toString("base64url")],
  ["CONTACT_EMAIL", ""],
  ["CONTACT_PHONE", ""],
] as const) {
  const r = poner(texto, nombre, valor);
  texto = r.texto;
  if (r.cambio) cambios.push(nombre);
}
writeFileSync(ARCHIVO, texto, { mode: 0o600 });

if (cambios.length) {
  console.log(`Listo. Se actualizó ${ARCHIVO}: ${cambios.join(", ")}.`);
  console.log("Haz una copia de DATA_ENCRYPTION_KEY en un lugar seguro: sin ella no se pueden leer los datos cifrados.");
} else {
  console.log(`${ARCHIVO} ya tenía todas las claves. No se cambió nada.`);
}
console.log("\nCompleta DATABASE_URL y DIRECT_URL en .env.local; después corre:  npm run db:migrate && npm run db:setup");
console.log("Siguiente paso:  npm run crear-admin -- tu@correo.cl \"una-contraseña-larga\"   y luego   npm run dev");
