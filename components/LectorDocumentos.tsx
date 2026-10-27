"use client";

import { useRef, useState, useTransition } from "react";
import { borrarDocumento, leerDocumento, pasarDocumentoAlInforme } from "@/lib/acciones/documentos";
import { NOMBRE_TIPO, type AnalisisDocumento } from "@/lib/documentos";
import { Icono } from "./Iconos";

export type DocVista = { id: number; nombre: string; fecha: string; pasado: boolean; analisis: AnalisisDocumento };

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="doc-dato">
      <span className="doc-dato-t">{titulo}</span>
      <span>{children}</span>
    </div>
  );
}

function Documento({ d, hayInforme, informeEntregado }: { d: DocVista; hayInforme: boolean; informeEntregado: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const a = d.analisis;
  return (
    <li className="doc-item">
      <details>
        <summary>
          <strong>{NOMBRE_TIPO[a.tipo]}</strong> <span className="ayuda">· {d.nombre} · {d.fecha}{d.pasado ? " · en el informe" : ""}</span>
        </summary>
        <div className="doc-cuerpo">
          {a.causa.length || a.tribunal ? <Dato titulo="Causa">{[...a.causa, a.tribunal].filter(Boolean).join(" · ")}</Dato> : null}
          {a.partes.length ? <Dato titulo="Partes">{a.partes.map((p) => `${p.rol}: ${p.nombre}`).join(" · ")}</Dato> : null}
          {a.ruts.length ? <Dato titulo="RUT">{a.ruts.join(", ")}</Dato> : null}
          {a.montos.length ? <Dato titulo="Montos">{a.montos.join(" · ")}</Dato> : null}
          {a.fechas.length ? (
            <Dato titulo="Fechas">
              <ul className="doc-lista">
                {a.fechas.slice(0, 8).map((f, i) => (
                  <li key={i}>
                    <strong>{f.iso.split("-").reverse().join("/")}</strong> {f.contexto.slice(0, 140)}
                  </li>
                ))}
              </ul>
            </Dato>
          ) : null}
          {a.articulos.length ? <Dato titulo="Artículos citados">{a.articulos.map((x) => `${x.norma} art. ${x.numero}`).join(" · ")}</Dato> : null}
          {a.lineasClave.length ? (
            <Dato titulo="Líneas clave">
              <ul className="doc-lista">
                {a.lineasClave.slice(0, 6).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </Dato>
          ) : null}
          <p className="ayuda">Detectado automáticamente: revísalo contra el documento original antes de usarlo.</p>
          <div className="p-acciones">
            {informeEntregado ? null : (
              <button
                type="button"
                className="btn btn-primario btn-chico"
                disabled={pendiente || !hayInforme}
                title={hayInforme ? undefined : "Crea primero el informe del caso"}
                onClick={() =>
                  iniciar(async () => {
                    const r = await pasarDocumentoAlInforme(d.id);
                    setMsg({ ok: r.ok, texto: r.mensaje });
                  })
                }
              >
                <Icono nombre="informe" tam={14} /> Pasar al informe
              </button>
            )}
            <button type="button" className="btn btn-secundario btn-chico" disabled={pendiente} onClick={() => iniciar(async () => { await borrarDocumento(d.id); })}>
              Borrar
            </button>
          </div>
          {!hayInforme && !informeEntregado ? <p className="ayuda">Crea el informe del caso para poder pasar los datos.</p> : null}
          {msg ? (
            <p role="status" className={`ayuda${msg.ok ? "" : " venc"}`}>
              {msg.texto}
            </p>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/** Sube un documento (PDF o TXT, hasta 4 MB), lo lee en el momento y muestra lo que encontró. No se guarda el archivo. */
export function LectorDocumentos({ solicitudId, docs, hayInforme, informeEntregado, limiteMb }: { solicitudId: number; docs: DocVista[]; hayInforme: boolean; informeEntregado: boolean; limiteMb: number }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(f: File | undefined) {
    if (!f || leyendo) return;
    setError("");
    if (f.size > limiteMb * 1048576) {
      setError(`Pesa ${(f.size / 1048576).toFixed(1)} MB y el máximo es ${limiteMb} MB.`);
      return;
    }
    setLeyendo(true);
    const fd = new FormData();
    fd.set("id", String(solicitudId));
    fd.set("archivo", f);
    try {
      const r = await leerDocumento(fd);
      if (!r.ok) setError(r.mensaje);
    } catch {
      setError("Se cortó la conexión. Revisa tu internet y vuelve a intentar.");
    }
    setLeyendo(false);
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <div>
      <button type="button" className="btn btn-secundario btn-chico" onClick={() => entrada.current?.click()} disabled={leyendo}>
        <Icono nombre="subir" tam={14} /> {leyendo ? "Leyendo…" : "Leer un PDF"}
      </button>
      <input ref={entrada} type="file" accept=".pdf,.txt" hidden aria-label="Elegir documento" onChange={(e) => subir(e.target.files?.[0])} />
      <p className="ayuda">PDF o TXT, hasta {limiteMb} MB. El archivo no se guarda: solo lo que se extrae, cifrado.</p>
      {leyendo ? (
        <div role="status" aria-live="polite">
          <div className="barra-prog" aria-hidden="true">
            <div style={{ width: "60%" }} />
          </div>
          <p className="ayuda">Leyendo el documento…</p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="ayuda venc">
          {error}
        </p>
      ) : null}
      {docs.length ? (
        <ul className="doc-lista-docs">
          {docs.map((d) => (
            <Documento key={d.id} d={d} hayInforme={hayInforme} informeEntregado={informeEntregado} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
