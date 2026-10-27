"use client";

import { useEffect, useState, useTransition } from "react";
import { consultarNormas, type Contexto, type NormaSugerida } from "@/lib/acciones/orientacion";
import { GUIA_RELATO, MATERIAS, REGIONES, type MateriaClave } from "@/lib/materias";
import { BarraIndeterminada, FormSolicitud } from "./formularios";
import { Icono } from "./Iconos";

type Props = {
  asesores: { id: number; nombre: string }[];
  asesorInicial?: number;
  materiaInicial?: string;
  nombre?: string;
  email?: string;
};

export function FlujoOrientacion(props: Props) {
  const [materia, setMateria] = useState(props.materiaInicial ?? "");
  const [region, setRegion] = useState("");
  const [relato, setRelato] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [normas, setNormas] = useState<NormaSugerida[] | null>(null);
  const [pendientes, setPendientes] = useState<string[]>([]);
  const [sinBase, setSinBase] = useState(false);
  const [ctx, setCtx] = useState<Contexto | null>(null);
  const [consultando, iniciar] = useTransition();
  const [verTodas, setVerTodas] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById("solicitud");
    if (!el) return;
    const o = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.05 });
    o.observe(el);
    return () => o.disconnect();
  }, [normas]);

  function consultar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!materia) e.materia = "Elige una materia.";
    if (!region) e.region = "Elige tu región.";
    if (!relato.trim()) e.relato = "Cuenta qué pasó.";
    else if (relato.trim().length < 40) e.relato = "Cuéntalo con un poco más de detalle (mínimo 40 caracteres).";
    setErrores(e);
    if (Object.keys(e).length) return;
    iniciar(async () => {
      let r;
      try {
        r = await consultarNormas(materia, relato);
      } catch {
        setErrores({ relato: "Se cortó la conexión. Revisa tu internet y vuelve a intentar; lo que escribiste sigue aquí." });
        return;
      }
      if (r.ok) {
        setVerTodas(false);
        setNormas(r.normas);
        setPendientes(r.pendientes ?? []);
        setSinBase(Boolean(r.sinBase));
        setCtx(r.contexto);
        requestAnimationFrame(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else setErrores({ relato: r.error });
    });
  }

  return (
    <>
      <form onSubmit={consultar} className="formulario" noValidate aria-label="Describe tu caso">
        <div className="fila-dos">
          <div className="campo">
            <label htmlFor="materia">Materia</label>
            <select id="materia" className="entrada" value={materia} onChange={(e) => setMateria(e.target.value)} aria-invalid={errores.materia ? true : undefined}>
              <option value="">Elige una materia</option>
              {MATERIAS.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.nombre}
                </option>
              ))}
            </select>
            {errores.materia ? <p className="error-campo">{errores.materia}</p> : null}
          </div>
          <div className="campo">
            <label htmlFor="region">Región</label>
            <select id="region" className="entrada" value={region} onChange={(e) => setRegion(e.target.value)} aria-invalid={errores.region ? true : undefined}>
              <option value="">Elige una región</option>
              {REGIONES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errores.region ? <p className="error-campo">{errores.region}</p> : null}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="relato">¿Qué pasó?</label>
          <p className="ayuda">{materia ? GUIA_RELATO[materia as MateriaClave] : "Qué pasó, cuándo y qué necesitas."} Sin RUT, direcciones ni nombres completos.</p>
          <textarea
            id="relato"
            className="entrada"
            value={relato}
            maxLength={1500}
            onChange={(e) => setRelato(e.target.value)}
            aria-invalid={errores.relato ? true : undefined}
          />
          <p className="ayuda" aria-live="polite">
            {relato.length} de 1500
          </p>
          {errores.relato ? (
            <p className="error-campo" role="alert">
              {errores.relato}
            </p>
          ) : null}
        </div>
        <div className="botones">
          <button type="submit" className="btn btn-primario" disabled={consultando}>
            <Icono nombre="buscar" tam={17} /> {consultando ? "Buscando…" : "Ver normas que podrían aplicar"}
          </button>
        </div>
        {consultando ? <BarraIndeterminada texto="Buscando en la biblioteca de normas…" /> : <p className="ayuda">Esta consulta no se guarda.</p>}
      </form>

      {normas ? (
        <section id="resultado" style={{ marginTop: 48 }} aria-labelledby="t-normas">
          <h2 id="t-normas" style={{ fontSize: "1.375rem" }}>
            Orientación general: {MATERIAS.find((m) => m.clave === materia)?.nombre}
          </h2>
          <p className="ayuda" style={{ marginTop: 6 }}>
            Según lo que describes, estas son las normas que podrían respaldarte y las vías habituales. Un abogado debe confirmarlo.
          </p>

          {pendientes.length && !sinBase ? (
            <p className="ayuda" role="note">
              <Icono nombre="alerta" tam={14} /> Aún no tenemos cargado: {pendientes.join(", ")}. Esta lista puede estar incompleta; un abogado la revisará.
            </p>
          ) : null}

          <h3 className="res-t">Normas que podrían favorecerte</h3>
          {normas.length === 0 ? (
            <p>{sinBase ? `Para esta materia aún no tenemos cargada la norma principal (${pendientes.join(", ")}). Preferimos no mostrarte resultados parciales que podrían orientarte mal. Un asesor puede revisar tu caso igual.` : "No hay normas en la biblioteca para este relato. Un asesor puede revisarlo igual."}</p>
          ) : (
            <ul className="normas-lista">
              {(verTodas ? normas : normas.slice(0, 3)).map((n) => (
                <li key={n.id}>
                  <strong>
                    {n.norma}, art. {n.numero}
                  </strong>
                  <p className="extracto">{n.texto.length > 220 ? n.texto.slice(0, 220).replace(/\s+\S*$/, "") + "…" : n.texto}</p>
                  <p className="ayuda" style={{ fontSize: "0.8125rem" }}>
                    Fuente: {n.enlace ? <a href={n.enlace} target="_blank" rel="noopener noreferrer">{n.fuente}</a> : n.fuente}
                  </p>
                  {n.texto.length > 220 ? (
                    <details>
                      <summary>Ver texto completo</summary>
                      <p>{n.texto}</p>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {!verTodas && normas.length > 3 ? (
            <button type="button" className="btn btn-secundario btn-chico" onClick={() => setVerTodas(true)} style={{ marginTop: 10 }}>
              <Icono nombre="mas" tam={15} /> Ver las {normas.length - 3} restantes
            </button>
          ) : null}

          {ctx ? (
            <div className="res-grid">
              <div>
                <h3 className="res-t">Derechos que suelen estar en juego</h3>
                <ul className="lista-simple">
                  {ctx.derechos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="res-t">Dónde se acude</h3>
                <p>{ctx.vias}</p>
                <h3 className="res-t">Plazos a tener presente</h3>
                <p>{ctx.plazos}</p>
              </div>
            </div>
          ) : null}
          <p className="ayuda" style={{ marginTop: 16 }}>
            Orientación general, no es asesoría jurídica ni reemplaza a un abogado. Los plazos y la vigencia de cada norma deben verificarse.
          </p>

          <div id="solicitud" style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid var(--borde)", scrollMarginTop: 12 }}>
            <h2 style={{ fontSize: "1.375rem" }}>¿Quieres ayuda de un abogado?</h2>
            <p style={{ marginTop: 8 }}>
              Deja tus datos. Un asesor revisa tu caso, prepara un informe y te conecta con un abogado de esta materia.
            </p>
            <FormSolicitud {...props} fijo={{ materia, region, relato: relato.trim() }} />
          </div>
        </section>
      ) : null}
      {normas && !formVisible ? (
        <a href="#solicitud" className="cta-fija btn btn-primario">
          <Icono nombre="enviar" tam={17} /> Pedir ayuda de un abogado
        </a>
      ) : null}
    </>
  );
}
