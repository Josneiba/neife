"use client";

import { useState } from "react";
import {
  crearPersonaAccion,
  crearTareaAccion,
  registrarInteraccionAccion,
} from "@/lib/acciones/crm";
import { MATERIAS } from "@/lib/materias";
import { CANALES, ORIGENES_CRM } from "@/lib/crm/catalogo";
import { SelectorUbicacion } from "./SelectorUbicacion";
import { MensajeForm, useFormulario } from "./useFormulario";

type Opcion = { id: number; nombre: string };

function SelectorPersona({ personas, error }: { personas: Opcion[]; error?: string }) {
  return (
    <label className="crm-campo">
      <span>Cliente</span>
      <select name="persona_id" className="entrada" required defaultValue="" aria-invalid={error ? true : undefined}>
        <option value="" disabled>
          Elige a quién…
        </option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormCliente() {
  const { estado, enviar, pendiente, ref } = useFormulario(crearPersonaAccion);
  const e = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <label className="crm-campo">
        <span>Nombre</span>
        <input name="nombre" className="entrada" required maxLength={120} autoComplete="off" autoFocus aria-invalid={e.nombre ? true : undefined} />
      </label>
      <label className="crm-campo">
        <span>Teléfono o correo</span>
        <input name="contacto" className="entrada" maxLength={160} autoComplete="off" inputMode="text" />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Materia</span>
          <select name="materia" className="entrada" defaultValue="otra">
            {MATERIAS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Cómo llegó</span>
          <select name="origen" className="entrada" defaultValue="otro">
            {ORIGENES_CRM.map((o) => (
              <option key={o.clave} value={o.clave}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="crm-campo">
        <span>Nota (opcional)</span>
        <input name="nota" className="entrada" maxLength={1000} autoComplete="off" />
      </label>
      <MasDatos />
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar cliente"}
      </button>
    </form>
  );
}

/** «+ Referido por», «+ Dirección», «+ Ubicación en el mapa»: datos opcionales que no estorban al agregar rápido. */
function MasDatos() {
  const [mapa, setMapa] = useState(false);
  return (
    <details className="crm-mas-datos">
      <summary>+ Más datos (dirección, referido por, ubicación)</summary>
      <div className="crm-form">
        <label className="crm-campo">
          <span>Referido por</span>
          <input name="referido_por" className="entrada" maxLength={120} autoComplete="off" />
        </label>
        <label className="crm-campo">
          <span>Dirección</span>
          <input name="direccion" className="entrada" maxLength={200} autoComplete="off" />
        </label>
        {mapa ? (
          <SelectorUbicacion />
        ) : (
          <button type="button" className="btn btn-secundario btn-chico" onClick={() => setMapa(true)}>
            Marcar ubicación en el mapa
          </button>
        )}
      </div>
    </details>
  );
}

export function FormInteraccion({ forma, personas, hoy, personaId }: { forma: "asesoria" | "reunion" | "contacto"; personas: Opcion[]; hoy: string; personaId?: number }) {
  const { estado, enviar, pendiente, ref } = useFormulario(registrarInteraccionAccion);
  const e = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      {forma === "reunion" ? (
        <label className="crm-campo">
          <span>Qué fue</span>
          <select name="tipo" className="entrada" defaultValue="reunion">
            <option value="reunion">Reunión presencial</option>
            <option value="audiencia">Audiencia</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="tipo" value={forma} />
      )}
      {personaId ? <input type="hidden" name="persona_id" value={personaId} /> : <SelectorPersona personas={personas} error={e.persona_id} />}
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Fecha</span>
          <input type="date" name="fecha" className="entrada" defaultValue={hoy} max={hoy} />
        </label>
        <label className="crm-campo">
          <span>Canal</span>
          <select name="canal" className="entrada" defaultValue={forma === "reunion" ? "presencial" : ""}>
            <option value="">—</option>
            {CANALES.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      {forma === "asesoria" ? (
        <label className="crm-check">
          <input type="checkbox" name="con_colega" />
          <span>Con abogado supervisor o colega presente</span>
        </label>
      ) : null}
      <label className="crm-campo">
        <span>Nota (opcional)</span>
        <textarea name="nota" className="entrada" rows={3} maxLength={1500} />
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function FormTarea({ personas, hoy, personaId }: { personas: Opcion[]; hoy: string; personaId?: number }) {
  const { estado, enviar, pendiente, ref } = useFormulario(crearTareaAccion);
  const e = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <label className="crm-campo">
        <span>Tarea</span>
        <input name="texto" className="entrada" required maxLength={300} autoComplete="off" autoFocus aria-invalid={e.texto ? true : undefined} placeholder="Ej.: pedir contrato de arriendo" />
      </label>
      <div className="crm-dos">
        {personaId ? (
          <input type="hidden" name="persona_id" value={personaId} />
        ) : (
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
        )}
        <label className="crm-campo">
          <span>Para el día</span>
          <input type="date" name="vence" className="entrada" min={hoy} />
        </label>
      </div>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar tarea"}
      </button>
    </form>
  );
}
