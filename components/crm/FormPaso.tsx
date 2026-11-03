"use client";

import { crearPasoAccion } from "@/lib/acciones/crm2";
import { CATEGORIAS_PASO } from "@/lib/crm/catalogo";
import { MensajeForm, useFormulario } from "./useFormulario";

/** Agrega un documento, trámite o compromiso a la lista de requisitos del caso. */
export function FormPaso({ personaId, alGuardar }: { personaId: number; alGuardar?: () => void }) {
  const { estado, enviar, pendiente, ref } = useFormulario(crearPasoAccion, alGuardar);
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <input type="hidden" name="persona_id" value={personaId} />
      <label className="crm-campo">
        <span>Requisito</span>
        <input name="texto" className="entrada" required maxLength={200} autoComplete="off" autoFocus placeholder="Ej.: últimas 3 liquidaciones de sueldo" />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Tipo</span>
          <select name="categoria" className="entrada" defaultValue="documento">
            {CATEGORIAS_PASO.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Plazo (opcional)</span>
          <input type="date" name="vence" className="entrada" />
        </label>
      </div>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar requisito"}
      </button>
    </form>
  );
}
