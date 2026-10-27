import Link from "next/link";
import { EncabezadoSitio } from "@/components/EncabezadoSitio";
import { PieSitio } from "@/components/PieSitio";

export default function NoEncontrada() {
  return (
    <>
      <EncabezadoSitio />
      <main id="contenido" className="contenedor pagina-estrecha">
        <h1>No encontramos esa página</h1>
        <p>Puede que el enlace esté incompleto o que la página ya no exista.</p>
        <div className="botones" style={{ marginTop: 24 }}>
          <Link href="/" className="btn btn-primario">
            Ir al inicio
          </Link>
        </div>
      </main>
      <PieSitio />
    </>
  );
}
