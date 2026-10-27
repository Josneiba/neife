"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { contactoRapido } from "@/lib/acciones/panel";
import { MATERIAS } from "@/lib/materias";
import type { EstadoForm } from "@/lib/validators";
import { Icono } from "./Iconos";

const ORIGENES = [
  { clave: "whatsapp", nombre: "WhatsApp" },
  { clave: "llamada", nombre: "Llamada" },
  { clave: "referido", nombre: "Referido" },
  { clave: "web", nombre: "Web" },
  { clave: "otro", nombre: "Otro" },
];

/** Alta de un contacto en 3 campos. Enter envía; al guardar queda listo para el siguiente. */
export function ContactoRapido() {
  const [abierto, setAbierto] = useState(false);
  const [mas, setMas] = useState(false);
  const [estado, ejecutar, pendiente] = useActionState(contactoRapido, {} as EstadoForm);
  const form = useRef<HTMLFormElement>(null);
  const nombre = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) nombre.current?.focus();
  }, [abierto]);
  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      setMas(false);
      nombre.current?.focus();
    }
  }, [estado]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => ejecutar(datos));
  }

  if (!abierto) {
    return (
      <button type="button" className="btn btn-primario btn-chico" onClick={() => setAbierto(true)}>
        <Icono nombre="mas" tam={16} /> Nuevo contacto
      </button>
    );
  }
  const e = estado.errores ?? {};
  return (
    <form ref={form} onSubmit={enviar} className="p-rapido" noValidate aria-label="Nuevo contacto">
      <div className="p-rapido-fila">
        <input ref={nombre} name="nombre" className="entrada" placeholder="Nombre" required maxLength={120} aria-invalid={e.nombre ? true : undefined} autoComplete="off" />
        <input name="contacto" className="entrada" placeholder="Teléfono o correo" required maxLength={160} aria-invalid={e.contacto ? true : undefined} autoComplete="off" />
        <select name="materia" className="entrada" defaultValue="otra" aria-label="Materia">
          {MATERIAS.map((m) => (
            <option key={m.clave} value={m.clave}>
              {m.nombre}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primario btn-chico" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Agregar"}
        </button>
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => setAbierto(false)} aria-label="Cerrar">
          <Icono nombre="cerrar" tam={15} />
        </button>
      </div>
      {mas ? (
        <div className="p-rapido-fila">
          <select name="origen" className="entrada" defaultValue="otro" aria-label="Cómo llegó">
            {ORIGENES.map((o) => (
              <option key={o.clave} value={o.clave}>
                {o.nombre}
              </option>
            ))}
          </select>
          <input name="nota" className="entrada" placeholder="Nota (opcional)" maxLength={600} autoComplete="off" />
        </div>
      ) : (
        <button type="button" className="p-rapido-mas" onClick={() => setMas(true)}>
          Origen y nota
        </button>
      )}
      <p className="p-rapido-msg" role="status" aria-live="polite">
        {estado.error ? <span className="venc">{estado.error}</span> : null}
        {e.nombre || e.contacto ? <span className="venc">{e.nombre ?? e.contacto}</span> : null}
        {estado.ok ? (
          <>
            {estado.ok}{" "}
            {estado.valores?.id ? <Link href={`/panel/solicitudes/${estado.valores.id}`}>Abrir caso</Link> : null}
          </>
        ) : null}
      </p>
    </form>
  );
}
