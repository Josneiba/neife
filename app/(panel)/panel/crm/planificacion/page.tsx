import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { FUENTES_PLAN, METRICAS } from "@/lib/crm/catalogo";
import { esFecha, esPeriodo, etiquetaCorta, finPeriodo, hoyLocal, inicioPeriodo, type Periodo } from "@/lib/crm/fechas";
import { contarPeriodos, contarPlanes, historial, metasVigentes } from "@/lib/crm/servicio";
import { asesoriasAgendadas, segmentos } from "@/lib/crm/servicio-planificacion";
import { periodoDeParams, porcentaje } from "@/lib/crm/vista";
import { BarraApp } from "@/components/panel/BarraApp";
import { GraficoVerlauf } from "@/components/crm/GraficoVerlauf";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { NavPeriodo, Pestanas, Seccion } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "Planificación semanal" };
export const dynamic = "force-dynamic";

const BASE = "/panel/crm/planificacion";

export default async function Planificacion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const tab = sp.t === "encontrar" || sp.t === "indicadores" ? sp.t : "personas";
  const hoy = hoyLocal();
  const periodoPedido: Periodo = esPeriodo(sp.p) && sp.p !== "dia" ? sp.p : "semana";
  const { inicio } = periodoDeParams({ ...sp, p: "semana" }, "semana", hoy);
  const inicioInd = inicioPeriodo(periodoPedido, esFecha(sp.d) ? sp.d : hoy);
  const d = `&d=${inicio}`;

  const pestanas = [
    { href: `${BASE}?t=personas${d}`, texto: "Clientes", activa: tab === "personas" },
    { href: `${BASE}?t=encontrar${d}`, texto: "Encontrar", activa: tab === "encontrar" },
    { href: `${BASE}?t=indicadores&p=semana`, texto: "Indicadores clave", activa: tab === "indicadores" },
  ];

  return (
    <>
      <BarraApp titulo="Planificación" volver="/panel/crm" />
      <div className="crm-pagina">
        <Pestanas items={pestanas} etiqueta="Secciones de la planificación" />
        {tab === "personas" ? <TabPersonas abogadoId={u.id} inicio={inicio} hoy={hoy} /> : null}
        {tab === "encontrar" ? <TabEncontrar abogadoId={u.id} inicio={inicio} hoy={hoy} /> : null}
        {tab === "indicadores" ? <TabIndicadores abogadoId={u.id} periodo={periodoPedido} inicio={inicioInd} hoy={hoy} /> : null}
      </div>
    </>
  );
}

async function TabPersonas({ abogadoId, inicio, hoy }: { abogadoId: number; inicio: string; hoy: string }) {
  const segs = await segmentos(abogadoId, inicio, hoy);
  return (
    <>
      <NavPeriodo base={BASE} periodo="semana" inicio={inicio} extra="t=personas" />
      <ul className="crm-lista-enlaces grande">
        {segs.map((s) => (
          <li key={s.clave}>
            <Link href={`${BASE}/personas/${s.clave}?d=${inicio}`}>
              <span>
                <strong>{s.titulo}</strong>
                <small>{s.total === 0 ? "Nadie por ahora" : `${s.conPlan} de ${s.total} clientes con plan esta semana`}</small>
              </span>
              <IconoCrm nombre="flecha-der" tam={22} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

async function TabEncontrar({ abogadoId, inicio, hoy }: { abogadoId: number; inicio: string; hoy: string }) {
  const [planes, ase, segs] = await Promise.all([contarPlanes(abogadoId, inicio, finPeriodo("semana", inicio)), asesoriasAgendadas(abogadoId, inicio), segmentos(abogadoId, inicio, hoy)]);
  const antiguos = segs.find((s) => s.clave === "antiguos");
  const fila = (clave: string) => FUENTES_PLAN.find((f) => f.clave === clave)!;
  return (
    <>
        <ul className="crm-lista-enlaces grande">
          <li>
            <Link href={`${BASE}/encontrar/asesorias?d=${inicio}`}>
              <span>
                <strong>{fila("asesorias").nombre}</strong>
                <small>{ase > 0 ? `${ase} asesoría${ase === 1 ? "" : "s"} agendada${ase === 1 ? "" : "s"} esta semana` : "Sin asesorías agendadas"}</small>
              </span>
              <IconoCrm nombre="flecha-der" tam={22} />
            </Link>
          </li>
          <li>
            <Link href={`${BASE}/encontrar/antiguos?d=${inicio}`}>
              <span>
                <strong>{fila("antiguos").nombre}</strong>
                <small>{antiguos?.total ? `${antiguos.total} clientes para retomar` : "Aún no tienes clientes antiguos"}</small>
              </span>
              <IconoCrm nombre="flecha-der" tam={22} />
            </Link>
          </li>
          {(["red", "actividades", "interesados"] as const).map((k) => (
            <li key={k} className="con-boton">
              <span>
                <strong>{fila(k).nombre}</strong>
                <small>{planes[k] > 0 ? `${planes[k]} plan${planes[k] === 1 ? "" : "es"} pendiente${planes[k] === 1 ? "" : "s"}` : "Sin planes agregados"}</small>
              </span>
              <Link href={`${BASE}/encontrar/${k}?d=${inicio}`} className="btn btn-primario btn-chico">
                {planes[k] > 0 ? "Ver planes" : "Agregar planes"}
              </Link>
            </li>
          ))}
        </ul>
    </>
  );
}

async function TabIndicadores({ abogadoId, periodo, inicio, hoy }: { abogadoId: number; periodo: Periodo; inicio: string; hoy: string }) {
  const lista = METRICAS.filter((m) => m.periodos.includes(periodo));
  const [real, meta, hist] = await Promise.all([
    contarPeriodos(abogadoId, periodo, [inicio]),
    metasVigentes(abogadoId, periodo, inicio),
    Promise.all(lista.map((m) => historial(abogadoId, m.clave, periodo, inicio, 6))),
  ]);
  const href = (p: Periodo) => `${BASE}?t=indicadores&p=${p}&d=${inicioPeriodo(p, p === periodo ? inicio : hoy)}`;
  return (
    <>
      <div className="crm-pestanas sub" role="tablist" aria-label="Período de los indicadores">
        <Link href={href("semana")} role="tab" aria-selected={periodo === "semana"} className={periodo === "semana" ? "activa" : undefined}>
          Semanal
        </Link>
        <Link href={href("mes")} role="tab" aria-selected={periodo === "mes"} className={periodo === "mes" ? "activa" : undefined}>
          Mensual
        </Link>
      </div>
      <NavPeriodo base={BASE} periodo={periodo} inicio={inicio} extra="t=indicadores" />

      <ul className="crm-indicadores">
        {lista.map((m, i) => {
          const r = real[inicio][m.clave];
          const t = meta[m.clave];
          const ok = t > 0 && r >= t;
          return (
            <li key={m.clave}>
              <Link href={`/panel/crm/metas/${m.clave}?p=${periodo}&d=${inicio}`} className="crm-indicador-fila">
                <span className="crm-indicador-nombre">
                  <IconoCrm nombre={m.icono} tam={22} />
                  {m.nombre}
                </span>
                <span className={`crm-indicador-valor${ok ? " ok" : ""}`}>
                  {r}/{t}
                  {ok ? <IconoCrm nombre="check" tam={18} /> : null}
                </span>
                <span className="crm-kpi-barra" role="progressbar" aria-valuenow={r} aria-valuemin={0} aria-valuemax={Math.max(t, 1)} aria-label={`Avance de ${m.corto}`}>
                  <span style={{ width: `${porcentaje(r, t)}%` }} />
                </span>
              </Link>
              {periodo === "mes" ? <GraficoVerlauf puntos={hist[i]} periodo="mes" titulo={`Evolución mensual de ${m.corto}`} /> : null}
            </li>
          );
        })}
      </ul>

      {periodo === "semana" ? (
        <Seccion titulo="Registro de tus metas" id="registro">
          <div className="crm-tabla-envoltura">
            <table className="crm-tabla crm-registro">
              <thead>
                <tr>
                  <th scope="col">Indicador</th>
                  {hist[0]?.map((p) => (
                    <th key={p.inicio} scope="col">
                      {etiquetaCorta("semana", p.inicio)[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((m, i) => (
                  <tr key={m.clave}>
                    <th scope="row">{m.corto}</th>
                    {hist[i].map((p) => {
                      const cumplida = p.meta > 0 && p.real >= p.meta;
                      return (
                        <td key={p.inicio} className={cumplida ? "ok" : p.real === 0 ? "cero" : undefined} title={`${p.real} de ${p.meta}`}>
                          {cumplida ? "✓ " : ""}
                          {p.real}
                          <span>/{p.meta}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      ) : null}
    </>
  );
}
