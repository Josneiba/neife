import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/guards";
import { actividadReciente } from "@/lib/admin-datos";
import { fechaHora } from "@/lib/formato";

export const metadata: Metadata = { title: "Actividad (administrador)" };
export const dynamic = "force-dynamic";

const TEXTOS: Record<string, string> = {
  ingreso: "Ingresó", ingreso_google: "Ingresó con Google", registro_cliente: "Creó una cuenta", registro_abogado: "Se registró como asesor",
  abogado_aprobado: "Asesor aprobado", abogado_rechazado: "Asesor rechazado o desactivado", solicitud_creada: "Nueva solicitud",
  solicitud_vista: "Abrió un caso", informe_creado: "Creó un informe", informe_entregado: "Entregó un informe", informe_retirado: "Retiró la entrega de un informe",
  contacto_rapido: "Anotó un contacto", norma_subida: "Subió un documento", norma_reemplazada: "Reemplazó un documento", norma_importada: "Importó una ley",
  norma_actualizada: "Actualizó una ley", norma_actualizada_auto: "Ley actualizada automáticamente", norma_eliminada: "Eliminó un documento",
  recuperacion_pedida: "Pidió recuperar su contraseña", clave_restablecida: "Cambió su contraseña",
};

export default async function Actividad() {
  await requerirAdmin();
  const filas = await actividadReciente(120);
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Actividad</h1>
          <span className="p-sub">Últimas {filas.length} acciones sensibles: quién hizo qué y cuándo</span>
        </div>
      </header>
      <table className="p-tabla">
        <thead>
          <tr>
            <th scope="col">Cuándo</th>
            <th scope="col">Quién</th>
            <th scope="col">Qué</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} style={{ cursor: "default" }}>
              <td className="num">{fechaHora(f.creadoEn)}</td>
              <td>{f.quien}</td>
              <td>{TEXTOS[f.accion] ?? f.accion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
