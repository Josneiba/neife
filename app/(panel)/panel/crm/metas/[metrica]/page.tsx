import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { FUENTES_PLAN, esMetrica, metricaDe } from "@/lib/crm/catalogo";
import { fechaDMA, finPeriodo, sumarDias } from "@/lib/crm/fechas";
import { contarPlanes, detalleMetrica, historial, metasVigentes, contarPeriodos, potencial } from "@/lib/crm/servicio";
import { periodoDeParams } from "@/lib/crm/vista";
import { EditorMeta } from "@/components/crm/EditorMeta";
import { GraficoVerlauf } from "@/components/crm/GraficoVerlauf";
import { NavPeriodo, PestanasPeriodo, Seccion, Vacio } from "@/components/crm/Piezas";
import { FilaPersona } from "@/components/crm/FilaPersona";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Editar meta" };
export const dynamic = "force-dynamic";

export default async function EditarMeta({
  params,
  searchParams,
}: {
  params: Promise<{ metrica: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const u = await requerirAbogado();
  const { metrica } = await params;
  if (!esMetrica(metrica)) notFound();
  const def = metricaDe(metrica);
  const sp = await searchParams;
  const pedido = periodoDeParams(sp, def.periodos.includes("semana") ? "semana" : def.periodos[0]);
  // Si el indicador no tiene ese período, usa el primero que sí tenga.
  const periodo = def.periodos.includes(pedido.periodo) ? pedido.periodo : def.periodos[0];
  const { inicio, hoy } = periodo === pedido.periodo ? pedido : periodoDeParams({ p: periodo, d: sp.d }, periodo);
  const fin = finPeriodo(periodo, inicio);

  const [real, metas, detalle, grupos, puntos, planes] = await Promise.all([
    contarPeriodos(u.id, periodo, [inicio]),
    metasVigentes(u.id, periodo, inicio),
    detalleMetrica(u.id, metrica, inicio, fin),
    potencial(u.id, metrica, periodo, inicio, hoy),
    historial(u.id, metrica, periodo, inicio, 6),
    metrica === "consultas_nuevas" ? contarPlanes(u.id, inicio, fin) : Promise.resolve(null),
  ]);
  const n = real[inicio][metrica];
  const meta = metas[metrica];
  const base = `/panel/crm/metas/${metrica}`;
  const futuro = inicio > hoy;

  return (
    <>
      <BarraApp titulo="Editar meta" volver={`/panel/crm/metas?p=${periodo}&d=${inicio}`} />

      <div className="crm-pagina">
        {def.periodos.length > 1 ? <PestanasPeriodo base={base} periodo={periodo} inicio={inicio} permitidos={def.periodos} /> : null}
        <NavPeriodo base={base} periodo={periodo} inicio={inicio} />

        <section className="crm-seccion">
          <h2 className="crm-titulo-grande">{def.nombre}</h2>
          <p className="crm-ayuda">{def.ayuda}</p>
          <EditorMeta metrica={metrica} periodo={periodo} inicio={inicio} objetivo={meta} />
          <details className="crm-real">
            <summary>
              <IconoCrm nombre="info" tam={20} />
              <span>
                Real: <b>{n}</b>
                {meta > 0 ? ` de ${meta}` : ""}
                {futuro ? " (período futuro)" : ""}
              </span>
              <IconoCrm nombre="flecha-abajo" tam={18} />
            </summary>
            {detalle.length === 0 ? (
              <p className="crm-vacio">Todavía no hay registros en este período.</p>
            ) : (
              <ul className="crm-detalle">
                {detalle.map((f, i) => (
                  <li key={i}>
                    <span>{fechaDMA(f.fecha)}</span>
                    {f.personaId ? <Link href={`/panel/crm/clientes/${f.personaId}`}>{f.persona}</Link> : <span>{f.persona}</span>}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </section>

        {metrica === "consultas_nuevas" ? (
          <div className="crm-tarjeta-consejo">
            <div className="crm-tarjeta-consejo-cab">
              <strong>Clientes que llegan a una reunión</strong>
              <IconoCrm nombre="info" tam={20} />
            </div>
            <p>
              Cuando una persona viene a una reunión presencial dentro de la misma semana en que la encontraste, es mucho más probable que
              firme un mandato. Agéndala cuanto antes.
            </p>
          </div>
        ) : null}

        <Seccion titulo="Potencial" id="potencial">
          {grupos.every((g) => g.personas.length === 0) ? (
            <Vacio>No encontramos a nadie en este momento. Agrega clientes con el botón «+».</Vacio>
          ) : (
            grupos.map((g) => (
              <details key={g.titulo} className="crm-acordeon" open>
                <summary>
                  {g.titulo} <span className="crm-chip">{g.personas.length}</span>
                  <IconoCrm nombre="flecha-arriba" tam={18} />
                </summary>
                {g.personas.length === 0 ? (
                  <p className="crm-vacio">No encontramos a nadie.</p>
                ) : (
                  <ul className="crm-lista">
                    {g.personas.map((p) => (
                      <FilaPersona key={p.id} p={p} hoy={hoy} />
                    ))}
                  </ul>
                )}
              </details>
            ))
          )}
        </Seccion>

        {planes ? (
          <Seccion titulo="Planes para encontrar clientes" id="planes">
            <ul className="crm-lista-enlaces">
              {FUENTES_PLAN.map((f) => (
                <li key={f.clave}>
                  <Link href={`/panel/crm/planificacion?d=${sumarDias(inicio, 0)}&fuente=${f.clave}`}>
                    <span>
                      <strong>{f.nombre}</strong>
                      <small>{planes[f.clave] > 0 ? `${planes[f.clave]} plan${planes[f.clave] === 1 ? "" : "es"} pendiente${planes[f.clave] === 1 ? "" : "s"}` : "Sin planes agregados"}</small>
                    </span>
                    <IconoCrm nombre="flecha-der" tam={20} />
                  </Link>
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}

        <Seccion titulo="Evolución" id="evolucion">
          <GraficoVerlauf puntos={puntos} periodo={periodo} titulo={`Evolución de ${def.corto}`} />
        </Seccion>
      </div>
    </>
  );
}
