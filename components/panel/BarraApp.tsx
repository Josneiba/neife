"use client";

import Link from "next/link";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { Popover } from "@/components/crm/Popover";
import { useMenu } from "./MenuContext";

/**
 * Barra superior de cada pantalla (como la de la app de referencia): ☰ (o flecha para volver),
 * el nombre de la pantalla —con un menú si hay vistas para elegir— y los íconos de acción.
 * No lleva subtítulos: lo único que dice es dónde estás.
 */
export function BarraApp({
  titulo,
  subtitulo,
  volver,
  vistas,
  centro,
  acciones,
}: {
  titulo: string;
  subtitulo?: string;
  volver?: string;
  /** Si se pasa, el título es un botón con ▾ que abre este contenido (enlaces). */
  vistas?: React.ReactNode;
  /** Reemplaza al título (p. ej. el selector de fecha de la agenda). */
  centro?: React.ReactNode;
  acciones?: React.ReactNode;
}) {
  const { abrir, avisos } = useMenu();
  const cabeza = (
    <span className="ba-titulo">
      <strong>{titulo}</strong>
      {subtitulo ? <small>{subtitulo}</small> : null}
    </span>
  );
  return (
    <header className="ba">
      {volver ? (
        <Link href={volver} className="ba-izq" aria-label="Volver">
          <IconoCrm nombre="flecha-izq" tam={24} />
        </Link>
      ) : (
        <button type="button" className="ba-izq" aria-label="Abrir el menú" onClick={abrir}>
          <IconoCrm nombre="menu" tam={24} />
          {avisos > 0 ? <span className="ps-punto" aria-hidden="true" /> : null}
        </button>
      )}
      {centro ? (
        <span className="ba-centro">{centro}</span>
      ) : vistas ? (
        <Popover etiqueta={`Cambiar vista de ${titulo}`} alinear="izq" clase="ba-titulo-boton" ancho={240} trigger={<>{cabeza}<IconoCrm nombre="flecha-abajo" tam={18} /></>}>
          {vistas}
        </Popover>
      ) : (
        <h1 className="ba-h1">{cabeza}</h1>
      )}
      <span className="ba-acciones">{acciones}</span>
    </header>
  );
}

/** Una opción de un menú desplegable. */
export function OpcionMenu({ href, icono, children, activa }: { href: string; icono?: React.ComponentProps<typeof IconoCrm>["nombre"]; children: React.ReactNode; activa?: boolean }) {
  return (
    <Link href={href} role="menuitem" className={`pop-op${activa ? " activa" : ""}`}>
      {icono ? <IconoCrm nombre={icono} tam={20} /> : null}
      <span>{children}</span>
      {activa ? <IconoCrm nombre="check" tam={18} /> : null}
    </Link>
  );
}

/** Ícono-enlace para la barra. */
export function IconoBarra({ href, icono, etiqueta, n }: { href: string; icono: React.ComponentProps<typeof IconoCrm>["nombre"]; etiqueta: string; n?: number }) {
  return (
    <Link href={href} className="crm-icono-boton ba-icono" aria-label={etiqueta}>
      <IconoCrm nombre={icono} tam={22} />
      {n ? <span className="ps-contador">{n > 99 ? "99+" : n}</span> : null}
    </Link>
  );
}
