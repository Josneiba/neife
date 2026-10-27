import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormIngresar } from "@/components/formularios";
import { usuarioActual } from "@/lib/auth";
import { rutaSegura } from "@/lib/guards";
import { googleActivo } from "@/lib/oauth";

export const metadata: Metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

const AVISOS: Record<string, { clase: string; texto: string }> = {
  "clave:ok": { clase: "aviso-ok", texto: "Contraseña cambiada. Ya puedes ingresar." },
  "error:google": { clase: "aviso-error", texto: "No pudimos ingresar con Google. Intenta de nuevo o usa tu correo y contraseña." },
  "error:google_cancelado": { clase: "aviso-error", texto: "Cancelaste el ingreso con Google. Puedes volver a intentarlo." },
  "error:google_correo": { clase: "aviso-error", texto: "Google no confirmó tu correo, o la cuenta no está disponible. Usa tu correo y contraseña." },
};

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const siguiente = rutaSegura(uno(sp.siguiente), "");
  const u = await usuarioActual();
  if (u) redirect(siguiente || (u.rol === "admin" ? "/admin" : u.rol === "abogado" ? "/panel" : "/cuenta"));
  const aviso = (uno(sp.clave) && AVISOS[`clave:${uno(sp.clave)}`]) || (uno(sp.error) && AVISOS[`error:${uno(sp.error)}`]) || null;

  return (
    <div className="contenedor pagina-estrecha">
      <h1>Ingresar</h1>
      <p>
        ¿No tienes cuenta? <Link href="/registro">Crea una</Link>.
      </p>
      {aviso ? (
        <div className={`aviso ${aviso.clase}`} role="status">
          {aviso.texto}
        </div>
      ) : null}
      {googleActivo() ? (
        <>
          <a className="btn btn-secundario btn-ancho" href={`/api/oauth/google${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`}>
            Continuar con Google
          </a>
          <p className="ayuda" style={{ textAlign: "center", margin: "14px 0" }}>o con tu correo</p>
        </>
      ) : null}
      <FormIngresar siguiente={siguiente || undefined} />
      <p className="ayuda" style={{ marginTop: 20 }}>
        <Link href="/recuperar">Olvidé mi contraseña</Link>
      </p>
    </div>
  );
}
