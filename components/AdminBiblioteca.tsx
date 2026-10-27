"use client";

import { useState, useTransition } from "react";
import { MATERIAS } from "@/lib/materias";
import {
  probarBusqueda,
  revisarNormasAhora,
  cargarLeyesBase,
  importarFuenteWeb,
  type HitPrueba,
} from "@/lib/acciones/admin";
import { Icono } from "./Iconos";

/** Botón para cargar (o actualizar) las leyes base. Es rápido: no lee PDF ni usa internet. */
export function CargarBase() {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="formulario formulario-panel">
      <p className="ayuda">Códigos y leyes de uso frecuente, tomados de la BCN (repositorio legalize-cl). Volver a cargar solo actualiza lo que cambió.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primario btn-chico" disabled={pendiente} onClick={() => iniciar(async () => setMsg(await cargarLeyesBase(false)))}>
          <Icono nombre="descargar" tam={14} /> {pendiente ? "Cargando…" : "Cargar leyes base"}
        </button>
        <button type="button" className="btn btn-secundario btn-chico" disabled={pendiente} onClick={() => iniciar(async () => setMsg(await cargarLeyesBase(true)))}>
          <Icono nombre="actualizar" tam={14} /> Recargar todo
        </button>
      </div>
      {msg ? (
        <p role="status" className={`ayuda${msg.ok ? "" : " venc"}`}>
          {msg.texto}
        </p>
      ) : null}
    </div>
  );
}

type EstadoFuente = { clave: string; nombre: string; cargada: boolean };

/** Normas que el repositorio no trae: se piden a LeyChile, y solo se guardan si el enlace es de esa norma. */
export function FuentesWeb({ fuentes }: { fuentes: EstadoFuente[] }) {
  return (
    <div className="formulario formulario-panel">
      <p className="ayuda">
        Estas normas no vienen en el repositorio. Busca la ley en{" "}
        <a href="https://www.bcn.cl/leychile/" target="_blank" rel="noopener noreferrer">LeyChile (BCN)</a>, copia la dirección (tiene «idNorma=») y pégala. Si el enlace no corresponde a la norma, no se importa nada.
      </p>
      <ul className="p-lista">
        {fuentes.map((f) => (
          <FilaFuente key={f.clave} f={f} />
        ))}
      </ul>
    </div>
  );
}

function FilaFuente({ f }: { f: EstadoFuente }) {
  const [entrada, setEntrada] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const hecha = f.cargada || msg?.ok;
  return (
    <li style={{ display: "block", padding: "10px 0" }}>
      <strong>
        <Icono nombre={hecha ? "check" : "alerta"} tam={14} /> {f.nombre}
      </strong>
      <span className="ayuda" style={{ marginLeft: 6 }}>{hecha ? "cargada" : "falta"}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <input
          className="entrada"
          style={{ flex: "1 1 220px", minWidth: 0 }}
          placeholder="https://www.bcn.cl/leychile/navegar?idNorma=…"
          aria-label={`Enlace de LeyChile para ${f.nombre}`}
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          inputMode="url"
        />
        <button type="button" className="btn btn-secundario btn-chico" disabled={pendiente || entrada.trim().length < 3} onClick={() => iniciar(async () => setMsg(await importarFuenteWeb(f.clave, entrada)))}>
          <Icono nombre="descargar" tam={14} /> {pendiente ? "Descargando…" : hecha ? "Reemplazar" : "Importar"}
        </button>
      </div>
      {msg ? (
        <p role="status" className={`ayuda${msg.ok ? "" : " venc"}`}>
          {msg.texto}
        </p>
      ) : null}
    </li>
  );
}

/** El administrador escribe un caso de ejemplo y ve qué artículos encontraría el sistema. */
export function ProbarBusqueda() {
  const [materia, setMateria] = useState("");
  const [texto, setTexto] = useState("");
  const [hits, setHits] = useState<HitPrueba[] | null>(null);
  const [error, setError] = useState("");
  const [buscando, iniciar] = useTransition();
  return (
    <form
      className="formulario formulario-panel"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          try {
            const r = await probarBusqueda(materia, texto);
            setError(r.error ?? "");
            setHits(r.error ? null : r.hits);
          } catch {
            setError("Se cortó la conexión. Vuelve a intentar.");
          }
        });
      }}
    >
      <div className="p-rapido-fila">
        <select className="entrada" value={materia} onChange={(e) => setMateria(e.target.value)} aria-label="Materia" style={{ flex: "0 1 160px" }}>
          <option value="">Todas</option>
          {MATERIAS.map((m) => (
            <option key={m.clave} value={m.clave}>
              {m.nombre}
            </option>
          ))}
        </select>
        <input className="entrada" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: me despidieron sin carta de aviso" maxLength={600} aria-label="Frase de prueba" />
        <button type="submit" className="btn btn-secundario btn-chico" disabled={buscando}>
          {buscando ? "Buscando…" : "Probar"}
        </button>
      </div>
      {error ? <p className="error-campo" role="alert">{error}</p> : null}
      {hits ? (
        hits.length === 0 ? (
          <p className="ayuda venc">No encontró nada. Falta subir una ley para este tema.</p>
        ) : (
          <ul className="p-lista">
            {hits.map((h, i) => (
              <li key={i} style={{ display: "block" }}>
                <strong>{h.norma}, art. {h.numero}</strong>
                <span className="ayuda" style={{ display: "block" }}>{h.texto}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </form>
  );
}

export function RevisarAhora() {
  const [msg, setMsg] = useState("");
  const [revisando, iniciar] = useTransition();
  return (
    <div>
      <button
        type="button"
        className="btn btn-secundario btn-chico"
        disabled={revisando}
        onClick={() =>
          iniciar(async () => {
            try {
              setMsg((await revisarNormasAhora()).texto);
            } catch {
              setMsg("Se cortó la conexión. Vuelve a intentar.");
            }
          })
        }
      >
        <Icono nombre="actualizar" tam={14} /> {revisando ? "Revisando LeyChile…" : "Revisar actualizaciones"}
      </button>
      {revisando ? <div className="barra-ind" aria-hidden="true" /> : null}
      <p className="ayuda" role="status" aria-live="polite">{msg}</p>
    </div>
  );
}
