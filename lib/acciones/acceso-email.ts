"use server";

import { redirect } from "next/navigation";
import { getDb, auditar } from "../db";
import { iniciarSesion } from "../auth";
import { ipActual, rutaSegura } from "../guards";
import { permitir } from "../ratelimit";
import { correos } from "../correo";
import { crearCodigoIngreso, gastarCodigoIngreso, gastarToken } from "../tokens";
import { enviarVerificacionCorreo } from "../verificacion-correo";
import {
  datosDeForm,
  erroresPorCampo,
  esquemaCodigoIngreso,
  esquemaSolicitarCodigoIngreso,
  esquemaVerificarCorreo,
  type EstadoForm,
} from "../validators";
import { segura } from "../errores";

async function solicitarCodigoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const parsed = esquemaSolicitarCodigoIngreso.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores: { email: datos.email ?? "" } };

  const ip = await ipActual();
  const email = parsed.data.email;
  const valores = { email, siguiente: rutaSegura(datos.siguiente, "") };
  if (!(await permitir(`codigo-ingreso:${ip}`, 20, 15 * 60 * 1000)) ||
      !(await permitir(`codigo-ingreso-correo:${email}`, 5, 15 * 60 * 1000))) {
    return { error: "Pediste varios códigos seguidos. Espera unos minutos y vuelve a probar.", valores };
  }

  const d = await getDb();
  const fila = (await d.execute({
    sql: "SELECT id, email_verificado FROM usuarios WHERE email = ?",
    args: [email],
  })).rows[0];

  if (fila) {
    const enviado = Number(fila.email_verificado) === 1
      ? await correos.codigoIngreso(email, await crearCodigoIngreso(Number(fila.id), email))
      : await enviarVerificacionCorreo(Number(fila.id), email);
    if (!enviado) return { error: "No pudimos enviar el correo. Intenta de nuevo en unos minutos.", valores };
  }

  return {
    ok: "Si el correo está asociado a una cuenta, recibirás un código. Si aún no lo verificaste, te enviaremos un enlace para confirmarlo.",
    valores,
  };
}

async function validarCodigoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const parsed = esquemaCodigoIngreso.safeParse(datos);
  if (!parsed.success) {
    return { errores: erroresPorCampo(parsed.error), valores: { email: datos.email ?? "", siguiente: datos.siguiente ?? "" } };
  }

  const ip = await ipActual();
  const email = parsed.data.email;
  const siguiente = rutaSegura(parsed.data.siguiente, "");
  if (!(await permitir(`validar-codigo:${ip}`, 30, 15 * 60 * 1000)) ||
      !(await permitir(`validar-codigo-correo:${email}`, 8, 15 * 60 * 1000))) {
    return { error: "Demasiados intentos. Espera unos minutos y solicita otro código.", valores: { email, siguiente } };
  }

  const id = await gastarCodigoIngreso(parsed.data.codigo, email);
  if (!id) return { error: "El código no es válido o ya venció. Solicita uno nuevo.", valores: { email, siguiente } };

  const d = await getDb();
  const fila = (await d.execute({
    sql: "SELECT id, rol FROM usuarios WHERE id = ? AND email = ? AND email_verificado = 1",
    args: [id, email],
  })).rows[0];
  if (!fila) return { error: "El código no es válido o ya venció. Solicita uno nuevo.", valores: { email, siguiente } };

  await iniciarSesion(Number(fila.id));
  await auditar(Number(fila.id), "ingreso_codigo", "usuario", Number(fila.id));
  const rol = String(fila.rol);
  const porDefecto = rol === "admin" ? "/admin" : rol === "abogado" ? "/panel" : "/cuenta";
  redirect(rutaSegura(siguiente, porDefecto));
}

async function verificarCorreoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const parsed = esquemaVerificarCorreo.safeParse(datosDeForm(fd));
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error) };

  const ip = await ipActual();
  if (!(await permitir(`verificar-correo:${ip}`, 10, 60 * 60 * 1000))) {
    return { error: "Demasiados intentos. Espera un rato y vuelve a abrir el enlace." };
  }

  const id = await gastarToken(parsed.data.token, "verificar_correo");
  if (!id) return { error: "El enlace ya venció o fue utilizado. Solicita uno nuevo desde el acceso por código." };

  const d = await getDb();
  const r = await d.execute({
    sql: "UPDATE usuarios SET email_verificado = 1 WHERE id = ? RETURNING id, rol",
    args: [id],
  });
  const fila = r.rows[0];
  if (!fila) return { error: "No encontramos esa cuenta. Crea una nueva o contacta con soporte." };

  await iniciarSesion(Number(fila.id));
  await auditar(Number(fila.id), "correo_verificado", "usuario", Number(fila.id));
  const rol = String(fila.rol);
  redirect(rol === "admin" ? "/admin" : rol === "abogado" ? "/panel" : "/cuenta");
}

export const solicitarCodigoIngreso = (...a: Parameters<typeof solicitarCodigoInterna>) =>
  segura(solicitarCodigoInterna, "enviar el código")(...a);

export const validarCodigoIngreso = (...a: Parameters<typeof validarCodigoInterna>) =>
  segura(validarCodigoInterna, "validar el código")(...a);

export const verificarCorreo = (...a: Parameters<typeof verificarCorreoInterna>) =>
  segura(verificarCorreoInterna, "verificar tu correo")(...a);
