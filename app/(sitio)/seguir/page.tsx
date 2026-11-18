import type { Metadata } from "next";
import Link from "next/link";
import { buscarCaso } from "@/lib/acciones/seguir";

export const metadata: Metadata = {
  title: "Seguir mi caso",
  description: "Escribe tu código de seguimiento y mira en qué etapa va tu caso. No necesitas cuenta.",
};
export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  formato: "El código tiene 8 letras y números, por ejemplo K7M4-9QX2. No usa 0, 1, I, L ni O.",
  nohay: "No encontramos un caso con ese código. Revisa que esté bien escrito.",
  limite: "Hiciste muchos intentos seguidos. Espera un rato y vuelve a probar.",
};

export default async function SeguirMiCaso({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const e = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const error = e ? ERRORES[e] : undefined;

  return (
    <div className="contenedor sg">
      <header className="sg-cab">
        <h1>Seguir mi caso</h1>
        <p>Escribe tu código y mira en qué etapa va. No necesitas cuenta.</p>
      </header>

      <div className="sg-grid">
        <section className="sg-tarjeta" aria-labelledby="sg-t">
          <form action={buscarCaso} className="sg-form">
            <label id="sg-t" htmlFor="codigo">Tu código de seguimiento</label>
            <div className="sg-fila">
              <input
                id="codigo"
                name="codigo"
                className="entrada sg-codigo"
                placeholder="K7M4-9QX2"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={24}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "sg-error" : "sg-ayuda"}
              />
              <button type="submit" className="btn btn-primario">Ver mi caso</button>
            </div>
            {error ? (
              <p id="sg-error" className="error-campo" role="alert">{error}</p>
            ) : (
              <p id="sg-ayuda" className="ayuda">Aparece en la pantalla al enviar tu caso y en el correo de confirmación.</p>
            )}
          </form>
        </section>

        <aside className="sg-lado" aria-label="Ayuda">
          <h2>¿No tienes el código?</h2>
          <ul>
            <li>Búscalo en el correo «Recibimos tu solicitud» (revisa también el spam).</li>
            <li>Si creaste una cuenta, <Link href="/ingresar?siguiente=/cuenta">ingresa</Link> y verás todos tus casos.</li>
            <li>¿Aún no envías tu caso? <Link href="/asesoria/solicitar">Cuéntalo aquí</Link>.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
