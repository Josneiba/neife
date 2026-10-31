"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { guardarMetaAccion } from "@/lib/acciones/crm";
import type { EstadoForm } from "@/lib/validators";
import type { Periodo } from "@/lib/crm/fechas";
import { IconoCrm } from "./IconosCrm";

/**
 * Meta con «−» y «+». Se guarda sola medio segundo después del último toque
 * y avisa «Meta guardada». La meta rige desde este período hacia adelante.
 */
export function EditorMeta({ metrica, periodo, inicio, objetivo }: { metrica: string; periodo: Periodo; inicio: string; objetivo: number }) {
  const [valor, setValor] = useState(String(objetivo));
  const [estado, ejecutar, pendiente] = useActionState(guardarMetaAccion, {} as EstadoForm);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si cambias de período, la pantalla se actualiza con la meta de ese período.
  useEffect(() => setValor(String(objetivo)), [objetivo, inicio, periodo, metrica]);
  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);

  function guardar(v: string) {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("metrica", metrica);
      fd.set("periodo", periodo);
      fd.set("inicio", inicio);
      fd.set("objetivo", v);
      startTransition(() => ejecutar(fd));
    }, 500);
  }
  function cambiar(v: number) {
    const n = Math.max(0, Math.min(10_000, v));
    setValor(String(n));
    guardar(String(n));
  }
  const n = Number(valor);

  return (
    <div className="crm-editor-meta">
      <div className="crm-editor-fila">
        <label className="crm-campo-meta">
          <span className="crm-campo-meta-etiqueta">Meta</span>
          <IconoCrm nombre="usuarios" tam={22} />
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={valor}
            aria-label="Meta"
            onChange={(e) => {
              const limpio = e.target.value.replace(/\D/g, "").slice(0, 5);
              setValor(limpio);
              if (limpio !== "") guardar(limpio);
            }}
          />
        </label>
        <button type="button" className="crm-redondo" aria-label="Bajar la meta" disabled={!(n > 0)} onClick={() => cambiar(n - 1)}>
          <IconoCrm nombre="menos" tam={20} />
        </button>
        <button type="button" className="crm-redondo primario" aria-label="Subir la meta" onClick={() => cambiar((Number.isFinite(n) ? n : 0) + 1)}>
          <IconoCrm nombre="mas" tam={20} />
        </button>
      </div>
      <p className="crm-msg" role="status" aria-live="polite">
        {pendiente ? "Guardando…" : estado.error ? <span className="venc">{estado.error}</span> : estado.errores ? <span className="venc">{Object.values(estado.errores)[0]}</span> : estado.ok ? <span className="ok">{estado.ok}</span> : null}
      </p>
    </div>
  );
}
