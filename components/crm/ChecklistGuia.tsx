"use client";

import { useEffect, useState } from "react";

type Fase = { fase: string; pasos: readonly string[] };

/** Lista de verificación de la primera asesoría. Las marcas se guardan solo en este navegador. */
export function ChecklistGuia({ fases }: { fases: readonly Fase[] }) {
  const [marcas, setMarcas] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const v = localStorage.getItem("crm-guia");
      if (v) setMarcas(JSON.parse(v));
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  function alternar(k: string) {
    const n = { ...marcas, [k]: !marcas[k] };
    setMarcas(n);
    try {
      localStorage.setItem("crm-guia", JSON.stringify(n));
    } catch {
      /* sin almacenamiento */
    }
  }
  function limpiar() {
    setMarcas({});
    try {
      localStorage.removeItem("crm-guia");
    } catch {
      /* sin almacenamiento */
    }
  }
  return (
    <div>
      {fases.map((f) => (
        <section key={f.fase} className="crm-seccion">
          <h2 className="crm-mini-titulo">{f.fase}</h2>
          <ul className="crm-tareas">
            {f.pasos.map((p, i) => {
              const k = `${f.fase}-${i}`;
              return (
                <li key={k} className={marcas[k] ? "hecha" : undefined}>
                  <button type="button" className="crm-casilla" aria-pressed={!!marcas[k]} aria-label={p} onClick={() => alternar(k)}>
                    {marcas[k] ? "✓" : null}
                  </button>
                  <span>{p}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <button type="button" className="btn btn-secundario btn-chico" onClick={limpiar}>
        Desmarcar todo
      </button>
    </div>
  );
}
