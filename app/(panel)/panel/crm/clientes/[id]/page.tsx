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
import { IconoCrm } from "@/components/crm/IconosCrm";
import { Seccion, Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Cliente" };
export const dynamic = "force-dynamic";

/** Número chileno → enlace de WhatsApp (solo dígitos, con 56 delante). */
function enlaceWhatsapp(tel: string): string | null {
  const n = tel.replace(/\D/g, "");
  if (n.length < 8) return null;
  const completo = n.startsWith("56") ? n : n.length === 9 ? `56${n}` : n;
  return `https://wa.me/${completo}`;
}

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirAbogado();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await obtenerPersona(id, u.id);
  if (!p) notFound();
  const hoy = hoyLocal();
  const [inter, tareas, grupos, mios] = await Promise.all([
    listarInteracciones(id, u.id),
    listarTareas(u.id, { incluirHechas: true }),
    listarGrupos(u.id),
    gruposDePersona(u.id, id),
  ]);
  const tareasDe = tareas.filter((t) => t.personaId === id);
  const wa = p.telefono ? enlaceWhatsapp(p.telefono) : null;
  const conHito = p.fechaHito !== "";

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <Link href="/panel/crm/clientes" className="crm-volver" aria-label="Volver a clientes">
            <IconoCrm nombre="flecha-izq" tam={22} />
          </Link>
          <h1>{p.nombre}</h1>
          <span className="p-sub">
            {nombreMateria(p.materia)} · {nombreEtapaCrm(p.etapa)}
          </span>
        </div>
        {conHito ? (
          <span className="crm-sello">
            <IconoCrm nombre="estrella" tam={16} /> {nombreHito(p.tipoHito)} el {fechaDMA(p.fechaHito)}
          </span>
        ) : null}
      </header>

      <div className="crm-pagina">
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
          <p className="crm-ayuda">{ETAPAS_CRM.find((e) => e.clave === p.etapa)?.ayuda}</p>
        </Seccion>

        <Seccion titulo="Contacto" id="contacto">
          <ul className="crm-datos">
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
