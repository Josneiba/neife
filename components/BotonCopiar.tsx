"use client";

import { useState } from "react";
import { Icono } from "./Iconos";

/** Copia el enlace de la página actual. Sin cuenta, es la única forma de volver a ver el caso. */
export function BotonCopiar({ texto = "Copiar enlace" }: { texto?: string }) {
  const [listo, setListo] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secundario btn-chico"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href.split("?")[0]);
          setListo(true);
          setTimeout(() => setListo(false), 2500);
        } catch {
          window.prompt("Copia este enlace:", location.href.split("?")[0]);
        }
      }}
    >
      <Icono nombre={listo ? "check" : "copiar"} tam={15} /> {listo ? "Copiado" : texto}
    </button>
  );
}
