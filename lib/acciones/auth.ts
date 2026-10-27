"use server";

import { redirect } from "next/navigation";
import { getDb, auditar } from "../db";
import { segura } from "../errores";
import { cerrarSesionActual, hashClave, iniciarSesion, verificarClave } from "../auth";
import { ipActual, rutaSegura } from "../guards";
import { permitir, reiniciar } from "../ratelimit";
import { slugLibre } from "../datos";
import {
  datosDeForm,
  erroresPorCampo,
  esquemaLogin,
  esquemaRegistroAbogado,
  esquemaRegistroCliente,
  type EstadoForm,
} from "../validators";

const MENSAJE_LIMITE = "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a probar.";

async function ingresarInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const parsed = esquemaLogin.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores: { email: datos.email ?? "" } };

  const ip = await ipActual();
  const claveLimite = `login:${ip}:${parsed.data.email}`;
  if (!(await permitir(claveLimite, 8, 10 * 60 * 1000)) || !(await permitir(`login-ip:${ip}`, 40, 10 * 60 * 1000))) {
    return { error: MENSAJE_LIMITE, valores: { email: datos.email ?? "" } };
  }

  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT id, password_hash, rol FROM usuarios WHERE email = ?",
    args: [parsed.data.email],
  });
  const fila = r.rows[0];
  const ok = await verificarClave(parsed.data.clave, fila ? String(fila.password_hash) : null);
  if (!fila || !ok) {
    return { error: "Correo o contraseña incorrectos.", valores: { email: datos.email ?? "" } };
  }

  await reiniciar(claveLimite);
  await iniciarSesion(Number(fila.id));
  await auditar(Number(fila.id), "ingreso", "usuario", Number(fila.id));

  const rol = String(fila.rol);
  const porDefecto = rol === "admin" ? "/admin" : rol === "abogado" ? "/panel" : "/cuenta";
  redirect(rutaSegura(datos.siguiente, porDefecto));
}

async function registrarClienteInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const valores = { nombre: datos.nombre ?? "", email: datos.email ?? "" };
  const parsed = esquemaRegistroCliente.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores };

  const ip = await ipActual();
  if (!(await permitir(`registro:${ip}`, 12, 60 * 60 * 1000))) return { error: MENSAJE_LIMITE, valores };

  const d = await getDb();
  const existe = await d.execute({ sql: "SELECT 1 FROM usuarios WHERE email = ?", args: [parsed.data.email] });
  if (existe.rows.length) return { errores: { email: "Ese correo ya tiene una cuenta. Ingresa con él." }, valores };

  const hash = await hashClave(parsed.data.clave);
  const r = await d.execute({
    sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, 'cliente', ?, 'activo')",
    args: [parsed.data.email, hash, parsed.data.nombre],
  });
  const id = Number(r.lastInsertRowid);
  await iniciarSesion(id);
  await auditar(id, "registro_cliente", "usuario", id);
  redirect("/cuenta");
}

async function registrarAbogadoInterna(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const datos = datosDeForm(fd);
  const valores = {
    nombre: datos.nombre ?? "",
    email: datos.email ?? "",
    titulo: datos.titulo ?? "",
    registro: datos.registro ?? "",
  };
  const parsed = esquemaRegistroAbogado.safeParse(datos);
  if (!parsed.success) return { errores: erroresPorCampo(parsed.error), valores };

  const ip = await ipActual();
  if (!(await permitir(`registro:${ip}`, 12, 60 * 60 * 1000))) return { error: MENSAJE_LIMITE, valores };

  const d = await getDb();
  const existe = await d.execute({ sql: "SELECT 1 FROM usuarios WHERE email = ?", args: [parsed.data.email] });
  if (existe.rows.length) return { errores: { email: "Ese correo ya tiene una cuenta. Ingresa con él." }, valores };

  const hash = await hashClave(parsed.data.clave);
  const slug = await slugLibre(parsed.data.nombre);
  const r = await d.execute({
    sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, 'abogado', ?, 'pendiente')",
    args: [parsed.data.email, hash, parsed.data.nombre],
  });
  const id = Number(r.lastInsertRowid);
  await d.execute({
    sql: "INSERT INTO perfiles (usuario_id, slug, titulo, registro, publicado) VALUES (?, ?, ?, ?, 1)",
    args: [id, slug, parsed.data.titulo, parsed.data.registro],
  });
  await iniciarSesion(id);
  await auditar(id, "registro_abogado", "usuario", id);
  redirect("/panel");
}

export async function salir() {
  await cerrarSesionActual();
  redirect("/");
}

export const ingresar = async (...a: Parameters<typeof ingresarInterna>) => segura(ingresarInterna, "ingresar")(...a);

export const registrarCliente = async (...a: Parameters<typeof registrarClienteInterna>) => segura(registrarClienteInterna, "crear tu cuenta")(...a);

export const registrarAbogado = async (...a: Parameters<typeof registrarAbogadoInterna>) => segura(registrarAbogadoInterna, "crear tu cuenta")(...a);
