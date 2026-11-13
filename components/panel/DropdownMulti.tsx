"use client";

import { useEffect, useRef, useState } from "react";

type Opcion = { valor: string; texto: string };

export function DropdownMulti({
  nombre,
  etiqueta,
  opciones,
  elegidas,
  todos,
}: {
  nombre: string;
  etiqueta: string;
  opciones: Opcion[];
  elegidas: string[];
  todos: string;
}) {
  const [seleccionadas, setSeleccionadas] = useState<string[]>(elegidas);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const cerrarFuera = (evento: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(evento.target as Node)) ref.current.open = false;
    };
    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("mousedown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, []);

  const texto = seleccionadas.length === 0
    ? todos
    : seleccionadas.length <= 2
      ? opciones.filter((opcion) => seleccionadas.includes(opcion.valor)).map((opcion) => opcion.texto).join(", ")
      : `${seleccionadas.length} elegidos`;

  return (
    <div className="dd-campo">
      <span className="dd-etiqueta">{etiqueta}</span>
      <details className="dd" ref={ref}>
        <summary aria-label={`${etiqueta}: ${texto}`}>
          <span className="dd-valor">{texto}</span>
        </summary>
        <div className="dd-lista" role="group" aria-label={etiqueta}>
          {opciones.map((opcion) => (
            <label key={opcion.valor}>
              <input
                type="checkbox"
                name={nombre}
                value={opcion.valor}
                checked={seleccionadas.includes(opcion.valor)}
                onChange={(evento) => setSeleccionadas((previas) =>
                  evento.target.checked
                    ? [...previas, opcion.valor]
                    : previas.filter((valor) => valor !== opcion.valor),
                )}
              />
              <span>{opcion.texto}</span>
            </label>
          ))}
          {seleccionadas.length > 0 ? (
            <button type="button" className="dd-limpiar" onClick={() => setSeleccionadas([])}>
              Quitar selección
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
