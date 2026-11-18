"use server";

import { redirect } from "next/navigation";
import { ipActual } from "../guards";
import { permitir } from "../ratelimit";
import { normalizarCodigo } from "../codigo-corto";
import { abrirConCorreo, estadoPorCodigo } from "../seguir";

/** Paso 1: la persona escribe su código. Solo comprueba que exista y la lleva a su estado. */
export async function buscarCaso(fd: FormData) {
  const entrada = String(fd.get("codigo") ?? "").slice(0, 40);
  const codigo = normalizarCodigo(entrada);
  if (!codigo) redirect("/seguir?e=formato");
  const ip = await ipActual();
  if (!(await permitir(`seguir:${ip}`, 20, 60 * 60 * 1000))) redirect("/seguir?e=limite");
  const estado = await estadoPorCodigo(codigo);
  if (!estado) redirect("/seguir?e=nohay");
  redirect(`/seguir/${encodeURIComponent(codigo)}`);
}

/** Paso 2 (opcional): con el correo que dejó, abre el detalle completo. Con límite por código y por IP. */
export async function abrirCasoConCorreo(fd: FormData) {
  const codigo = normalizarCodigo(String(fd.get("codigo") ?? ""));
  const correo = String(fd.get("correo") ?? "").trim().slice(0, 160);
  if (!codigo) redirect("/seguir?e=formato");
  const base = `/seguir/${encodeURIComponent(codigo)}`;
  if (!/^\S+@\S+\.\S+$/.test(correo)) redirect(`${base}?e=correo`);
  const ip = await ipActual();
  if (!(await permitir(`seguir-correo-ip:${ip}`, 15, 60 * 60 * 1000)) || !(await permitir(`seguir-correo:${codigo}`, 8, 60 * 60 * 1000))) {
    redirect(`${base}?e=limite`);
  }
  const enlace = await abrirConCorreo(codigo, correo);
  if (!enlace) redirect(`${base}?e=correo`);
  redirect(`/seguimiento/${encodeURIComponent(enlace)}`);
}
