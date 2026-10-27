import type { Metadata } from "next";
import { BotonEnviar } from "@/components/BotonEnviar";
import { estadoFuentes } from "@/lib/fuentes";
import { FormImportarLey } from "@/components/formularios";
import { CargarBase, FuentesWeb, ProbarBusqueda, RevisarAhora } from "@/components/AdminBiblioteca";
import { Icono } from "@/components/Iconos";
import { requerirAdmin } from "@/lib/guards";
import { listarNormas } from "@/lib/normas";
import { NORMAS_HABITUALES } from "@/lib/leychile";
import { fechaCorta } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";
import { actualizarNorma, borrarNorma } from "@/lib/acciones/admin";

export const metadata: Metadata = { title: "Biblioteca legal (administrador)" };
export const dynamic = "force-dynamic";

export default async function AdminBiblioteca() {
  await requerirAdmin();
  const normas = await listarNormas();
  const fuentes = (await estadoFuentes()).map((e) => ({ clave: e.fuente.clave, nombre: e.fuente.nombre, cargada: e.cargada }));

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Biblioteca legal</h1>
          <span className="p-sub">{normas.length} documentos</span>
        </div>
      </header>

      <div className="p-dos">
        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-base">
            <h2 id="t-base">
              <Icono nombre="descargar" tam={16} /> Leyes base
            </h2>
            <CargarBase />
          </section>
          <section className="p-sec" aria-labelledby="t-web">
            <h2 id="t-web">
              <Icono nombre="externo" tam={16} /> Normas que faltan (LeyChile)
            </h2>
            <FuentesWeb fuentes={fuentes} />
          </section>
          <section className="p-sec" aria-labelledby="t-ley">
            <h2 id="t-ley">
              <Icono nombre="descargar" tam={16} /> Agregar una ley desde LeyChile
            </h2>
            <FormImportarLey habituales={NORMAS_HABITUALES} />
          </section>

          <section className="p-sec" aria-labelledby="t-prueba">
            <h2 id="t-prueba">
              <Icono nombre="buscar" tam={16} /> Probar la búsqueda
            </h2>
            <ProbarBusqueda />
          </section>
        </div>

        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-lista">
            <h2 id="t-lista">Cargados</h2>
            <RevisarAhora />
            {normas.length === 0 ? (
              <p className="p-vacio" style={{ padding: "8px 0" }}>
                Aún no hay documentos.
              </p>
            ) : (
              <ul className="p-lista">
                {normas.map((n) => (
                  <li key={n.id} style={{ alignItems: "flex-start", flexWrap: "wrap", padding: "10px 0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{n.nombre}</strong>
                      <div className="ayuda" style={{ fontSize: "0.8125rem" }}>
                        {nombreMateria(n.materia)} · {n.total} {n.modo === "secciones" ? "secciones" : "artículos"} · {fechaCorta(n.creado_en)}
                        {n.version ? ` · versión ${n.version}` : ""}
                        {n.bcnId && n.revisadaEn ? ` · revisada ${fechaCorta(n.revisadaEn)}` : ""}
                      </div>
                      <div className={`ayuda${n.errorRevision ? " venc" : ""}`} style={{ fontSize: "0.8125rem" }}>
                        {n.errorRevision ? `Error al actualizar: ${n.errorRevision}` : n.bcnId ? "Se actualiza sola desde LeyChile" : n.modo === "secciones" ? "Sin artículos numerados: se guardó por secciones" : "Archivo subido"}
                      </div>
                    </div>
                    {n.bcnId ? (
                      <form action={actualizarNorma}>
                        <input type="hidden" name="id" value={n.id} />
                        <BotonEnviar className="btn btn-secundario btn-chico" enviando="Actualizando…">
                          <Icono nombre="actualizar" tam={14} /> Actualizar
                        </BotonEnviar>
                      </form>
                    ) : null}
                    <details className="desplegable">
                      <summary>Eliminar</summary>
                      <form action={borrarNorma}>
                        <input type="hidden" name="id" value={n.id} />
                        <p className="ayuda">Se borra el documento. Los informes ya hechos conservan su copia del texto.</p>
                        <BotonEnviar className="btn btn-peligro btn-chico" enviando="Eliminando…">
                          Sí, eliminar
                        </BotonEnviar>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
