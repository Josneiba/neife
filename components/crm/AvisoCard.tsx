import Link from "next/link";
import { ocultarAvisoAccion } from "@/lib/acciones/crm2";
import type { Aviso } from "@/lib/crm/servicio-avisos";
import { IconoCrm } from "./IconosCrm";

const ETIQUETA = { urgente: "Urgente", aviso: "Atención", info: "Para revisar" } as const;

/** Una notificación: toca para ir a resolverla; «Posponer» la oculta un día y «Descartar» dos semanas. */
export function AvisoCard({ a, acciones = true }: { a: Aviso; acciones?: boolean }) {
  return (
    <li className={`crm-aviso-card n-${a.nivel}`}>
      <Link href={a.href} className="crm-aviso-enlace">
        <span className="crm-aviso-icono" aria-hidden="true">
          <IconoCrm nombre={a.nivel === "urgente" ? "alerta" : a.nivel === "aviso" ? "campana" : "info"} tam={20} />
        </span>
        <span className="crm-aviso-texto">
          <span className="crm-aviso-nivel">{ETIQUETA[a.nivel]}</span>
          <strong>{a.titulo}</strong>
          {a.detalle ? <small>{a.detalle}</small> : null}
        </span>
        <IconoCrm nombre="flecha-der" tam={18} />
      </Link>
      {acciones ? (
        <span className="crm-aviso-acciones">
          <form action={ocultarAvisoAccion}>
            <input type="hidden" name="clave" value={a.clave} />
            <input type="hidden" name="dias" value="1" />
            <button type="submit" className="crm-enlace-boton">
              Posponer hasta mañana
            </button>
          </form>
          <form action={ocultarAvisoAccion}>
            <input type="hidden" name="clave" value={a.clave} />
            <input type="hidden" name="dias" value="14" />
            <button type="submit" className="crm-enlace-boton">
              Descartar
            </button>
          </form>
        </span>
      ) : null}
    </li>
  );
}
