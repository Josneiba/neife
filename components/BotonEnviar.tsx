"use client";

import { useFormStatus } from "react-dom";

export function BotonEnviar({
  children,
  enviando = "Enviando…",
  className = "btn btn-primario",
  pendiente,
}: {
  children: React.ReactNode;
  enviando?: string;
  className?: string;
  /** Si se indica, manda sobre el estado del formulario (para formularios con onSubmit). */
  pendiente?: boolean;
}) {
  const estado = useFormStatus();
  const pending = pendiente ?? estado.pending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? enviando : children}
    </button>
  );
}
