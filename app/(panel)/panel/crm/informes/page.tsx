import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { METRICAS, nombreEtapaCrm, nombreResultadoDerivacion } from "@/lib/crm/catalogo";
import { etiquetaPeriodo, fechaDMA, hoyLocal, inicioPeriodo, sumarPeriodos } from "@/lib/crm/fechas";
import { listarPersonas } from "@/lib/crm/servicio";
import { evaluarCartera, listarDerivaciones, montoAcordado, resumenPorColega } from "@/lib/crm/servicio-seguimiento";
import { embudoPorOrigen, resumenMensual } from "@/lib/crm/servicio-informes";
import { resumenResenas, textoTiempo, tiempoRespuestaHoras } from "@/lib/resenas";
import { nombreMateria } from "@/lib/materias";
import { BarraApp } from "@/components/panel/BarraApp";
import { BarraProgreso, Estrellas, Pestanas, Seccion, Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Informes" };
export const dynamic = "force-dynamic";

const pesos = (n: number) => `$${n.toLocaleString("es-CL")}`;

export default async function Informes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const t = ["derivaciones", "satisfaccion", "mes", "origen"].includes(sp.t ?? "") ? (sp.t as string) : "casos";
  const hoy = hoyLocal();
  const pestanas = [
    { href: "/panel/crm/informes", texto: "Casos", activa: t === "casos" },
    { href: "/panel/crm/informes?t=derivaciones", texto: "Derivaciones", activa: t === "derivaciones" },
    { href: "/panel/crm/informes?t=satisfaccion", texto: "Conformidad", activa: t === "satisfaccion" },
    { href: "/panel/crm/informes?t=mes", texto: "Mes", activa: t === "mes" },
    { href: "/panel/crm/informes?t=origen", texto: "Origen", activa: t === "origen" },
  ];

  let cuerpo: React.ReactNode = null;

  if (t === "casos") {
    const cartera = (await evaluarCartera(u.id, hoy)).sort((a, b) => b.ev.pct - a.ev.pct);
    cuerpo = (
      <Seccion titulo={`Casos (${cartera.length})`}>
        {cartera.length === 0 ? (
          <Vacio>No hay casos abiertos.</Vacio>
        ) : (
          <ul className="crm-informes-lista">
            {cartera.map(({ p, ev }) => (
              <li key={p.id}>
                <div>
                  <strong>{p.nombre}</strong>
                  <small>
                    {nombreMateria(p.materia)} · {nombreEtapaCrm(p.etapa)}
                  </small>
                  <BarraProgreso pct={ev.pct} etiqueta={`Avance de ${p.nombre}`} />
                  <small>
                    {ev.pct} % · {ev.listo ? "Listo para mostrar al cliente" : ev.casiListo ? "Casi listo" : `Falta: ${ev.faltantes[0]?.texto ?? ev.siguiente}`}
                  </small>
                  <small>Siguiente paso: <strong>{ev.siguiente}</strong></small>
                </div>
                <div className="crm-acciones-fila">
                  <Link href={`/panel/crm/informes/${p.id}`} className="btn btn-primario btn-chico">Ver informe</Link>
                  <Link href={`/panel/crm/clientes/${p.id}?t=progreso`} className="btn btn-secundario btn-chico">Completar</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    );
  } else if (t === "derivaciones") {
    const lista = await listarDerivaciones(u.id);
    const porColega = resumenPorColega(lista);
    cuerpo = (
      <>
        <Seccion titulo={`Asesorías con colega (${lista.length})`}>
          {lista.length === 0 ? (
            <Vacio>Sin derivaciones.</Vacio>
          ) : (
            <ul className="crm-informes-lista">
              {lista.map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>{v.persona || "Cliente"}</strong> → <strong>{v.colega}</strong>
                    <small>
                      {fechaDMA(v.fecha)} · {nombreResultadoDerivacion(v.resultado)}
                    </small>
                    <small>
                      Comisión: {v.comisionTipo === "ninguna" ? "sin comisión" : v.comisionTipo === "porcentaje" ? `${v.comisionValor} %` : pesos(v.comisionValor)} ({v.comisionEstado.replace("_", " ")}
                      {v.comisionEstado === "cobrada" ? `, cobrado ${pesos(v.comisionCobrada)}` : montoAcordado(v) ? `, ${pesos(montoAcordado(v))}` : ""})
                    </small>
                    {v.trato ? <small>Trato: {v.trato}</small> : null}
                    <small>
                      Conformidad del cliente: <Estrellas n={v.satisfaccion} />
                    </small>
                  </div>
                  <Link href={`/panel/crm/clientes/${v.personaId}?t=progreso#derivacion`} className="btn btn-secundario btn-chico">Abrir</Link>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
        {porColega.length > 0 ? (
          <Seccion titulo="Por colega">
            <div className="crm-tabla-envoltura">
              <table className="crm-tabla">
                <thead>
                  <tr>
                    <th scope="col">Colega</th>
                    <th scope="col">Derivados</th>
                    <th scope="col">Aceptados</th>
                    <th scope="col">Resueltos</th>
                    <th scope="col">Conformidad</th>
                    <th scope="col">Por cobrar</th>
                    <th scope="col">Cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {porColega.map((c) => (
                    <tr key={c.colega}>
                      <th scope="row">{c.colega}</th>
                      <td>{c.derivaciones}</td>
                      <td>{c.aceptadas}</td>
                      <td>{c.resueltas}</td>
                      <td>{c.satisfaccion ?? "—"}</td>
                      <td>{pesos(c.comisionPorCobrar)}</td>
                      <td>{pesos(c.comisionCobrada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        ) : null}
      </>
    );
  } else if (t === "satisfaccion") {
    const todos = await listarPersonas(u.id, {});
    const con = todos.filter((p) => p.satisfaccion > 0).sort((a, b) => b.satisfaccion - a.satisfaccion);
    const sin = todos.filter((p) => p.satisfaccion === 0 && ["mandato", "cerrado", "derivado"].includes(p.etapa));
    const prom = con.length ? Math.round((con.reduce((a, p) => a + p.satisfaccion, 0) / con.length) * 10) / 10 : null;
    cuerpo = (
      <>
        <Seccion titulo={`Conformidad de tus clientes${prom ? ` · promedio ${prom}` : ""}`}>
          {con.length === 0 ? (
            <Vacio>Sin opiniones registradas.</Vacio>
          ) : (
            <ul className="crm-informes-lista">
              {con.map((p) => (
                <li key={p.id}>
                  <div>
                    <Link href={`/panel/crm/clientes/${p.id}?t=progreso#conformidad`}><strong>{p.nombre}</strong></Link> <Estrellas n={p.satisfaccion} />
                    {p.satisfaccionNota ? <small>{p.satisfaccionNota}</small> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
        {sin.length > 0 ? (
          <Seccion titulo="Falta preguntar">
            <ul className="lista-enlaces">
              {sin.map((p) => (
                <li key={p.id}>
                  <Link href={`/panel/crm/plantillas?pl=opinion&p=${p.id}`}>{p.nombre} <small>pedir opinión</small></Link>
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}
      </>
    );
  } else if (t === "origen") {
    const [embudo, horas, resenas] = await Promise.all([
      embudoPorOrigen(u.id),
      tiempoRespuestaHoras(u.id, 1),
      resumenResenas(u.id),
    ]);
    const total = embudo.filas.reduce((suma, fila) => suma + fila.total, 0);
    cuerpo = (
      <Seccion titulo="Origen de tus clientes · últimos 90 días">
        <div className="or-kpis">
          <div><b>{embudo.tomados30}</b><span>Casos tomados (30 días)</span></div>
          <div><b>{horas === null ? "—" : textoTiempo(horas)}</b><span>En tomar un caso</span></div>
          <div><b>{resenas.total ? `${resenas.promedio} ★` : "—"}</b><span>{resenas.total ? `${resenas.total} reseña${resenas.total === 1 ? "" : "s"}` : "Sin reseñas aún"}</span></div>
        </div>
        {embudo.filas.length === 0 ? (
          <Vacio>Todavía no hay clientes nuevos en este período.</Vacio>
        ) : (
          <table className="or-tabla">
            <thead>
              <tr><th>Origen</th><th>Clientes</th><th>% del total</th><th>Avanzaron</th><th aria-label="Conversión" /></tr>
            </thead>
            <tbody>
              {embudo.filas.map((fila) => {
                const conversion = fila.total ? Math.round((fila.avanzaron / fila.total) * 100) : 0;
                return (
                  <tr key={fila.origen}>
                    <td>{fila.origen}</td>
                    <td>{fila.total}</td>
                    <td>{total ? Math.round((fila.total / total) * 100) : 0} %</td>
                    <td>{fila.avanzaron} <small>({conversion} %)</small></td>
                    <td><BarraProgreso pct={conversion} etiqueta={`Conversión de ${fila.origen}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Seccion>
    );
  } else {
    const mesActual = inicioPeriodo("mes", hoy);
    const m = /^\d{4}-\d{2}-01$/.test(sp.m ?? "") ? (sp.m as string) : mesActual;
    const r = await resumenMensual(u.id, m);
    const mensuales = METRICAS.filter((x) => x.periodos.includes("mes"));
    cuerpo = (
      <Seccion titulo={etiquetaPeriodo("mes", m)}>
        <div className="crm-acciones-fila">
          <Link href={`/panel/crm/informes?t=mes&m=${sumarPeriodos("mes", m, -1)}`} className="btn btn-secundario btn-chico">← Mes anterior</Link>
          {m < mesActual ? <Link href={`/panel/crm/informes?t=mes&m=${sumarPeriodos("mes", m, 1)}`} className="btn btn-secundario btn-chico">Mes siguiente →</Link> : null}
        </div>
        <ul className="crm-datos">
          {mensuales.map((def) => (
            <li key={def.clave}>
              {def.nombre}: <strong>{r.real[def.clave] ?? 0}</strong> de {r.meta[def.clave] ?? 0}
            </li>
          ))}
          <li>Derivaciones del mes: <strong>{r.derivaciones.n}</strong> ({r.derivaciones.aceptadas} aceptadas) · comisión acordada {pesos(r.derivaciones.comisionAcordada)} · cobrada {pesos(r.derivaciones.comisionCobrada)}</li>
          <li>Conformidad: {r.satisfaccion.promedio ?? "sin datos"} ({r.satisfaccion.n} opiniones)</li>
        </ul>
        {r.porOrigen.length ? <p>Clientes nuevos por origen: {r.porOrigen.map((o) => `${o.nombre} (${o.n})`).join(", ")}</p> : null}
        {r.porMateria.length ? <p>Por materia: {r.porMateria.map((o) => `${o.nombre} (${o.n})`).join(", ")}</p> : null}
        <p><Link href="/panel/crm/planificacion?t=indicadores&p=mes" className="crm-enlace-boton">Ver los gráficos en Indicadores clave</Link></p>
      </Seccion>
    );
  }

  return (
    <>
      <BarraApp titulo="Informes" />
      <div className="crm-pagina">
        <Pestanas etiqueta="Tipo de informe" items={pestanas} />
        {cuerpo}
      </div>
    </>
  );
}
