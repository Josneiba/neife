"use client";

import { fichaAccion } from "@/lib/acciones/crm2";
import { ORIGENES_CRM } from "@/lib/crm/catalogo";
import type { PersonaCrm } from "@/lib/crm/servicio";
import { MATERIAS, REGIONES } from "@/lib/materias";
import { SelectorUbicacion } from "./SelectorUbicacion";
import { MensajeForm, useFormulario } from "./useFormulario";

/** Edita todos los datos de la ficha del cliente. */
export function FormFicha({ p, alGuardar }: { p: PersonaCrm; alGuardar?: () => void }) {
  const { estado, enviar, pendiente } = useFormulario(fichaAccion, alGuardar);
  const e = estado.errores ?? {};
  return (
    <form onSubmit={enviar} noValidate className="crm-form">
      <input type="hidden" name="persona_id" value={p.id} />
      <input type="hidden" name="abogado_destino" value={p.abogadoDestino} />
      <label className="crm-campo">
        <span>Nombre</span>
        <input name="nombre" className="entrada" required maxLength={120} defaultValue={p.nombre} aria-invalid={e.nombre ? true : undefined} />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Teléfono</span>
          <input name="telefono" className="entrada" maxLength={30} defaultValue={p.telefono} inputMode="tel" aria-invalid={e.telefono ? true : undefined} />
        </label>
        <label className="crm-campo">
          <span>Correo</span>
          <input name="email" className="entrada" maxLength={160} defaultValue={p.email} inputMode="email" aria-invalid={e.email ? true : undefined} />
        </label>
      </div>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Materia</span>
          <select name="materia" className="entrada" defaultValue={p.materia}>
            {MATERIAS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Tipo de cliente</span>
          <select name="tipo" className="entrada" defaultValue={p.tipo}>
            <option value="natural">Persona</option>
            <option value="empresa">Empresa</option>
          </select>
        </label>
      </div>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Región</span>
          <select name="region" className="entrada" defaultValue={p.region}>
            <option value="">—</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Comuna</span>
          <input name="comuna" className="entrada" maxLength={80} defaultValue={p.comuna} />
        </label>
      </div>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Cómo llegó</span>
          <select name="origen" className="entrada" defaultValue={p.origen}>
            {ORIGENES_CRM.map((o) => (
              <option key={o.clave} value={o.clave}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Referido por</span>
          <input name="referido_por" className="entrada" maxLength={120} defaultValue={p.referidoPor} />
        </label>
      </div>
      <label className="crm-campo">
        <span>Disponibilidad para contactarlo</span>
        <input name="disponibilidad" className="entrada" maxLength={300} defaultValue={p.disponibilidad} placeholder="Ej.: lunes a jueves después de las 18:00" />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Honorario estimado ($)</span>
          <input type="number" name="valor_estimado" className="entrada" min={0} defaultValue={p.valorEstimado} inputMode="numeric" />
        </label>
        <label className="crm-check">
          <input type="checkbox" name="prioritario" defaultChecked={p.prioritario} />
          <span>Cliente prioritario</span>
        </label>
      </div>
      <label className="crm-check">
        <input type="checkbox" name="informe_visible" defaultChecked={p.informeVisible} />
        <span>Incluir en el informe de avance que puede ver el cliente</span>
      </label>
      <label className="crm-campo">
        <span>Nota interna (solo tú la ves)</span>
        <textarea name="nota" className="entrada" rows={3} maxLength={1000} defaultValue={p.nota} />
      </label>
      <p className="crm-mini-titulo">Ubicación</p>
      <SelectorUbicacion lat={p.lat} lng={p.lng} direccion={p.direccion} conDireccion />
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
