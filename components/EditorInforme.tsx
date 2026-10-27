"use client";

import { useState, useTransition } from "react";
import { buscarParaInforme, guardarInforme } from "@/lib/acciones/panel";
import { MATERIAS } from "@/lib/materias";
import type { ContenidoInforme, NormaInforme } from "@/lib/datos";
import type { Resultado } from "@/lib/normas";
import { completitudInforme } from "@/lib/informe-completitud";
import { Icono } from "./Iconos";

type Props = {
  informeId: number;
  estado: "borrador" | "final";
  inicial: ContenidoInforme;
  pendientesAbiertos?: number;
};

function Area({
  id,
  etiqueta,
  ayuda,
  valor,
  onChange,
  filas = 4,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  valor: string;
  onChange: (v: string) => void;
  filas?: number;
}) {
  return (
    <div className="ed-campo">
      <label htmlFor={id}>{etiqueta}</label>
      {ayuda ? <span className="ayuda">{ayuda}</span> : null}
      <textarea id={id} className="entrada" rows={filas} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function EditorInforme({ informeId, estado, inicial, pendientesAbiertos = 0 }: Props) {
  const [objeto, setObjeto] = useState(inicial.objeto);
  const [conclusiones, setConclusiones] = useState(inicial.conclusiones);
  const [materia, setMateria] = useState(inicial.materia);
  const [resumen, setResumen] = useState(inicial.resumen);
  const [cronologia, setCronologia] = useState(inicial.cronologia);
  const [datos, setDatos] = useState(inicial.datos.join("\n"));
  const [faltantes, setFaltantes] = useState(inicial.faltantes.join("\n"));
  const [derechos, setDerechos] = useState(inicial.derechos.join("\n"));
  const [vias, setVias] = useState(inicial.vias);
  const [plazos, setPlazos] = useState(inicial.plazos);
  const [documentos, setDocumentos] = useState(inicial.documentos.join("\n"));
  const [puntos, setPuntos] = useState(inicial.puntos);
  const [preguntas, setPreguntas] = useState(inicial.preguntas.join("\n"));
  const [abogado, setAbogado] = useState(inicial.abogadoDestino);
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [normas, setNormas] = useState<NormaInforme[]>(inicial.normas);

  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const [buscando, iniciarBusqueda] = useTransition();

  function guardar(accion: "borrador" | "final") {
    setMensaje(null);
    iniciarGuardado(async () => {
      const r = await guardarInforme(
        informeId,
        {
          materia,
          objeto,
          conclusiones,
          resumen,
          cronologia,
          datos,
          faltantes,
          derechos,
          vias,
          plazos,
          documentos,
          puntos,
          preguntas,
          abogadoDestino: abogado,
          observaciones,
          normas: normas.map((n) => ({ articuloId: n.articuloId, incluir: n.incluir, comentario: n.comentario })),
        },
        accion,
      );
      setMensaje({ ok: r.ok, texto: r.mensaje });
    });
  }

  function buscar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!consulta.trim()) return;
    iniciarBusqueda(async () => setResultados(await buscarParaInforme(consulta)));
  }

  function agregar(r: Resultado) {
    if (normas.some((n) => n.articuloId === r.id)) return;
    setNormas([...normas, { articuloId: r.id, norma: r.norma, numero: r.numero, texto: r.texto, incluir: true, comentario: "" }]);
  }

  function cambiarNorma(id: number, cambios: Partial<NormaInforme>) {
    setNormas(normas.map((n) => (n.articuloId === id ? { ...n, ...cambios } : n)));
  }

  const incluidas = normas.filter((n) => n.incluir).length;
  const comp = completitudInforme(
    {
      ...inicial,
      objeto,
      conclusiones,
      resumen,
      cronologia,
      derechos: derechos.split("\n").filter((l) => l.trim()),
      vias,
      plazos,
      abogadoDestino: abogado,
      normas,
    },
    pendientesAbiertos,
  );

  return (
    <>
      <div className="ed-barra">
        <button type="button" className="btn btn-primario" onClick={() => guardar("borrador")} disabled={guardando}>
          <Icono nombre="check" tam={16} /> {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className="btn btn-secundario" onClick={() => guardar("final")} disabled={guardando}>
          Marcar como final
        </button>
        <a className="btn btn-secundario" href={`/api/informes/${informeId}/pdf`} target="_blank" rel="noopener">
          <Icono nombre="descargar" tam={16} /> PDF
        </a>
        <span className="estado" role="status">
          {mensaje ? (
            <span style={{ color: mensaje.ok ? "var(--azul-texto)" : "var(--rosa-texto)" }}>{mensaje.texto}</span>
          ) : null}
          <span className={`etiqueta etiqueta-${estado}`}>{estado === "final" ? "Final" : "Borrador"}</span>
        </span>
      </div>

      <div className="ed-completo" aria-label="Qué falta para el informe completo">
        <div className="ed-completo-cab">
          <b>{comp.hechos} de {comp.total}</b> partes listas
          <span className="barra-prog ed-completo-barra" role="progressbar" aria-label="Avance del informe" aria-valuenow={comp.hechos} aria-valuemin={0} aria-valuemax={comp.total}>
            <span style={{ width: `${Math.round((comp.hechos / comp.total) * 100)}%` }} />
          </span>
        </div>
        <ul className="ed-completo-lista">
          {comp.items.map((i) => (
            <li key={i.clave} className={i.ok ? "ok" : "falta"}>
              <Icono nombre={i.ok ? "check" : "circulo"} tam={13} /> {i.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="ed-cuerpo">
        <div>
          <div className="ed-campo">
            <label htmlFor="materia">Materia</label>
            <select id="materia" className="entrada" value={materia} onChange={(e) => setMateria(e.target.value)}>
              {MATERIAS.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <h2 className="ed-sec">1. Consulta planteada</h2>
          <Area id="objeto" etiqueta="Qué se quiere resolver" ayuda="Una o dos frases: la duda de la persona y qué orientación se entrega." valor={objeto} onChange={setObjeto} filas={3} />
          <h2 className="ed-sec">2. Antecedentes de hecho</h2>
          <Area id="resumen" etiqueta="Hechos" ayuda="Relato de la persona, sin datos personales." valor={resumen} onChange={setResumen} filas={7} />
          <Area id="cronologia" etiqueta="Cronología" ayuda="Una fecha por línea, en orden. Se propone desde el relato: revísala." valor={cronologia} onChange={setCronologia} />
          <Area id="documentos" etiqueta="Documentos y prueba" ayuda="Uno por línea: los que existen y los que faltan." valor={documentos} onChange={setDocumentos} filas={4} />
          <h2 className="ed-sec">4. Fundamentos</h2>
          <Area id="derechos" etiqueta="Derechos que podrían asistir" ayuda="Uno por línea. Confirmar con la norma vigente." valor={derechos} onChange={setDerechos} filas={5} />
          <Area id="vias" etiqueta="Vía habitual" ayuda="Tribunal u organismo y trámite previo." valor={vias} onChange={setVias} filas={4} />
          <Area id="plazos" etiqueta="Plazos a verificar" valor={plazos} onChange={setPlazos} filas={3} />
          <Area id="puntos" etiqueta="Puntos que debe evaluar el abogado" ayuda="Dudas abiertas. Sin predecir resultados." valor={puntos} onChange={setPuntos} />
          <h2 className="ed-sec">5. Conclusiones y recomendaciones</h2>
          <Area id="conclusiones" etiqueta="Conclusiones" ayuda="Breves y directas: qué norma parece aplicar y qué conviene hacer ahora." valor={conclusiones} onChange={setConclusiones} filas={5} />
          <Area id="datos" etiqueta="Datos a confirmar" ayuda="Uno por línea." valor={datos} onChange={setDatos} filas={3} />
          <Area id="faltantes" etiqueta="Información que falta" ayuda="Uno por línea." valor={faltantes} onChange={setFaltantes} filas={3} />
          <Area id="preguntas" etiqueta="Preguntas para la primera reunión" ayuda="Una por línea." valor={preguntas} onChange={setPreguntas} filas={4} />
          <div className="ed-campo">
            <label htmlFor="abogado">Dirigido a</label>
            <input id="abogado" className="entrada" value={abogado} maxLength={200} onChange={(e) => setAbogado(e.target.value)} />
          </div>
          <Area id="observaciones" etiqueta="Observaciones" valor={observaciones} onChange={setObservaciones} filas={3} />
        </div>

        <div>
          <div className="ed-campo">
            <h2 className="ed-sec" style={{ margin: 0 }}>3. Normativa aplicable</h2>
            <label>
              Artículos <span style={{ fontWeight: 400, color: "var(--suave)" }}>· {incluidas} incluidas</span>
            </label>
          </div>
          {normas.length === 0 ? (
            <p className="p-vacio" style={{ padding: "12px 0" }}>
              La biblioteca no encontró artículos para este relato. Busca abajo.
            </p>
          ) : (
            normas.map((n) => (
              <div key={n.articuloId} className="ed-norma" data-excluida={!n.incluir}>
                <div className="ed-norma-cab">
                  <span className="norma-titulo">
                    {n.norma}, art. {n.numero}
                  </span>
                  <label className="opcion">
                    <input type="checkbox" checked={n.incluir} onChange={(e) => cambiarNorma(n.articuloId, { incluir: e.target.checked })} />
                    <span>Incluir</span>
                  </label>
                </div>
                <div className="norma-texto" tabIndex={0} aria-label="Texto del artículo">
                  {n.texto}
                </div>
                <input
                  className="entrada"
                  placeholder="Nota (opcional)"
                  aria-label={`Nota sobre el artículo ${n.numero}`}
                  value={n.comentario}
                  maxLength={500}
                  onChange={(e) => cambiarNorma(n.articuloId, { comentario: e.target.value })}
                />
              </div>
            ))
          )}

          <form className="p-alta" onSubmit={buscar} role="search" style={{ marginTop: 16 }}>
            <label htmlFor="busqueda-informe" className="solo-lectores">
              Buscar en la biblioteca
            </label>
            <input
              id="busqueda-informe"
              className="entrada"
              placeholder="Buscar artículo: finiquito, garantía…"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
            <button type="submit" className="btn btn-secundario" disabled={buscando}>
              <Icono nombre="buscar" tam={16} /> {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {resultados ? (
            resultados.length === 0 ? (
              <p className="p-vacio" style={{ padding: "12px 0" }}>
                Sin resultados.
              </p>
            ) : (
              resultados.map((r) => {
                const ya = normas.some((n) => n.articuloId === r.id);
                return (
                  <div key={r.id} className="ed-norma">
                    <div className="ed-norma-cab">
                      <span className="norma-titulo">
                        {r.norma}, art. {r.numero}
                      </span>
                      <button type="button" className="btn btn-secundario btn-chico" onClick={() => agregar(r)} disabled={ya}>
                        {ya ? "Ya está" : "Agregar"}
                      </button>
                    </div>
                    <div className="norma-texto">{r.texto.length > 420 ? r.texto.slice(0, 420).trimEnd() + "…" : r.texto}</div>
                  </div>
                );
              })
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
