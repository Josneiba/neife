import "../../panel.css";
import Link from "next/link";
import { requerirAdmin } from "@/lib/guards";
import { salir } from "@/lib/acciones/auth";
import { getDb } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { NavLateral } from "@/components/NavEnlaces";
import { Icono } from "@/components/Iconos";
import { TablasMovil } from "@/components/TablasMovil";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirAdmin();
  const d = await getDb();
  const r = await d.execute("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'abogado' AND estado = 'pendiente'");
  const pendientes = Number(r.rows[0]?.n ?? 0);

  return (
    <div className="app">
      <aside className="lateral">
        <Logo href="/admin" />
        <NavLateral
          raiz="/admin"
          enlaces={[
            { href: "/admin", texto: "Resumen", icono: "casos" },
            { href: "/admin/biblioteca", texto: "Biblioteca legal", icono: "libro" },
            { href: "/admin/terminos", texto: "Términos", icono: "nota" },
            { href: "/admin/asesores", texto: "Asesores", icono: "escudo", contador: pendientes },
            { href: "/admin/actividad", texto: "Actividad", icono: "nota" },
          ]}
        />
        <div className="lateral-cuenta">
          <div className="cuenta-datos">
            <strong>{u.nombre}</strong>
            Administrador
          </div>
          <Link href="/">
            <Icono nombre="externo" tam={15} /> Ver el sitio
          </Link>
          <form action={salir}>
            <button type="submit" className="boton-enlace">
              <Icono nombre="salir" tam={15} /> Salir
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
