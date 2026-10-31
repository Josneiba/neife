"use client";

import { crearPlanAccion } from "@/lib/acciones/crm";
import { FUENTES_PLAN } from "@/lib/crm/catalogo";
import { nombreDiaLargo } from "@/lib/crm/fechas";
import { MensajeForm, useFormulario } from "./useFormulario";

export function FormPlan({ dias, personas, fuente }: { dias: string[]; personas: { id: number; nombre: string }[]; fuente?: string }) {
  const { estado, enviar, pendiente, ref } = useFormulario(crearPlanAccion);
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form" aria-label="Agregar un plan">
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Día</span>
          <select name="fecha" className="entrada" defaultValue={dias[0]}>
            {dias.map((d) => (
              <option key={d} value={d}>
                {nombreDiaLargo(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>De dónde</span>
          <select name="fuente" className="entrada" defaultValue={fuente ?? "asesorias"}>
            {FUENTES_PLAN.map((f) => (
              <option key={f.clave} value={f.clave}>
                {f.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Cliente (opcional)</span>
          <select name="persona_id" className="entrada" defaultValue="">
            <option value="">—</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>O escribe el plan</span>
          <input name="texto" className="entrada" maxLength={300} autoComplete="off" placeholder="Ej.: charla en la junta de vecinos" />
        </label>
      </div>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar plan"}
      </button>
    </form>
  );
}
