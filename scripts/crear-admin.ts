import { cargarEnv } from "./_env";
cargarEnv();

/** Uso: npm run crear-admin -- correo@dominio.cl "contraseña de 10+ caracteres" "Tu nombre" */
async function main() {
  const { getDb } = await import("../lib/db");
  const { hashClave } = await import("../lib/auth");
  const [email, clave, nombre = "Administrador"] = process.argv.slice(2);
  if (!email || !clave) {
    console.error('Uso: npm run crear-admin -- correo@dominio.cl "contraseña" "Nombre"');
    process.exit(1);
  }
  if (clave.length < 10) {
    console.error("La contraseña debe tener al menos 10 caracteres.");
    process.exit(1);
  }
  const d = await getDb();
  const hash = await hashClave(clave);
  const existe = await d.execute({ sql: "SELECT id FROM usuarios WHERE email = ?", args: [email.toLowerCase()] });
  if (existe.rows[0]) {
    await d.execute({
      sql: "UPDATE usuarios SET rol = 'admin', estado = 'activo', password_hash = ?, nombre = ? WHERE id = ?",
      args: [hash, nombre, existe.rows[0].id],
    });
    console.log(`Se actualizó la cuenta existente ${email} como administrador.`);
  } else {
    await d.execute({
      sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, 'admin', ?, 'activo')",
      args: [email.toLowerCase(), hash, nombre],
    });
    console.log(`Administrador creado: ${email}`);
  }
}
main().then(async () => { const { cerrarDb } = await import("../lib/db"); await cerrarDb(); process.exit(0); }).catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
