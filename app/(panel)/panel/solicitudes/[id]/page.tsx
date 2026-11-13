import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pasos } from "@/components/Avance";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Icono } from "@/components/Iconos";
import { requerirAbogado } from "@/lib/guards";
import { urlSitio } from "@/lib/sitio";
import { LectorDocumentos } from "@/components/LectorDocumentos";
import { listarDocumentos } from "@/lib/documentos-datos";
import { MAX_DOCUMENTO_MB } from "@/lib/documentos-datos";
import {
  listarPendientes,
  listarSeguimiento,
  obtenerInformePorSolicitud,
  obtenerSolicitudAsesor,
} from "@/lib/datos";
import { auditar } from "@/lib/db";
import { estadoAbogado, faltantes, nombreEtapa, nombreResultado, RESULTADOS, siguientePaso } from "@/lib/etapas";
import { fechaHora, folio } from "@/lib/formato";
import { MATERIAS, nombreMateria, nombreOrigen, nombreUrgencia } from "@/lib/materias";
import {
  aceptarSolicitud,
  agregarNota,
  agregarPendiente,
  alternarPendiente,
  borrarPendiente,
  cerrarSolicitud,
  confirmarAbogado,
  fijarContacto,
  crearInforme,
  derivarSolicitud,
  devolverABandeja,
  rechazarSolicitud,
  registrarAutorizacion,
} from "@/lib/acciones/panel";

export const metadata: Metadata = { title: "Caso" };
export const dynamic = "force-dynamic";

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirAbogado();
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();
  const s = await obtenerSolicitudAsesor(id, u.id);
  if (!s) notFound();
  await auditar(u.id, "solicitud_vista", "solicitud", s.id);

  const [informe, pendientes, historial, documentos] = await Promise.all([
    obtenerInformePorSolicitud(s.id),
    listarPendientes(s.id),
    listarSeguimiento(s.id),
    listarDocumentos(s.id, u.id),
  ]);
  const abiertos = pendientes.filter((p) => !p.hecho);
  const ctx = {
    estado: s.estado,
    derivarOk: s.derivarOk,
    abogadoDestino: s.abogadoDestino,
    abogadoConfirmado: s.abogadoConfirmado,
    pendientesAbiertos: abiertos.length,
    informe: informe ? { estado: informe.estado, entregado: informe.entregado } : null,
  };
  const sig = siguientePaso(ctx);
  // Los antecedentes por reunir ya tienen su propia lista: aquí solo lo demás.
  const falta = faltantes(ctx, []);

  const digitos = s.telefono.replace(/\D/g, "");
  const wa = digitos.length === 9 ? `56${digitos}` : digitos.length >= 10 ? digitos : "";
  const primer = s.nombre.split(" ")[0];
  const enlaceSeg = `${urlSitio()}/seguimiento/${s.codigo}`;
  const textosWa: Record<string, string> = {
    nueva: `Hola ${primer}, soy ${u.nombre} de Neife. Recibí tu solicitud de orientación en ${nombreMateria(s.materia)}. ¿Te puedo llamar hoy para conversar los detalles?`,
    aceptada: `Hola ${primer}, soy ${u.nombre}. Estoy armando tu informe. Para avanzar necesito algunos documentos; te los dejo detallados aquí: ${enlaceSeg}`,
    informe: `Hola ${primer}, tu informe está en preparación. Puedes ver el avance aquí: ${enlaceSeg}`,
    entregada: `Hola ${primer}, tu informe ya está listo. Lo descargas aquí: ${enlaceSeg} ¿Quieres que te conecte con un abogado de ${nombreMateria(s.materia)}?`,
    derivada: `Hola ${primer}, derivé tu caso a un abogado de la materia. Cualquier duda me escribes. Avance: ${enlaceSeg}`,
  };
  const mensajeWa = encodeURIComponent(textosWa[s.estado] ?? `Hola ${primer}, te escribo por tu solicitud en Neife: ${enlaceSeg}`);
  const cerrado = s.estado === "cerrada" || s.estado === "rechazada";

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>
            {folio(s.codigo)} · {s.nombre}
          </h1>
          <span className="p-sub">
            {nombreMateria(s.materia)}{s.region ? ` · ${s.region}` : ""}
          </span>
        </div>
        <div className="p-acciones">
          <Link href="/panel" className="btn btn-secundario btn-chico">
            Casos
          </Link>
          <a href={`/api/expediente/${s.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-chico">
            <Icono nombre="informe" tam={15} /> Expediente PDF
          </a>
          <a href={`/api/expediente/${s.id}/pdf?para=persona&descargar=1`} className="btn btn-secundario btn-chico" title="Copia sin notas internas, lista para enviar a la persona">
            Copia para la persona
          </a>
          {informe ? (
            <Link href={`/panel/informes/${informe.id}`} className="btn btn-secundario btn-chico">
              <Icono nombre="informe" tam={15} /> Informe
            </Link>
          ) : null}
        </div>
      </header>

      {s.estado === "rechazada" ? (
        <div className="p-siguiente">
          <span className="txt">
            <Icono nombre="cerrar" /> Rechazada
            {s.motivoRechazo ? <small>{s.motivoRechazo}</small> : null}
          </span>
        </div>
      ) : (
        <>
          <div className="p-pasos-barra">
            <Pasos estado={s.estado} />
          </div>
          {!cerrado ? (
            <div className="p-siguiente">
              <span className="txt">
                <Icono nombre="flecha" /> {sig.texto}
              </span>
              <div className="p-acciones">
                {sig.accion === "aceptar" && (
                  <>
                    <form action={aceptarSolicitud}>
                      <input type="hidden" name="id" value={s.id} />
                      <BotonEnviar enviando="Aceptando…">
                        <Icono nombre="check" tam={16} /> Aceptar
                      </BotonEnviar>
                    </form>
                    <details className="desplegable">
                      <summary>Rechazar</summary>
                      <form action={rechazarSolicitud}>
                        <input type="hidden" name="id" value={s.id} />
                        <div className="campo">
                          <label htmlFor="motivo">Motivo (la persona lo verá)</label>
                          <textarea id="motivo" name="motivo" className="entrada" maxLength={400} />
                        </div>
                        <BotonEnviar className="btn btn-peligro" enviando="Rechazando…">
                          Rechazar solicitud
                        </BotonEnviar>
                      </form>
                    </details>
                  </>
                )}
                {sig.accion === "informe" &&
                  (informe ? (
                    <Link href={`/panel/informes/${informe.id}`} className="btn btn-primario">
                      <Icono nombre="informe" tam={16} /> Abrir informe
                    </Link>
                  ) : (
                    <form action={crearInforme}>
                      <input type="hidden" name="id" value={s.id} />
                      <BotonEnviar enviando="Preparando…">
                        <Icono nombre="informe" tam={16} /> Preparar informe
                      </BotonEnviar>
                    </form>
                  ))}
                {(sig.accion === "editar-informe" || sig.accion === "entregar") && informe ? (
                  <Link href={`/panel/informes/${informe.id}`} className="btn btn-primario">
                    <Icono nombre={sig.accion === "entregar" ? "enviar" : "editar"} tam={16} />{" "}
                    {sig.accion === "entregar" ? "Ir a entregar" : "Editar informe"}
                  </Link>
                ) : null}
                {sig.accion === "derivar" && !s.derivarOk && (
                  <form action={registrarAutorizacion}>
                    <input type="hidden" name="id" value={s.id} />
                    <BotonEnviar enviando="Guardando…">
                      <Icono nombre="check" tam={16} /> La persona autorizó
                    </BotonEnviar>
                  </form>
                )}
                {sig.accion === "derivar" && s.derivarOk && (
                  <form action={derivarSolicitud} className="p-alta">
                    <input type="hidden" name="id" value={s.id} />
                    <label htmlFor="destino" className="solo-lectores">
                      Abogado o estudio
                    </label>
                    <input id="destino" name="destino" className="entrada" placeholder="Abogado o estudio" required maxLength={200} />
                    <BotonEnviar enviando="Derivando…">
                      <Icono nombre="enviar" tam={16} /> Derivar
                    </BotonEnviar>
                  </form>
                )}
                {sig.accion === "confirmar" && (
                  <form action={confirmarAbogado}>
                    <input type="hidden" name="id" value={s.id} />
                    <BotonEnviar enviando="Guardando…">
                      <Icono nombre="check" tam={16} /> {s.abogadoDestino} tomó el caso
                    </BotonEnviar>
                  </form>
                )}
                {!["nueva"].includes(s.estado) && (
                  <form action={cerrarSolicitud} className="p-alta">
                    <input type="hidden" name="id" value={s.id} />
                    <label htmlFor="resultado" className="solo-lectores">
                      Resultado
                    </label>
                    <select id="resultado" name="resultado" className="entrada" defaultValue={s.abogadoConfirmado ? "con_abogado" : ""}>
                      <option value="">Resultado…</option>
                      {RESULTADOS.map((r) => (
                        <option key={r.clave} value={r.clave}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    <BotonEnviar className={sig.accion === "cerrar" ? "btn" : "btn btn-secundario"} enviando="Cerrando…">
                      Cerrar caso
                    </BotonEnviar>
                  </form>
                )}
                {s.estado === "aceptada" && !informe ? (
                  <details className="pasar">
                    <summary className="btn btn-secundario btn-chico">Pasar a otro asesor</summary>
                    <form action={devolverABandeja} className="pasar-panel">
                      <input type="hidden" name="id" value={s.id} />
                      <p>El caso volverá a la bandeja y avisaremos a la persona.</p>
                      <label htmlFor="materia-devolver">Materia que corresponde</label>
                      <select id="materia-devolver" name="materia" defaultValue={s.materia}>
                        {MATERIAS.map((materia) => (
                          <option key={materia.clave} value={materia.clave}>{materia.nombre}</option>
                        ))}
                      </select>
                      <BotonEnviar className="btn btn-chico" enviando="Devolviendo…">Devolver a la bandeja</BotonEnviar>
                    </form>
                  </details>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="p-dos">
        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-relato">
            <h2 id="t-relato">Relato</h2>
            <p className="p-texto">{s.relato}</p>
          </section>

          {!cerrado && s.estado !== "nueva" ? (
            <section className="p-sec" aria-labelledby="t-docs">
              <h2 id="t-docs">
                <Icono nombre="nota" tam={16} /> Documentos
              </h2>
              <LectorDocumentos
                solicitudId={s.id}
                docs={documentos.map((d) => ({ id: d.id, nombre: d.nombre, fecha: fechaHora(d.creadoEn), pasado: d.pasado, analisis: d.analisis }))}
                hayInforme={Boolean(informe)}
                informeEntregado={Boolean(informe?.entregado)}
                limiteMb={MAX_DOCUMENTO_MB}
              />
            </section>
          ) : null}

          {!cerrado && s.estado !== "nueva" ? (
            <section className="p-sec" aria-labelledby="t-pend">
              <h2 id="t-pend">
                Antecedentes <span className="n">{abiertos.length} por reunir</span>
              </h2>
              <ul className="p-lista">
                {pendientes.map((p) => (
                  <li key={p.id}>
                    <form action={alternarPendiente}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="pendiente" value={p.id} />
                      <button type="submit" className="p-check" aria-pressed={p.hecho}>
                        <span className="caja">{p.hecho ? <Icono nombre="check" tam={12} /> : null}</span>
                        <span className="txt">{p.texto}</span>
                      </button>
                    </form>
                    <form action={borrarPendiente}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="pendiente" value={p.id} />
                      <button type="submit" className="p-quitar" aria-label={`Quitar: ${p.texto}`}>
                        <Icono nombre="cerrar" tam={14} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={agregarPendiente} className="p-alta">
                <input type="hidden" name="id" value={s.id} />
                <label htmlFor="nuevo-pend" className="solo-lectores">
                  Agregar antecedente
                </label>
                <input id="nuevo-pend" name="texto" className="entrada" placeholder="Agregar antecedente" maxLength={200} />
                <button type="submit" className="btn btn-secundario btn-chico">
                  <Icono nombre="mas" tam={15} /> Agregar
                </button>
              </form>
            </section>
          ) : null}

          <section className="p-sec" aria-labelledby="t-hist">
            <h2 id="t-hist">Historial</h2>
            <form action={agregarNota} className="p-alta" style={{ marginBottom: 10 }}>
              <input type="hidden" name="id" value={s.id} />
              <label htmlFor="nota" className="solo-lectores">
                Nueva nota
              </label>
              <input id="nota" name="texto" className="entrada" placeholder="Nota: llamada, acuerdo, dato nuevo…" maxLength={1000} />
              <button type="submit" className="btn btn-secundario btn-chico">
                <Icono nombre="nota" tam={15} /> Anotar
              </button>
            </form>
            <ul className="p-hist">
              {historial.map((e) => (
                <li key={e.id}>
                  <time>{fechaHora(e.creadoEn)}</time>
                  {e.tipo === "etapa" ? (
                    <span className="etapa">
                      <Icono nombre="flecha" tam={14} />
                      {e.texto}
                    </span>
                  ) : (
                    <span className="nota">{e.texto}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="p-col">
          <section className="p-sec" aria-labelledby="t-contacto">
            <h2 id="t-contacto">Contacto</h2>
            <dl className="p-datos">
              {s.email ? (
                <>
                  <dt>Correo</dt>
                  <dd>
                    <a href={`mailto:${s.email}`}>
                      <Icono nombre="correo" tam={15} /> {s.email}
                    </a>
                  </dd>
                </>
              ) : null}
              {s.telefono ? (
                <>
                  <dt>Teléfono</dt>
                  <dd>
                    {s.telefono}
                    {wa ? (
                      <>
                        {" · "}
                        <a href={`https://wa.me/${wa}?text=${mensajeWa}`} target="_blank" rel="noopener noreferrer">
                          WhatsApp (mensaje listo)
                        </a>
                      </>
                    ) : null}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>

          <section className="p-sec" aria-labelledby="t-caso">
            <h2 id="t-caso">Caso</h2>
            <dl className="p-datos">
              <dt>Etapa</dt>
              <dd>{nombreEtapa(s.estado)}</dd>
              <dt>Origen</dt>
              <dd>{nombreOrigen(s.origen)}</dd>
              <dt>Urgencia</dt>
              <dd>{nombreUrgencia(s.urgencia)}</dd>
              <dt>Presupuesto</dt>
              <dd>{s.presupuesto || "—"}</dd>
              <dt>Derivar</dt>
              <dd>{s.derivarOk ? "Autorizado" : "Sin autorización"}</dd>
              <dt>Abogado</dt>
              <dd>
                {(() => {
                  const ea = estadoAbogado(s);
                  if (ea === "confirmado") return `${s.abogadoDestino} · confirmado`;
                  if (ea === "esperando") return `${s.abogadoDestino} · sin confirmar`;
                  return "Sin asignar";
                })()}
              </dd>
              {s.resultado ? (
                <>
                  <dt>Resultado</dt>
                  <dd>{nombreResultado(s.resultado)}</dd>
                </>
              ) : null}
            </dl>
            {!cerrado ? (
              <form action={fijarContacto} className="p-alta" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={s.id} />
                <label htmlFor="fecha" className="solo-lectores">
                  Próximo contacto
                </label>
                <input id="fecha" name="fecha" type="date" className="entrada" defaultValue={s.proximoContacto} />
                <button type="submit" className="btn btn-secundario btn-chico">
                  Fijar contacto
                </button>
              </form>
            ) : null}
          </section>

          {falta.length > 0 ? (
            <section className="p-sec" aria-labelledby="t-falta">
              <h2 id="t-falta">Falta</h2>
              <ul className="p-lista">
                {falta.map((f) => (
                  <li key={f}>
                    <Icono nombre="circulo" tam={12} /> {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
