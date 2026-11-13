import "../../panel.css";
import "../../crm.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { salir } from "@/lib/acciones/auth";
import { contarSolicitudesAsesor, contarBandeja } from "@/lib/datos";
import { Logo } from "@/components/Logo";
import { Etiqueta } from "@/components/Etiqueta";
import { TablasMovil } from "@/components/TablasMovil";
import { ShellPanel } from "@/components/panel/ShellPanel";
import { hoyLocal } from "@/lib/crm/fechas";
import { listarPersonas } from "@/lib/crm/servicio";
import { avisos } from "@/lib/crm/servicio-avisos";

export const dynamic = "force-dynamic";

/**
 * Marco de todo el panel del abogado (v2): barra delgada con menú de tres rayas, barra inferior
 * en el celular y botón «+» contextual. El menú lateral fijo de antes ya no ocupa pantalla.
 */
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

  const [conteo, lista, personas, abiertas] = await Promise.all([
    contarSolicitudesAsesor(u.id),
    avisos(u.id),
    listarPersonas(u.id, { limite: 500 }),
    contarBandeja(),
  ]);

  return (
    <ShellPanel
      nombre={u.nombre}
      email={u.email}
      avisos={lista.filter((a) => a.nivel !== "info").length}
      casosNuevos={conteo.nueva ?? 0}
      bandeja={abiertas}
      personas={personas.map((p) => ({ id: p.id, nombre: p.nombre }))}
      hoy={hoyLocal()}
    >
      <TablasMovil />
      {children}
    </ShellPanel>
  );
}
