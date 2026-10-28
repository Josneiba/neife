import Link from "next/link";
import { SITIO } from "@/lib/contenido";
import { Logo } from "./Logo";

export function PieSitio() {
  return (
    <footer className="pie">
      <div className="contenedor pie-interior">
        <div className="pie-marca">
          <Logo />
          <p>© {new Date().getFullYear()} {SITIO.nombre}. Orientación legal en {SITIO.ciudad}. No reemplaza a un abogado.</p>
        </div>
        <nav className="pie-enlaces" aria-label="Información">
          <Link href="/asesoria/solicitar">Contar mi caso</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/ingresar">Ingresar</Link>
        </nav>
      </div>
    </footer>
  );
}
