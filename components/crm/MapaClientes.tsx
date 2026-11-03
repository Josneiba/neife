"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as MapaLf, TileLayer } from "leaflet";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";
import { ATRIBUCION, CENTRO_CHILE, COLOR_ETAPA, MAPAS, cargarLeaflet } from "./leaflet";
import { ChipsFiltro, type OpcionesFiltro } from "./ChipsFiltro";
import { Hoja } from "./Hoja";
import { IconoCrm } from "./IconosCrm";
import { BotonGuardarFiltro } from "./VistasGuardadas";

export type PuntoMapa = { id: number; nombre: string; etapa: string; etapaNombre: string; materia: string; comuna: string; lat: number; lng: number };

type Panel = "capas" | "notas" | "sin" | "comunas" | null;

/**
 * Pantalla «Mapa» (como «Karte» de la referencia): solo el mapa, con la fila de filtros arriba, el botón de capas
 * en una esquina y un botón flotante que abre las demás listas (notas de zona, clientes sin ubicación, por comuna).
 */
export function MapaClientes({
  puntos,
  focoId,
  etapas,
  opciones,
  vistas,
  notas,
  sinUbicacion,
  porComuna,
  abrir,
  filtrado,
}: {
  puntos: PuntoMapa[];
  focoId?: number;
  etapas: { clave: string; nombre: string }[];
  opciones: OpcionesFiltro;
  vistas: React.ReactNode;
  notas: React.ReactNode;
  sinUbicacion: React.ReactNode;
  porComuna: React.ReactNode;
  abrir?: "notas";
  filtrado: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLf | null>(null);
  const capa = useRef<LayerGroup | null>(null);
  const base = useRef<TileLayer | null>(null);
  const [listo, setListo] = useState(false);
  const [panel, setPanel] = useState<Panel>(abrir === "notas" ? "notas" : null);
  const [fab, setFab] = useState(false);
  const [tipo, setTipo] = useState("calle");
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const visibles = puntos.filter((p) => !ocultas.includes(p.etapa));

  useEffect(() => {
    let vivo = true;
    (async () => {
      const L = await cargarLeaflet();
      if (!vivo || !caja.current || mapa.current) return;
      const m = L.map(caja.current, { zoomControl: false }).setView(CENTRO_CHILE, 11);
      L.control.zoom({ position: "bottomleft" }).addTo(m);
      capa.current = L.layerGroup().addTo(m);
      mapa.current = m;
      setListo(true);
    })();
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      capa.current = null;
      base.current = null;
    };
  }, []);

  // Tipo de mapa
  useEffect(() => {
    if (!listo || !mapa.current) return;
    let vivo = true;
    (async () => {
      const L = await cargarLeaflet();
      if (!vivo || !mapa.current) return;
      base.current?.remove();
      const def = MAPAS.find((x) => x.clave === tipo) ?? MAPAS[0];
      base.current = L.tileLayer(def.url, { maxZoom: def.maxZoom, attribution: ATRIBUCION + def.extra }).addTo(mapa.current);
      base.current.bringToBack();
    })();
    return () => {
      vivo = false;
    };
  }, [listo, tipo]);

  // Puntos
  useEffect(() => {
    if (!listo || !mapa.current || !capa.current) return;
    let vivo = true;
    (async () => {
      const L = await cargarLeaflet();
      if (!vivo || !mapa.current || !capa.current) return;
      capa.current.clearLayers();
      for (const p of visibles) {
        const c = L.circleMarker([p.lat, p.lng], { radius: p.id === focoId ? 13 : 10, color: "#ffffff", weight: 2, fillColor: COLOR_ETAPA[p.etapa] ?? "#71959f", fillOpacity: 0.95 });
        const cuerpo = document.createElement("div");
        const nombre = document.createElement("strong");
        nombre.textContent = p.nombre;
        const detalle = document.createElement("div");
        detalle.textContent = `${p.etapaNombre} · ${p.materia}${p.comuna ? ` · ${p.comuna}` : ""}`;
        const ficha = document.createElement("a");
        ficha.href = `/panel/crm/clientes/${p.id}`;
        ficha.textContent = "Abrir ficha";
        const ruta = document.createElement("a");
        ruta.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
        ruta.target = "_blank";
        ruta.rel = "noopener noreferrer";
        ruta.textContent = "Cómo llegar";
        ruta.style.marginLeft = "12px";
        cuerpo.append(nombre, detalle, ficha, ruta);
        c.bindPopup(cuerpo);
        c.addTo(capa.current);
        if (p.id === focoId) c.openPopup();
      }
      if (!visibles.length) return;
      const foco = visibles.find((p) => p.id === focoId);
      if (foco) mapa.current.setView([foco.lat, foco.lng], 16);
      else mapa.current.fitBounds(L.latLngBounds(visibles.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 });
    })();
    return () => {
      vivo = false;
    };
    // «visibles» se recalcula en cada render; importan los puntos y las etapas ocultas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, puntos, ocultas, focoId]);

  function miUbicacion() {
    setFab(false);
    if (!navigator.geolocation) return setAviso("Tu navegador no permite usar la ubicación.");
    navigator.geolocation.getCurrentPosition(
      (pos) => mapa.current?.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => setAviso("No pudimos obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const cuenta = (k: string) => puntos.filter((p) => p.etapa === k).length;
  return (
    <div className="mapa-pantalla">
      <BarraApp
        titulo="Mapa"
        subtitulo={filtrado ? "Filtrado" : undefined}
        vistas={vistas}
        acciones={
          <>
            <BotonGuardarFiltro />
            <IconoBarra href="/panel/crm/buscar" icono="buscar" etiqueta="Buscar" />
          </>
        }
      />
      <ChipsFiltro base="/panel/crm/zonas" opciones={opciones} conCampos={false} />
      <div className="mapa-caja">
        <div ref={caja} className="crm-mapa grande" role="application" aria-label={`Mapa de clientes: ${visibles.length} puntos`} />
        <button type="button" className="mapa-capas" aria-label="Capas del mapa" onClick={() => setPanel("capas")}>
          <IconoCrm nombre="capas" tam={24} />
        </button>
        {aviso ? (
          <p className="mapa-aviso" role="status" onClick={() => setAviso("")}>
            {aviso}
          </p>
        ) : null}
        {fab ? <button type="button" className="crm-velo" aria-label="Cerrar el menú" onClick={() => setFab(false)} /> : null}
        <div className="crm-fab-zona mapa-fab">
          {fab ? (
            <ul className="crm-fab-lista" aria-label="Más del mapa">
              {(
                [
                  ["Mi ubicación", "ubicar", miUbicacion],
                  ["Notas de zona", "libro", () => (setFab(false), setPanel("notas"))],
                  ["Clientes sin ubicación", "usuario-mas", () => (setFab(false), setPanel("sin"))],
                  ["Clientes por comuna", "lista", () => (setFab(false), setPanel("comunas"))],
                ] as const
              ).map(([texto, ic, fn]) => (
                <li key={texto}>
                  <button type="button" className="crm-fab-item" onClick={fn}>
                    <IconoCrm nombre={ic} tam={20} />
                    {texto}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="crm-fab" aria-expanded={fab} aria-label={fab ? "Cerrar" : "Más opciones del mapa"} onClick={() => setFab((x) => !x)}>
            <IconoCrm nombre={fab ? "cerrar" : "ruta"} tam={26} />
          </button>
        </div>
      </div>

      <Hoja titulo="Capas del mapa" abierta={panel === "capas"} cerrar={() => setPanel(null)}>
        <label className="crm-campo">
          <span>Tipo de mapa</span>
          <select className="entrada" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {MAPAS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="crm-mini-titulo">Marcadores</p>
        {etapas.map((e) => (
          <label key={e.clave} className="capa-fila">
            <i style={{ background: COLOR_ETAPA[e.clave] }} />
            <span>
              {e.nombre} <small>({cuenta(e.clave)})</small>
            </span>
            <input type="checkbox" checked={!ocultas.includes(e.clave)} onChange={() => setOcultas((o) => (o.includes(e.clave) ? o.filter((x) => x !== e.clave) : [...o, e.clave]))} />
          </label>
        ))}
      </Hoja>
      <Hoja titulo="Notas de zona" abierta={panel === "notas"} cerrar={() => setPanel(null)}>
        {notas}
      </Hoja>
      <Hoja titulo="Clientes sin ubicación" abierta={panel === "sin"} cerrar={() => setPanel(null)}>
        {sinUbicacion}
      </Hoja>
      <Hoja titulo="Clientes por comuna" abierta={panel === "comunas"} cerrar={() => setPanel(null)}>
        {porComuna}
      </Hoja>
    </div>
  );
}
