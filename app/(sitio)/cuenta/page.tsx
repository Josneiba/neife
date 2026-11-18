import type { Metadata } from "next";
import Link from "next/link";
import { AvanceMini } from "@/components/Avance";
import { requerirCliente } from "@/lib/guards";
import { Icono } from "@/components/Iconos";
import { listarPendientes, listarSolicitudesCliente, obtenerInformePorSolicitud, obtenerPerfil } from "@/lib/datos";
import { fechaCorta } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";
import { mensajeDeEstado } from "@/lib/seguir";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Cuenta() {
  const u = await requerirCliente();
  const solicitudes = await listarSolicitudesCliente(u.id);
  const detalle = await Promise.all(
    solicitudes.map(async (s) => {
      const perfil = s.asesorId ? await obtenerPerfil(s.asesorId) : null;
      const informe = ["entregada", "derivada", "cerrada"].includes(s.estado) && !s.anonimizada ? await obtenerInformePorSolicitud(s.id) : null;
      const pendientes = ["aceptada", "informe"].includes(s.estado) && !s.anonimizada ? (await listarPendientes(s.id)).filter((p) => !p.hecho) : [];
      const resumen = mensajeDeEstado({
        estado: s.estado,
        conAsesor: s.asesorId !== null,
        confirmado: s.abogadoConfirmado,
        creadoEn: s.creadoEn,
        ultimaActividad: s.actualizadoEn,
        anonimizada: s.anonimizada,
      });
      return { s, pendientes: pendientes.length, hayInforme: Boolean(informe?.entregado), perfil, resumen };
    }),
  );

  return (
    <div className="contenedor cu">
      <header className="cu-cab">
        <div>
          <h1>Hola, {u.nombre.split(" ")[0]}</h1>
          <p>Tus casos y en qué etapa va cada uno.</p>
        </div>
        <Link href="/asesoria/solicitar" className="btn btn-primario">Contar un caso</Link>
      </header>

      {solicitudes.length === 0 ? (
        <p className="vacio">
          Aún no hay casos en esta cuenta. Si pediste ayuda antes con este mismo correo, aparecerán aquí al confirmarlo. ¿Tienes un
          código? <Link href="/seguir">Seguir mi caso</Link>.
        </p>
      ) : (
        <ul className="cu-casos">
          {detalle.map(({ s, pendientes, hayInforme, perfil, resumen }) => (
            <li key={s.id} className="cu-caso" data-tono={resumen.tono}>
              <div className="cu-fila">
                <Link href={`/seguimiento/${s.codigo}`} className="cu-codigo">{s.codigoSeguimiento}</Link>
                <span className="cu-fecha">{nombreMateria(s.materia)} · {fechaCorta(s.creadoEn)}</span>
              </div>
              <p className="cu-estado">
                <strong>{resumen.titulo}</strong>
                {!s.anonimizada && pendientes > 0 ? <span> · te pide {pendientes} dato{pendientes === 1 ? "" : "s"}</span> : null}
              </p>
              <AvanceMini estado={s.estado} />
              <div className="cu-pie">
                <span className="cu-asesor">
                  {perfil ? (
                    <>
                      {perfil.nombre}
                      {perfil.verificadoEn ? <small title="Título verificado por Neife"> ✓ verificado</small> : null}
                    </>
                  ) : s.anonimizada ? "Datos eliminados" : "Esperando asesor"}
                </span>
                {s.anonimizada ? null : (
                  <span className="cu-botones">
                    {hayInforme ? (
                      <a className="btn btn-secundario btn-chico" href={`/api/seguimiento/${s.codigo}/pdf`}>
                        <Icono nombre="descargar" tam={15} /> Informe
                      </a>
                    ) : null}
                    <Link className="btn btn-primario btn-chico" href={`/seguimiento/${s.codigo}`}>Ver caso</Link>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="ayuda cu-pie-pagina">
        Los avances también llegan al correo. Al terminar la asesoría borramos tus datos, salvo que pidas guardarlos.{" "}
        <a href="/api/mis-datos">Descargar mis datos</a> · <Link href="/privacidad">Privacidad</Link>
      </p>
    </div>
  );
}
