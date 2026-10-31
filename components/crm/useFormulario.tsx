"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { EstadoForm } from "@/lib/validators";

/**
 * Formulario con acción de servidor que NO se vacía si hay un error (React 19 lo vacía siempre).
 * Si todo sale bien, se vacía y deja el cursor listo para el siguiente registro.
 */
export function useFormulario(accion: (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>, alGuardar?: () => void) {
  const [estado, ejecutar, pendiente] = useActionState(accion, {} as EstadoForm);
  const ref = useRef<HTMLFormElement>(null);
  const aviso = useRef(alGuardar);
  aviso.current = alGuardar;

  useEffect(() => {
    if (estado.ok) {
      ref.current?.reset();
      const primero = ref.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=checkbox]), textarea");
      primero?.focus();
      aviso.current?.();
    }
  }, [estado]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => ejecutar(datos));
  }
  return { estado, enviar, pendiente, ref, ejecutar };
}

export function MensajeForm({ estado }: { estado: EstadoForm }) {
  const primero = estado.errores ? Object.values(estado.errores)[0] : undefined;
  return (
    <p className="crm-msg" role="status" aria-live="polite">
      {estado.error ? <span className="venc">{estado.error}</span> : null}
      {primero ? <span className="venc">{primero}</span> : null}
      {estado.ok ? <span className="ok">{estado.ok}</span> : null}
    </p>
  );
}
