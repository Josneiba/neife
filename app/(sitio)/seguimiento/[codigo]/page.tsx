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
import { huecosLibres, reservaVigente } from "@/lib/agenda-publica";
import { textoTiempo, tiempoRespuestaHoras, yaTieneResena } from "@/lib/resenas";
import { enviarResena, reservarMiHora } from "@/lib/acciones/avisos";
import { nombreDiaLargo } from "@/lib/crm/fechas";

const diaCorto = (fecha: string) =>
  new Intl.DateTimeFormat("es-CL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${fecha}T12:00:00Z`))
    .replace(".", "");

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
  const perfil = s.asesorId ? await obtenerPerfil(s.asesorId) : null;
  const informe = ["entregada", "derivada", "cerrada"].includes(s.estado) ? await obtenerInformePorSolicitud(s.id) : null;
  const hayInforme = Boolean(informe?.entregado);
  const pendientes = ["aceptada", "informe"].includes(s.estado)
    ? (await listarPendientes(s.id)).filter((p) => !p.hecho)
    : [];
  const asesor = perfil?.nombre ?? (s.asesorId ? "El asesor" : "Un asesor de neife");
  const puedeReservar = Boolean(s.asesorId) && ["aceptada", "informe", "entregada"].includes(s.estado);
  const [huecos, reserva, horasRespuesta, resenado] = await Promise.all([
    puedeReservar && s.asesorId ? huecosLibres(s.asesorId) : Promise.resolve([]),
    puedeReservar && s.asesorId ? reservaVigente(s.asesorId, s.id) : Promise.resolve(null),
    s.estado === "nueva" ? tiempoRespuestaHoras() : Promise.resolve(null),
    ["entregada", "derivada", "cerrada"].includes(s.estado) && s.asesorId ? yaTieneResena(s.id) : Promise.resolve(true),
  ]);
  const puedeResenar = Boolean(s.asesorId) &&
    ["entregada", "derivada", "cerrada"].includes(s.estado) &&
    !resenado;

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
        {s.estado === "nueva" && (
          <p>
            {s.asesorId
              ? `${asesor} aún no la revisa. Te escribirá al correo o teléfono que dejaste.`
              : `Tu solicitud ya está a la vista de todos los asesores de Neife. El primero que la tome te escribirá al correo o teléfono que dejaste.${horasRespuesta !== null ? ` Los casos se están tomando en unas ${textoTiempo(horasRespuesta)}.` : ""}`}
          </p>
        )}
        {s.asesorId && s.estado !== "nueva" && s.estado !== "rechazada" ? (
          <p>
            <a href={`/api/seguimiento/${encodeURIComponent(s.codigo)}/avance`} className="btn btn-secundario btn-chico">
              Descargar el avance de mi caso (PDF)
            </a>
          </p>
        ) : null}

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

        {puedeReservar ? (
          <section className="seg-tarjeta" aria-labelledby="t-hora">
            <h2 id="t-hora">Reserva una hora con {asesor}</h2>
            {sp.hora === "ok" ? <p className="aviso aviso-ok" role="status">Tu hora quedó reservada. Te enviamos la confirmación por correo.</p> : null}
            {sp.hora === "ocupada" ? <p className="aviso aviso-error" role="alert">Esa hora ya no está libre. Elige otra.</p> : null}
            {sp.hora === "limite" ? <p className="aviso aviso-error" role="alert">Hiciste muchas reservas hoy. Escríbele a tu asesor.</p> : null}
            {sp.hora === "ya" ? <p className="aviso aviso-info" role="status">Ya tienes una hora reservada. Si necesitas cambiarla, avísale a tu asesor.</p> : null}
            {reserva ? (
              <p className="seg-reservada">
                <span>Tu próxima hora</span>
                <strong>{nombreDiaLargo(reserva.fecha)} · {reserva.hora}</strong>
                <small>Para cambiarla, avísale a tu asesor.</small>
              </p>
            ) : huecos.length === 0 ? (
              <p className="seg-nota">{asesor} no tiene horas abiertas por ahora. Te contactará con los datos que dejaste.</p>
            ) : (
              <form action={reservarMiHora} className="reserva">
                <input type="hidden" name="codigo" value={s.codigo} />
                <div className="reserva-dias">
                  {huecos.slice(0, 5).map((dia) => (
                    <fieldset key={dia.fecha} className="reserva-dia">
                      <legend>{diaCorto(dia.fecha)}</legend>
                      {dia.horas.map((hora) => (
                        <label key={hora} className="reserva-hora">
                          <input type="radio" name="hora" value={`${dia.fecha}|${hora}`} required />
                          <span>{hora}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <button type="submit" className="btn btn-primario">Reservar hora elegida</button>
              </form>
            )}
          </section>
        ) : null}

        {sp.resena === "ok" ? <p className="aviso aviso-ok" role="status">Gracias por tu reseña. Ayuda a otras personas a elegir.</p> : null}
        {sp.resena === "ya" ? <p className="aviso aviso-info" role="status">Ya recibimos una reseña para este caso o alcanzaste el límite de intentos.</p> : null}
        {puedeResenar ? (
          <section className="seg-tarjeta" aria-labelledby="t-resena">
            <h2 id="t-resena">¿Cómo te fue con {asesor}?</h2>
            <form action={enviarResena} className="resena">
              <input type="hidden" name="codigo" value={s.codigo} />
              <div className="resena-estrellas" role="radiogroup" aria-label="Tu evaluación">
                {[5, 4, 3, 2, 1].map((estrellas) => (
                  <label key={estrellas} title={`${estrellas} de 5`}>
                    <input type="radio" name="estrellas" value={estrellas} required />
                    <span aria-hidden="true">★</span>
                    <span className="solo-lector">{estrellas} de 5</span>
                  </label>
                ))}
              </div>
              <textarea
                id="comentario"
                name="comentario"
                className="entrada"
                maxLength={400}
                rows={2}
                placeholder="Comentario opcional. No escribas nombres ni datos de contacto."
                aria-label="Comentario opcional"
              />
              <button type="submit" className="btn btn-secundario">Enviar reseña</button>
            </form>
          </section>
        ) : null}

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
