"use client";

import { actualizarPersonaAccion, fijarHitoAccion, registrarInteraccionAccion } from "@/lib/acciones/crm";
import { CANALES, ORIGENES_CRM, TIPOS_HITO } from "@/lib/crm/catalogo";
import { MATERIAS, REGIONES } from "@/lib/materias";
import { MensajeForm, useFormulario } from "./useFormulario";

/** Registrar algo de ESTE cliente (asesoría, contacto, reunión, audiencia o nota). */
export function RegistroDePersona({ personaId, hoy }: { personaId: number; hoy: string }) {
  const { estado, enviar, pendiente, ref } = useFormulario(registrarInteraccionAccion);
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form" aria-label="Registrar una interacción">
      <input type="hidden" name="persona_id" value={personaId} />
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Qué pasó</span>
          <select name="tipo" className="entrada" defaultValue="asesoria">
            <option value="asesoria">Asesoría</option>
            <option value="contacto">Contacto</option>
            <option value="reunion">Reunión presencial</option>
            <option value="audiencia">Audiencia</option>
            <option value="nota">Nota</option>
          </select>
        </label>
        <label className="crm-campo">
          <span>Fecha</span>
          <input type="date" name="fecha" className="entrada" defaultValue={hoy} max={hoy} />
        </label>
      </div>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Canal</span>
          <select name="canal" className="entrada" defaultValue="">
            <option value="">—</option>
            {CANALES.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-check">
          <input type="checkbox" name="con_colega" />
          <span>Con abogado o colega presente (solo asesorías)</span>
        </label>
      </div>
      <label className="crm-campo">
        <span>Detalle (opcional)</span>
        <textarea name="nota" className="entrada" rows={3} maxLength={1500} />
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}

export function FormHito({ personaId, fecha, tipo }: { personaId: number; fecha: string; tipo: string }) {
  const { estado, enviar, pendiente } = useFormulario(fijarHitoAccion);
  return (
    <form onSubmit={enviar} noValidate className="crm-form-linea" aria-label="Fecha de hito">
      <input type="hidden" name="persona_id" value={personaId} />
      <select name="tipo_hito" className="entrada" defaultValue={tipo || "audiencia"} aria-label="Tipo de hito">
        {TIPOS_HITO.map((t) => (
          <option key={t.clave} value={t.clave}>
            {t.nombre}
          </option>
        ))}
      </select>
      <input type="date" name="fecha" className="entrada" defaultValue={fecha} aria-label="Fecha del hito" />
      <button type="submit" className="btn btn-secundario btn-chico" disabled={pendiente}>
        {pendiente ? "…" : "Guardar"}
      </button>
      <MensajeForm estado={estado} />
    </form>
  );
}

type Datos = {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  materia: string;
  origen: string;
  tipo: string;
  region: string;
  comuna: string;
  nota: string;
  abogadoDestino: string;
  valorEstimado: number;
  prioritario: boolean;
};

export function FormDetalles({ p }: { p: Datos }) {
  const { estado, enviar, pendiente } = useFormulario(actualizarPersonaAccion);
  const e = estado.errores ?? {};
  return (
    <form onSubmit={enviar} noValidate className="crm-form" aria-label="Datos del cliente">
      <input type="hidden" name="persona_id" value={p.id} />
      <label className="crm-campo">
        <span>Nombre o razón social</span>
        <input name="nombre" className="entrada" defaultValue={p.nombre} required maxLength={120} aria-invalid={e.nombre ? true : undefined} />
      </label>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Teléfono</span>
          <input name="telefono" className="entrada" defaultValue={p.telefono} maxLength={30} inputMode="tel" aria-invalid={e.telefono ? true : undefined} />
        </label>
        <label className="crm-campo">
          <span>Correo</span>
          <input name="email" type="email" className="entrada" defaultValue={p.email} maxLength={160} aria-invalid={e.email ? true : undefined} />
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
          <span>Tipo</span>
          <select name="tipo" className="entrada" defaultValue={p.tipo}>
            <option value="natural">Persona natural</option>
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
          <input name="comuna" className="entrada" defaultValue={p.comuna} maxLength={80} />
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
          <span>Valor estimado del caso ($)</span>
          <input name="valor_estimado" type="number" min={0} className="entrada" defaultValue={p.valorEstimado} inputMode="numeric" />
        </label>
      </div>
      <label className="crm-campo">
        <span>Abogado de destino (si lo derivas)</span>
        <input name="abogado_destino" className="entrada" defaultValue={p.abogadoDestino} maxLength={160} />
      </label>
      <label className="crm-campo">
        <span>Notas internas</span>
        <textarea name="nota" className="entrada" rows={3} defaultValue={p.nota} maxLength={1000} />
      </label>
      <label className="crm-check">
        <input type="checkbox" name="prioritario" defaultChecked={p.prioritario} />
        <span>Marcar como prioritario (estrella)</span>
      </label>
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
