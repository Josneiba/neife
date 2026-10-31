import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirma tu correo" };

export default function VerificaCorreo() {
  return (
    <div className="contenedor pagina-estrecha">
      <h1>Revisa tu correo</h1>
      <p>Te enviamos un enlace para confirmar tu dirección y activar la cuenta. Revisa también la carpeta de spam.</p>
      <p className="ayuda">
        ¿No recibiste el enlace?{" "}
        <Link href="/ingresar/codigo">Solicita que te lo enviemos de nuevo</Link>.
      </p>
    </div>
  );
}
