"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { aQuery, CAMPOS, leerFiltros, type FiltrosClientes } from "@/lib/crm/filtros";
import { IconoCrm } from "./IconosCrm";
import { Popover } from "./Popover";

export type OpcionesFiltro = {
  etapas: { clave: string; nombre: string }[];
  materias: { clave: string; nombre: string }[];
  origenes: { clave: string; nombre: string }[];
  grupos: { clave: string; nombre: string }[];
};

type Clave = "c" | "g" | "e" | "m" | "o";

function Lista({ clave, opciones, f, base }: { clave: Clave; opciones: { clave: string; nombre: string }[]; f: FiltrosClientes; base: string }) {
  const router = useRouter();
  const actual = (clave === "g" ? f.g.map(String) : f[clave]) as string[];
  const [sel, setSel] = useState<string[]>(actual);
  const alternar = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  function aplicar() {
    const n: FiltrosClientes = { ...f, [clave]: clave === "g" ? sel.map(Number) : sel } as FiltrosClientes;
    const q = aQuery(n);
    router.push(q ? `${base}?${q}` : base);
  }
  return (
    <div>
      {opciones.map((o) => (
        <label key={o.clave} className="pop-op">
          <span>{o.nombre}</span>
          <input type="checkbox" checked={sel.includes(o.clave)} onChange={() => alternar(o.clave)} />
        </label>
      ))}
      {opciones.length === 0 ? <p className="busca-vacio">Aún no hay opciones.</p> : null}
      <div className="crm-acciones-fila" style={{ padding: "6px 10px" }}>
        <button type="button" data-cerrar className="btn btn-primario btn-chico" onClick={aplicar}>
          Aplicar
        </button>
        <button type="button" data-cerrar className="btn btn-secundario btn-chico" onClick={() => setSel([])}>
          Ninguno
        </button>
      </div>
    </div>
  );
}

/**
 * Fila de filtros bajo la barra (embudo + chips con ▾), igual que en la referencia:
 * el embudo abre la página de Filtro completa y cada chip, su lista para marcar.
 */
export function ChipsFiltro({ base, opciones, conCampos = true }: { base: string; opciones: OpcionesFiltro; conCampos?: boolean }) {
  const sp = useSearchParams();
  const f = leerFiltros(Object.fromEntries(sp.entries()));
  const q = aQuery(f);
  const chips: { clave: Clave; nombre: string; opciones: { clave: string; nombre: string }[]; n: number }[] = [
    ...(conCampos ? [{ clave: "c" as Clave, nombre: "Campos mostrados", opciones: CAMPOS.map((c) => ({ clave: c.clave, nombre: c.nombre })), n: 0 }] : []),
    { clave: "g", nombre: "Grupos", opciones: opciones.grupos, n: f.g.length },
    { clave: "e", nombre: "Etapa", opciones: opciones.etapas, n: f.e.length },
    { clave: "m", nombre: "Materia", opciones: opciones.materias, n: f.m.length },
    { clave: "o", nombre: "Origen", opciones: opciones.origenes, n: f.o.length },
  ];
  return (
    <div className="chips-barra" role="toolbar" aria-label="Filtros">
      <Link href={`/panel/crm/clientes/filtro?${q}${base.includes("zonas") ? `${q ? "&" : ""}de=zonas` : ""}`} className="chip-icono" aria-label="Abrir todos los filtros">
        <IconoCrm nombre="filtro" tam={24} />
      </Link>
      {chips.map((c) => (
        <Popover key={c.clave} etiqueta={c.nombre} alinear="izq" clase={`chip-menu${c.n ? " activo" : ""}`} trigger={<>{c.nombre}{c.n ? ` (${c.n})` : ""}<IconoCrm nombre="flecha-abajo" tam={16} /></>}>
          <Lista clave={c.clave} opciones={c.opciones} f={f} base={base} />
        </Popover>
      ))}
    </div>
  );
}
