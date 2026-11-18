import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pasos } from "@/components/Avance";
import { abrirCasoConCorreo } from "@/lib/acciones/seguir";
import { normalizarCodigo } from "@/lib/codigo-corto";
import { fechaCorta, hace } from "@/lib/formato";
import { estadoPorCodigo } from "@/lib/seguir";

export const metadata: Metadata = { title: "Estado de tu caso", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  correo: "Ese correo no coincide con el que dejaste en este caso.",
  limite: "Hiciste muchos intentos seguidos. Espera un rato y vuelve a probar.",
};

export default async function EstadoDelCaso({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { codigo: crudo } = await params;
  const sp = await searchParams;
  const codigo = normalizarCodigo(decodeURIComponent(crudo));
  if (!codigo) notFound();
  const estado = await estadoPorCodigo(codigo);
  if (!estado) notFound();
  const e = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const error = e ? ERRORES[e] : undefined;

  return (
    <div className="contenedor sg">
      <header className="sg-cab">
        <p className="sg-etiqueta">Código de seguimiento</p>
        <h1 className="sg-folio">{estado.codigo}</h1>
        <p>
          {estado.materia} · enviado el {fechaCorta(estado.creadoEn)}
          {!estado.anonimizada ? ` · última actividad ${hace(estado.ultimaActividad)}` : ""}
        </p>
      </header>

      <div className="sg-grid">
        <section className="sg-principal" aria-label="Estado">
          <div className="sg-estado" data-tono={estado.tono} role="status">
            <h2>{estado.titulo}</h2>
            {estado.mensaje ? <p>{estado.mensaje}</p> : null}
            {estado.sugerencia ? <p className="sg-sugerencia">{estado.sugerencia}</p> : null}
          </div>
          {!estado.anonimizada ? (
            <div className="sg-pasos">
              <Pasos estado={estado.estado} />
            </div>
          ) : null}
        </section>

        <aside className="sg-lado" aria-label="Detalle">
          {estado.anonimizada ? (
            <>
              <h2>¿Necesitas ayuda de nuevo?</h2>
              <p><Link className="btn btn-primario" href="/asesoria/solicitar">Contar un caso nuevo</Link></p>
            </>
          ) : (
            <>
              <h2>Ver el detalle de mi caso</h2>
              <p className="ayuda">Quién lleva tu caso, qué necesita de ti, tu informe y las horas disponibles. Escribe el correo que dejaste.</p>
              <form action={abrirCasoConCorreo} className="sg-form">
                <input type="hidden" name="codigo" value={estado.codigo} />
                <label htmlFor="correo" className="solo-lector">Tu correo</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  className="entrada"
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "sg-error" : undefined}
                />
                {error ? <p id="sg-error" className="error-campo" role="alert">{error}</p> : null}
                <button type="submit" className="btn btn-primario">Abrir mi caso</button>
              </form>
            </>
          )}
          <p className="sg-otro"><Link href="/seguir">Seguir otro caso</Link></p>
        </aside>
      </div>
    </div>
  );
}
