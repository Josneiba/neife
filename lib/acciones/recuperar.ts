"use server";

import { redirect } from "next/navigation";
import { getDb, auditar } from "../db";
import { hashClave } from "../auth";
import { ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { crearToken, gastarToken } from "../tokens";
import { urlSitio } from "../sitio";
import { conMensaje } from "../errores";
import { datosDeForm, erroresPorCampo, esquemaNuevaClave, esquemaPedirRecuperacion, type EstadoForm } from "../validators";

const SIEMPRE = "Si ese correo tiene una cuenta, te enviamos un enlace. Revisa también la carpeta de spam. Vale por 1 hora.";

export async function pedirRecuperacion(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const parsed = esquemaPedirRecuperacion.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores: { email: datos.email ?? "" } };

  const ip = await ipActual();
  if (!(await permitir(`recuperar:${ip}`, 6, 60 * 60 * 1000)) || !(await permitir(`recuperar-correo:${parsed.data.email}`, 3, 60 * 60 * 1000))) {
    return { error: "Pediste varios enlaces seguidos. Espera un rato y vuelve a probar.", valores: { email: datos.email ?? "" } };
  }

  const r = await conMensaje(async () => {
    const d = await getDb();
    const f = (await d.execute({ sql: "SELECT id FROM usuarios WHERE email = ?", args: [parsed.data.email] })).rows[0];
    if (f) {
      const token = await crearToken(Number(f.id), "recuperar", 60);
      await correos.recuperar(parsed.data.email, `${urlSitio()}/recuperar/${token}`);
      await auditar(Number(f.id), "recuperacion_pedida", "usuario", Number(f.id));
    }
    return { ok: SIEMPRE } as EstadoForm;
  }, "enviar el enlace");
  // Misma respuesta exista o no la cuenta: no se puede usar para averiguar quién tiene cuenta.
  return "error" in r && r.error ? { error: r.error, valores: { email: datos.email ?? "" } } : (r as EstadoForm);
}

export async function restablecerClave(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const parsed = esquemaNuevaClave.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error) };

  const ip = await ipActual();
  if (!(await permitir(`restablecer:${ip}`, 10, 60 * 60 * 1000))) return { error: "Demasiados intentos. Espera un rato." };

  const r = await conMensaje(async () => {
    const id = await gastarToken(parsed.data.token, "recuperar");
    if (!id) return { error: "Este enlace ya se usó o venció. Pide uno nuevo." } as EstadoForm;
    const d = await getDb();
    await d.execute({ sql: "UPDATE usuarios SET password_hash = ? WHERE id = ?", args: [await hashClave(parsed.data.clave), id] });
    await auditar(id, "clave_restablecida", "usuario", id);
    return { ok: "listo", valores: { id: String(id) } } as EstadoForm;
  }, "cambiar la contraseña");
  if ("error" in r && r.error) return { error: r.error };
  redirect("/ingresar?clave=ok");
}
