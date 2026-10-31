import type { Metadata } from "next";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, METRICAS } from "@/lib/crm/catalogo";
import { etiquetaPeriodo, hoyLocal, inicioPeriodo, sumarDias, sumarPeriodos } from "@/lib/crm/fechas";
import { conteoPorEtapa, contarPeriodos, embudo, historial, metasVigentes } from "@/lib/crm/servicio";
import { porcentaje } from "@/lib/crm/vista";
import { GraficoVerlauf } from "@/components/crm/GraficoVerlauf";
import { Seccion } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Informes" };
export const dynamic = "force-dynamic";

export default async function Informes() {
  const u = await requerirAbogado();
  const hoy = hoyLocal();
  const mesActual = inicioPeriodo("mes", hoy);
  const meses = Array.from({ length: 6 }, (_, k) => sumarPeriodos("mes", mesActual, k - 5));
  const [conteos, metasPorMes, emb, etapas, hMandatos, hClientes] = await Promise.all([
    contarPeriodos(u.id, "mes", meses),
    Promise.all(meses.map((m) => metasVigentes(u.id, "mes", m))),
    embudo(u.id, sumarDias(hoy, -90)),
    conteoPorEtapa(u.id),
    historial(u.id, "mandatos", "mes", mesActual, 6),
    historial(u.id, "consultas_nuevas", "mes", mesActual, 6),
  ]);
  const pasos = [
    { n: "Clientes nuevos", v: emb.total },
    { n: "Recibieron asesoría", v: emb.asesoria },
    { n: "Con fecha de hito", v: emb.hito },
    { n: "Firmaron mandato", v: emb.mandato },
    { n: "Conectados con abogado", v: emb.derivado },
    { n: "Casos resueltos", v: emb.resuelto },
  ];
  const mensuales = METRICAS.filter((m) => m.periodos.includes("mes"));
  const totalClientes = Object.values(etapas).reduce((a, b) => a + b, 0);

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Informes</h1>
          <span className="p-sub">Cómo vas, mes a mes</span>
        </div>
      </header>
      <div className="crm-pagina">
        <Seccion titulo="Metas de los últimos 6 meses" id="meses">
          <div className="crm-tabla-envoltura">
            <table className="crm-tabla">
              <thead>
                <tr>
                  <th scope="col">Indicador</th>
                  {meses.map((m) => (
                    <th key={m} scope="col">
                      {etiquetaPeriodo("mes", m).split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mensuales.map((def) => (
                  <tr key={def.clave}>
                    <th scope="row">{def.corto}</th>
                    {meses.map((m, k) => {
                      const real = conteos[m][def.clave];
                      const meta = metasPorMes[k][def.clave];
                      const ok = meta > 0 && real >= meta;
                      return (
                        <td key={m} className={ok ? "ok" : real === 0 && meta > 0 ? "cero" : undefined}>
                          {real}
                          <span>/{meta}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>

        <Seccion titulo="Embudo de los últimos 90 días" id="embudo">
          <ul className="crm-embudo">
            {pasos.map((p) => (
              <li key={p.n}>
                <span className="crm-embudo-nombre">{p.n}</span>
                <span className="crm-embudo-barra" aria-hidden="true">
                  <i style={{ width: `${porcentaje(p.v, Math.max(emb.total, 1))}%` }} />
                </span>
                <span className="crm-embudo-valor">
                  {p.v}
                  <small>{emb.total > 0 ? `${Math.round((p.v / emb.total) * 100)}%` : "—"}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="crm-ayuda">Cuenta a los clientes que entraron en los últimos 90 días y cuántos llegaron a cada paso (hasta hoy).</p>
        </Seccion>

        <Seccion titulo="Tus clientes hoy" id="etapas">
          <ul className="crm-embudo">
            {ETAPAS_CRM.map((e) => (
              <li key={e.clave}>
                <span className="crm-embudo-nombre">{e.nombre}</span>
                <span className="crm-embudo-barra" aria-hidden="true">
                  <i style={{ width: `${porcentaje(etapas[e.clave], Math.max(totalClientes, 1))}%` }} />
                </span>
                <span className="crm-embudo-valor">{etapas[e.clave]}</span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion titulo="Mandatos firmados por mes" id="g1">
          <GraficoVerlauf puntos={hMandatos} periodo="mes" titulo="Mandatos firmados por mes" />
        </Seccion>
        <Seccion titulo="Clientes nuevos por mes" id="g2">
          <GraficoVerlauf puntos={hClientes} periodo="mes" titulo="Clientes nuevos por mes" />
        </Seccion>
      </div>
    </>
  );
}
