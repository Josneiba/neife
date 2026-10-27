import type { Metadata } from "next";
import { leerTerminos } from "@/lib/terminos";

export const metadata: Metadata = { title: "Términos y condiciones" };
export const dynamic = "force-dynamic";

function bloques(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter((bloque) => bloque && !bloque.startsWith("# Términos y condiciones"));
}

export default async function Terminos() {
  const documento = await leerTerminos();
  return (
    <div className="contenedor pagina-estrecha" style={{ maxWidth: 720 }}>
      <h1>Términos y condiciones</h1>
      {documento.publicado ? (
        <p className="ayuda legal-version">Versión {documento.version} · Vigente desde {new Date(documento.publicadoEn).toLocaleDateString("es-CL")}</p>
      ) : (
        <div className="aviso aviso-espera legal-aviso" role="status">
          Este es un borrador base, todavía no publicado. La administración debe completar la identificación del responsable
          y revisar el texto antes de habilitarlo como versión vigente.
        </div>
      )}
      <article className="documento-legal">
        {bloques(documento.contenido).map((bloque, i) =>
          bloque.startsWith("## ") ? (
            <h2 key={i}>{bloque.slice(3)}</h2>
          ) : bloque.startsWith("- ") ? (
            <ul key={i}>
              {bloque.split("\n").map((linea, j) => <li key={j}>{linea.replace(/^- /, "")}</li>)}
            </ul>
          ) : (
            <p key={i}>{bloque}</p>
          ),
        )}
      </article>
      <section className="documento-legal" aria-labelledby="fuentes-legales">
        <h2 id="fuentes-legales">Fuentes legales oficiales</h2>
        <ul>
          <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noreferrer">Ley 19.628, sobre protección de la vida privada</a></li>
          <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" target="_blank" rel="noreferrer">Ley 21.719, protección y tratamiento de datos personales</a> (publicada el 13 de diciembre de 2024; vigencia general de las modificaciones indicadas desde el 1 de diciembre de 2026)</li>
          <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=61438" target="_blank" rel="noreferrer">Ley 19.496, protección de los derechos de los consumidores</a></li>
        </ul>
      </section>
    </div>
  );
}
