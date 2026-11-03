"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapaLf, Marker } from "leaflet";
import { ATRIBUCION, CENTRO_CHILE, TILES, cargarLeaflet, type L } from "./leaflet";

/**
 * Mapa para marcar dónde vive o trabaja el cliente: toca el mapa, arrastra el punto, busca una dirección
 * o usa tu ubicación. Entrega los campos «lat» y «lng» (y «direccion» si se pide) dentro del formulario.
 */
export function SelectorUbicacion({ lat, lng, direccion, conDireccion = false }: { lat?: number | null; lng?: number | null; direccion?: string; conDireccion?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLf | null>(null);
  const marca = useRef<Marker | null>(null);
  const libre = useRef<L | null>(null);
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState("");

  function ponerMarca(L: L, m: MapaLf, p: { lat: number; lng: number }) {
    if (marca.current) marca.current.setLatLng([p.lat, p.lng]);
    else {
      marca.current = L.marker([p.lat, p.lng], { draggable: true, icon: L.divIcon({ className: "crm-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(m);
      marca.current.on("dragend", () => {
        const ll = marca.current!.getLatLng();
        setPunto({ lat: ll.lat, lng: ll.lng });
      });
    }
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      const L = await cargarLeaflet();
      if (!vivo || !caja.current || mapa.current) return;
      libre.current = L;
      const m = L.map(caja.current, { scrollWheelZoom: false }).setView(punto ? [punto.lat, punto.lng] : CENTRO_CHILE, punto ? 16 : 11);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUCION }).addTo(m);
      mapa.current = m;
      if (punto) ponerMarca(L, m, punto);
      m.on("click", (e) => setPunto({ lat: e.latlng.lat, lng: e.latlng.lng }));
    })();
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      marca.current = null;
    };
    // El mapa se crea una sola vez; los cambios de «punto» se reflejan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (punto && libre.current && mapa.current) ponerMarca(libre.current, mapa.current, punto);
    if (!punto && marca.current) {
      marca.current.remove();
      marca.current = null;
    }
  }, [punto]);

  async function buscar() {
    const q = busca.trim();
    if (q.length < 4) return setMsg("Escribe la calle, el número y la comuna.");
    setMsg("Buscando…");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (!j[0]) return setMsg("No encontramos esa dirección. Toca el mapa para marcar el punto.");
      const p = { lat: Number(j[0].lat), lng: Number(j[0].lon) };
      setPunto(p);
      mapa.current?.setView([p.lat, p.lng], 16);
      setMsg("Revisa que el punto esté bien y arrástralo si hace falta.");
    } catch {
      setMsg("No pudimos buscar ahora. Toca el mapa para marcar el punto.");
    }
  }

  function miUbicacion() {
    if (!navigator.geolocation) return setMsg("Tu navegador no permite usar la ubicación.");
    setMsg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPunto(p);
        mapa.current?.setView([p.lat, p.lng], 16);
        setMsg("");
      },
      () => setMsg("No pudimos obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="crm-selector-ubicacion">
      <input type="hidden" name="lat" value={punto ? punto.lat.toFixed(5) : ""} />
      <input type="hidden" name="lng" value={punto ? punto.lng.toFixed(5) : ""} />
      {conDireccion ? (
        <label className="crm-campo">
          <span>Dirección (texto)</span>
          <input name="direccion" className="entrada" defaultValue={direccion ?? ""} maxLength={200} autoComplete="off" />
        </label>
      ) : null}
      <div className="crm-form-linea">
        <input
          className="entrada"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void buscar();
            }
          }}
          placeholder="Buscar dirección: calle, número, comuna"
          aria-label="Buscar dirección en el mapa"
          maxLength={160}
        />
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => void buscar()}>
          Buscar
        </button>
        <button type="button" className="btn btn-secundario btn-chico" onClick={miUbicacion}>
          Mi ubicación
        </button>
      </div>
      <div ref={caja} className="crm-mapa chico" role="application" aria-label="Mapa para marcar la ubicación. Toca para poner el punto." />
      <p className="crm-ayuda" role="status">
        {msg || (punto ? "Punto marcado. Puedes arrastrarlo para afinarlo." : "Toca el mapa para marcar el punto.")}{" "}
        {punto ? (
          <button type="button" className="crm-enlace-boton" onClick={() => setPunto(null)}>
            Quitar punto
          </button>
        ) : null}
      </p>
    </div>
  );
}
