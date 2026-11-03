"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { aQuery, CAMPOS, ORDENES, type FiltrosClientes } from "@/lib/crm/filtros";
import { BarraApp } from "@/components/panel/BarraApp";
import { IconoCrm } from "./IconosCrm";
import type { OpcionesFiltro } from "./ChipsFiltro";

type Opc = { clave: string; nombre: string }[];

function Grupo({ titulo, opciones, sel, setSel }: { titulo: string; opciones: Opc; sel: string[]; setSel: (v: string[]) => void }) {
  const todos = opciones.length > 0 && sel.length === opciones.length;
  const parcial = sel.length > 0 && !todos;
  return (
    <details className="filtro-grupo">
      <summary>
        <span>{titulo}</span>
        <IconoCrm nombre="flecha-abajo" tam={18} className="flecha" />
        <span className="todos">
          Todos
          <input
            type="checkbox"
            aria-label={`Marcar todos en ${titulo}`}
            checked={todos}
            ref={(el) => {
              if (el) el.indeterminate = parcial;
            }}
            onClick={(e) => e.stopPropagation()}
            onChange={() => setSel(todos ? [] : opciones.map((o) => o.clave))}
          />
        </span>
      </summary>
      <div className="filtro-opciones">
        {opciones.map((o) => (
          <label key={o.clave}>
            <span>{o.nombre}</span>
            <input type="checkbox" checked={sel.includes(o.clave)} onChange={() => setSel(sel.includes(o.clave) ? sel.filter((x) => x !== o.clave) : [...sel, o.clave])} />
          </label>
        ))}
        {opciones.length === 0 ? <span className="busca-vacio">Aún no hay opciones.</span> : null}
      </div>
    </details>
  );
}

/** Página «Filtro» a pantalla completa: ✕ cancela, ✓ aplica. Puede guardar el filtro con un nombre. */
export function FormFiltro({ inicial, opciones, regiones, volver }: { inicial: FiltrosClientes; opciones: OpcionesFiltro; regiones: Opc; volver: string }) {
  const router = useRouter();
  const [f, setF] = useState<FiltrosClientes>(inicial);
  const [guardar, setGuardar] = useState(false);
  const set = <K extends keyof FiltrosClientes>(k: K, v: FiltrosClientes[K]) => setF((x) => ({ ...x, [k]: v }));

  function aplicar() {
    const q = aQuery(f);
    if (guardar) {
      const nombre = window.prompt("Nombre para este filtro:")?.trim();
      if (nombre) {
        try {
          const v = JSON.parse(localStorage.getItem("crm-vistas") ?? "[]").filter((x: { nombre: string }) => x.nombre !== nombre);
          localStorage.setItem("crm-vistas", JSON.stringify([...v, { nombre: nombre.slice(0, 40), q }]));
        } catch {
          /* sin almacenamiento */
        }
      }
    }
    router.push(q ? `${volver}?${q}` : volver);
  }

  return (
    <div className="filtro-pag">
      <BarraApp
        titulo="Filtro"
        volver={volver}
        acciones={
          <button type="button" className="crm-icono-boton ba-icono" aria-label="Aplicar el filtro" onClick={aplicar}>
            <IconoCrm nombre="check" tam={24} />
          </button>
        }
      />
      <label className="filtro-fila">
        <span>Guardar como filtro</span>
        <input type="checkbox" role="switch" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
      </label>
      <label className="crm-campo" style={{ margin: "12px 16px 0" }}>
        <span>Ordenar la lista de clientes</span>
        <select className="entrada" value={f.s} onChange={(e) => set("s", e.target.value)}>
          {ORDENES.map((o) => (
            <option key={o.clave} value={o.clave}>
              {o.nombre}
            </option>
          ))}
        </select>
      </label>
      <Grupo titulo="Campos mostrados" opciones={CAMPOS.map((c) => ({ clave: c.clave, nombre: c.nombre }))} sel={f.c} setSel={(v) => set("c", v)} />
      <Grupo titulo="Grupos" opciones={opciones.grupos} sel={f.g.map(String)} setSel={(v) => set("g", v.map(Number))} />
      <Grupo titulo="Etapa" opciones={opciones.etapas} sel={f.e} setSel={(v) => set("e", v)} />
      <Grupo titulo="Materia" opciones={opciones.materias} sel={f.m} setSel={(v) => set("m", v)} />
      <Grupo titulo="Región" opciones={regiones} sel={f.r} setSel={(v) => set("r", v)} />
      <Grupo titulo="Origen" opciones={opciones.origenes} sel={f.o} setSel={(v) => set("o", v)} />
      <Grupo
        titulo="Teléfono"
        opciones={[
          { clave: "con", nombre: "Con teléfono" },
          { clave: "sin", nombre: "Sin teléfono" },
        ]}
        sel={f.t ? [f.t] : []}
        setSel={(v) => set("t", v.length === 1 ? (v[0] as "con" | "sin") : "")}
      />
      <div className="crm-acciones-fila" style={{ padding: "16px" }}>
        <button type="button" className="btn btn-primario" onClick={aplicar}>
          Aplicar filtro
        </button>
        <button type="button" className="btn btn-secundario" onClick={() => router.push(volver)}>
          Quitar todos los filtros
        </button>
      </div>
    </div>
  );
}
