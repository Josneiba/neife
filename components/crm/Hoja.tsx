"use client";

import { useEffect, useState } from "react";
import { IconoCrm } from "./IconosCrm";

/** Hoja emergente (desde abajo en el celular, centrada en el computador). Se cierra con Escape o tocando fuera. */
export function Hoja({ titulo, abierta, cerrar, children }: { titulo: string; abierta: boolean; cerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [abierta, cerrar]);
  if (!abierta) return null;
  return (
    <div className="crm-hoja-fondo" onClick={cerrar}>
      <div className="crm-hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{titulo}</h2>
          <button type="button" className="crm-icono-boton" aria-label="Cerrar" onClick={cerrar}>
            <IconoCrm nombre="cerrar" tam={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Botón que abre una hoja con el formulario que le pases como función (recibe «cerrar»). */
export function BotonHoja({
  texto,
  titulo,
  clase = "crm-enlace-boton",
  icono,
  children,
}: {
  texto: string;
  titulo: string;
  clase?: string;
  icono?: React.ComponentProps<typeof IconoCrm>["nombre"];
  children: (cerrar: () => void) => React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const cerrar = () => setAbierta(false);
  return (
    <>
      <button type="button" className={clase} onClick={() => setAbierta(true)}>
        {icono ? <IconoCrm nombre={icono} tam={16} /> : null} {texto}
      </button>
      <Hoja titulo={titulo} abierta={abierta} cerrar={cerrar}>
        {children(cerrar)}
      </Hoja>
    </>
  );
}
