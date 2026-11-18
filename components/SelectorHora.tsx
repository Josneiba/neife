"use client";

import { useState } from "react";

type Dia = { fecha: string; horas: string[] };

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function partes(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return { dia: DIAS[dt.getUTCDay()], largo: DIAS_LARGOS[dt.getUTCDay()], num: d, mes: MESES[m - 1] };
}

/** Elige primero el día y luego la hora. Envía `hora` = "AAAA-MM-DD|HH:MM". */
export default function SelectorHora({ dias }: { dias: Dia[] }) {
  const [fecha, setFecha] = useState(dias[0]?.fecha ?? "");
  const [hora, setHora] = useState("");
  const actual = dias.find((d) => d.fecha === fecha) ?? dias[0];
  const p = actual ? partes(actual.fecha) : null;

  return (
    <div className="sh">
      <div className="sh-dias" role="tablist" aria-label="Día">
        {dias.map((d) => {
          const x = partes(d.fecha);
          const activo = d.fecha === actual?.fecha;
          return (
            <button
              key={d.fecha}
              type="button"
              role="tab"
              aria-selected={activo}
              className="sh-dia"
              onClick={() => { setFecha(d.fecha); setHora(""); }}
            >
              <span>{x.dia}</span>
              <strong>{x.num}</strong>
              <small>{x.mes}</small>
            </button>
          );
        })}
      </div>

      <div className="sh-horas" role="radiogroup" aria-label={p ? `Horas del ${p.largo} ${p.num}` : "Horas"}>
        {actual?.horas.map((h) => (
          <label key={h} className="sh-hora">
            <input
              type="radio"
              name="hora_visible"
              value={h}
              checked={hora === h}
              onChange={() => setHora(h)}
            />
            <span>{h}</span>
          </label>
        ))}
      </div>

      <input type="hidden" name="hora" value={hora ? `${actual?.fecha}|${hora}` : ""} />
      <p className="sh-resumen" aria-live="polite">
        {hora && p ? <>Elegiste el <strong>{p.largo} {p.num} de {p.mes}, {hora}</strong></> : "Elige un día y una hora."}
      </p>
      <button type="submit" className="btn btn-primario" disabled={!hora}>Reservar esta hora</button>
    </div>
  );
}
