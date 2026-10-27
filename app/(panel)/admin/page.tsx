import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/Iconos";
import { requerirAdmin } from "@/lib/guards";
import { embudo30, estadoSistema, resumenAdmin } from "@/lib/admin-datos";

export const metadata: Metadata = { title: "Resumen (administrador)" };
export const dynamic = "force-dynamic";

export default async function Resumen() {
  await requerirAdmin();
  const [r, sistema, pasosEmbudo] = await Promise.all([resumenAdmin(), estadoSistema(), embudo30()]);
  const { casos, asesores, biblioteca } = r;

  const atencion: { texto: string; href: string }[] = [];
  if (asesores.pendientes) atencion.push({ texto: `${asesores.pendientes} asesor${asesores.pendientes === 1 ? "" : "es"} por verificar`, href: "/admin/asesores" });
  for (const m of r.cobertura) {
    if (m.documentos === 0) atencion.push({ texto: `${m.nombre}: no hay leyes cargadas`, href: "/admin/biblioteca" });
    else if (m.consultas >= 5 && m.sinResultado / m.consultas >= 0.3)
      atencion.push({ texto: `${m.nombre}: ${Math.round((m.sinResultado / m.consultas) * 100)}% de las consultas sin resultado`, href: "/admin/biblioteca" });
  }
  if (biblioteca.sinRevisar) atencion.push({ texto: `${biblioteca.sinRevisar} norma${biblioteca.sinRevisar === 1 ? "" : "s"} sin revisar hace más de 14 días`, href: "/admin/biblioteca" });
  if (biblioteca.conError) atencion.push({ texto: `${biblioteca.conError} norma${biblioteca.conError === 1 ? "" : "s"} con error al actualizar`, href: "/admin/biblioteca" });
  if (casos.sinResponder) atencion.push({ texto: `${casos.sinResponder} solicitud${casos.sinResponder === 1 ? "" : "es"} llevan más de 1 día sin respuesta`, href: "/admin/asesores" });
  for (const c of sistema) if (c.estado === "mal") atencion.push({ texto: `${c.nombre}: ${c.detalle}`, href: "/admin" });

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Resumen</h1>
          <span className="p-sub">Solo cantidades: el administrador no ve los casos de las personas</span>
        </div>
      </header>

      <div className="p-kpis" role="list">
        <div role="listitem"><b>{casos.semana}</b><span>solicitudes esta semana</span></div>
        <div role="listitem" className={casos.sinResponder ? "alerta" : undefined}><b>{casos.sinResponder}</b><span>sin respuesta (1 día o más)</span></div>
        <div role="listitem"><b>{casos.activos}</b><span>casos en curso</span></div>
        <div role="listitem"><b>{casos.conAbogado}</b><span>con abogado conseguido</span></div>
        <div role="listitem"><b>{asesores.activos}</b><span>asesores activos</span></div>
        <div role="listitem"><b>{biblioteca.articulos.toLocaleString("es-CL")}</b><span>artículos en {biblioteca.documentos} documentos</span></div>
      </div>

      <div className="p-dos">
        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-atencion">
            <h2 id="t-atencion">Requiere atención</h2>
            {atencion.length === 0 ? (
              <p className="ayuda">Nada pendiente.</p>
            ) : (
              <ul className="p-lista">
                {atencion.map((a) => (
                  <li key={a.texto}>
                    <Icono nombre="alerta" tam={15} />
                    <Link href={a.href} style={{ flex: 1 }}>{a.texto}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="p-sec" aria-labelledby="t-emb">
            <h2 id="t-emb">Embudo (últimos 30 días)</h2>
            <table className="p-tabla">
              <thead>
                <tr><th scope="col">Paso</th><th scope="col">Personas</th><th scope="col">Del paso anterior</th></tr>
              </thead>
              <tbody>
                {pasosEmbudo.map((p) => (
                  <tr key={p.nombre} style={{ cursor: "default" }}>
                    <td>{p.nombre}</td>
                    <td className="num">{p.n}</td>
                    <td className="num">{p.pct === null ? "—" : `${p.pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="p-sec" aria-labelledby="t-cob">
            <h2 id="t-cob">Cobertura de la biblioteca (últimos 30 días)</h2>
            <table className="p-tabla">
              <thead>
                <tr>
                  <th scope="col">Materia</th>
                  <th scope="col">Documentos</th>
                  <th scope="col">Artículos</th>
                  <th scope="col">Consultas</th>
                  <th scope="col">Sin resultado</th>
                </tr>
              </thead>
              <tbody>
                {r.cobertura.map((m) => (
                  <tr key={m.clave} style={{ cursor: "default" }}>
                    <td>{m.nombre}</td>
                    <td className="num">{m.documentos === 0 ? <span className="venc">0</span> : m.documentos}</td>
                    <td className="num">{m.articulos.toLocaleString("es-CL")}</td>
                    <td className="num">{m.consultas}</td>
                    <td className="num">{m.consultas ? `${m.sinResultado} (${Math.round((m.sinResultado / m.consultas) * 100)}%)` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ayuda">Solo se registra la materia y si hubo resultados, nunca lo que escribió la persona. Una materia con muchas consultas sin resultado necesita más leyes.</p>
          </section>
        </div>

        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-sis">
            <h2 id="t-sis">Estado del sistema</h2>
            <ul className="p-lista">
              {sistema.map((c) => (
                <li key={c.nombre} style={{ alignItems: "flex-start" }}>
                  <span className={`punto ${c.estado === "ok" ? "" : `punto-${c.estado}`}`} style={{ marginTop: 6 }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>
                    <strong>{c.nombre}</strong>
                    <span className="ayuda" style={{ display: "block" }}>{c.detalle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
