import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, nombreCanal, nombreEtapaCrm, nombreHito, nombreInteraccion, nombreOrigenCrm } from "@/lib/crm/catalogo";
import { fechaDMA, hoyLocal, haceCuanto } from "@/lib/crm/fechas";
import { gruposDePersona, listarGrupos, listarInteracciones, listarTareas, obtenerPersona } from "@/lib/crm/servicio";
import {
  alternarGrupoPersonaAccion,
  alternarTareaAccion,
  cambiarEtapaAccion,
  eliminarInteraccionAccion,
  eliminarPersonaAccion,
  programarContactoAccion,
} from "@/lib/acciones/crm";
import { nombreMateria } from "@/lib/materias";
import { FormDetalles, FormHito, RegistroDePersona } from "@/components/crm/FormulariosPersona";
import { BarraApp, OpcionMenu } from "@/components/panel/BarraApp";
import { Popover } from "@/components/crm/Popover";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { BarraProgreso, Estrellas, Pestanas, Seccion, Vacio } from "@/components/crm/Piezas";
import { BotonAgendarCita, BotonAgregarPaso, BotonDerivar, BotonEditarFicha } from "@/components/crm/BotonesFicha";
import { CATEGORIAS_PASO, ESTADOS_PASO, nombreResultadoDerivacion } from "@/lib/crm/catalogo";
import { citasDePersona } from "@/lib/crm/servicio-citas";
import { colegasDePlataforma, contextoCaso, lineaTiempo, montoAcordado } from "@/lib/crm/servicio-seguimiento";
import { estadoPasoAccion, eliminarPasoAccion, eliminarDerivacionAccion, informeVisibleAccion, pasosSugeridosAccion, satisfaccionAccion } from "@/lib/acciones/crm2";

export const metadata: Metadata = { title: "CRM · Cliente" };
export const dynamic = "force-dynamic";

/** Número chileno → enlace de WhatsApp (solo dígitos, con 56 delante). */
function enlaceWhatsapp(tel: string): string | null {
  const n = tel.replace(/\D/g, "");
  if (n.length < 8) return null;
  const completo = n.startsWith("56") ? n : n.length === 9 ? `56${n}` : n;
  return `https://wa.me/${completo}`;
}

export default async function FichaCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const pestana = sp.t === "progreso" || sp.t === "linea" ? sp.t : "perfil";
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await obtenerPersona(id, u.id);
  if (!p) notFound();
  const hoy = hoyLocal();
  const [inter, tareas, grupos, mios, caso, linea, colegas, citas] = await Promise.all([
    listarInteracciones(id, u.id),
    listarTareas(u.id, { incluirHechas: true }),
    listarGrupos(u.id),
    gruposDePersona(u.id, id),
    contextoCaso(u.id, p, hoy),
    lineaTiempo(u.id, p, hoy),
    colegasDePlataforma(u.id),
    citasDePersona(u.id, id),
  ]);
  const { ev, pasos, derivacion } = caso;
  const base = `/panel/crm/clientes/${p.id}`;
  const hrefT = (t: string) => `${base}?t=${t}`;
  const tareasDe = tareas.filter((t) => t.personaId === id);
  const wa = p.telefono ? enlaceWhatsapp(p.telefono) : null;
  const conHito = p.fechaHito !== "";

  return (
    <>
      <BarraApp
        titulo={p.nombre}
        subtitulo={`${nombreMateria(p.materia)} · ${nombreEtapaCrm(p.etapa)}`}
        volver="/panel/crm/clientes"
        acciones={
          <>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="crm-icono-boton ba-icono" aria-label="WhatsApp"><IconoCrm nombre="whatsapp" tam={22} /></a> : null}
            <Popover etiqueta="Más opciones" icono="puntos">
              {p.telefono ? <a className="pop-op" role="menuitem" href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`}><IconoCrm nombre="telefono" tam={20} /><span>Llamar</span></a> : null}
              {p.telefono ? <a className="pop-op" role="menuitem" href={`sms:${p.telefono.replace(/[^\d+]/g, "")}`}><IconoCrm nombre="mensaje" tam={20} /><span>SMS</span></a> : null}
              {p.email ? <a className="pop-op" role="menuitem" href={`mailto:${p.email}`}><IconoCrm nombre="correo" tam={20} /><span>Correo</span></a> : null}
              {p.lat != null ? <OpcionMenu href={`/panel/crm/zonas?p=${p.id}`} icono="zona">Ver en el mapa</OpcionMenu> : null}
              <OpcionMenu href={`/panel/crm/informes/${p.id}`} icono="informe">Informe de avance</OpcionMenu>
              <OpcionMenu href={`/panel/crm/plantillas?p=${p.id}`} icono="mensaje">Plantillas de mensaje</OpcionMenu>
            </Popover>
          </>
        }
      />

      <div className="crm-pagina">
        <Pestanas etiqueta="Secciones del cliente" items={[
          { href: hrefT("perfil"), texto: "Perfil", activa: pestana === "perfil" },
          { href: hrefT("progreso"), texto: "Progreso", activa: pestana === "progreso" },
          { href: hrefT("linea"), texto: "Línea de tiempo", activa: pestana === "linea" },
        ]} />

        {pestana === "perfil" ? (
          <>
            {ev.faltantes.length > 0 ? (
              <div className="crm-banner rojo">
                <strong>Falta completar ({ev.faltantes.length})</strong>
                <ul>{ev.faltantes.slice(0, 3).map((f) => <li key={f.clave}>{f.texto}</li>)}</ul>
                <Link href={hrefT("progreso")}>Ver el progreso</Link>
              </div>
            ) : (
              <div className="crm-banner verde">Ficha al día: no falta nada por registrar.</div>
            )}
            <div className="crm-acciones-fila">
              <BotonEditarFicha p={p} />
              <BotonAgendarCita personaId={p.id} personas={[{ id: p.id, nombre: p.nombre }]} hoy={hoy} />
              {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secundario btn-chico">WhatsApp</a> : null}
              {p.telefono ? <a href={`sms:${p.telefono.replace(/[^\d+]/g, "")}`} className="btn btn-secundario btn-chico">SMS</a> : null}
              {p.telefono ? <a href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`} className="btn btn-secundario btn-chico">Llamar</a> : null}
            </div>
        <Seccion titulo="Etapa" id="etapa">
          <div className="crm-etapas" role="group" aria-label="Cambiar la etapa del cliente">
            {ETAPAS_CRM.map((e) => (
              <form key={e.clave} action={cambiarEtapaAccion}>
                <input type="hidden" name="persona_id" value={p.id} />
                <input type="hidden" name="etapa" value={e.clave} />
                <button type="submit" className={e.clave === p.etapa ? "activa" : undefined} aria-pressed={e.clave === p.etapa} title={e.ayuda}>
                  {e.corto}
                </button>
              </form>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Contacto" id="contacto">
          <ul className="crm-datos">
            <li><strong>Código de seguimiento:</strong> <code>{p.codigoSeguimiento}</code></li>
            <li>
              <IconoCrm nombre="telefono" tam={18} />
              {p.telefono ? <a href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`}>{p.telefono}</a> : <span className="vacio">Sin teléfono</span>}
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="crm-pildora chica">
                  WhatsApp
                </a>
              ) : null}
            </li>
            <li>
              <IconoCrm nombre="correo" tam={18} />
              {p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : <span className="vacio">Sin correo</span>}
            </li>
            <li>
              <IconoCrm nombre="zona" tam={18} />
              {p.comuna || p.region ? [p.comuna, p.region].filter(Boolean).join(", ") : <span className="vacio">Sin zona</span>}
            </li>
            <li>
              <IconoCrm nombre="info" tam={18} />
              Llegó por: {nombreOrigenCrm(p.origen)} · última asesoría: {p.ultimaAsesoria ? haceCuanto(p.ultimaAsesoria, hoy) : "ninguna"}
            </li>
          </ul>
          {p.nota ? <p className="crm-nota-interna">{p.nota}</p> : null}
        </Seccion>

        <Seccion titulo="Fechas" id="fechas">
          <p className="crm-mini-titulo">Fecha de hito (audiencia, mediación, firma o plazo)</p>
          <FormHito personaId={p.id} fecha={p.fechaHito} tipo={p.tipoHito} />
          <p className="crm-mini-titulo">Próximo contacto</p>
          <form action={programarContactoAccion} className="crm-form-linea">
            <input type="hidden" name="persona_id" value={p.id} />
            <input type="date" name="fecha" className="entrada" defaultValue={p.proximoContacto} aria-label="Fecha del próximo contacto" />
            <button type="submit" className="btn btn-secundario btn-chico">
              Guardar
            </button>
          </form>
        </Seccion>

        <Seccion titulo="Registrar" id="registrar">
          <RegistroDePersona personaId={p.id} hoy={hoy} />
        </Seccion>

        <Seccion titulo="Historial" id="historial">
          {inter.length === 0 ? (
            <Vacio>Aún no hay registros. Anota la primera asesoría o contacto arriba.</Vacio>
          ) : (
            <ol className="crm-historial">
              {inter.map((i) => (
                <li key={i.id}>
                  <div className="crm-historial-cab">
                    <strong>{nombreInteraccion(i.tipo)}</strong>
                    <span>
                      {fechaDMA(i.fecha)}
                      {i.canal ? ` · ${nombreCanal(i.canal)}` : ""}
                      {i.conColega ? " · con colega" : ""}
                    </span>
                    <form action={eliminarInteraccionAccion}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="crm-icono-boton" aria-label={`Eliminar el registro del ${fechaDMA(i.fecha)}`}>
                        <IconoCrm nombre="papelera" tam={16} />
                      </button>
                    </form>
                  </div>
                  {i.nota ? <p>{i.nota}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </Seccion>

        <Seccion titulo="Tareas de este cliente" id="tareas">
          {tareasDe.length === 0 ? (
            <Vacio>Sin tareas. Agrégalas con el botón «+» de abajo.</Vacio>
          ) : (
            <ul className="crm-tareas">
              {tareasDe.map((t) => (
                <li key={t.id} className={t.hecha ? "hecha" : undefined}>
                  <form action={alternarTareaAccion}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="crm-casilla" aria-label={t.hecha ? "Marcar como pendiente" : "Marcar como hecha"} aria-pressed={t.hecha}>
                      {t.hecha ? <IconoCrm nombre="check" tam={16} /> : null}
                    </button>
                  </form>
                  <span>{t.texto}</span>
                  {t.vence ? <small>{fechaDMA(t.vence)}</small> : null}
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Grupos" id="grupos-persona">
          <div className="crm-chips-linea">
            {grupos.map((g) => {
              const esta = mios.includes(g.id);
              return (
                <form key={g.id} action={alternarGrupoPersonaAccion}>
                  <input type="hidden" name="grupo_id" value={g.id} />
                  <input type="hidden" name="persona_id" value={p.id} />
                  <button type="submit" className={`crm-chip-boton${esta ? " activa" : ""}`} aria-pressed={esta}>
                    {esta ? <IconoCrm nombre="check" tam={14} /> : null} {g.nombre}
                  </button>
                </form>
              );
            })}
          </div>
        </Seccion>


            <Seccion titulo="Próximas citas" id="citas">
              {citas.filter((c) => c.estado === "pendiente" && c.fecha >= hoy).length === 0 ? (
                <Vacio>Sin citas pendientes. Usa «Agendar cita» arriba.</Vacio>
              ) : (
                <ul className="lista-enlaces">
                  {citas.filter((c) => c.estado === "pendiente" && c.fecha >= hoy).map((c) => (
                    <li key={c.id}><Link href={`/panel/crm/agenda?d=${c.fecha}`}>{fechaDMA(c.fecha)} · {c.horaIni} · {c.titulo || c.tipo}</Link></li>
                  ))}
                </ul>
              )}
            </Seccion>
          </>
        ) : null}

        {pestana === "progreso" ? (
          <>
            <Seccion titulo="Avance del caso" id="avance">
              <p className="crm-progreso-fila"><BarraProgreso pct={ev.pct} etiqueta="Avance del caso" /> <strong>{ev.pct} %</strong></p>
              <p className="crm-siguiente"><IconoCrm nombre="flecha-der" tam={16} /> Siguiente paso: {ev.siguiente}</p>
              {ev.listo ? <p className="crm-banner verde">Informe listo para mostrar al cliente.</p> : ev.casiListo ? <p className="crm-banner">Casi listo: falta poco para el informe.</p> : null}
              {ev.faltantes.length ? (
                <ul className="crm-faltantes">{ev.faltantes.map((f) => <li key={f.clave}>{f.texto}</li>)}</ul>
              ) : null}
              <div className="crm-acciones-fila">
                <Link href={`/panel/crm/informes/${p.id}`} className="btn btn-primario btn-chico">Ver informe del cliente</Link>
                <form action={informeVisibleAccion}>
                  <input type="hidden" name="persona_id" value={p.id} />
                  <input type="hidden" name="visible" value={p.informeVisible ? "0" : "1"} />
                  <button type="submit" className="btn btn-secundario btn-chico" aria-pressed={p.informeVisible}>
                    {p.informeVisible ? "Informe visible para el cliente: sí" : "Informe visible para el cliente: no"}
                  </button>
                </form>
              </div>
            </Seccion>

            <Seccion titulo="Requisitos y trámites" id="requisitos">
              {pasos.length === 0 ? (
                <Vacio>Aún no hay requisitos. Agrega los documentos y trámites del caso.</Vacio>
              ) : (
                <ul className="crm-pasos">
                  {pasos.map((x) => (
                    <li key={x.id} className={`paso-${x.estado}`}>
                      <div>
                        <strong>{x.texto}</strong>
                        <small>{CATEGORIAS_PASO.find((c) => c.clave === x.categoria)?.nombre}{x.vence ? ` · vence ${fechaDMA(x.vence)}` : ""}</small>
                      </div>
                      <div className="crm-etapas" role="group" aria-label={`Estado de ${x.texto}`}>
                        {ESTADOS_PASO.map((e) => (
                          <form key={e.clave} action={estadoPasoAccion}>
                            <input type="hidden" name="id" value={x.id} />
                            <input type="hidden" name="estado" value={e.clave} />
                            <button type="submit" className={e.clave === x.estado ? "activa" : undefined} aria-pressed={e.clave === x.estado}>{e.nombre}</button>
                          </form>
                        ))}
                      </div>
                      <form action={eliminarPasoAccion}>
                        <input type="hidden" name="id" value={x.id} />
                        <button type="submit" className="crm-icono-boton" aria-label={`Eliminar ${x.texto}`}><IconoCrm nombre="papelera" tam={16} /></button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="crm-acciones-fila">
                <BotonAgregarPaso personaId={p.id} />
                <form action={pasosSugeridosAccion}>
                  <input type="hidden" name="persona_id" value={p.id} />
                  <button type="submit" className="btn btn-secundario btn-chico">Agregar los sugeridos para {nombreMateria(p.materia)}</button>
                </form>
              </div>
            </Seccion>

            <Seccion titulo="Conformidad del cliente" id="conformidad">
              <p>Opinión actual: <Estrellas n={p.satisfaccion} />{p.satisfaccionNota ? ` · ${p.satisfaccionNota}` : ""}</p>
              <form action={satisfaccionAccion} className="crm-form-linea">
                <input type="hidden" name="persona_id" value={p.id} />
                <select name="valor" className="entrada" defaultValue={p.satisfaccion || 5} aria-label="Estrellas">
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "estrella" : "estrellas"}</option>)}
                </select>
                <input name="nota" className="entrada" placeholder="Cómo quedó (opcional)" maxLength={300} defaultValue={p.satisfaccionNota} />
                <button type="submit" className="btn btn-secundario btn-chico">Guardar</button>
              </form>
            </Seccion>

            <Seccion titulo="Derivación a un colega" id="derivacion">
              {derivacion ? (
                <ul className="crm-datos">
                  <li>Colega: <strong>{derivacion.colega}</strong> · {fechaDMA(derivacion.fecha)}</li>
                  <li>Resultado: {nombreResultadoDerivacion(derivacion.resultado)}</li>
                  <li>Comisión: {derivacion.comisionTipo === "ninguna" ? "sin comisión" : derivacion.comisionTipo === "porcentaje" ? `${derivacion.comisionValor} %` : `$${derivacion.comisionValor.toLocaleString("es-CL")}`} · {derivacion.comisionEstado.replace("_", " ")}{montoAcordado(derivacion) ? ` · acordado $${montoAcordado(derivacion).toLocaleString("es-CL")}` : ""}</li>
                  {derivacion.trato ? <li>Cómo fue el trato: {derivacion.trato}</li> : null}
                  <li>Conformidad: <Estrellas n={derivacion.satisfaccion} /></li>
                </ul>
              ) : (
                <Vacio>Este caso no se ha derivado.</Vacio>
              )}
              <div className="crm-acciones-fila">
                <BotonDerivar personaId={p.id} colegas={colegas} previa={derivacion} hoy={hoy} />
                {derivacion ? (
                  <form action={eliminarDerivacionAccion}>
                    <input type="hidden" name="id" value={derivacion.id} />
                    <button type="submit" className="btn btn-peligro btn-chico">Quitar derivación</button>
                  </form>
                ) : null}
              </div>
            </Seccion>
          </>
        ) : null}

        {pestana === "linea" ? (
          <>
            <Seccion titulo="Lo que viene" id="proximos">
              {linea.proximos.length === 0 ? <Vacio>Nada agendado. Agenda una cita o fija un próximo contacto.</Vacio> : (
                <ol className="crm-historial">{linea.proximos.map((i) => (
                  <li key={i.clave}><div className="crm-historial-cab"><strong>{i.titulo}</strong><span>{fechaDMA(i.fecha)}{i.hora ? ` · ${i.hora}` : ""}</span></div>{i.detalle ? <p>{i.detalle}</p> : null}</li>
                ))}</ol>
              )}
            </Seccion>
            <Seccion titulo="Historia del caso" id="historia">
              {linea.historial.length === 0 ? <Vacio>Todavía no hay historia que mostrar.</Vacio> : (
                <ol className="crm-historial">{linea.historial.map((i) => (
                  <li key={i.clave}><div className="crm-historial-cab"><strong>{i.titulo}</strong><span>{fechaDMA(i.fecha)}{i.hora ? ` · ${i.hora}` : ""}</span></div>{i.detalle ? <p>{i.detalle}</p> : null}</li>
                ))}</ol>
              )}
            </Seccion>
          </>
        ) : null}

        <details className="crm-desplegable">
          <summary>
            Editar datos del cliente <IconoCrm nombre="flecha-abajo" tam={16} />
          </summary>
          <div className="crm-desplegable-cuerpo">
            <FormDetalles p={p} />
          </div>
        </details>

        <details className="crm-desplegable peligro">
          <summary>
            Eliminar cliente <IconoCrm nombre="flecha-abajo" tam={16} />
          </summary>
          <div className="crm-desplegable-cuerpo">
            <p>Se borra la ficha, su historial y sus tareas. Los indicadores de períodos pasados se corrigen. No se puede deshacer.</p>
            <form action={eliminarPersonaAccion}>
              <input type="hidden" name="persona_id" value={p.id} />
              <button type="submit" className="btn btn-peligro btn-chico">
                Sí, eliminar a {p.nombre}
              </button>
            </form>
          </div>
        </details>
      </div>
    </>
  );
}
