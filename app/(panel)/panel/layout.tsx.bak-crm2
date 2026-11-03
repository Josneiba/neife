import "../../panel.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { salir } from "@/lib/acciones/auth";
import { contarSolicitudesAsesor } from "@/lib/datos";
import { Logo } from "@/components/Logo";
import { NavLateral } from "@/components/NavEnlaces";
import { Etiqueta } from "@/components/Etiqueta";
import { Icono } from "@/components/Iconos";
import { TablasMovil } from "@/components/TablasMovil";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await usuarioActual();
  if (!u) redirect("/ingresar?siguiente=/panel");
  if (u.rol === "cliente") redirect("/cuenta");
  if (u.rol === "admin") redirect("/admin");

  if (u.estado !== "activo") {
    return (
      <main id="contenido" className="contenedor pagina-estrecha">
        <Logo />
        <h1 style={{ marginTop: 32 }}>
          {u.estado === "pendiente" ? "Estamos verificando tu cuenta" : "No pudimos verificar tu cuenta"}
        </h1>
        <p style={{ marginTop: 12 }}>
          <Etiqueta estado={u.estado} />
        </p>
        <p style={{ marginTop: 16 }}>
          {u.estado === "pendiente"
            ? "Revisamos tu título y colegiatura. Cuando termine, verás los casos y tu perfil será público. Vuelve a ingresar más tarde."
            : "No pudimos confirmar tus datos. Escríbenos si crees que es un error."}
        </p>
        <div className="botones" style={{ marginTop: 28 }}>
          <Link href="/" className="btn btn-secundario">
            Volver al sitio
          </Link>
          <form action={salir}>
            <button type="submit" className="btn btn-secundario">
              Salir
            </button>
          </form>
        </div>
      </main>
    );
  }

  const conteo = await contarSolicitudesAsesor(u.id);

  return (
    <div className="app">
      <aside className="lateral">
        <Logo href="/panel" />
        <NavLateral
          raiz="/panel"
          enlaces={[
            { href: "/panel", texto: "Casos", icono: "casos", contador: conteo.nueva ?? 0 },
            { href: "/panel/crm", texto: "CRM", icono: "usuarios" },
            { href: "/panel/informes", texto: "Informes", icono: "informe" },
            { href: "/panel/biblioteca", texto: "Biblioteca", icono: "libro" },
            { href: "/panel/perfil", texto: "Mi perfil", icono: "usuario" },
          ]}
        />
        <div className="lateral-cuenta">
          <div className="cuenta-datos">
            <strong>{u.nombre}</strong>
            {u.email}
          </div>
          <Link href="/asesoria" aria-label="Perfil público">
            <Icono nombre="externo" tam={17} /> <span className="txt">Perfil público</span>
          </Link>
          <form action={salir}>
            <button type="submit" className="boton-enlace" aria-label="Salir">
              <Icono nombre="salir" tam={17} /> <span className="txt">Salir</span>
            </button>
          </form>
        </div>
      </aside>
      <main id="contenido" className="principal">
        <TablasMovil />
        {children}
      </main>
    </div>
  );
}
