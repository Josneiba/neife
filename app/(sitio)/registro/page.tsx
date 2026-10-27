import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormRegistroAbogado, FormRegistroCliente } from "@/components/formularios";
import { usuarioActual } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function Registro({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const u = await usuarioActual();
  if (u) redirect(u.rol === "admin" ? "/admin" : u.rol === "abogado" ? "/panel" : "/cuenta");

  const tipo = (Array.isArray(sp.tipo) ? sp.tipo[0] : sp.tipo) === "asesor" ? "asesor" : "cliente";

  return (
    <div className="contenedor pagina-estrecha">
      <h1>Crear cuenta</h1>
      <p>
        ¿Ya tienes una? <Link href="/ingresar">Ingresa</Link>.
      </p>

      <nav className="conmutador" aria-label="Tipo de cuenta" style={{ marginTop: 24 }}>
        <Link href="/registro" aria-current={tipo === "cliente" ? "true" : undefined}>
          Necesito asesoría
        </Link>
        <Link href="/registro?tipo=asesor" aria-current={tipo === "asesor" ? "true" : undefined}>
          Soy abogado o asesor
        </Link>
      </nav>

      {tipo === "cliente" ? (
        <>
          <p className="ayuda" style={{ marginTop: 16 }}>
            La cuenta es opcional: te sirve para ver tus solicitudes en un solo lugar. Puedes pedir asesoría sin crearla.
          </p>
          <FormRegistroCliente />
        </>
      ) : (
        <FormRegistroAbogado />
      )}
    </div>
  );
}
