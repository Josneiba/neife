"use client";

import { useState } from "react";
import { derivacionAccion } from "@/lib/acciones/crm2";
import { ESTADOS_COMISION, RESULTADOS_DERIVACION, TIPOS_COMISION } from "@/lib/crm/catalogo";
import type { Derivacion } from "@/lib/crm/servicio-seguimiento";
import { MensajeForm, useFormulario } from "./useFormulario";

export type Colega = { id: number; nombre: string; slug: string };

/** A qué colega derivaste al cliente, con qué comisión, cómo fue el trato y si el cliente quedó conforme. */
export function FormDerivacion({ personaId, colegas, previa, hoy, alGuardar }: { personaId: number; colegas: Colega[]; previa: Derivacion | null; hoy: string; alGuardar?: () => void }) {
  const { estado, enviar, pendiente, ref } = useFormulario(derivacionAccion, alGuardar);
  const e = estado.errores ?? {};
  const [tipo, setTipo] = useState(previa?.comisionTipo ?? "ninguna");
  const [colegaId, setColegaId] = useState(previa?.colegaId ? String(previa.colegaId) : "");
  const [nombre, setNombre] = useState(previa?.colega ?? "");
  const [comEstado, setComEstado] = useState(previa?.comisionEstado ?? "sin_acuerdo");

  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <input type="hidden" name="persona_id" value={personaId} />
      <input type="hidden" name="colega_id" value={colegaId} />
      {colegas.length > 0 ? (
        <label className="crm-campo">
          <span>Colega en Neife (opcional)</span>
          <select
            className="entrada"
            value={colegaId}
            onChange={(ev) => {
              setColegaId(ev.target.value);
              const c = colegas.find((x) => String(x.id) === ev.target.value);
              if (c) setNombre(c.nombre);
            }}
          >
            <option value="">Otro colega (escribe su nombre)</option>
            {colegas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="crm-campo">
        <span>Nombre del colega</span>
        <input name="colega" className="entrada" required maxLength={120} value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="off" aria-invalid={e.colega ? true : undefined} />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Contacto del colega</span>
          <input name="contacto" className="entrada" maxLength={160} defaultValue={previa?.contacto ?? ""} autoComplete="off" />
        </label>
        <label className="crm-campo">
          <span>Fecha de la derivación</span>
          <input type="date" name="fecha" className="entrada" defaultValue={previa?.fecha ?? hoy} max={hoy} />
        </label>
      </div>
      <label className="crm-campo">
        <span>Motivo (opcional)</span>
        <input name="motivo" className="entrada" maxLength={600} defaultValue={previa?.motivo ?? ""} placeholder="Ej.: materia penal, fuera de mi especialidad" />
      </label>

      <fieldset className="crm-grupo-campos">
        <legend>Comisión</legend>
        <div className="crm-dos">
          <label className="crm-campo">
            <span>Tipo</span>
            <select name="comision_tipo" className="entrada" value={tipo} onChange={(ev) => setTipo(ev.target.value as typeof tipo)}>
              {TIPOS_COMISION.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          {tipo !== "ninguna" ? (
            <label className="crm-campo">
              <span>{tipo === "porcentaje" ? "Porcentaje (%)" : "Monto ($)"}</span>
              <input type="number" name="comision_valor" className="entrada" min={0} max={tipo === "porcentaje" ? 100 : 1_000_000_000} defaultValue={previa?.comisionValor ?? 0} inputMode="numeric" />
            </label>
          ) : (
            <input type="hidden" name="comision_valor" value="0" />
          )}
        </div>
        {tipo !== "ninguna" ? (
          <div className="crm-dos">
            <label className="crm-campo">
              <span>Estado del pago</span>
              <select name="comision_estado" className="entrada" value={comEstado} onChange={(ev) => setComEstado(ev.target.value as typeof comEstado)}>
                {ESTADOS_COMISION.map((t) => (
                  <option key={t.clave} value={t.clave}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
            {comEstado === "cobrada" ? (
              <label className="crm-campo">
                <span>Monto cobrado ($)</span>
                <input type="number" name="comision_cobrada" className="entrada" min={0} defaultValue={previa?.comisionCobrada ?? 0} inputMode="numeric" />
              </label>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <label className="crm-campo">
        <span>Resultado</span>
        <select name="resultado" className="entrada" defaultValue={previa?.resultado ?? "en_curso"}>
          {RESULTADOS_DERIVACION.map((r) => (
            <option key={r.clave} value={r.clave}>
              {r.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="crm-campo">
        <span>Cómo fue el trato con el colega</span>
        <textarea name="trato" className="entrada" rows={2} maxLength={800} defaultValue={previa?.trato ?? ""} placeholder="Ej.: respondió el mismo día y cumplió lo acordado" />
      </label>
      <label className="crm-campo">
        <span>¿El cliente quedó conforme con el colega?</span>
        <select name="satisfaccion" className="entrada" defaultValue={String(previa?.satisfaccion ?? 0)}>
          <option value="0">Aún no lo sé</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)} ({n})
            </option>
          ))}
        </select>
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : previa ? "Guardar cambios" : "Guardar derivación"}
      </button>
    </form>
  );
}
