"use client";

import { crearGrupoAccion } from "@/lib/acciones/crm";
import { MensajeForm, useFormulario } from "./useFormulario";

export function FormGrupo() {
  const { estado, enviar, pendiente, ref } = useFormulario(crearGrupoAccion);
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form-linea" aria-label="Agregar grupo">
      <input name="nombre" className="entrada" placeholder="Nuevo grupo (ej.: Clientes de Valparaíso)" maxLength={60} required autoComplete="off" />
      <button type="submit" className="btn btn-secundario btn-chico" disabled={pendiente}>
        {pendiente ? "…" : "Agregar"}
      </button>
      <MensajeForm estado={estado} />
    </form>
  );
}
