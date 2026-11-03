"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { eliminarCitaAccion, estadoCitaAccion } from "@/lib/acciones/crm2";
import { alternarTareaAccion } from "@/lib/acciones/crm";
import { BarraApp, IconoBarra, OpcionMenu } from "@/components/panel/BarraApp";
import { Popover } from "./Popover";
import { tipoCita, nombreCanal } from "@/lib/crm/catalogo";
import { diaSemanaCorto, fechaCorta, fechaDMA, fechaLarga, horaAMin, inicioSemana, minAHora, numeroDia, sumarDias } from "@/lib/crm/fechas";
import type { Cita } from "@/lib/crm/servicio-citas";
import { FormCita } from "./FormCita";
import { Hoja } from "./Hoja";
import { IconoCrm } from "./IconosCrm";
import { useFormulario } from "./useFormulario";

export type ItemDiaCal = { fecha: string; tipo: "hito" | "contacto" | "tarea" | "plan"; titulo: string; detalle: string; personaId: number | null; hecho?: boolean };

const H_INI = 6;
const H_FIN = 23;
const PX = 56; // alto de una hora
const MIN_INI = H_INI * 60;
const ALTO = (H_FIN - H_INI + 1) * PX;

type Posicionada = { c: Cita; col: number; cols: number };

/** Reparte las citas que se cruzan en columnas lado a lado. */
function acomodar(citas: Cita[]): Posicionada[] {
  const orden = [...citas].sort((a, b) => horaAMin(a.horaIni) - horaAMin(b.horaIni) || horaAMin(b.horaFin) - horaAMin(a.horaFin));
  const salida: Posicionada[] = [];
  let grupo: Posicionada[] = [];
  let finGrupo = -1;
  const cerrarGrupo = () => {
    const cols = Math.max(1, ...grupo.map((g) => g.col + 1));
    grupo.forEach((g) => (g.cols = cols));
    salida.push(...grupo);
    grupo = [];
  };
  for (const c of orden) {
    const ini = horaAMin(c.horaIni);
    if (grupo.length && ini >= finGrupo) {
      cerrarGrupo();
      finGrupo = -1;
    }
    const usadas = new Set(grupo.filter((g) => horaAMin(g.c.horaFin) > ini).map((g) => g.col));
    let col = 0;
    while (usadas.has(col)) col++;
    grupo.push({ c, col, cols: 1 });
    finGrupo = Math.max(finGrupo, horaAMin(c.horaFin));
  }
  if (grupo.length) cerrarGrupo();
  return salida;
}

function ListaCitas({ citas, abrir }: { citas: Cita[]; abrir: (c: Cita) => void }) {
  const orden = [...citas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaIni.localeCompare(b.horaIni));
  if (!orden.length) return <p className="crm-vacio" style={{ padding: "12px 16px" }}>Sin citas próximas.</p>;
  let ult = "";
  return (
    <div className="crm-lista-citas">
      {orden.map((c) => {
        const t = tipoCita(c.tipo);
        const cab = c.fecha !== ult;
        ult = c.fecha;
        return (
          <div key={c.id}>
            {cab ? <h2 className="lista-seccion">{fechaLarga(c.fecha)}</h2> : null}
            <button type="button" className={`crm-cita-fila c-${t.color}`} onClick={() => abrir(c)}>
              <strong>{c.persona || c.titulo || t.nombre}</strong>
              <span>
                {t.nombre} · {c.horaIni}–{c.horaFin}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ListaTareas({ tareas }: { tareas: { id: number; texto: string; vence: string; hecha: boolean; personaId: number | null }[] }) {
  if (!tareas.length) return <p className="crm-vacio" style={{ padding: "12px 16px" }}>No hay tareas.</p>;
  return (
    <ul className="crm-tareas" style={{ padding: "8px 16px" }}>
      {tareas.map((t) => (
        <li key={t.id} className={t.hecha ? "hecha" : undefined}>
          <form action={alternarTareaAccion}>
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className="crm-casilla" aria-pressed={t.hecha} aria-label={t.hecha ? "Marcar como pendiente" : "Marcar como hecha"}>
              {t.hecha ? <IconoCrm nombre="check" tam={16} /> : null}
            </button>
          </form>
          <span>{t.texto}</span>
          {t.vence ? <small>{fechaDMA(t.vence)}</small> : null}
        </li>
      ))}
    </ul>
  );
}

export function Calendario({
  fecha,
  hoy,
  ahora,
  vista,
  citas,
  items,
  personas,
  tareas,
}: {
  fecha: string;
  hoy: string;
  ahora: { fecha: string; hora: string };
  vista: "dia" | "semana" | "citas" | "tareas";
  citas: Cita[];
  items: ItemDiaCal[];
  personas: { id: number; nombre: string }[];
  tareas: { id: number; texto: string; vence: string; hecha: boolean; personaId: number | null }[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState({ citas: true, hitos: true, planes: true, tareas: true, hechas: true });
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem("crm-agenda-filtro") ?? "null");
      if (g) setFiltro((f) => ({ ...f, ...g }));
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  const alternarFiltro = (k: keyof typeof filtro) =>
    setFiltro((f) => {
      const n = { ...f, [k]: !f[k] };
      try {
        localStorage.setItem("crm-agenda-filtro", JSON.stringify(n));
      } catch {
        /* sin almacenamiento */
      }
      return n;
    });
  const hayFiltro = Object.values(filtro).some((v) => !v);
  const scroll = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Cita | null>(null);
  const [editando, setEditando] = useState(false);
  const [nueva, setNueva] = useState<{ fecha: string; hora: string } | null>(null);
  const [reloj, setReloj] = useState(ahora);

  const lunes = inicioSemana(fecha);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const dias = vista === "semana" ? semana : [fecha];
  const href = (d: string, v: string = vista) => `/panel/crm/agenda?d=${d}&v=${v}`;

  // La línea de «ahora» se mueve sola cada minuto.
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(n).reduce<Record<string, string>>((a, x) => ({ ...a, [x.type]: x.value }), {});
      setReloj({ fecha: `${f.year}-${f.month}-${f.day}`, hora: `${f.hour}:${f.minute}` });
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Al abrir, deja a la vista la hora actual (si es hoy) o la primera cita.
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const delDia = citas.filter((c) => dias.includes(c.fecha));
    const ref = dias.includes(ahora.fecha) ? horaAMin(ahora.hora) - 60 : delDia.length ? Math.min(...delDia.map((c) => horaAMin(c.horaIni))) - 30 : 8 * 60;
    el.scrollTop = Math.max(0, ((ref - MIN_INI) / 60) * PX);
    // Solo al cambiar de día o de vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, vista]);

  const horas = Array.from({ length: H_FIN - H_INI + 1 }, (_, i) => H_INI + i);
  const citasVis = filtro.citas ? citas : [];
  const itemsVis = items.filter((i) => (i.tipo === "tarea" ? filtro.tareas && (filtro.hechas || !i.hecho) : i.tipo === "plan" ? filtro.planes : filtro.hitos));
  const tiene = (d: string) => citasVis.some((c) => c.fecha === d && c.estado !== "cancelada") || itemsVis.some((i) => i.fecha === d);

  function clicVacio(d: string, e: React.MouseEvent<HTMLDivElement>) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = Math.floor((MIN_INI + (y / PX) * 60) / 30) * 30;
    setNueva({ fecha: d, hora: minAHora(Math.max(MIN_INI, Math.min(22 * 60, min))) });
  }

  return (
    <div className="crm-cal">
      <BarraApp
        titulo="Agenda"
        centro={
          <label className="ba-fecha">
            <span>{fechaCorta(fecha)}</span>
            <IconoCrm nombre="flecha-abajo" tam={18} />
            <input type="date" value={fecha} aria-label="Ir a otra fecha" onChange={(e) => e.target.value && router.push(href(e.target.value))} />
          </label>
        }
        acciones={
          <>
            <IconoBarra href={href(hoy, vista === "citas" || vista === "tareas" ? "dia" : vista)} icono="hoy" etiqueta="Ir a hoy" />
            <Popover etiqueta="Qué mostrar en la agenda" icono="filtro" clase={`crm-icono-boton ba-icono${hayFiltro ? " con-filtro" : ""}`} ancho={260}>
              {(
                [
                  ["citas", "Citas"],
                  ["hitos", "Hitos y contactos"],
                  ["planes", "Planes para encontrar clientes"],
                  ["tareas", "Tareas"],
                  ["hechas", "Tareas completadas"],
                ] as const
              ).map(([k, n]) => (
                <label key={k} className="pop-op">
                  <span>{n}</span>
                  <input type="checkbox" checked={filtro[k]} onChange={() => alternarFiltro(k)} />
                </label>
              ))}
            </Popover>
            <IconoBarra href={href(fecha, "tareas")} icono="cuadro-check" etiqueta="Ver las tareas" />
            <Popover etiqueta="Más opciones" icono="puntos" ancho={220}>
              <OpcionMenu href="/panel/crm/buscar" icono="buscar">Buscar</OpcionMenu>
              <OpcionMenu href={href(fecha, "citas")} icono="lista" activa={vista === "citas"}>Citas</OpcionMenu>
              <OpcionMenu href={href(fecha, "dia")} icono="agenda" activa={vista === "dia"}>Día</OpcionMenu>
              <OpcionMenu href={href(fecha, "semana")} icono="grupo" activa={vista === "semana"}>Semana</OpcionMenu>
              <OpcionMenu href={href(fecha, "tareas")} icono="tareas" activa={vista === "tareas"}>Tareas</OpcionMenu>
            </Popover>
          </>
        }
      />

      <nav className="crm-cal-semana" aria-label="Días de la semana">
        {semana.map((d) => (
          <Link key={d} href={href(d)} className={`${d === fecha && vista === "dia" ? "activa" : ""}${d === hoy ? " hoy" : ""}${tiene(d) ? " con" : ""}`} aria-current={d === fecha ? "date" : undefined} aria-label={fechaCorta(d)}>
            <span>{diaSemanaCorto(d)}</span>
            <b>{numeroDia(d)}</b>
          </Link>
        ))}
      </nav>

      {vista === "citas" ? (
        <ListaCitas citas={citasVis.filter((c) => c.fecha >= hoy && c.estado !== "cancelada")} abrir={(c) => { setSel(c); setEditando(false); }} />
      ) : vista === "tareas" ? (
        <ListaTareas tareas={tareas.filter((t) => filtro.hechas || !t.hecha)} />
      ) : (
        <>
      <div className="crm-cal-scroll" ref={scroll}>
        <div className="crm-cal-tabla" style={{ ["--dias" as string]: dias.length }}>
          <div className="crm-cal-esquina" aria-hidden="true" />
          {dias.map((d) => {
            const todo = itemsVis.filter((i) => i.fecha === d);
            return (
              <div key={d} className={`crm-cal-titulo${d === hoy ? " hoy" : ""}`}>
                {vista === "semana" ? (
                  <Link href={href(d, "dia")}>
                    {diaSemanaCorto(d)} <b>{numeroDia(d)}</b>
                  </Link>
                ) : (
                  <span className="crm-cal-todo-et">Todo el día</span>
                )}
                {todo.length ? (
                  <ul className="crm-cal-todo">
                    {todo.slice(0, vista === "semana" ? 3 : 12).map((i, k) => (
                      <li key={k} className={`${i.tipo}${i.hecho ? " hecha" : ""}`}>
                        <Link href={i.personaId ? `/panel/crm/clientes/${i.personaId}` : i.tipo === "tarea" ? "/panel/crm/tareas" : "/panel/crm/planificacion"} title={`${i.detalle}: ${i.titulo}`}>
                          <IconoCrm nombre={i.tipo === "hito" ? "estrella" : i.tipo === "tarea" ? "tarea" : i.tipo === "contacto" ? "mensaje" : "actualizar"} tam={13} /> {i.titulo}
                        </Link>
                      </li>
                    ))}
                    {todo.length > (vista === "semana" ? 3 : 12) ? <li className="mas">+{todo.length - 3} más</li> : null}
                  </ul>
                ) : null}
              </div>
            );
          })}

          <div className="crm-cal-horas" style={{ height: ALTO }} aria-hidden="true">
            {horas.map((h) => (
              <span key={h} style={{ top: (h - H_INI) * PX }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {dias.map((d) => {
            const delDia = citasVis.filter((c) => c.fecha === d);
            return (
              <div key={d} className="crm-cal-col" style={{ height: ALTO }} onClick={(e) => clicVacio(d, e)}>
                {horas.map((h) => (
                  <i key={h} className="crm-cal-linea" style={{ top: (h - H_INI) * PX }} />
                ))}
                {acomodar(delDia).map(({ c, col, cols }) => {
                  const top = Math.max(0, ((horaAMin(c.horaIni) - MIN_INI) / 60) * PX);
                  const alto = Math.max(26, ((horaAMin(c.horaFin) - Math.max(horaAMin(c.horaIni), MIN_INI)) / 60) * PX - 2);
                  const t = tipoCita(c.tipo);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`crm-cita c-${t.color} e-${c.estado}`}
                      style={{ top, height: alto, left: `${(col / cols) * 100}%`, width: `calc(${100 / cols}% - 3px)` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSel(c);
                        setEditando(false);
                      }}
                      aria-label={`${t.nombre} ${c.horaIni} a ${c.horaFin}${c.persona ? ` con ${c.persona}` : ""}. ${c.estado === "pendiente" ? "" : c.estado.replace("_", " ")}`}
                    >
                      <strong>{c.persona || c.titulo || t.nombre}</strong>
                      <span>
                        {t.nombre} · {c.horaIni}–{c.horaFin}
                      </span>
                    </button>
                  );
                })}
                {d === reloj.fecha && horaAMin(reloj.hora) >= MIN_INI ? (
                  <div className="crm-cal-ahora" style={{ top: ((horaAMin(reloj.hora) - MIN_INI) / 60) * PX }}>
                    <span>{reloj.hora}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

        </>
      )}

      <Hoja titulo="Agendar cita" abierta={!!nueva} cerrar={() => setNueva(null)}>
        {nueva ? <FormCita personas={personas} hoy={hoy} inicial={{ fecha: nueva.fecha, horaIni: nueva.hora, horaFin: minAHora(horaAMin(nueva.hora) + 60) }} alGuardar={() => setNueva(null)} /> : null}
      </Hoja>
      <Hoja titulo={editando ? "Editar cita" : sel ? tipoCita(sel.tipo).nombre : ""} abierta={!!sel} cerrar={() => setSel(null)}>
        {sel && editando ? (
          <FormCita personas={personas} hoy={hoy} inicial={{ id: sel.id, tipo: sel.tipo, fecha: sel.fecha, horaIni: sel.horaIni, horaFin: sel.horaFin, personaId: sel.personaId, titulo: sel.titulo, nota: sel.nota, canal: sel.canal }} alGuardar={() => setSel(null)} />
        ) : sel ? (
          <DetalleCita c={sel} cerrar={() => setSel(null)} editar={() => setEditando(true)} />
        ) : null}
      </Hoja>
    </div>
  );
}

function DetalleCita({ c, cerrar, editar }: { c: Cita; cerrar: () => void; editar: () => void }) {
  const est = useFormulario(estadoCitaAccion, cerrar);
  const del = useFormulario(eliminarCitaAccion, cerrar);
  const t = tipoCita(c.tipo);
  const poner = (estado: string) => {
    const fd = new FormData();
    fd.set("id", String(c.id));
    fd.set("estado", estado);
    startTransition(() => est.ejecutar(fd));
  };
  const borrar = () => {
    if (!window.confirm("¿Eliminar esta cita? Si estaba realizada, también se quita del historial.")) return;
    const fd = new FormData();
    fd.set("id", String(c.id));
    startTransition(() => del.ejecutar(fd));
  };
  return (
    <div className="crm-detalle-cita">
      <p className="crm-titulo-grande">{c.titulo || c.persona || t.nombre}</p>
      <ul className="crm-datos">
        <li>
          <IconoCrm nombre="agenda" tam={18} /> {fechaLarga(c.fecha)} · {c.horaIni}–{c.horaFin}
        </li>
        {c.persona && c.personaId ? (
          <li>
            <IconoCrm nombre="cliente" tam={18} /> <Link href={`/panel/crm/clientes/${c.personaId}`}>{c.persona}</Link>
          </li>
        ) : null}
        {c.canal ? (
          <li>
            <IconoCrm nombre="mensaje" tam={18} /> {nombreCanal(c.canal)}
          </li>
        ) : null}
        <li>
          <IconoCrm nombre="info" tam={18} /> Estado: <b>{c.estado === "no_asistio" ? "No asistió" : c.estado[0].toUpperCase() + c.estado.slice(1)}</b>
        </li>
      </ul>
      {c.nota ? <p className="crm-nota-interna">{c.nota}</p> : null}
      <p className="crm-msg" role="status">
        {est.estado.error ? <span className="venc">{est.estado.error}</span> : null}
      </p>
      <div className="crm-acciones-fila">
        {c.estado !== "realizada" ? (
          <button type="button" className="btn btn-primario btn-chico" disabled={est.pendiente} onClick={() => poner("realizada")}>
            <IconoCrm nombre="check" tam={16} /> Marcar realizada
          </button>
        ) : (
          <button type="button" className="btn btn-secundario btn-chico" disabled={est.pendiente} onClick={() => poner("pendiente")}>
            Volver a pendiente
          </button>
        )}
        {c.estado === "pendiente" ? (
          <>
            <button type="button" className="btn btn-secundario btn-chico" disabled={est.pendiente} onClick={() => poner("no_asistio")}>
              No asistió
            </button>
            <button type="button" className="btn btn-secundario btn-chico" disabled={est.pendiente} onClick={() => poner("cancelada")}>
              Cancelar cita
            </button>
          </>
        ) : null}
        {c.estado === "no_asistio" || c.estado === "cancelada" ? (
          <button type="button" className="btn btn-secundario btn-chico" disabled={est.pendiente} onClick={() => poner("pendiente")}>
            Reprogramar (volver a pendiente)
          </button>
        ) : null}
        {c.estado !== "realizada" ? (
          <button type="button" className="btn btn-secundario btn-chico" onClick={editar}>
            <IconoCrm nombre="editar" tam={16} /> Editar
          </button>
        ) : null}
        <button type="button" className="btn btn-secundario btn-chico peligro-texto" disabled={del.pendiente} onClick={borrar}>
          <IconoCrm nombre="papelera" tam={16} /> Eliminar
        </button>
      </div>
    </div>
  );
}
