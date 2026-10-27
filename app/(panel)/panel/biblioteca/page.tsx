import type { Metadata } from "next";
import { Icono } from "@/components/Iconos";
import { requerirAbogado } from "@/lib/guards";
import { buscarArticulos, listarNormas } from "@/lib/normas";
import { fechaCorta } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";

export const metadata: Metadata = { title: "Biblioteca legal" };

export default async function Biblioteca({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requerirAbogado();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : (sp.q ?? "")).slice(0, 300);
  const [normas, resultados] = await Promise.all([listarNormas(), q.trim() ? buscarArticulos(q, { limite: 15 }) : Promise.resolve(null)]);

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Biblioteca</h1>
          <span className="p-sub">{normas.length} documentos · los sube el administrador</span>
        </div>
        <form className="p-acciones" role="search" style={{ flex: "1 1 360px", maxWidth: 520 }}>
          <label htmlFor="q" className="solo-lectores">
            Buscar
          </label>
          <input id="q" name="q" className="entrada" defaultValue={q} placeholder="Buscar: finiquito, garantía, alimentos…" style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primario">
            <Icono nombre="buscar" tam={16} /> Buscar
          </button>
        </form>
      </header>

      <div className="p-cuerpo">
        {resultados ? (
          resultados.length === 0 ? (
            <p className="p-vacio" style={{ padding: "8px 0" }}>
              Sin resultados para «{q}».
            </p>
          ) : (
            <ul className="p-lista" aria-label="Resultados">
              {resultados.map((r) => (
                <li key={r.id} style={{ display: "block", padding: "12px 0" }}>
                  <strong>
                    {r.norma}, art. {r.numero}
                  </strong>{" "}
                  <span className="ayuda">· {nombreMateria(r.materia)}</span>
                  <p className="p-texto" style={{ color: "var(--suave)", marginTop: 4 }}>
                    {r.texto.length > 700 ? r.texto.slice(0, 700).trimEnd() + "…" : r.texto}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      {normas.length > 0 ? (
        <table className="p-tabla" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th scope="col">Documento</th>
              <th scope="col">Materia</th>
              <th scope="col">Artículos</th>
              <th scope="col">Versión</th>
              <th scope="col">Cargado</th>
            </tr>
          </thead>
          <tbody>
            {normas.map((n) => (
              <tr key={n.id} style={{ cursor: "default" }}>
                <td>{n.nombre}</td>
                <td>{nombreMateria(n.materia)}</td>
                <td className="num">{n.total}</td>
                <td className="num">{n.version || "—"}</td>
                <td className="num">{fechaCorta(n.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="p-vacio">Aún no hay documentos.</p>
      )}
    </>
  );
}
