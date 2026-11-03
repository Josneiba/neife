"use client";

import { notaZonaAccion } from "@/lib/acciones/crm2";
import { REGIONES } from "@/lib/materias";
import { MensajeForm, useFormulario } from "./useFormulario";

/** Una nota sobre una zona: dónde conviene dar charlas, qué juzgado queda cerca, qué colega trabaja ahí. */
export function FormNotaZona() {
  const { estado, enviar, pendiente, ref } = useFormulario(notaZonaAccion);
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Región</span>
          <select name="region" className="entrada" defaultValue="">
            <option value="">Sin región</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Comuna</span>
          <input name="comuna" className="entrada" required maxLength={80} />
        </label>
      </div>
      <label className="crm-campo">
        <span>Nota</span>
        <textarea name="texto" className="entrada" required maxLength={500} rows={3} placeholder="Ej.: Juzgado de Letras del Trabajo a 10 min; junta de vecinos acepta charlas los sábados." />
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar nota"}
      </button>
    </form>
  );
}
