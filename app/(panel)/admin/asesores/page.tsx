import type { Metadata } from "next";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Etiqueta } from "@/components/Etiqueta";
import { Icono } from "@/components/Iconos";
import { requerirAdmin } from "@/lib/guards";
import { getDb } from "@/lib/db";
import { fechaCorta } from "@/lib/formato";
import { aprobarAbogado, rechazarAbogado } from "@/lib/acciones/admin";

export const metadata: Metadata = { title: "Asesores (administrador)" };
export const dynamic = "force-dynamic";

type Fila = { id: number; nombre: string; email: string; estado: string; titulo: string; registro: string; creado: string };

export default async function Verificacion() {
  await requerirAdmin();
  const d = await getDb();
  const r = await d.execute(
    `SELECT u.id, u.nombre, u.email, u.estado, u.creado_en, p.titulo, p.registro
       FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id
      WHERE u.rol = 'abogado' ORDER BY (u.estado = 'pendiente') DESC, u.creado_en DESC`,
  );
  const filas: Fila[] = r.rows.map((f) => ({
    id: Number(f.id),
    nombre: String(f.nombre),
    email: String(f.email),
    estado: String(f.estado),
    titulo: String(f.titulo),
    registro: String(f.registro),
    creado: String(f.creado_en),
  }));
  const pendientes = filas.filter((f) => f.estado === "pendiente");
  const resto = filas.filter((f) => f.estado !== "pendiente");

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Asesores</h1>
          <span className="p-sub">
            {pendientes.length} por verificar · comprueba título y colegiatura en una fuente oficial antes de aprobar
          </span>
        </div>
      </header>
      {filas.length === 0 ? (
        <p className="p-vacio">Aún no hay asesores registrados.</p>
      ) : (
        <table className="p-tabla">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Condición</th>
              <th scope="col">Colegiatura o universidad</th>
              <th scope="col">Registro</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {[...pendientes, ...resto].map((f) => (
              <tr key={f.id} style={{ cursor: "default" }}>
                <td>{f.nombre}</td>
                <td>{f.email}</td>
                <td>{f.titulo}</td>
                <td>{f.registro}</td>
                <td className="num">{fechaCorta(f.creado)}</td>
                <td>
                  <Etiqueta estado={f.estado} />
                </td>
                <td>
                  <div className="p-acciones">
                    {f.estado !== "activo" && (
                      <form action={aprobarAbogado}>
                        <input type="hidden" name="id" value={f.id} />
                        <BotonEnviar className="btn btn-primario btn-chico" enviando="…">
                          <Icono nombre="check" tam={14} /> Aprobar
                        </BotonEnviar>
                      </form>
                    )}
                    {f.estado !== "rechazado" && (
                      <form action={rechazarAbogado}>
                        <input type="hidden" name="id" value={f.id} />
                        <BotonEnviar className="btn btn-secundario btn-chico" enviando="…">
                          {f.estado === "activo" ? "Desactivar" : "Rechazar"}
                        </BotonEnviar>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
