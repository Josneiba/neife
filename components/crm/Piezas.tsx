import Link from "next/link";
import { PERIODOS, etiquetaPeriodo, sumarPeriodos, type Periodo } from "@/lib/crm/fechas";
import { IconoCrm, type NombreIconoCrm } from "./IconosCrm";

/** Título de sección con enlace opcional a la derecha («Ver todos»). */
export function Seccion({ titulo, enlace, children, id }: { titulo: string; enlace?: { href: string; texto: string }; children: React.ReactNode; id?: string }) {
  return (
    <section className="crm-seccion" aria-labelledby={id ? `${id}-t` : undefined} id={id}>
      <header className="crm-seccion-cab">
        <h2 id={id ? `${id}-t` : undefined}>{titulo}</h2>
        {enlace ? <Link href={enlace.href}>{enlace.texto}</Link> : null}
      </header>
      {children}
    </section>
  );
}

/** Mosaico con icono, nombre y, si hay algo pendiente, un globo con el número (99+ como máximo). */
export function Baldosa({ href, icono, texto, n }: { href: string; icono: NombreIconoCrm; texto: string; n?: number }) {
  return (
    <Link href={href} className="crm-baldosa">
      <span className="crm-baldosa-icono">
        <IconoCrm nombre={icono} tam={30} />
        {n ? (
          <span className="crm-globo" aria-label={`${n} pendientes`}>
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </span>
      <span className="crm-baldosa-texto">{texto}</span>
    </Link>
  );
}

/** Pestañas Día / Semana / Mes. Conservan la fecha que estás mirando. */
export function PestanasPeriodo({ base, periodo, inicio, permitidos }: { base: string; periodo: Periodo; inicio: string; permitidos?: Periodo[] }) {
  return (
    <div className="crm-pestanas" role="tablist" aria-label="Período">
      {PERIODOS.filter((p) => !permitidos || permitidos.includes(p.clave)).map((p) => (
        <Link
          key={p.clave}
          href={`${base}?p=${p.clave}&d=${inicio}`}
          role="tab"
          aria-selected={p.clave === periodo}
          className={p.clave === periodo ? "activa" : undefined}
        >
          {p.plural}
        </Link>
      ))}
    </div>
  );
}

/** «📅 26 oct – 1 nov 2026   ‹ ›» para ir al período anterior o siguiente. */
export function NavPeriodo({ base, periodo, inicio, extra }: { base: string; periodo: Periodo; inicio: string; extra?: string }) {
  const q = (d: string) => `${base}?p=${periodo}&d=${d}${extra ? `&${extra}` : ""}`;
  return (
    <div className="crm-navperiodo">
      <span className="crm-navperiodo-etiqueta">
        <IconoCrm nombre="agenda" tam={22} />
        <span>{etiquetaPeriodo(periodo, inicio)}</span>
      </span>
      <span className="crm-navperiodo-botones">
        <Link href={q(sumarPeriodos(periodo, inicio, -1))} className="crm-icono-boton" aria-label="Período anterior">
          <IconoCrm nombre="flecha-izq" tam={22} />
        </Link>
        <Link href={q(sumarPeriodos(periodo, inicio, 1))} className="crm-icono-boton" aria-label="Período siguiente">
          <IconoCrm nombre="flecha-der" tam={22} />
        </Link>
      </span>
    </div>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="crm-vacio">{children}</p>;
}
