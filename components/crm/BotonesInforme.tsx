"use client";

import { useState } from "react";

/** «Imprimir / guardar PDF» y «Copiar resumen» del informe de un cliente. */
export function BotonesInforme({ resumen }: { resumen: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  }
  return (
    <div className="crm-acciones-fila no-imprimir">
      <button type="button" className="btn btn-primario btn-chico" onClick={() => window.print()}>
        Imprimir o guardar PDF
      </button>
      <button type="button" className="btn btn-secundario btn-chico" onClick={copiar}>
        {copiado ? "Copiado" : "Copiar resumen"}
      </button>
    </div>
  );
}
