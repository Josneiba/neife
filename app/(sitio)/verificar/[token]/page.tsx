import type { Metadata } from "next";
import Link from "next/link";
import { FormVerificarCorreo } from "@/components/formularios";
import { tokenValido } from "@/lib/tokens";

export const metadata: Metadata = { title: "Confirmar correo", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificarCorreo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = token.length >= 20 && token.length <= 100 && (await tokenValido(token, "verificar_correo"));

  return (
    <div className="contenedor pagina-estrecha">
      <h1>Confirma tu correo</h1>
      {valido ? (
        <>
          <p>Confirma que esta dirección de correo es tuya para activar la cuenta.</p>
          <FormVerificarCorreo token={token} />
        </>
      ) : (
        <>
          <div className="aviso aviso-error" role="alert">
            Este enlace ya se usó o venció.
          </div>
          <p>
            <Link href="/ingresar/codigo">Solicitar otro enlace</Link>
          </p>
        </>
      )}
    </div>
  );
}
