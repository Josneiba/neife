import type { Metadata } from "next";
import Link from "next/link";
import { FormPedirRecuperacion } from "@/components/formularios";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Recuperar() {
  return (
    <div className="contenedor pagina-estrecha">
      <h1>Recuperar contraseña</h1>
      <p>Escribe el correo de tu cuenta y te enviamos un enlace para elegir una nueva.</p>
      <FormPedirRecuperacion />
      <p className="ayuda" style={{ marginTop: 20 }}>
        <Link href="/ingresar">Volver a ingresar</Link>
      </p>
    </div>
  );
}
