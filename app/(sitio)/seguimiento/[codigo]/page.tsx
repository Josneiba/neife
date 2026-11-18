import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pasos } from "@/components/Avance";
import { cobrosDeSolicitud, datosParaPagar } from "@/lib/pagos-datos";
import { ETIQUETA_COBRO, TIPOS_CUENTA } from "@/lib/pagos";
import { informarTransferencia } from "@/lib/acciones/pagos";
import { BotonCopiar } from "@/components/BotonCopiar";
import { Icono } from "@/components/Iconos";
import { listarPendientes, obtenerInformePorSolicitud, obtenerPerfil, obtenerSolicitudPorCodigo } from "@/lib/datos";
import { avance, TOTAL_ETAPAS } from "@/lib/etapas";
import Link from "next/link";
import { fechaLarga, iniciales, pesos } from "@/lib/formato";
import { Verificacion } from "@/components/Verificacion";
import { guiaDe } from "@/lib/guias";
import { mensajeDeEstado } from "@/lib/seguir";
import { URL_VERIFICAR_TITULO } from "@/lib/verificacion-titulo";
import { nombreMateria } from "@/lib/materias";
import { borrarMisDatos, cambiarConservacion } from "@/lib/acciones/solicitudes";
import { DIAS_DE_GRACIA } from "@/lib/privacidad";
import { aceptarMandato } from "@/lib/acciones/mandato";
import { plazoDe } from "@/lib/plazos";
import SelectorHora from "@/components/SelectorHora";
import { huecosLibres, reservaVigente } from "@/lib/agenda-publica";
import { textoTiempo, tiempoRespuestaHoras, yaTieneResena } from "@/lib/resenas";
import { enviarResena, reservarMiHora } from "@/lib/acciones/avisos";
import { hoyLocal, nombreDiaLargo } from "@/lib/crm/fechas";
import { listarMensajes, marcarLeidos } from "@/lib/mensajes-datos";
import { HiloMensajes } from "@/components/HiloMensajes";
import { enviarMensajePersona } from "@/lib/acciones/mensajes";

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
        <h1>Solicitud {s.codigoSeguimiento}</h1>
        <div className="aviso aviso-ok" style={{ marginTop: 20 }}>
          Esta asesoría terminó y, como pediste, <strong>tus datos personales fueron eliminados</strong>. Ya no hay nada tuyo guardado en este caso.
        </div>
        <p className="ayuda" style={{ marginTop: 16 }}>Si necesitas ayuda de nuevo, puedes <a href="/asesoria/solicitar">contar un caso nuevo</a>.</p>
      </div>
    );
  }
  const puedeEscribirMensaje = Boolean(s.asesorId) && ["nueva", "aceptada", "informe", "entregada", "derivada"].includes(s.estado);
  if (puedeEscribirMensaje) await marcarLeidos(s.id, "persona");
  const mensajes = puedeEscribirMensaje ? await listarMensajes(s.id) : [];
  const perfil = s.asesorId ? await obtenerPerfil(s.asesorId) : null;
  const informe = ["entregada", "derivada", "cerrada"].includes(s.estado) ? await obtenerInformePorSolicitud(s.id) : null;
  const hayInforme = Boolean(informe?.entregado);
  const pendientes = ["aceptada", "informe"].includes(s.estado)
    ? (await listarPendientes(s.id)).filter((p) => !p.hecho)
    : [];
  const asesor = perfil?.nombre ?? (s.asesorId ? "El asesor" : "Un asesor de neife");
  const cobros = s.asesorId && !s.anonimizada ? (await cobrosDeSolicitud(s.id)).filter((c) => c.estado !== "anulado") : [];
  const porPagar = cobros.filter((c) => c.estado === "pendiente" || c.estado === "comprobante");
  const cuentaPago = s.asesorId && porPagar.length ? await datosParaPagar(s.id, s.asesorId, s.clienteId) : null;
  const hoyISO = hoyLocal();
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

  const resumen = mensajeDeEstado({
    estado: s.estado,
    conAsesor: s.asesorId !== null,
    confirmado: s.abogadoConfirmado,
    creadoEn: s.creadoEn,
    ultimaActividad: s.actualizadoEn,
    anonimizada: false,
  });
  const guia = guiaDe(s.materia);
  const sinInforme = !(["entregada", "derivada", "cerrada"].includes(s.estado) && hayInforme);

  const documentos = (sufijo: string) =>
    guia && s.asesorId && ["aceptada", "informe", "entregada"].includes(s.estado) ? (
      <section className="seg-tarjeta" aria-labelledby={`t-docs-${sufijo}`}>
        <h2 id={`t-docs-${sufijo}`}>Documentos que conviene reunir</h2>
        <ul className="lista-simple">
          {guia.documentos.map((d) => (
            <li key={d}>
              <Icono nombre="circulo" tam={12} /> {d}
            </li>
          ))}
        </ul>
        <p className="seg-nota">Si no tienes alguno, no pasa nada: cuéntaselo a tu asesor.</p>
      </section>
    ) : null;

  return (
    <div className="contenedor seg">
      {sp.nueva ? (
        <div className="aviso aviso-ok seg-nueva" role="status">
          <div>
            <strong>Solicitud enviada.</strong> Tu código es <b className="seg-codigo-inline">{s.codigoSeguimiento}</b>. Guárdalo: con él y tu
            correo puedes volver desde <Link href="/seguir">Seguir mi caso</Link>, sin cuenta.
          </div>
          <div className="botones">
            <BotonCopiar texto="Copiar código" valor={s.codigoSeguimiento} />
            <BotonCopiar texto="Copiar enlace privado" />
          </div>
        </div>
      ) : null}

      <header className="seg-cab">
        <div>
          <p className="sg-etiqueta">Tu caso</p>
          <h1>{nombreMateria(s.materia)}</h1>
          <p className="seg-meta">
            Enviado el {fechaLarga(s.creadoEn)}
            {s.estado !== "rechazada" ? ` · avance ${avance(s.estado)} de ${TOTAL_ETAPAS}` : ""}
          </p>
        </div>
        <div className="seg-codigo">
          <span>Código de seguimiento</span>
          <strong>{s.codigoSeguimiento}</strong>
          <BotonCopiar texto="Copiar" valor={s.codigoSeguimiento} />
        </div>
      </header>

      <div className="seg-pasos">
        <Pasos estado={s.estado} />
      </div>

      <div className="seg-grid">
        <div className="sg-estado seg-a-estado" data-tono={resumen.tono} role="status">
          <h2>{resumen.titulo}</h2>
          {resumen.mensaje ? <p>{resumen.mensaje}</p> : null}
          {resumen.sugerencia ? <p className="sg-sugerencia">{resumen.sugerencia}</p> : null}
        </div>

        <div className="seg-lado">
          <aside className="seg-a-prof" aria-label="Quién lleva tu caso">
            {perfil ? (
              <section className="seg-prof">
                <h2>Tu asesor</h2>
                <div className="seg-prof-fila">
                  <span className="seg-avatar" aria-hidden="true">{iniciales(perfil.nombre)}</span>
                  <div>
                    <strong>{perfil.nombre}</strong>
                    <p>{perfil.titulo}</p>
                  </div>
                </div>
                <Verificacion titulo={perfil.titulo} verificadoEn={perfil.verificadoEn} codigo={perfil.codigoPublico} />
                {perfil.ubicacion ? <p className="seg-nota">{perfil.ubicacion}</p> : null}
              </section>
            ) : (
              <section className="seg-prof">
                <h2>Mientras esperas</h2>
                <p className="seg-nota">
                  {s.asesorId ? "Tu asesor aún no completa su perfil." : "Un asesor verificado de Neife tomará tu caso."}
                  {guia ? " Esto puede ayudarte a ir preparándote:" : ""}
                </p>
                {guia ? <Link className="btn btn-secundario btn-chico" href={`/guia/${s.materia}`}>Guía de {nombreMateria(s.materia)}</Link> : null}
              </section>
            )}
            {s.estado === "derivada" && s.abogadoDestino ? (
              <section className="seg-prof">
                <h2>Abogado al que se derivó</h2>
                <strong>{s.abogadoDestino}</strong>
                <p className="seg-nota">
                  {s.abogadoConfirmado ? "Confirmó que lleva tu caso." : "Aún no confirma que toma tu caso."} Antes de contratarlo, pídele el
                  código de su certificado de título y compruébalo en el{" "}
                  <a href={URL_VERIFICAR_TITULO} target="_blank" rel="noopener noreferrer">Poder Judicial ↗</a>.
                </p>
              </section>
            ) : null}
          </aside>

          <div className="seg-solo-ancho">{documentos("b")}</div>

          <details className="seg-a-mas seg-mas" open={Boolean(sp.borrar || sp.guardado)}>
            <summary>Mis datos y privacidad</summary>
            {sp.guardado ? <p className="aviso aviso-ok" role="status">Listo, guardamos tu preferencia.</p> : null}
            <p className="ayuda">
              Al terminar la asesoría, tus datos se borran {s.conservarDatos ? "solo si desmarcas esta opción" : "automáticamente"}
              {` (${DIAS_DE_GRACIA} días después, para que alcances a descargar tu informe).`}
            </p>
            <form action={cambiarConservacion} className="seg-mas-form">
              <input type="hidden" name="codigo" value={s.codigo} />
              <label className="opcion">
                <input type="checkbox" name="conservar" defaultChecked={s.conservarDatos} />
                <span>Guardar mis datos para ayudarme de nuevo</span>
              </label>
              <button className="btn btn-secundario btn-chico" type="submit">Guardar preferencia</button>
            </form>
            <form action={borrarMisDatos} className="seg-mas-form seg-borrar">
              <input type="hidden" name="codigo" value={s.codigo} />
              <p className="ayuda">Borrar elimina tu solicitud, tu informe y el historial. No se puede deshacer.</p>
              {sp.borrar === "confirma" ? <p className="error-campo" role="alert">Marca la casilla para confirmar.</p> : null}
              {sp.borrar === "limite" ? <p className="error-campo" role="alert">Muchos intentos seguidos. Prueba más tarde.</p> : null}
              <label className="opcion">
                <input type="checkbox" name="confirmo" />
                <span>Entiendo que se borra todo</span>
              </label>
              <button className="btn btn-secundario btn-chico" type="submit">Borrar definitivamente</button>
            </form>
          </details>
        </div>

        <div className="seg-a-principal">
          {puedeEscribirMensaje ? (
            <HiloMensajes
              mensajes={mensajes}
              yo="persona"
              otro={asesor}
              accion={enviarMensajePersona}
              ocultos={{ codigo: s.codigo }}
              estado={typeof sp.msg === "string" ? sp.msg : undefined}
            />
          ) : null}
          {(() => {
            const pl = ["nueva", "aceptada", "informe", "entregada", "derivada"].includes(s.estado) ? plazoDe(s.materia, s.fechaHecho, hoyISO) : null;
            return pl ? (
              <section className="seg-plazo" data-tono={pl.tono} aria-labelledby="t-plazo">
                <h2 id="t-plazo">{pl.titulo}: {pl.texto.toLowerCase()}</h2>
                <p>Conviene actuar antes del <b>{pl.limite.split("-").reverse().join("-")}</b>. {pl.base} No cuenta feriados.</p>
                {s.asesorId ? <p className="seg-nota">Si aún no lo hiciste, avísale a tu asesor hoy.</p> : null}
              </section>
            ) : null;
          })()}
          {sp.mandato === "aceptado" ? <p className="aviso aviso-ok" role="status">Listo, aceptaste el mandato. Tu asesor ya lo ve.</p> : null}
          {sp.mandato === "marca" ? <p className="aviso aviso-error" role="alert">Marca la casilla para aceptar.</p> : null}
          {sp.mandato === "limite" ? <p className="aviso aviso-error" role="alert">Muchos intentos seguidos. Prueba más tarde.</p> : null}
          {sp.mandato === "error" ? <p className="aviso aviso-error" role="alert">No pudimos registrar la aceptación en el CRM. No se aceptó el mandato; vuelve a intentarlo o contacta a tu asesor.</p> : null}
          {s.mandatoPropuesto && s.asesorId ? (
            <section className="seg-tarjeta seg-mandato" aria-labelledby="t-mandato">
              <h2 id="t-mandato">{s.mandatoEn ? "Mandato aceptado" : `${asesor} te propone un mandato`}</h2>
              <details className="consent-mas seg-mandato-det">
                <summary>Leer el mandato completo</summary>
                <p className="seg-mandato-texto">{s.mandatoPropuesto}</p>
              </details>
              {s.mandatoEn ? (
                <p className="seg-nota">Lo aceptaste el {fechaLarga(s.mandatoEn)}.</p>
              ) : (
                <form action={aceptarMandato} className="seg-mandato-form">
                  <input type="hidden" name="codigo" value={s.codigo} />
                  <label className="opcion">
                    <input type="checkbox" name="acepto" />
                    <span>Leí el mandato y acepto que {asesor} me represente.</span>
                  </label>
                  <button type="submit" className="btn btn-primario">Acepto el mandato</button>
                  <p className="ayuda">Si algo no te calza, escríbele a tu asesor antes de aceptar.</p>
                </form>
              )}
            </section>
          ) : null}
          {cobros.length > 0 ? (
            <section className="seg-tarjeta seg-pagos" id="t-pagos" aria-labelledby="t-pagos-h">
              <h2 id="t-pagos-h">Pagos</h2>
              {sp.pago === "ok" ? <p className="aviso aviso-ok" role="status">Listo, avisamos a {asesor}. Él o ella confirmará el pago.</p> : null}
              {sp.pago === "fecha" ? <p className="aviso aviso-error" role="alert">Revisa la fecha: no puede ser futura ni de hace más de 90 días.</p> : null}
              {sp.pago === "operacion" ? <p className="aviso aviso-error" role="alert">Escribe el número de operación del comprobante (4 a 40 letras o números).</p> : null}
              {sp.pago === "limite" ? <p className="aviso aviso-error" role="alert">Muchos intentos seguidos. Prueba más tarde.</p> : null}
              <ul className="seg-cobros">
                {cobros.map((c) => (
                  <li key={c.id} className="seg-cobro" data-estado={c.estado}>
                    <div className="seg-cobro-top">
                      <strong>{c.concepto}</strong>
                      <span className="seg-cobro-monto">{pesos(c.monto)}</span>
                    </div>
                    <p className="seg-cobro-estado">{ETIQUETA_COBRO[c.estado]}{c.estado === "comprobante" ? ` · operación ${c.operacion}` : ""}</p>
                    {c.estado === "pendiente" ? (
                      <details className="consent-mas seg-cobro-det">
                        <summary>Ya transferí</summary>
                        <form action={informarTransferencia} className="seg-cobro-form">
                          <input type="hidden" name="codigo" value={s.codigo} />
                          <input type="hidden" name="cobro" value={c.id} />
                          <label className="pf-campo"><span>Fecha de la transferencia</span><input type="date" name="fecha" required max={hoyISO} defaultValue={hoyISO} /></label>
                          <label className="pf-campo"><span>N.º de operación del comprobante</span><input name="operacion" required maxLength={40} autoComplete="off" /></label>
                          <button type="submit" className="btn btn-primario btn-chico">Avisar que transferí</button>
                        </form>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
              {cuentaPago ? (
                <div className="seg-cuenta">
                  <h3>Datos para transferir</h3>
                  <dl>
                    <div><dt>Banco</dt><dd>{cuentaPago.banco}</dd></div>
                    <div><dt>Tipo</dt><dd>{TIPOS_CUENTA.find(([k]) => k === cuentaPago.tipo)?.[1] ?? cuentaPago.tipo}</dd></div>
                    <div><dt>N.º de cuenta</dt><dd><b>{cuentaPago.numero}</b> <BotonCopiar texto="Copiar" valor={cuentaPago.numero} /></dd></div>
                    <div><dt>RUT</dt><dd><b>{cuentaPago.rut}</b> <BotonCopiar texto="Copiar" valor={cuentaPago.rut} /></dd></div>
                    <div><dt>Titular</dt><dd>{cuentaPago.titular}</dd></div>
                    {cuentaPago.correo ? <div><dt>Correo</dt><dd>{cuentaPago.correo}</dd></div> : null}
                  </dl>
                  <p className="seg-nota">Antes de transferir, confirma con {asesor} que estos datos son correctos. Neife nunca te pedirá pagar a otra cuenta ni te pedirá datos de tu tarjeta.</p>
                </div>
              ) : null}
              {!cuentaPago && porPagar.length ? <p className="seg-nota">Confirma los datos de transferencia directamente con tu asesor antes de pagar.</p> : null}
            </section>
          ) : null}
          {pendientes.length > 0 ? (
            <section className="seg-tarjeta" aria-labelledby="t-pend">
              <h2 id="t-pend">Lo que necesita de ti</h2>
              <ul className="lista-simple">
                {pendientes.map((p) => (
                  <li key={p.id}>
                    <Icono nombre="circulo" tam={12} /> {p.texto}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {perfil && perfil.precioInforme > 0 && ["aceptada", "informe"].includes(s.estado) ? (
            <p className="seg-nota-caja">
              <strong>Informe: {pesos(perfil.precioInforme)}.</strong>{" "}
              <span style={{ whiteSpace: "pre-line" }}>{perfil.instruccionesPago || "Tu asesor te indicará cómo pagar."}</span>
            </p>
          ) : null}
          {!sinInforme ? (
            <div className="botones">
              <a className="btn btn-primario" href={`/api/seguimiento/${s.codigo}/pdf`}>
                <Icono nombre="descargar" tam={17} /> Descargar informe (PDF)
              </a>
            </div>
          ) : null}
          {s.asesorId && s.estado !== "nueva" && s.estado !== "rechazada" ? (
            <p>
              <a href={`/api/seguimiento/${encodeURIComponent(s.codigo)}/avance`} className="btn btn-secundario btn-chico">
                Descargar el avance de mi caso (PDF)
              </a>
            </p>
          ) : null}

        <div className="seg-solo-estrecho">{documentos("a")}</div>

        {puedeReservar ? (
          <section className="seg-tarjeta" aria-labelledby="t-hora">
            <h2 id="t-hora">Reserva una hora con {asesor}</h2>
            {sp.hora === "ok" ? <p className="aviso aviso-ok" role="status">Tu hora quedó reservada. Te enviamos la confirmación por correo.</p> : null}
            {sp.hora === "ocupada" ? <p className="aviso aviso-error" role="alert">Esa hora ya no está libre. Elige otra.</p> : null}
            {sp.hora === "limite" ? <p className="aviso aviso-error" role="alert">Hiciste muchas reservas hoy. Escríbele a tu asesor.</p> : null}
            {sp.hora === "ya" ? <p className="aviso aviso-info" role="status">Ya tienes una hora reservada. Si necesitas cambiarla, avísale a tu asesor.</p> : null}
            {sp.hora === "error" ? <p className="aviso aviso-error" role="alert">No pudimos registrar la reserva. No se guardó una hora; inténtalo otra vez o contacta a tu asesor.</p> : null}
            {reserva ? (
              <p className="seg-reservada">
                <span>Tu próxima hora</span>
                <strong>{nombreDiaLargo(reserva.fecha)} · {reserva.hora}</strong>
                <small>Para cambiarla, avísale a tu asesor.</small>
                <a className="btn btn-secundario btn-chico" href={`/api/seguimiento/${encodeURIComponent(s.codigo)}/cita`}>Agregar a mi calendario</a>
              </p>
            ) : huecos.length === 0 ? (
              <p className="seg-nota">{asesor} no tiene horas abiertas por ahora. Te contactará con los datos que dejaste.</p>
            ) : (
              <form action={reservarMiHora} className="reserva">
                <input type="hidden" name="codigo" value={s.codigo} />
                <SelectorHora dias={huecos.slice(0, 7)} />
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

      </div>

      <p className="ayuda seg-pie">Orientación general. No reemplaza a un abogado ni constituye patrocinio.</p>
    </div>
  );
}
