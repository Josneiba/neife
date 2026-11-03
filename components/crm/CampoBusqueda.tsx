"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconoCrm } from "./IconosCrm";

const LLAVE = "crm-busquedas";

/** Campo de búsqueda de la página «Buscar»: busca mientras escribes y recuerda las últimas búsquedas. */
export function CampoBusqueda({ q, hayResultados }: { q: string; hayResultados: boolean }) {
  const router = useRouter();
  const [valor, setValor] = useState(q);
  const [recientes, setRecientes] = useState<string[]>([]);
  useEffect(() => {
    try {
      setRecientes(JSON.parse(localStorage.getItem(LLAVE) ?? "[]"));
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      if (valor.trim() !== q) router.replace(valor.trim() ? `/panel/crm/buscar?q=${encodeURIComponent(valor.trim())}` : "/panel/crm/buscar");
    }, 250);
    return () => clearTimeout(t);
  }, [valor, q, router]);
  function recordar() {
    const v = valor.trim();
    if (!v) return;
    const n = [v, ...recientes.filter((x) => x !== v)].slice(0, 8);
    setRecientes(n);
    try {
      localStorage.setItem(LLAVE, JSON.stringify(n));
    } catch {
      /* sin almacenamiento */
    }
  }
  return (
    <>
      <div className="busca-campo">
        <IconoCrm nombre="buscar" tam={22} />
        <input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && recordar()} onBlur={recordar} placeholder="Buscar" aria-label="Buscar clientes" maxLength={80} />
        {valor ? (
          <button type="button" className="crm-icono-boton" aria-label="Borrar" onClick={() => setValor("")}>
            <IconoCrm nombre="cerrar" tam={18} />
          </button>
        ) : null}
      </div>
      {!q ? (
        recientes.length ? (
          <div className="busca-recientes">
            {recientes.map((r) => (
              <button key={r} type="button" className="chip-menu" onClick={() => setValor(r)}>
                {r}
              </button>
            ))}
          </div>
        ) : (
          <p className="busca-vacio">No hay búsquedas recientes</p>
        )
      ) : !hayResultados ? (
        <p className="busca-vacio">Sin resultados para «{q}»</p>
      ) : null}
    </>
  );
}
