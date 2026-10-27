import type { Metadata } from "next";
import Link from "next/link";
import { AvanceMini } from "@/components/Avance";
import { requerirCliente } from "@/lib/guards";
import { Pasos } from "@/components/Avance";
import { Icono } from "@/components/Iconos";
import { listarPendientes, listarSolicitudesCliente, obtenerInformePorSolicitud, obtenerPerfil } from "@/lib/datos";
import { fechaCorta, folio } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

function textoSiguiente(estado: string, asesor: string, pend: number, confirmado: boolean): string {
  switch (estado) {
    case "nueva": return `${asesor} aún no revisa tu solicitud.`;
    case "aceptada": return pend ? `${asesor} necesita ${pend} dato${pend === 1 ? "" : "s"} de ti.` : `${asesor} está preparando tu informe.`;
    case "informe": return `${asesor} está terminando tu informe.`;
    case "entregada": return "Tu informe está listo. Si quieres un abogado, díselo al asesor.";
    case "derivada": return confirmado ? "Tu abogado confirmó que toma el caso." : "Esperando que el abogado confirme.";
    case "cerrada": return "Caso cerrado.";
    case "rechazada": return "El asesor no pudo tomar tu solicitud.";
    default: return "";
  }
}

export default async function Cuenta() {
  const u = await requerirCliente();
  const solicitudes = await listarSolicitudesCliente(u.id);
  const detalle = await Promise.all(
    solicitudes.map(async (s) => {
      const perfil = await obtenerPerfil(s.asesorId);
      const informe = ["entregada", "derivada", "cerrada"].includes(s.estado) && !s.anonimizada ? await obtenerInformePorSolicitud(s.id) : null;
      const pendientes = ["aceptada", "informe"].includes(s.estado) && !s.anonimizada ? (await listarPendientes(s.id)).filter((p) => !p.hecho) : [];
      return { s, pendientes, hayInforme: Boolean(informe?.entregado), asesor: perfil?.nombre ?? "El asesor" };
    }),
  );

  return (
    <div className="contenedor pagina-ancha" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: "clamp(1.75rem, 3.6vw, 2.25rem)" }}>Hola, {u.nombre.split(" ")[0]}</h1>
      <p style={{ marginTop: 8, color: "var(--suave)" }}>Tus casos y su avance.</p>

      <div className="botones" style={{ marginTop: 24 }}>
        <Link href="/asesoria" className="btn btn-primario">
          Contar un caso
        </Link>
      </div>

      <h2 style={{ fontSize: "1.25rem", marginTop: 28, marginBottom: 8 }}>Mis casos</h2>
      {solicitudes.length === 0 ? (
        <p className="vacio">Aún no hay casos en esta cuenta. Los que pidas con esta sesión iniciada aparecerán aquí.</p>
      ) : (
        <ul className="cuenta-casos">
          {detalle.map(({ s, pendientes, hayInforme, asesor }) => (
            <li key={s.id}>
              <div className="cc-cab">
                <Link href={`/seguimiento/${s.codigo}`} className="folio">{folio(s.codigo)}</Link>
                <span>{nombreMateria(s.materia)} · {fechaCorta(s.creadoEn)}</span>
                <AvanceMini estado={s.estado} />
              </div>
              <Pasos estado={s.estado} />
              <div className="cc-acciones">
                {s.anonimizada ? (
                  <span className="ayuda">Datos eliminados al terminar la asesoría.</span>
                ) : (
                  <>
                    <span className="cc-texto">{textoSiguiente(s.estado, asesor, pendientes.length, s.abogadoConfirmado)}</span>
                    {hayInforme ? (
                      <a className="btn btn-primario btn-chico" href={`/api/seguimiento/${s.codigo}/pdf`}>
                        <Icono nombre="descargar" tam={15} /> Informe PDF
                      </a>
                    ) : null}
                    <Link className="btn btn-secundario btn-chico" href={`/seguimiento/${s.codigo}`}>Ver detalle</Link>
                  </>
                )}
              </div>
              {pendientes.length > 0 ? (
                <ul className="lista-simple cc-pend">
                  {pendientes.map((p) => (
                    <li key={p.id}><Icono nombre="circulo" tam={12} /> {p.texto}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="ayuda" style={{ marginTop: 28 }}>
        Los avances también te llegan al correo que dejaste. Al terminar la asesoría borramos tus datos, salvo que pidas guardarlos
        desde el detalle de cada caso. <Link href="/privacidad">Privacidad</Link>.
      </p>
    </div>
  );
}
