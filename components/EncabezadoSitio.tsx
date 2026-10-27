import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { salir } from "@/lib/acciones/auth";
import { Logo } from "./Logo";
import { NavSitio } from "./NavEnlaces";
import { Icono } from "./Iconos";

export async function EncabezadoSitio() {
  const usuario = await usuarioActual();
  const destino = usuario?.rol === "admin" ? "/admin" : usuario?.rol === "abogado" ? "/panel" : "/cuenta";

  return (
    <header className="encabezado">
      <div className="contenedor encabezado-interior">
        <Logo />
        <nav className="nav" aria-label="Principal">
          <NavSitio
            enlaces={[
              { href: "/#como", texto: "Cómo funciona", opcional: true },
              { href: "/asesoria", texto: "Asesores", opcional: true },
              { href: "/#contacto", texto: "Contacto", opcional: true },
            ]}
          />
          <span className="nav-sep" aria-hidden="true" />
          {usuario ? (
            <>
              <Link href={destino} aria-label={usuario.rol === "cliente" ? "Mi cuenta" : "Mi panel"} title={usuario.rol === "cliente" ? "Mi cuenta" : "Mi panel"} className="nav-icono">
                <Icono nombre="usuario" tam={20} className="solo-movil" />
                <span className="txt-escritorio">{usuario.rol === "cliente" ? "Mi cuenta" : "Mi panel"}</span>
              </Link>
              <form action={salir}>
                <button type="submit" className="nav-boton nav-icono" aria-label="Salir" title="Salir">
                  <Icono nombre="salir" tam={20} className="solo-movil" />
                  <span className="txt-escritorio">Salir</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/ingresar" aria-label="Ingresar" title="Ingresar" className="nav-icono">
                <Icono nombre="usuario" tam={20} className="solo-movil" />
                <span className="txt-escritorio">Ingresar</span>
              </Link>
              <Link href="/registro" className="btn btn-secundario btn-chico nav-opcional">
                Crear cuenta
              </Link>
              <Link href="/asesoria/solicitar" className="btn btn-primario btn-chico">
                Contar mi caso
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
