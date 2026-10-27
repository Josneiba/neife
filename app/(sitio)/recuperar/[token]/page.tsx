import type { Metadata } from "next";
import Link from "next/link";
import { FormNuevaClave } from "@/components/formularios";
import { tokenValido } from "@/lib/tokens";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NuevaClave({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = token.length >= 20 && token.length <= 100 && (await tokenValido(token, "recuperar"));
  return (
    <div className="contenedor pagina-estrecha">
      <h1>Nueva contraseña</h1>
      {valido ? (
        <FormNuevaClave token={token} />
      ) : (
        <>
          <div className="aviso aviso-error" role="alert">
            Este enlace ya se usó o venció.
          </div>
          <p>
            <Link href="/recuperar">Pedir un enlace nuevo</Link>
          </p>
        </>
      )}
    </div>
  );
}
