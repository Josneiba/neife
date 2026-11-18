"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CAUSALES, calcularFiniquito, type Causal } from "@/lib/finiquito";
import { materiaConPlazo, plazoDe } from "@/lib/plazos";
import { pesos } from "@/lib/formato";
import { hoyLocal } from "@/lib/crm/fechas";

const hoyISO = () => hoyLocal();
const fechaLarga = (f: string) => f.split("-").reverse().join("-");

function Plazos() {
  const [materia, setMateria] = useState("laboral");
  const [fecha, setFecha] = useState("");
  const p = useMemo(() => (fecha ? plazoDe(materia, fecha, hoyISO()) : null), [materia, fecha]);
  return (
    <section className="cal-panel" aria-labelledby="cal-plazos">
      <h2 id="cal-plazos">¿Cuánto plazo me queda?</h2>
      <p className="cal-ayuda">Elige el tipo de problema y la fecha en que ocurrió. Te decimos hasta cuándo conviene actuar.</p>
      <div className="cal-campos">
        <label>
          <span>¿Qué pasó?</span>
          <select value={materia} onChange={(e) => setMateria(e.target.value)}>
            <option value="laboral">Me despidieron o terminó mi trabajo</option>
            <option value="consumidor">Compré algo o contraté un servicio y tuve un problema</option>
          </select>
        </label>
        <label>
          <span>¿Cuándo ocurrió?</span>
          <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </label>
      </div>
      {p ? (
        <div className="cal-resultado" data-tono={p.tono} role="status">
          <strong>{p.texto}</strong>
          <p>{p.titulo} hasta el <b>{fechaLarga(p.limite)}</b>.</p>
          <p className="cal-ayuda">{p.base} No cuenta feriados, así que la fecha real puede ser un poco posterior; no te confíes de los últimos días.</p>
          {materiaConPlazo(materia) ? (
            <Link className="btn btn-primario" href={`/asesoria/solicitar?materia=${materia}&fecha=${fecha}`}>Contar mi caso a un asesor</Link>
          ) : null}
        </div>
      ) : (
        <p className="cal-vacio">Escribe la fecha para ver el plazo.</p>
      )}
    </section>
  );
}

function Finiquito() {
  const [f, setF] = useState({ inicio: "", termino: "", remuneracion: "", causal: "necesidades" as Causal, aviso: "no", vacaciones: "", uf: "" });
  const num = (t: string) => Number(t.replace(/\./g, "").replace(",", ".")) || 0;
  const listo = f.inicio && f.termino && f.termino >= f.inicio && num(f.remuneracion) > 0;
  const r = useMemo(
    () => (listo ? calcularFiniquito({ inicio: f.inicio, termino: f.termino, remuneracion: num(f.remuneracion), causal: f.causal, avisoPrevio: f.aviso === "si", diasVacaciones: num(f.vacaciones), uf: num(f.uf) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f, listo],
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const ayuda = CAUSALES.find((c) => c.clave === f.causal)?.ayuda;
  return (
    <section className="cal-panel" aria-labelledby="cal-fin">
      <h2 id="cal-fin">Calculadora de finiquito</h2>
      <p className="cal-ayuda">Un cálculo de referencia. No guardamos lo que escribes.</p>
      <div className="cal-campos">
        <label><span>Inicio del trabajo</span><input type="date" value={f.inicio} onChange={set("inicio")} /></label>
        <label><span>Fin del trabajo</span><input type="date" value={f.termino} onChange={set("termino")} /></label>
        <label><span>Última remuneración mensual ($)</span><input inputMode="numeric" placeholder="800000" value={f.remuneracion} onChange={set("remuneracion")} /></label>
        <label><span>Valor de la UF hoy ($)</span><input inputMode="decimal" placeholder="Para el tope de 90 UF" value={f.uf} onChange={set("uf")} /></label>
        <label className="cal-ancha">
          <span>¿Cómo terminó?</span>
          <select value={f.causal} onChange={set("causal")}>{CAUSALES.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}</select>
          {ayuda ? <small>{ayuda}</small> : null}
        </label>
        <label><span>¿Te avisaron con 30 días?</span><select value={f.aviso} onChange={set("aviso")}><option value="no">No</option><option value="si">Sí</option></select></label>
        <label><span>Días de vacaciones pendientes</span><input inputMode="numeric" placeholder="0" value={f.vacaciones} onChange={set("vacaciones")} /></label>
      </div>
      {r ? (
        <div className="cal-resultado" data-tono="ok" role="status">
          <ul className="cal-lineas">
            {r.lineas.map((l) => (
              <li key={l.concepto}><span>{l.concepto}<small>{l.detalle}</small></span><b>{pesos(l.monto)}</b></li>
            ))}
            {r.lineas.length === 0 ? <li><span>Con estos datos no corresponde un pago adicional.</span></li> : null}
          </ul>
          <p className="cal-total"><span>Total de referencia</span><b>{pesos(r.total)}</b></p>
          {r.avisos.map((a) => <p key={a} className="cal-ayuda">{a}</p>)}
          <Link className="btn btn-primario" href={`/asesoria/solicitar?materia=laboral${f.termino ? `&fecha=${f.termino}` : ""}`}>Que un asesor revise mi finiquito</Link>
        </div>
      ) : (
        <p className="cal-vacio">Completa las fechas y la remuneración para ver el resultado.</p>
      )}
    </section>
  );
}

export function Calculadoras() {
  const [vista, setVista] = useState<"plazos" | "finiquito">("plazos");
  return (
    <div className="cal">
      <div className="cal-tabs" role="tablist" aria-label="Calculadora">
        <button type="button" role="tab" aria-selected={vista === "plazos"} onClick={() => setVista("plazos")}>Plazos</button>
        <button type="button" role="tab" aria-selected={vista === "finiquito"} onClick={() => setVista("finiquito")}>Finiquito</button>
      </div>
      {vista === "plazos" ? <Plazos /> : <Finiquito />}
    </div>
  );
}
