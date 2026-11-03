"use client";

import { useEffect, useRef, useState } from "react";
import { IconoCrm, type NombreIconoCrm } from "./IconosCrm";

/**
 * Menú desplegable pequeño (los tres puntos, la flecha del título, los chips de filtro).
 * Se cierra al tocar fuera, con Escape o al elegir un enlace o botón de envío.
 */
export function Popover({
  etiqueta,
  icono,
  trigger,
  clase = "crm-icono-boton",
  alinear = "der",
  ancho,
  children,
}: {
  etiqueta: string;
  icono?: NombreIconoCrm;
  trigger?: React.ReactNode;
  clase?: string;
  alinear?: "izq" | "der";
  ancho?: number;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  return (
    <span className="pop" ref={caja}>
      <button type="button" className={clase} aria-label={etiqueta} aria-expanded={abierto} aria-haspopup="menu" onClick={() => setAbierto((a) => !a)}>
        {trigger ?? (icono ? <IconoCrm nombre={icono} tam={22} /> : null)}
      </button>
      {abierto ? (
        <div
          className={`pop-panel ${alinear}`}
          style={ancho ? { minWidth: ancho } : undefined}
          role="menu"
          onClick={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest("a") || t.closest("button[type=submit]") || t.closest("[data-cerrar]")) setAbierto(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
