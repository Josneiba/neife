"use client";

import { useMemo, useState } from "react";
import type { PlantillaMensaje } from "@/lib/crm/contenido";

type Persona = { id: number; nombre: string; telefono: string };

function whatsapp(tel: string, texto: string): string | null {
  const n = tel.replace(/\D/g, "");
  if (n.length < 8) return null;
  const completo = n.startsWith("56") ? n : n.length === 9 ? `56${n}` : n;
  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
}

/** Elige una plantilla y un cliente, completa fecha y hora, y copia el mensaje o ábrelo en WhatsApp. */
export function UsarPlantilla({ plantillas, personas, abogado, inicial, personaInicial }: { plantillas: PlantillaMensaje[]; personas: Persona[]; abogado: string; inicial?: string; personaInicial?: number }) {
  const [clave, setClave] = useState(plantillas.find((p) => p.clave === inicial)?.clave ?? plantillas[0].clave);
  const [personaId, setPersonaId] = useState<number>(personaInicial ?? 0);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [copiado, setCopiado] = useState(false);
  const pl = plantillas.find((p) => p.clave === clave) ?? plantillas[0];
  const persona = personas.find((p) => p.id === personaId);
  const [editado, setEditado] = useState<string | null>(null);

  const base = useMemo(
    () =>
      pl.texto
        .replaceAll("[nombre]", persona ? persona.nombre.split(" ")[0] : "[nombre]")
        .replaceAll("[abogado]", abogado || "[abogado]")
        .replaceAll("[fecha]", fecha ? new Date(fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }) : "[fecha]")
        .replaceAll("[hora]", hora || "[hora]"),
    [pl, persona, abogado, fecha, hora],
  );
  const texto = editado ?? base;
  const enlace = persona?.telefono ? whatsapp(persona.telefono, texto) : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles: el texto sigue visible para copiarlo a mano */
    }
  }

  return (
    <div className="crm-form">
      <div className="crm-chips-linea" role="group" aria-label="Plantilla">
        {plantillas.map((p) => (
          <button key={p.clave} type="button" className={`crm-chip-boton${p.clave === clave ? " activa" : ""}`} aria-pressed={p.clave === clave} onClick={() => { setClave(p.clave); setEditado(null); }}>
            {p.titulo}
          </button>
        ))}
      </div>
      <p className="crm-ayuda">{pl.cuando}</p>
      <div className="crm-dos">
        <label className="crm-campo">
          <span>Cliente</span>
          <select className="entrada" value={personaId} onChange={(e) => { setPersonaId(Number(e.target.value)); setEditado(null); }}>
            <option value={0}>Sin elegir</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </label>
        <label className="crm-campo">
          <span>Fecha</span>
          <input type="date" className="entrada" value={fecha} onChange={(e) => { setFecha(e.target.value); setEditado(null); }} />
        </label>
        <label className="crm-campo">
          <span>Hora</span>
          <input type="time" className="entrada" value={hora} onChange={(e) => { setHora(e.target.value); setEditado(null); }} />
        </label>
      </div>
      <label className="crm-campo">
        <span>Mensaje (puedes editarlo)</span>
        <textarea className="entrada" rows={6} value={texto} onChange={(e) => setEditado(e.target.value)} />
      </label>
      <div className="crm-acciones-fila">
        <button type="button" className="btn btn-primario btn-chico" onClick={copiar}>
          {copiado ? "Copiado" : "Copiar mensaje"}
        </button>
        {enlace ? (
          <a href={enlace} target="_blank" rel="noopener noreferrer" className="btn btn-secundario btn-chico">
            Abrir en WhatsApp
          </a>
        ) : (
          <span className="crm-ayuda">{persona ? "Este cliente no tiene teléfono." : "Elige un cliente para abrir WhatsApp."}</span>
        )}
      </div>
    </div>
  );
}
