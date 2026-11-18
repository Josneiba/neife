"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { ATRIBUCION, TILES, cargarLeaflet } from "./crm/leaflet";

/** Mapa de solo lectura con un punto: la oficina del asesor. El zoom con la rueda se activa al tocarlo. */
export function MapaFicha({ lat, lng, etiqueta }: { lat: number; lng: number; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let vivo = true;
    let quitar: (() => void) | null = null;
    (async () => {
      const L = await cargarLeaflet();
      if (!vivo || !caja.current) return;
      const m = L.map(caja.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([lat, lng], 16);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUCION }).addTo(m);
      L.marker([lat, lng], { icon: L.divIcon({ className: "mf-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] }), title: etiqueta }).addTo(m);
      m.on("click", () => { m.scrollWheelZoom.enable(); m.dragging.enable(); });
      quitar = () => m.remove();
    })();
    return () => { vivo = false; quitar?.(); };
  }, [lat, lng, etiqueta]);
  return <div ref={caja} className="mf-mapa" role="img" aria-label={`Mapa: ${etiqueta}`} />;
}
