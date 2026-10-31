"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoCrm, type NombreIconoCrm } from "./IconosCrm";

const SECCIONES: { href: string; texto: string; icono: NombreIconoCrm }[] = [
  { href: "/panel/crm", texto: "Inicio", icono: "inicio" },
  { href: "/panel/crm/agenda", texto: "Agenda", icono: "agenda" },
  { href: "/panel/crm/clientes", texto: "Clientes", icono: "cliente" },
  { href: "/panel/crm/zonas", texto: "Zonas", icono: "zona" },
  { href: "/panel/crm/informes", texto: "Informes", icono: "informe" },
];

/** Barra de secciones del CRM: abajo en el celular (como la referencia) y arriba en el computador. */
export function BarraCrm() {
  const pathname = usePathname();
  return (
    <nav className="crm-nav" aria-label="Secciones del CRM">
      {SECCIONES.map((s) => {
        const activa = s.href === "/panel/crm" ? pathname === s.href || pathname.startsWith("/panel/crm/metas") || pathname.startsWith("/panel/crm/planificacion") : pathname.startsWith(s.href);
        return (
          <Link key={s.href} href={s.href} aria-current={activa ? "page" : undefined} className={activa ? "activa" : undefined}>
            <span className="crm-nav-icono">
              <IconoCrm nombre={s.icono} tam={22} />
            </span>
            <span className="crm-nav-texto">{s.texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
