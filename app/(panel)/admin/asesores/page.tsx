import type { Metadata } from "next";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Etiqueta } from "@/components/Etiqueta";
import { Icono } from "@/components/Iconos";
import { requerirAdmin } from "@/lib/guards";
import { getDb } from "@/lib/db";
import { fechaCorta } from "@/lib/formato";
import { aprobarAbogado, rechazarAbogado } from "@/lib/acciones/admin";
import { datoAVerificar, esAbogado, URL_VERIFICAR_TITULO } from "@/lib/verificacion-titulo";

export const metadata: Metadata = { title: "Asesores (administrador)" };
export const dynamic = "force-dynamic";

type Fila = {
  id: number;
  nombre: string;
  email: string;
  estado: string;
  titulo: string;
  registro: string;
  creado: string;
  verificado: string;
  nota: string;
};

const MOTIVOS = [
  "No pudimos verificar tu título con el dato que enviaste.",
  "El código del certificado no es válido o está vencido.",
  "Faltan datos para verificar tu cuenta.",
];

export default async function Verificacion({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requerirAdmin();
  const sp = await searchParams;
  const aviso = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const d = await getDb();
  const r = await d.execute(
    `SELECT u.id, u.nombre, u.email, u.estado, u.creado_en, p.titulo, p.registro, p.verificado_en, p.verificacion_nota
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
    verificado: String(f.verificado_en),
    nota: String(f.verificacion_nota),
  }));
  const pendientes = filas.filter((f) => f.estado === "pendiente");
  const resto = filas.filter((f) => f.estado !== "pendiente");

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Asesores</h1>
          <span className="p-sub">
            {pendientes.length === 0 ? "Nada por verificar" : `${pendientes.length} por verificar`} · {resto.length} ya revisados
          </span>
        </div>
      </header>

      {aviso === "comprobar" ? (
        <p className="ad-aviso ad-aviso-alerta" role="alert">Marca la casilla «Comprobé el dato» antes de aprobar.</p>
      ) : ok ? (
        <p className="ad-aviso" role="status">{ok === "aprobado" ? "Cuenta aprobada. Le avisamos por correo." : "Cuenta rechazada. Le avisamos por correo con el motivo."}</p>
      ) : null}

      {pendientes.length > 0 ? (
        <section className="ad-lista" aria-label="Cuentas por verificar">
          {pendientes.map((f) => (
            <article key={f.id} className="ad-tarjeta">
              <header className="ad-cab">
                <div>
                  <h2>{f.nombre}</h2>
                  <p>{f.email}</p>
                </div>
                <span className="ad-fecha">Registro {fechaCorta(f.creado)}</span>
              </header>
              <dl className="ad-datos">
                <div>
                  <dt>Dice ser</dt>
                  <dd>{f.titulo}</dd>
                </div>
                <div>
                  <dt>{datoAVerificar(f.titulo)}</dt>
                  <dd className="ad-dato">{f.registro}</dd>
                </div>
              </dl>
              {esAbogado(f.titulo) ? (
                <a className="btn btn-secundario btn-chico ad-enlace" href={URL_VERIFICAR_TITULO} target="_blank" rel="noopener noreferrer">
                  Verificar el certificado en el Poder Judicial ↗
                </a>
              ) : (
                <p className="ad-nota">Confirma con la universidad (certificado de alumno regular o de egreso) antes de aprobar.</p>
              )}
              <form action={aprobarAbogado} className="ad-aprobar">
                <input type="hidden" name="id" value={f.id} />
                <label className="opcion">
                  <input type="checkbox" name="comprobado" />
                  <span>Comprobé el dato en la fuente oficial</span>
                </label>
                <BotonEnviar className="btn btn-primario btn-chico" enviando="…">
                  <Icono nombre="check" tam={14} /> Aprobar
                </BotonEnviar>
              </form>
              <details className="ad-rechazo">
                <summary>Rechazar con motivo</summary>
                <form action={rechazarAbogado}>
                  <input type="hidden" name="id" value={f.id} />
                  <label className="solo-lector" htmlFor={`m${f.id}`}>Motivo</label>
                  <select id={`m${f.id}`} name="motivo" className="entrada">
                    {MOTIVOS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <label className="solo-lector" htmlFor={`n${f.id}`}>Mensaje propio (opcional)</label>
                  <input id={`n${f.id}`} name="nota" className="entrada" maxLength={300} placeholder="Mensaje propio (opcional)" />
                  <BotonEnviar className="btn btn-secundario btn-chico" enviando="…">Rechazar y avisar</BotonEnviar>
                </form>
              </details>
            </article>
          ))}
        </section>
      ) : (
        <p className="p-vacio">No hay cuentas esperando verificación.</p>
      )}

      {resto.length > 0 ? (
        <section aria-label="Cuentas revisadas" className="ad-revisadas">
          <h2>Ya revisadas</h2>
          <table className="p-tabla">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Condición</th>
                <th scope="col">Estado</th>
                <th scope="col">Verificado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {resto.map((f) => (
                <tr key={f.id} style={{ cursor: "default" }}>
                  <td>
                    {f.nombre}
                    <small className="ad-sub">{f.email}</small>
                  </td>
                  <td>{f.titulo}</td>
                  <td>
                    <Etiqueta estado={f.estado} />
                    {f.nota ? <small className="ad-sub">{f.nota}</small> : null}
                  </td>
                  <td className="num">{f.verificado ? fechaCorta(f.verificado) : "—"}</td>
                  <td>
                    {f.estado === "activo" ? (
                      <form action={rechazarAbogado}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="motivo" value="Tu cuenta fue desactivada. Escríbenos si crees que es un error." />
                        <BotonEnviar className="btn btn-secundario btn-chico" enviando="…">Desactivar</BotonEnviar>
                      </form>
                    ) : (
                      <form action={aprobarAbogado} className="ad-aprobar">
                        <input type="hidden" name="id" value={f.id} />
                        <label className="opcion">
                          <input type="checkbox" name="comprobado" />
                          <span>Comprobado</span>
                        </label>
                        <BotonEnviar className="btn btn-primario btn-chico" enviando="…">Reactivar</BotonEnviar>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
