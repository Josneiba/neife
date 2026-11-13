import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIAS, guiaDe } from "@/lib/guias";
import { nombreMateria } from "@/lib/materias";

export function generateStaticParams() {
  return Object.keys(GUIAS).map((materia) => ({ materia }));
}

export async function generateMetadata({ params }: { params: Promise<{ materia: string }> }): Promise<Metadata> {
  const guia = guiaDe((await params).materia);
  return guia ? { title: guia.titulo, description: guia.bajada } : {};
}

export default async function Guia({ params }: { params: Promise<{ materia: string }> }) {
  const guia = guiaDe((await params).materia);
  if (!guia) notFound();

  return (
    <div className="contenedor guia">
      <header className="guia-cab">
        <p className="guia-etiqueta">Guía gratuita · {nombreMateria(guia.materia)}</p>
        <h1>{guia.titulo}</h1>
        <p className="guia-bajada">{guia.bajada}</p>
      </header>

      <div className="guia-grid">
        <section aria-labelledby="t-pasos">
          <h2 id="t-pasos">Qué hacer, paso a paso</h2>
          <ol className="guia-pasos">
            {guia.pasos.map((paso) => (
              <li key={paso.titulo}>
                <strong>{paso.titulo}</strong>
                <span>{paso.texto}</span>
              </li>
            ))}
          </ol>
        </section>
        <aside className="guia-lado">
          <section className="guia-nota guia-plazo" aria-labelledby="t-plazos">
            <h2 id="t-plazos">Plazos</h2>
            <ul>{guia.plazos.map((texto) => <li key={texto}>{texto}</li>)}</ul>
          </section>
          <section className="guia-nota" aria-labelledby="t-docs">
            <h2 id="t-docs">Junta estos documentos</h2>
            <ul className="guia-check">{guia.documentos.map((texto) => <li key={texto}>{texto}</li>)}</ul>
          </section>
          <section className="guia-nota guia-cta" aria-labelledby="t-cta">
            <h2 id="t-cta">¿Quieres que un asesor lo revise?</h2>
            <p>Cuéntalo una vez y los asesores de Neife lo ven.</p>
            <Link href={`/asesoria/solicitar?materia=${guia.materia}`} className="btn btn-primario">Pedir orientación</Link>
          </section>
        </aside>
      </div>

      {guia.carta ? (
        <section className="guia-carta" aria-labelledby="t-carta">
          <div className="guia-carta-cab">
            <h2 id="t-carta">{guia.carta.titulo}</h2>
            <p>Completa los datos y descarga la carta en PDF. No guardamos lo que escribes.</p>
          </div>
          <form action={`/api/carta/${guia.materia}`} method="post" className="guia-form">
            {guia.carta.campos.map((campo) => (
              <div className={`campo${campo.largo ? " guia-ancho" : ""}`} key={campo.nombre}>
                <label htmlFor={`c-${campo.nombre}`}>
                  {campo.etiqueta}{campo.opcional ? " (opcional)" : ""}
                </label>
                {campo.largo ? (
                  <textarea id={`c-${campo.nombre}`} name={campo.nombre} className="entrada" rows={3} maxLength={800} required={!campo.opcional} placeholder={campo.ayuda} />
                ) : (
                  <input id={`c-${campo.nombre}`} name={campo.nombre} className="entrada" maxLength={160} required={!campo.opcional} placeholder={campo.ayuda} />
                )}
              </div>
            ))}
            <div className="guia-ancho">
              <button type="submit" className="btn btn-primario">Descargar carta (PDF)</button>
            </div>
          </form>
        </section>
      ) : null}

      <p className="guia-aviso">
        Orientación general: no reemplaza a un abogado ni constituye patrocinio. Normas de referencia: {guia.normas.join("; ")}. Las leyes cambian: confirma los plazos con un asesor.
      </p>
    </div>
  );
}
