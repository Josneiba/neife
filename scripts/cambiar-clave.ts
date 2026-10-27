import { cargarEnv } from "./_env";
cargarEnv();

/** Uso: npm run cambiar-clave -- correo@dominio.cl "nueva contraseña" (para quien olvidó su clave). */
async function main() {
  const { getDb } = await import("../lib/db");
  const { hashClave } = await import("../lib/auth");
  const [email, clave] = process.argv.slice(2);
  if (!email || !clave || clave.length < 10) {
    console.error('Uso: npm run cambiar-clave -- correo@dominio.cl "nueva contraseña de 10+ caracteres"');
    process.exit(1);
  }
  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE usuarios SET password_hash = ? WHERE email = ?",
    args: [await hashClave(clave), email.toLowerCase()],
  });
  console.log(r.rowsAffected ? "Contraseña cambiada." : "No existe una cuenta con ese correo.");
}
main().then(async () => { const { cerrarDb } = await import("../lib/db"); await cerrarDb(); process.exit(0); }).catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
