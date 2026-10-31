"use client";

import { useEffect, useState } from "react";
import {
  crearPersonaAccion,
  crearTareaAccion,
  registrarInteraccionAccion,
} from "@/lib/acciones/crm";
import { MATERIAS } from "@/lib/materias";
import { CANALES, ORIGENES_CRM } from "@/lib/crm/catalogo";
import { IconoCrm, type NombreIconoCrm } from "./IconosCrm";
import { MensajeForm, useFormulario } from "./useFormulario";

type Opcion = { id: number; nombre: string };
type Forma = "cliente" | "asesoria" | "reunion" | "contacto" | "tarea";

const ACCIONES: { forma: Forma; texto: string; icono: NombreIconoCrm }[] = [
  { forma: "reunion", texto: "Reunión o audiencia", icono: "balanza" },
  { forma: "tarea", texto: "Tarea", icono: "tarea" },
  { forma: "cliente", texto: "Cliente", icono: "usuario-mas" },
  { forma: "asesoria", texto: "Asesoría", icono: "birrete" },
  { forma: "contacto", texto: "Contacto", icono: "mensaje" },
];

const TITULOS: Record<Forma, string> = {
  cliente: "Nuevo cliente",
  asesoria: "Registrar asesoría",
  reunion: "Registrar reunión o audiencia",
  contacto: "Registrar contacto",
  tarea: "Nueva tarea",
};

/**
 * Botón «+» flotante con las 5 acciones más usadas (como la referencia).
 * Cada una abre una hoja con un formulario corto; Enter guarda y queda listo para el siguiente.
 */
export function AccionesRapidas({ personas, hoy }: { personas: Opcion[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [forma, setForma] = useState<Forma | null>(null);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setForma(null);
      setAbierto(false);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  return (
    <>
      {abierto && !forma ? <button type="button" className="crm-velo" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} /> : null}
      <div className="crm-fab-zona">
        {abierto && !forma ? (
          <ul className="crm-fab-lista" aria-label="Acciones rápidas">
            {ACCIONES.map((a) => (
              <li key={a.forma}>
                <button type="button" className="crm-fab-item" onClick={() => setForma(a.forma)}>
                  <IconoCrm nombre={a.icono} tam={20} />
                  {a.texto}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="crm-fab"
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar acciones rápidas" : "Abrir acciones rápidas"}
          onClick={() => {
            setForma(null);
            setAbierto((a) => !a);
          }}
        >
          <IconoCrm nombre={abierto ? "cerrar" : "mas"} tam={26} />
        </button>
      </div>

      {forma ? (
        <div className="crm-hoja-fondo" onClick={() => setForma(null)}>
          <div className="crm-hoja" role="dialog" aria-modal="true" aria-label={TITULOS[forma]} onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>{TITULOS[forma]}</h2>
              <button type="button" className="crm-icono-boton" aria-label="Cerrar" onClick={() => setForma(null)}>
                <IconoCrm nombre="cerrar" tam={20} />
              </button>
            </header>
            {forma === "cliente" ? <FormCliente /> : null}
            {forma === "tarea" ? <FormTarea personas={personas} hoy={hoy} /> : null}
            {forma === "asesoria" || forma === "reunion" || forma === "contacto" ? <FormInteraccion forma={forma} personas={personas} hoy={hoy} /> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

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
      <MensajeForm estado={estado} />
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar cliente"}
      </button>
    </form>
  );
}

function FormInteraccion({ forma, personas, hoy }: { forma: "asesoria" | "reunion" | "contacto"; personas: Opcion[]; hoy: string }) {
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
      <SelectorPersona personas={personas} error={e.persona_id} />
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

export function FormTarea({ personas, hoy }: { personas: Opcion[]; hoy: string }) {
  const { estado, enviar, pendiente, ref } = useFormulario(crearTareaAccion);
  const e = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={enviar} noValidate className="crm-form">
      <label className="crm-campo">
        <span>Tarea</span>
        <input name="texto" className="entrada" required maxLength={300} autoComplete="off" autoFocus aria-invalid={e.texto ? true : undefined} placeholder="Ej.: pedir contrato de arriendo" />
      </label>
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
