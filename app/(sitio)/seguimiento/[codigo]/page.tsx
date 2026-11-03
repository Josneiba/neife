import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pasos } from "@/components/Avance";
import { BotonCopiar } from "@/components/BotonCopiar";
import { Icono } from "@/components/Iconos";
import { listarPendientes, obtenerInformePorSolicitud, obtenerPerfil, obtenerSolicitudPorCodigo } from "@/lib/datos";
import { avance, TOTAL_ETAPAS } from "@/lib/etapas";
import { fechaLarga, folio, pesos } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";
import { borrarMisDatos, cambiarConservacion } from "@/lib/acciones/solicitudes";
import { DIAS_DE_GRACIA } from "@/lib/privacidad";

export const metadata: Metadata = {
  title: "Seguimiento de tu solicitud",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Seguimiento({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { codigo } = await params;
  const sp = await searchParams;
  const s = await obtenerSolicitudPorCodigo(codigo);
  if (!s) notFound();

  if (s.anonimizada) {
    return (
      <div className="contenedor pagina-estrecha">
        <h1>Solicitud {folio(s.codigo)}</h1>
        <div className="aviso aviso-ok" style={{ marginTop: 20 }}>
          Esta asesoría terminó y, como pediste, <strong>tus datos personales fueron eliminados</strong>. Ya no hay nada tuyo guardado en este caso.
        </div>
        <p className="ayuda" style={{ marginTop: 16 }}>Si necesitas ayuda de nuevo, puedes <a href="/asesoria/solicitar">contar un caso nuevo</a>.</p>
      </div>
    );
  }
  const perfil = await obtenerPerfil(s.asesorId);
  const informe = ["entregada", "derivada", "cerrada"].includes(s.estado) ? await obtenerInformePorSolicitud(s.id) : null;
  const hayInforme = Boolean(informe?.entregado);
  const pendientes = ["aceptada", "informe"].includes(s.estado)
    ? (await listarPendientes(s.id)).filter((p) => !p.hecho)
    : [];
  const asesor = perfil?.nombre ?? "El asesor";

  return (
    <div className="contenedor pagina-estrecha">
      {sp.nueva ? (
        <div className="aviso aviso-ok" role="status" style={{ marginBottom: 24 }}>
          <strong>Solicitud enviada.</strong> Guarda tu código único y el enlace privado de seguimiento.
          <div className="botones" style={{ marginTop: 10 }}>
            <BotonCopiar texto="Copiar código" valor={s.codigoSeguimiento} />
            <BotonCopiar />
          </div>
          <p className="ayuda" style={{ marginTop: 10 }}>Conserva también el enlace privado de esta página para consultar el avance.</p>
        </div>
      ) : null}

      <h1>Solicitud {folio(s.codigo)}</h1>
      <p className="ayuda" style={{ marginTop: 8, overflowWrap: "anywhere" }}>
        Código de seguimiento: <strong>{s.codigoSeguimiento}</strong>
      </p>
      <p className="ayuda" style={{ marginTop: 8 }}>
        {nombreMateria(s.materia)} · enviada el {fechaLarga(s.creadoEn)}
        {s.estado !== "rechazada" ? ` · avance ${avance(s.estado)} de ${TOTAL_ETAPAS}` : ""}
      </p>

      <div style={{ margin: "28px 0 8px" }}>
        <Pasos estado={s.estado} />
      </div>

      <div style={{ marginTop: 28, display: "grid", gap: 16 }}>
        {s.estado === "nueva" && <p>{asesor} aún no la revisa. Te escribirá al correo o teléfono que dejaste.</p>}

        {(s.estado === "aceptada" || s.estado === "informe") && (
          <>
            <p>
              {asesor} aceptó tu solicitud y te contactará {s.estado === "informe" ? "cuando el informe esté listo" : "con los datos que dejaste"}.
            </p>
            {pendientes.length > 0 ? (
              <div>
                <h2 style={{ fontSize: "1.0625rem", marginBottom: 8 }}>Lo que necesita de ti</h2>
                <ul className="lista-simple">
                  {pendientes.map((p) => (
                    <li key={p.id}>
                      <Icono nombre="circulo" tam={12} /> {p.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {perfil && perfil.precioInforme > 0 ? (
              <p>
                <strong>Informe: {pesos(perfil.precioInforme)}.</strong>{" "}
                <span style={{ whiteSpace: "pre-line" }}>{perfil.instruccionesPago || "El asesor te indicará cómo pagar."}</span>
              </p>
            ) : null}
          </>
        )}

        {(s.estado === "entregada" || s.estado === "derivada" || s.estado === "cerrada") && hayInforme && (
          <div className="botones">
            <a className="btn btn-primario" href={`/api/seguimiento/${s.codigo}/pdf`}>
              <Icono nombre="descargar" tam={17} /> Descargar informe (PDF)
            </a>
          </div>
        )}
        {s.estado === "entregada" && (
          <p>Si quieres que un abogado lleve tu caso, díselo a {asesor}: necesita tu autorización para compartir tu informe.</p>
        )}
        {s.estado === "derivada" && <p>Tu caso fue derivado a un abogado. Él o ella se pondrá en contacto contigo.</p>}
        {s.estado === "cerrada" && <p>Este caso está cerrado.</p>}

        {s.estado === "rechazada" && (
          <div className="aviso aviso-error">
            <strong>El asesor no pudo tomar tu solicitud.</strong>
            {s.motivoRechazo ? <p style={{ marginTop: 6 }}>{s.motivoRechazo}</p> : null}
            <p style={{ marginTop: 6 }}>Puedes pedir a otro asesor o acudir a la Corporación de Asistencia Judicial de tu región.</p>
          </div>
        )}
      </div>

      <section className="datos-persona" aria-labelledby="t-mis-datos">
        <h2 id="t-mis-datos">Tus datos</h2>
        {sp.guardado ? <p className="aviso aviso-ok" role="status">Listo, guardamos tu preferencia.</p> : null}
        <p className="ayuda">
          Al terminar la asesoría, tus datos se borran {s.conservarDatos ? "solo si desmarcas esta opción" : "automáticamente"}
          {` (${DIAS_DE_GRACIA} días después, para que alcances a descargar tu informe).`}
        </p>
        <form action={cambiarConservacion} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="codigo" value={s.codigo} />
          <label className="opcion">
            <input type="checkbox" name="conservar" defaultChecked={s.conservarDatos} />
            <span>Guardar mis datos para ayudarme de nuevo en el futuro</span>
          </label>
          <div className="botones"><button className="btn btn-secundario btn-chico" type="submit">Guardar preferencia</button></div>
        </form>
      </section>

      <details className="borrar-datos" open={Boolean(sp.borrar)} style={{ marginTop: 20 }}>
        <summary>Borrar mis datos</summary>
        <form action={borrarMisDatos} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <input type="hidden" name="codigo" value={s.codigo} />
          <p className="ayuda">
            Se elimina tu solicitud, tu informe y todo el historial. No se puede deshacer, y {asesor} ya no podrá verlos.
          </p>
          {sp.borrar === "confirma" ? <p className="error-campo" role="alert">Marca la casilla para confirmar.</p> : null}
          {sp.borrar === "limite" ? <p className="error-campo" role="alert">Muchos intentos seguidos. Prueba más tarde.</p> : null}
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="confirmo" /> Entiendo que se borra todo
          </label>
          <div className="botones">
            <button className="btn btn-secundario btn-chico" type="submit">Borrar definitivamente</button>
          </div>
        </form>
      </details>

      <p className="ayuda" style={{ marginTop: 24 }}>
        Orientación general. No reemplaza a un abogado ni constituye patrocinio.
      </p>
    </div>
  );
}
