"use client";

import { useState } from "react";
import { Icono } from "./Iconos";

/** Copia el valor indicado o, si no se indica, el enlace privado de la página actual. */
export function BotonCopiar({ texto = "Copiar enlace", valor }: { texto?: string; valor?: string }) {
  const [listo, setListo] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secundario btn-chico"
      onClick={async () => {
        const contenido = valor ?? location.href.split("?")[0];
        try {
          await navigator.clipboard.writeText(contenido);
          setListo(true);
          setTimeout(() => setListo(false), 2500);
        } catch {
          window.prompt(valor ? "Copia este código:" : "Copia este enlace:", contenido);
        }
      }}
    >
      <Icono nombre={listo ? "check" : "copiar"} tam={15} /> {listo ? "Copiado" : texto}
    </button>
  );
}
