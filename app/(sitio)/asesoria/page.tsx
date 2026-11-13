import type { Metadata } from "next";
import Link from "next/link";
import { listarAsesoresPublicos } from "@/lib/datos";
import { nombreMateria } from "@/lib/materias";
import { iniciales, pesos } from "@/lib/formato";
import { resumenResenas, textoTiempo, tiempoRespuestaHoras } from "@/lib/resenas";

export const metadata: Metadata = {
  title: "Asesoría",
  description: "Revisa qué normas chilenas podrían aplicar a tu caso y pide contacto con un abogado.",
};

export const dynamic = "force-dynamic";

export default async function Asesoria() {
  const asesores = await listarAsesoresPublicos();
  const extras = new Map(
    await Promise.all(
      asesores.map(async (asesor) => [
        asesor.usuarioId,
        { resenas: await resumenResenas(asesor.usuarioId), horas: await tiempoRespuestaHoras(asesor.usuarioId) },
      ] as const),
    ),
  );

  return (
    <div className="contenedor">
      <div className="cabecera-pagina">
        <h1>Asesoría</h1>
        <p>Cuenta tu caso, mira qué normas podrían aplicar y pide que un asesor te conecte con un abogado.</p>
      </div>

      {asesores.length === 0 ? (
        <div className="aviso aviso-espera" role="status" style={{ marginTop: 32 }}>
          <p>Todavía no hay asesores disponibles para recibir solicitudes. Mientras tanto, puedes contar tu caso y revisar normas oficiales relacionadas.</p>
          <Link href="/asesoria/solicitar" className="btn btn-primario" style={{ marginTop: 12 }}>
            Contar mi caso
          </Link>
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
              {extras.get(a.usuarioId)?.resenas.total ? (
                <p className="perfil-resena" aria-label={`${extras.get(a.usuarioId)?.resenas.promedio} de 5 estrellas`}>
                  <span aria-hidden="true">★</span> <strong>{extras.get(a.usuarioId)?.resenas.promedio}</strong> · {extras.get(a.usuarioId)?.resenas.total} reseña{extras.get(a.usuarioId)?.resenas.total === 1 ? "" : "s"}
                </p>
              ) : null}
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
                {extras.get(a.usuarioId)?.horas != null ? (
                  <>
                    <dt>Suele responder en</dt>
                    <dd>{textoTiempo(extras.get(a.usuarioId)?.horas ?? 0)}</dd>
                  </>
                ) : null}
                <dt>Informe de orientación</dt>
                <dd>{pesos(a.precioInforme)}</dd>
              </dl>
              {extras.get(a.usuarioId)?.resenas.ultimas.length ? (
                <div>
                  <h3>Lo que dicen las personas atendidas</h3>
                  {extras.get(a.usuarioId)?.resenas.ultimas.map((resena, i) => (
                    <blockquote key={i} className="perfil-cita">
                      “{resena.comentario}” <small>— {resena.estrellas} de 5</small>
                    </blockquote>
                  ))}
                </div>
              ) : null}
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
