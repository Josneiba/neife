import type { Metadata } from "next";
import Link from "next/link";
import { AVISO_ETICA, CONSEJOS } from "@/lib/crm/contenido";
import { Seccion } from "@/components/crm/Piezas";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Consejos para encontrar clientes" };

export default function Consejos() {
  return (
    <>
      <BarraApp titulo="Consejos" volver="/panel/crm" />
      <div className="crm-pagina">
        <Seccion titulo="Ideas">
          <ul className="crm-consejos">
            {CONSEJOS.map((c) => (
              <li key={c.t}>
                <strong>{c.t}</strong>
                <p>{c.c}</p>
              </li>
            ))}
          </ul>
        </Seccion>
        <p className="crm-ayuda">{AVISO_ETICA}</p>
        <p>
          <Link href="/panel/crm/plantillas" className="btn btn-secundario btn-chico">Ir a las plantillas de mensaje</Link>{" "}
          <Link href="/panel/crm/planificacion?t=encontrar" className="btn btn-secundario btn-chico">Planificar cómo encontrar clientes</Link>
        </p>
      </div>
    </>
  );
}
