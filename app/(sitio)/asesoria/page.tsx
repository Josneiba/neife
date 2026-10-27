import type { Metadata } from "next";
import Link from "next/link";
import { listarAsesoresPublicos } from "@/lib/datos";
import { nombreMateria } from "@/lib/materias";
import { iniciales, pesos } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Asesoría",
  description: "Revisa qué normas chilenas podrían aplicar a tu caso y pide contacto con un abogado.",
};

export const dynamic = "force-dynamic";

export default async function Asesoria() {
  const asesores = await listarAsesoresPublicos();

  return (
    <div className="contenedor">
      <div className="cabecera-pagina">
        <h1>Asesoría</h1>
        <p>Cuenta tu caso, mira qué normas podrían aplicar y pide que un asesor te conecte con un abogado.</p>
      </div>

      {asesores.length === 0 ? (
        <div className="aviso aviso-espera" style={{ marginTop: 32 }}>
          Todavía no hay asesores disponibles. Vuelve pronto.
        </div>
      ) : (
        asesores.map((a) => (
          <article key={a.usuarioId} className="perfil" aria-labelledby={`asesor-${a.usuarioId}`}>
            <div className="perfil-lado">
              <div className="perfil-iniciales" aria-hidden="true">
                {iniciales(a.nombre)}
              </div>
              <h2 id={`asesor-${a.usuarioId}`}>{a.nombre}</h2>
              <p className="perfil-titulo">{a.titulo}</p>
              <span className="verificado">Cuenta verificada por Neife</span>
            </div>
            <div className="perfil-cuerpo">
              {a.bio ? (
                <div>
                  <h3>Presentación</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{a.bio}</p>
                </div>
              ) : null}
              <dl className="datos">
                {a.materias.length > 0 ? (
                  <>
                    <dt>Materias</dt>
                    <dd>{a.materias.map(nombreMateria).join(", ")}</dd>
                  </>
                ) : null}
                {a.ubicacion ? (
                  <>
                    <dt>Atención</dt>
                    <dd>{a.ubicacion}</dd>
                  </>
                ) : null}
                <dt>Informe de orientación</dt>
                <dd>{pesos(a.precioInforme)}</dd>
              </dl>
              <div className="botones">
                <Link href={`/asesoria/solicitar?asesor=${a.usuarioId}`} className="btn btn-primario">
                  Contar mi caso
                </Link>
              </div>
            </div>
          </article>
        ))
      )}

      <section className="seccion" aria-labelledby="t-como">
        <h2 id="t-como">Cómo funciona</h2>
        <ol className="pasos">
          <li>Cuentas tu caso y ves las normas que podrían aplicar. No se guarda nada.</li>
          <li>Si quieres ayuda, dejas tus datos. El asesor revisa el caso y prepara tu informe.</li>
          <li>Recibes el informe y, con tu autorización, te conecta con un abogado del rubro.</li>
        </ol>
      </section>

      <p className="ayuda" style={{ marginTop: 40, maxWidth: 640 }}>
        Orientación general. No reemplaza a un abogado. Si tienes una audiencia o un plazo cerca, busca un abogado de inmediato.
      </p>
    </div>
  );
}
