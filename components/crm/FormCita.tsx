"use client";

import { guardarCitaAccion } from "@/lib/acciones/crm2";
import { CANALES, TIPOS_CITA, type TipoCita } from "@/lib/crm/catalogo";
import { MensajeForm, useFormulario } from "./useFormulario";

export type CitaInicial = { id?: number; tipo?: TipoCita; fecha?: string; horaIni?: string; horaFin?: string; personaId?: number | null; titulo?: string; nota?: string; canal?: string };

/** Agendar (o editar) una cita con día y hora. */
export function FormCita({
  personas,
  hoy,
  inicial = {},
  tipoFijo,
  personaFija,
  alGuardar,
}: {
  personas: { id: number; nombre: string }[];
  hoy: string;
  inicial?: CitaInicial;
  tipoFijo?: TipoCita;
  personaFija?: number;
  alGuardar?: () => void;
}) {
  const { estado, enviar, pendiente, ref } = useFormulario(guardarCitaAccion, alGuardar);
  const e = estado.errores ?? {};
  const tipo = tipoFijo ?? inicial.tipo ?? "asesoria";
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      {inicial.id ? <input type="hidden" name="id" value={inicial.id} /> : null}
      {tipoFijo ? (
        <input type="hidden" name="tipo" value={tipoFijo} />
      ) : (
        <label className="crm-campo">
          <span>Tipo</span>
          <select name="tipo" className="entrada" defaultValue={tipo}>
            {TIPOS_CITA.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {personaFija ? (
        <input type="hidden" name="persona_id" value={personaFija} />
      ) : (
        <label className="crm-campo">
          <span>Cliente {tipo === "evento" ? "(opcional)" : ""}</span>
          <select name="persona_id" className="entrada" defaultValue={inicial.personaId ? String(inicial.personaId) : ""}>
            <option value="">—</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="crm-campo">
        <span>Título {tipo === "evento" ? "" : "(opcional)"}</span>
        <input name="titulo" className="entrada" maxLength={120} defaultValue={inicial.titulo ?? ""} autoComplete="off" aria-invalid={e.titulo ? true : undefined} placeholder={tipo === "evento" ? "Ej.: charla en la junta de vecinos" : "Ej.: revisar contrato"} />
      </label>
      <div className="crm-tres">
        <label className="crm-campo">
          <span>Día</span>
          <input type="date" name="fecha" className="entrada" defaultValue={inicial.fecha ?? hoy} required aria-invalid={e.fecha ? true : undefined} />
        </label>
        <label className="crm-campo">
          <span>Desde</span>
          <input type="time" name="hora_ini" className="entrada" defaultValue={inicial.horaIni ?? "10:00"} step={900} required aria-invalid={e.hora_ini ? true : undefined} />
        </label>
        <label className="crm-campo">
          <span>Hasta</span>
          <input type="time" name="hora_fin" className="entrada" defaultValue={inicial.horaFin ?? ""} step={900} />
        </label>
      </div>
      <label className="crm-campo">
        <span>Canal</span>
        <select name="canal" className="entrada" defaultValue={inicial.canal ?? ""}>
          <option value="">—</option>
          {CANALES.map((c) => (
            <option key={c.clave} value={c.clave}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="crm-campo">
        <span>Nota (opcional)</span>
        <textarea name="nota" className="entrada" rows={2} maxLength={600} defaultValue={inicial.nota ?? ""} />
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : inicial.id ? "Guardar cambios" : "Agendar"}
      </button>
    </form>
  );
}
