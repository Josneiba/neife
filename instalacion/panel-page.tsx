import type { Metadata } from "next";
import Link from "next/link";
import { AvanceMini } from "@/components/Avance";
import { ContactoRapido } from "@/components/ContactoRapido";
import { Icono } from "@/components/Iconos";
import { requerirAbogado } from "@/lib/guards";
import { listarCasos, resumenSemana, type FilaCaso } from "@/lib/datos";
import { diasDesde, estadoAbogado, faltantes, nombreResultado, siguientePaso } from "@/lib/etapas";
import { espera, fechaCorta, folio } from "@/lib/formato";
import { nombreMateria, nombreUrgencia } from "@/lib/materias";

export const metadata: Metadata = { title: "Casos" };
export const dynamic = "force-dynamic";

const VISTAS = [
  { clave: "activos", nombre: "Activos", estados: ["nueva", "aceptada", "informe", "entregada", "derivada"] },
  { clave: "nuevas", nombre: "Nuevos", estados: ["nueva"] },
  { clave: "informe", nombre: "En informe", estados: ["aceptada", "informe"] },
  { clave: "porderivar", nombre: "Por derivar", estados: ["entregada"] },
  { clave: "conabogado", nombre: "Con abogado", estados: ["derivada"] },
  { clave: "cerradas", nombre: "Cerrados", estados: ["cerrada", "rechazada"] },
] as const;

const ABIERTOS = ["nueva", "aceptada", "informe", "entregada", "derivada"];
const hoy = () => new Date().toISOString().slice(0, 10);

/** Sin movimiento hace 7 días o más. */
const detenido = (f: FilaCaso) => ABIERTOS.includes(f.solicitud.estado) && diasDesde(f.solicitud.actualizadoEn) >= 7;
const vencido = (f: FilaCaso) => ABIERTOS.includes(f.solicitud.estado) && !!f.solicitud.proximoContacto && f.solicitud.proximoContacto <= hoy();

const PESO_URGENCIA: Record<string, number> = { urgente: 0, pronto: 1, normal: 2 };

function resumenFalta(f: FilaCaso): string {
  const ctx = {
    estado: f.solicitud.estado,
    derivarOk: f.solicitud.derivarOk,
    abogadoDestino: f.solicitud.abogadoDestino,
    abogadoConfirmado: f.solicitud.abogadoConfirmado,
    pendientesAbiertos: f.pendientes.filter((p) => !p.hecho).length,
    informe: f.informe,
  };
  const lista = faltantes(
    ctx,
    f.pendientes.filter((p) => !p.hecho).map((p) => p.texto),
  );
  if (lista.length === 0) return "—";
  const [primero, ...resto] = lista;
  return resto.length ? `${primero} y ${resto.length} más` : primero;
}

export default async function Casos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const vista = VISTAS.find((v) => v.clave === sp.v) ?? VISTAS[0];
  const [casos, semana] = await Promise.all([listarCasos(u.id), resumenSemana(u.id)]);
  const avanceMeta = Math.min(100, Math.round((semana.confirmados / Math.max(semana.meta, 1)) * 100));

  const conteo = (estados: readonly string[]) => casos.filter((c) => estados.includes(c.solicitud.estado)).length;
  const abiertos = casos.filter((c) => ABIERTOS.includes(c.solicitud.estado));
  const resumen = [
    { n: casos.filter((c) => c.solicitud.estado === "nueva").length, t: "por responder", icono: "alerta" as const },
    { n: abiertos.filter(vencido).length, t: "contactos vencidos", icono: "reloj" as const },
    { n: abiertos.filter(detenido).length, t: "detenidos 7 días o más", icono: "reloj" as const },
    { n: casos.filter((c) => c.solicitud.estado === "entregada").length, t: "por derivar", icono: "alerta" as const },
    { n: casos.filter((c) => estadoAbogado(c.solicitud) === "confirmado").length, t: "con abogado", icono: "alerta" as const },
  ];
  const filas = casos
    .filter((c) => (vista.estados as readonly string[]).includes(c.solicitud.estado))
    .sort(
      (a, b) =>
        (PESO_URGENCIA[a.solicitud.urgencia] ?? 2) - (PESO_URGENCIA[b.solicitud.urgencia] ?? 2) ||
        b.solicitud.actualizadoEn.localeCompare(a.solicitud.actualizadoEn),
    );

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Casos</h1>
          <span className="p-sub">Ordenados por urgencia</span>
        </div>
        <ContactoRapido />
      </header>
      <div className="p-meta" aria-label="Meta de la semana">
        <span>
          <b>{semana.confirmados}</b> de {semana.meta} clientes confirmados esta semana
          <span className="p-meta-sec"> · {semana.nuevas} solicitud{semana.nuevas === 1 ? "" : "es"} nueva{semana.nuevas === 1 ? "" : "s"}</span>
        </span>
        <span className="barra-prog p-meta-barra" role="progressbar" aria-label="Avance de la meta semanal" aria-valuenow={semana.confirmados} aria-valuemin={0} aria-valuemax={semana.meta}>
          <span style={{ width: `${avanceMeta}%` }} />
        </span>
      </div>
      <p className="p-resumen">
        {resumen.map((r) => (
          <span key={r.t} className={r.n === 0 ? "cero" : undefined}>
            <b>{r.n}</b> {r.t}
          </span>
        ))}
      </p>
      <nav className="p-filtros" aria-label="Filtrar casos">
        {VISTAS.map((v) => (
          <Link
            key={v.clave}
            href={v.clave === "activos" ? "/panel" : `/panel?v=${v.clave}`}
            aria-current={v.clave === vista.clave ? "page" : undefined}
          >
            {v.nombre} <span className="n">{conteo(v.estados)}</span>
          </Link>
        ))}
      </nav>

      {filas.length === 0 ? (
        <p className="p-vacio">No hay casos en esta vista.</p>
      ) : (
        <table className="p-tabla p-tabla-casos">
          <thead>
            <tr>
              <th scope="col">N°</th>
              <th scope="col">Persona</th>
              <th scope="col">Materia</th>
              <th scope="col">Avance</th>
              <th scope="col">Falta</th>
              <th scope="col">Abogado</th>
              <th scope="col">Siguiente paso</th>
              <th scope="col">Contacto</th>
              <th scope="col">Urgencia</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const s = f.solicitud;
              const sig = siguientePaso({
                estado: s.estado,
                derivarOk: s.derivarOk,
                abogadoDestino: s.abogadoDestino,
                abogadoConfirmado: s.abogadoConfirmado,
                pendientesAbiertos: f.pendientes.filter((p) => !p.hecho).length,
                informe: f.informe,
              });
              return (
                <tr key={s.id}>
                  <td className="num">
                    <Link className="folio" href={`/panel/solicitudes/${s.id}`}>
                      {folio(s.codigo)}
                    </Link>
                  </td>
                  <td className="persona">
                    {s.nombre}
                    <small>{s.region}</small>
                  </td>
                  <td>{nombreMateria(s.materia)}</td>
                  <td>
                    <AvanceMini estado={s.estado} />
                  </td>
                  <td className="falta" data-oculto-movil data-vacio={resumenFalta(f) === "—" ? "" : undefined}>
                    <span className="ico-movil"><Icono nombre="circulo" tam={13} /></span>
                    {resumenFalta(f)}
                  </td>
                  <td data-oculto-movil data-vacio={estadoAbogado(s) === "sin" ? "" : undefined}>
                    <span className="ico-movil"><Icono nombre="escudo" tam={13} /></span>
                    {(() => {
                      const ea = estadoAbogado(s);
                      if (ea === "confirmado") return <span className="ok abog" title={s.abogadoDestino}>{s.abogadoDestino}</span>;
                      if (ea === "esperando") return <span className="espera abog" title={s.abogadoDestino}>{s.abogadoDestino}<small>Sin confirmar</small></span>;
                      return <span className="vacio">Sin asignar</span>;
                    })()}
                  </td>
                  <td className="siguiente">{s.estado === "cerrada" && s.resultado ? nombreResultado(s.resultado) : sig.texto}</td>
                  <td className="num" data-oculto-movil data-vacio={s.estado !== "nueva" && !(s.proximoContacto && ABIERTOS.includes(s.estado)) && !detenido(f) ? "" : undefined}>
                    <span className="ico-movil"><Icono nombre="reloj" tam={13} /></span>
                    {s.estado === "nueva" ? (
                      <span className={diasDesde(s.creadoEn) >= 1 ? "venc" : undefined}>Espera {espera(s.creadoEn)}</span>
                    ) : s.proximoContacto && ABIERTOS.includes(s.estado) ? (
                      <span className={vencido(f) ? "venc" : undefined}>{fechaCorta(s.proximoContacto)}</span>
                    ) : detenido(f) ? (
                      <span className="venc">Sin mov. {diasDesde(s.actualizadoEn)} d</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`urg urg-${s.urgencia}`}>
                      {s.urgencia === "urgente" ? <Icono nombre="alerta" tam={15} /> : null}
                      {s.urgencia === "pronto" ? <Icono nombre="reloj" tam={15} /> : null}
                      {nombreUrgencia(s.urgencia)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
