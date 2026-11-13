"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { salir } from "@/lib/acciones/auth";
import { IconoCrm, type NombreIconoCrm } from "@/components/crm/IconosCrm";
import { FabCrm } from "@/components/crm/FabCrm";
import { BarraApp } from "./BarraApp";
import { MenuCtx } from "./MenuContext";

type Persona = { id: number; nombre: string };
type Item = { href: string; texto: string; icono: NombreIconoCrm; n?: number };

/** Barra inferior: las 5 secciones del CRM. «Inicio» también se ilumina en sus pantallas hijas. */
const NAV: { href: string; texto: string; icono: NombreIconoCrm; incluye: string[] }[] = [
  { href: "/panel/crm", texto: "Inicio", icono: "inicio", incluye: ["/panel/crm/metas", "/panel/crm/planificacion", "/panel/crm/gestion", "/panel/crm/notificaciones", "/panel/crm/tareas", "/panel/crm/notas", "/panel/crm/plantillas", "/panel/crm/guia", "/panel/crm/consejos"] },
  { href: "/panel/crm/agenda", texto: "Agenda", icono: "agenda", incluye: [] },
  { href: "/panel/crm/clientes", texto: "Clientes", icono: "cliente", incluye: ["/panel/crm/buscar"] },
  { href: "/panel/crm/zonas", texto: "Mapa", icono: "zona", incluye: [] },
  { href: "/panel/crm/informes", texto: "Informes", icono: "informe", incluye: [] },
];

function tituloDe(p: string) {
  if (p.startsWith("/panel/biblioteca")) return "Biblioteca legal";
  if (p.startsWith("/panel/informes")) return "Informes de caso";
  if (p.startsWith("/panel/perfil")) return "Mi perfil";
  return "Casos";
}

function enRuta(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(base + "/");
}

/**
 * Marco del panel: menú lateral que se abre con ☰ (no ocupa pantalla), barra inferior de 5 secciones
 * y botón «+» contextual. Cada pantalla del CRM dibuja su propia barra superior (BarraApp); las pantallas
 * originales de Neife (Casos, Biblioteca…) reciben una barra sencilla con ☰.
 */
export function ShellPanel({
  nombre,
  email,
  avisos,
  casosNuevos,
  bandeja,
  personas,
  hoy,
  children,
}: {
  nombre: string;
  email: string;
  avisos: number;
  casosNuevos: number;
  bandeja: number;
  personas: Persona[];
  hoy: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [abierto]);

  const menu = useMemo(() => ({ abrir: () => setAbierto(true), avisos }), [avisos]);

  /* Igual que el menú de la referencia: una lista de accesos, una línea, y luego las ayudas. */
  const principales: Item[] = [
    { href: "/panel/bandeja", texto: "Bandeja de solicitudes", icono: "lista", n: bandeja },
    { href: "/panel", texto: "Mis casos", icono: "maletin", n: casosNuevos },
    { href: "/panel/crm/notificaciones", texto: "Notificaciones", icono: "campana", n: avisos },
    { href: "/panel/crm/informes?t=derivaciones", texto: "Colegas y derivaciones", icono: "intercambio" },
    { href: "/panel/crm/planificacion?t=indicadores", texto: "Indicadores clave", icono: "informe" },
    { href: "/panel/crm/gestion/referidos", texto: "Referidos", icono: "usuarios" },
    { href: "/panel/crm/gestion/nuevos_mandantes", texto: "Mandatos firmados", icono: "firma" },
    { href: "/panel/crm/tareas", texto: "Tareas", icono: "tarea" },
    { href: "/panel/crm/gestion/sin_seguimiento", texto: "Sin seguimiento", icono: "alerta" },
    { href: "/panel/crm/notas", texto: "Notas rápidas", icono: "nota" },
    { href: "/panel/crm/gestion/por_contactar", texto: "Por contactar", icono: "usuario-mas" },
    { href: "/panel/crm/plantillas", texto: "Plantillas de mensajes", icono: "mensaje" },
  ];
  const ayudas: Item[] = [
    { href: "/panel/crm/zonas?abrir=notas", texto: "Notas de zona", icono: "libro" },
    { href: "/panel/biblioteca", texto: "Biblioteca legal", icono: "libro" },
    { href: "/panel/informes", texto: "Informes de caso", icono: "documento" },
    { href: "/panel/crm/guia", texto: "Guía de primera asesoría", icono: "birrete" },
    { href: "/panel/crm/consejos", texto: "Ideas para conseguir clientes", icono: "bombilla" },
    { href: "/panel/perfil", texto: "Mi perfil", icono: "cliente" },
  ];
  const esActivo = (href: string) => {
    const [ruta, q] = href.split("?");
    return !q && (ruta === "/panel" ? pathname === "/panel" : enRuta(pathname, ruta));
  };
  const propia = pathname.startsWith("/panel/crm");

  return (
    <MenuCtx.Provider value={menu}>
      <div className="app panel-shell">
        {abierto ? <button type="button" className="ps-velo" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} /> : null}
        <aside className={`ps-menu${abierto ? " abierto" : ""}`} aria-hidden={!abierto} aria-label="Menú del panel" inert={!abierto}>
          <div className="ps-menu-cab">
            <div>
              <small>Abogado</small>
              <strong>{nombre}</strong>
              <small className="ps-correo">{email}</small>
            </div>
            <button type="button" className="crm-icono-boton" aria-label="Cerrar el menú" onClick={() => setAbierto(false)}>
              <IconoCrm nombre="cerrar" tam={22} />
            </button>
          </div>
          <nav className="ps-menu-nav">
            <section>
              {principales.map((i) => (
                <Link key={i.href} href={i.href} aria-current={esActivo(i.href) ? "page" : undefined}>
                  <IconoCrm nombre={i.icono} tam={22} />
                  <span>{i.texto}</span>
                  {i.n ? <span className="ps-contador en-lista">{i.n}</span> : null}
                </Link>
              ))}
            </section>
            <section>
              {ayudas.map((i) => (
                <Link key={i.href} href={i.href} aria-current={esActivo(i.href) ? "page" : undefined}>
                  <IconoCrm nombre={i.icono} tam={22} />
                  <span>{i.texto}</span>
                </Link>
              ))}
              <Link href="/asesoria">
                <IconoCrm nombre="externo" tam={22} />
                <span>Perfil público</span>
              </Link>
              <form action={salir}>
                <button type="submit" className="ps-salir">
                  <IconoCrm nombre="salir" tam={22} />
                  <span>Salir</span>
                </button>
              </form>
            </section>
          </nav>
        </aside>

        <main id="contenido" className="principal ps-principal">
          {propia ? null : <BarraApp titulo={tituloDe(pathname)} />}
          {children}
        </main>

        <nav className="ps-nav" aria-label="Secciones principales">
          {NAV.map((s) => {
            const a = s.href === "/panel/crm" ? pathname === s.href || s.incluye.some((b) => enRuta(pathname, b)) : enRuta(pathname, s.href) || s.incluye.some((b) => enRuta(pathname, b));
            return (
              <Link key={s.href} href={s.href} aria-current={a ? "page" : undefined} className={a ? "activa" : undefined}>
                <span className="ps-nav-icono">
                  <IconoCrm nombre={s.icono} tam={22} />
                </span>
                <span>{s.texto}</span>
              </Link>
            );
          })}
        </nav>
        <Suspense fallback={null}>{propia ? <FabCrm personas={personas} hoy={hoy} /> : null}</Suspense>
      </div>
    </MenuCtx.Provider>
  );
}
