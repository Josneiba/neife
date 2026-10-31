import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormCodigoIngreso } from "@/components/formularios";
import { usuarioActual } from "@/lib/auth";
import { rutaSegura } from "@/lib/guards";

export const metadata: Metadata = { title: "Ingresar con código" };
export const dynamic = "force-dynamic";

export default async function IngresarConCodigo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const siguiente = rutaSegura(uno(sp.siguiente), "");
  const usuario = await usuarioActual();
  if (usuario) redirect(siguiente || (usuario.rol === "admin" ? "/admin" : usuario.rol === "abogado" ? "/panel" : "/cuenta"));

  return (
    <div className="contenedor pagina-estrecha">
      <h1>Ingresar con un código</h1>
      <p>Te enviaremos un código de un solo uso a tu correo. No necesitas recordar la contraseña.</p>
      <FormCodigoIngreso siguiente={siguiente || undefined} />
      <p className="ayuda" style={{ marginTop: 20 }}>
        <Link href={`/ingresar${siguiente ? `?siguiente=${encodeURIComponent(siguiente)}` : ""}`}>Volver al ingreso con contraseña</Link>
      </p>
    </div>
  );
}
