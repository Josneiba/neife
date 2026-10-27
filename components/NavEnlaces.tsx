"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "./Iconos";

export type Enlace = { href: string; texto: string; opcional?: boolean; contador?: number; icono?: NombreIcono };

function esActual(pathname: string, href: string, exacto?: boolean): boolean {
  if (href.includes("#")) return false;
  if (exacto || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavSitio({ enlaces }: { enlaces: Enlace[] }) {
  const pathname = usePathname();
  return (
    <>
      {enlaces.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          className={e.opcional ? "nav-opcional" : undefined}
          aria-current={esActual(pathname, e.href) ? "page" : undefined}
        >
          {e.texto}
        </Link>
      ))}
    </>
  );
}

export function NavLateral({ enlaces, raiz }: { enlaces: Enlace[]; raiz: string }) {
  const pathname = usePathname();
  return (
    <nav className="lateral-nav" aria-label="Secciones">
      {enlaces.map((e) => (
        <Link key={e.href} href={e.href} aria-label={e.contador ? `${e.texto} ${e.contador}` : e.texto} title={e.texto} aria-current={esActual(pathname, e.href, e.href === raiz) ? "page" : undefined}>
          {e.icono ? <Icono nombre={e.icono} tam={17} /> : null}
          <span className="txt-escritorio">{e.texto}</span>
          {e.contador ? <span className="contador">{e.contador}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
