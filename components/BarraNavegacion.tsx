"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Barra fina arriba que aparece al cambiar de página (enlaces internos), para que nadie
 * sienta que "no pasó nada". Sin librerías: avanza sola hasta ~85 % y se completa al llegar.
 */
function Barra() {
  const ruta = usePathname();
  const params = useSearchParams();
  const [ancho, setAncho] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function parar() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }
  function empezar() {
    parar();
    setVisible(true);
    setAncho(8);
    timer.current = setInterval(() => setAncho((a) => (a < 85 ? a + (90 - a) * 0.08 : a)), 200);
  }

  useEffect(() => {
    // Llegó la nueva página: completa y oculta.
    parar();
    setAncho(100);
    const t = setTimeout(() => {
      setVisible(false);
      setAncho(0);
    }, 250);
    return () => clearTimeout(t);
  }, [ruta, params]);

  useEffect(() => {
    function alClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (url.pathname.startsWith("/api/")) return;
      empezar();
    }
    document.addEventListener("click", alClick);
    return () => {
      document.removeEventListener("click", alClick);
      parar();
    };
  }, []);

  return (
    <div className="barra-nav" aria-hidden="true" style={{ opacity: visible ? 1 : 0 }}>
      <div style={{ width: `${ancho}%` }} />
    </div>
  );
}

export function BarraNavegacion() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}
