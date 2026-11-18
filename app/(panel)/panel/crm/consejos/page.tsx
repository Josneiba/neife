import type { Metadata } from "next";
import Link from "next/link";
import { AVISO_ETICA, CONSEJOS } from "@/lib/crm/contenido";
import { Seccion } from "@/components/crm/Piezas";
import { requerirAbogado } from "@/lib/guards";
import { comoTeVen } from "@/lib/visibilidad";
import { TarjetaVisibilidad } from "@/components/panel/TarjetaVisibilidad";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Consejos para encontrar clientes" };

export default async function Consejos() {
  const usuario = await requerirAbogado();
  const v = await comoTeVen(usuario.id);
  return (
    <>
      <BarraApp titulo="Cómo te ven" volver="/panel/crm" />
      <div className="crm-pagina">
        {v ? <TarjetaVisibilidad v={v} /> : null}
        <Seccion titulo="Ideas para conseguir clientes">
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
        <p><Link href="/panel/enlace" className="btn btn-primario btn-chico">Mi enlace y QR</Link></p>
        <p>
          <Link href="/panel/crm/plantillas" className="btn btn-secundario btn-chico">Ir a las plantillas de mensaje</Link>{" "}
          <Link href="/panel/crm/planificacion?t=encontrar" className="btn btn-secundario btn-chico">Planificar cómo encontrar clientes</Link>
        </p>
      </div>
    </>
  );
}
