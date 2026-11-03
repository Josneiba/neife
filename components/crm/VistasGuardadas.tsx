"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconoCrm } from "./IconosCrm";
import { OpcionMenu } from "@/components/panel/BarraApp";

type Vista = { nombre: string; q: string };
const LLAVE = "crm-vistas";

function leer(): Vista[] {
  try {
    const v = JSON.parse(localStorage.getItem(LLAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.nombre === "string" && typeof x.q === "string") : [];
  } catch {
    return [];
  }
}
function guardar(v: Vista[]) {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
}

/** Las vistas guardadas (filtros con nombre) de este navegador, dentro del menú del título. */
export function VistasGuardadas({ base }: { base: string }) {
  const [vistas, setVistas] = useState<Vista[]>([]);
  useEffect(() => setVistas(leer()), []);
  if (!vistas.length) return null;
  return (
    <>
      <p className="pop-sep">Mis filtros guardados</p>
      {vistas.map((v) => (
        <div key={v.nombre} className="pop-fila">
          <OpcionMenu href={`${base}?${v.q}`} icono="filtro">{v.nombre}</OpcionMenu>
          <button
            type="button"
            className="crm-icono-boton"
            aria-label={`Borrar el filtro ${v.nombre}`}
            onClick={() => {
              const n = vistas.filter((x) => x.nombre !== v.nombre);
              guardar(n);
              setVistas(n);
            }}
          >
            <IconoCrm nombre="papelera" tam={18} />
          </button>
        </div>
      ))}
    </>
  );
}

/** Ícono «embudo +»: guarda los filtros que estás usando con un nombre. */
export function BotonGuardarFiltro() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const q = sp.toString();
  return (
    <button
      type="button"
      className="crm-icono-boton ba-icono"
      aria-label="Guardar este filtro"
      onClick={() => {
        if (!q) return window.alert("Primero elige algún filtro (embudo o chips) para poder guardarlo.");
        const nombre = window.prompt("Nombre para este filtro:")?.trim();
        if (!nombre) return;
        const otras = leer().filter((v) => v.nombre !== nombre);
        guardar([...otras, { nombre: nombre.slice(0, 40), q }]);
        window.alert(`Guardado. Lo encuentras en el menú de «${pathname.includes("zonas") ? "Mapa" : "Clientes"}».`);
      }}
    >
      <IconoCrm nombre="filtro-mas" tam={22} />
    </button>
  );
}

