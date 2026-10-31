import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { HOME_MENSUAL, HOME_SEMANAL } from "@/lib/crm/catalogo";
import { etiquetaPeriodo, nombreMes } from "@/lib/crm/fechas";
import { listarGrupos, resumenInicio } from "@/lib/crm/servicio";
import { eliminarGrupoAccion, moverGrupoAccion } from "@/lib/acciones/crm";
import { MetaHoy, MetaMes, TarjetaIndicador } from "@/components/crm/Indicadores";
import { Baldosa, Seccion, Vacio } from "@/components/crm/Piezas";
import { FilaPersona } from "@/components/crm/FilaPersona";
import { FormGrupo } from "@/components/crm/FormGrupo";
import { IconoCrm } from "@/components/crm/IconosCrm";

export const metadata: Metadata = { title: "CRM · Inicio" };
export const dynamic = "force-dynamic";

export default async function InicioCrm() {
  const u = await requerirAbogado();
  const [r, grupos] = await Promise.all([resumenInicio(u.id), listarGrupos(u.id)]);
  const { semana, mes, abiertos } = r;
  const semanales = HOME_SEMANAL.filter((c) => c !== "consultas_nuevas");

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Inicio</h1>
          <span className="p-sub">Tus clientes y tus metas</span>
        </div>
        <Link href="/panel/crm/clientes" className="btn btn-secundario btn-chico">
          <IconoCrm nombre="cliente" tam={16} /> Ver clientes
        </Link>
      </header>

      <div className="crm-pagina">
        <Seccion titulo="Indicadores clave semanales" enlace={{ href: "/panel/crm/metas", texto: "Ver todos" }} id="semanales">
          <p className="crm-periodo">{etiquetaPeriodo("semana", semana.inicio)}</p>
          <div className="crm-kpis">
            <TarjetaIndicador
              clave="consultas_nuevas"
              real={semana.real.consultas_nuevas}
              meta={semana.meta.consultas_nuevas}
              href={`/panel/crm/metas/consultas_nuevas?p=semana&d=${semana.inicio}`}
              ancha
              lateral={<MetaHoy real={r.dia.real} meta={r.dia.meta} />}
            />
            {semanales.map((c) => (
              <TarjetaIndicador key={c} clave={c} real={semana.real[c]} meta={semana.meta[c]} href={`/panel/crm/metas/${c}?p=semana&d=${semana.inicio}`} />
            ))}
            <TarjetaIndicador
              clave="mandatos"
              real={semana.real.mandatos}
              meta={semana.meta.mandatos}
              href={`/panel/crm/metas/mandatos?p=semana&d=${semana.inicio}`}
              ancha
              lateral={<MetaMes nombreMes={nombreMes(mes.inicio)} real={mes.real.mandatos} meta={mes.meta.mandatos} href={`/panel/crm/metas/mandatos?p=mes&d=${mes.inicio}`} />}
            />
          </div>
          <p className="crm-centro">
            <Link href="/panel/crm/planificacion" className="crm-pildora">
              Planificación semanal
            </Link>
          </p>
        </Seccion>

        <Seccion titulo="Indicadores mensuales" enlace={{ href: `/panel/crm/metas?p=mes&d=${mes.inicio}`, texto: "Ver todos" }} id="mensuales">
          <p className="crm-periodo">{etiquetaPeriodo("mes", mes.inicio)}</p>
          <div className="crm-kpis">
            {HOME_MENSUAL.map((c) => (
              <TarjetaIndicador key={c} clave={c} real={mes.real[c]} meta={mes.meta[c]} href={`/panel/crm/metas/${c}?p=mes&d=${mes.inicio}`} />
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Clientes con avance" enlace={{ href: "/panel/crm/clientes", texto: "Ver todos" }} id="avance">
          {r.avanzan.length === 0 ? (
            <Vacio>
              Todavía no hay clientes en asesoría. Usa el botón «+» para agregar a tu primer cliente, o{" "}
              <Link href="/panel/crm/clientes">importa tus casos actuales</Link>.
            </Vacio>
          ) : (
            <ul className="crm-lista">
              {r.avanzan.map((p) => (
                <FilaPersona key={p.id} p={p} hoy={r.hoy} />
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Gestiones abiertas" id="abiertas">
          <div className="crm-baldosas">
            <Baldosa href="/panel/crm/clientes?f=hito_proximo" icono="calendario-ok" texto="Citas próximas" n={abiertos.citas} />
            <Baldosa href="/panel/crm/clientes?f=referidos" icono="usuarios" texto="Referidos" n={abiertos.referidos} />
            <Baldosa href="/panel/crm/clientes?e=con_hito" icono="firma" texto="Mandatos por firmar" n={abiertos.mandatosPendientes} />
            <Baldosa href="/panel/crm/tareas" icono="tarea" texto="Tareas" n={abiertos.tareas} />
            <Baldosa href="/panel/crm/clientes?f=vencidos" icono="alerta" texto="Sin seguimiento" n={abiertos.vencidos} />
            <Baldosa href="/panel/crm/notas" icono="nota" texto="Notas rápidas" n={abiertos.notas} />
            <Baldosa href="/panel/crm/clientes?f=por_contactar" icono="mensaje" texto="Por contactar" n={abiertos.porContactar} />
            <Baldosa href="/panel/crm/clientes?f=postventa" icono="escudo" texto="Postventa" n={abiertos.postventa} />
            <Baldosa href="/panel/crm/plantillas" icono="bombilla" texto="Consejos" />
          </div>
        </Seccion>

        <Seccion titulo="Ayudas" id="ayudas">
          <div className="crm-baldosas">
            <Baldosa href="/panel/crm/zonas" icono="zona" texto="Notas de zona" />
            <Baldosa href="/panel/biblioteca" icono="libro" texto="Biblioteca legal" />
            <Baldosa href="/panel/crm/plantillas" icono="mensaje" texto="Plantillas de mensajes" />
            <Baldosa href="/panel/informes" icono="documento" texto="Informes de caso" />
            <Baldosa href="/panel" icono="maletin" texto="Mis casos" />
            <Baldosa href="/panel/crm/plantillas#primera-asesoria" icono="birrete" texto="Guía de primera asesoría" />
          </div>
        </Seccion>

        <Seccion titulo="Filtros rápidos" id="filtros">
          <div className="crm-baldosas">
            <Baldosa href="/panel/crm/clientes?f=referidos" icono="usuario-mas" texto="Nuevos referidos" />
            <Baldosa href="/panel/crm/clientes?f=hito_proximo" icono="calendario-ok" texto="Hito en 14 días" />
            <Baldosa href="/panel/crm/informes" icono="informe" texto="Informe de avance" />
            <Baldosa href="/panel/crm/clientes?f=nuevos_mandantes" icono="firma" texto="Nuevos mandantes" />
          </div>
        </Seccion>

        <Seccion titulo="Grupos" id="grupos">
          <ul className="crm-grupos">
            {grupos.map((g, i) => (
              <li key={g.id}>
                <span className="crm-asa" aria-hidden="true">
                  <IconoCrm nombre="asa" tam={20} />
                </span>
                <Link href={`/panel/crm/clientes?g=${g.id}`} className="crm-grupo-nombre">
                  {g.nombre}
                  <span className="crm-chip">{g.personas}</span>
                </Link>
                <span className="crm-grupo-acciones">
                  <form action={moverGrupoAccion}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="dir" value="arriba" />
                    <button type="submit" className="crm-icono-boton" aria-label={`Subir ${g.nombre}`} disabled={i === 0}>
                      <IconoCrm nombre="flecha-arriba" tam={18} />
                    </button>
                  </form>
                  <form action={moverGrupoAccion}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="dir" value="abajo" />
                    <button type="submit" className="crm-icono-boton" aria-label={`Bajar ${g.nombre}`} disabled={i === grupos.length - 1}>
                      <IconoCrm nombre="flecha-abajo" tam={18} />
                    </button>
                  </form>
                  <form action={eliminarGrupoAccion}>
                    <input type="hidden" name="id" value={g.id} />
                    <button type="submit" className="crm-icono-boton" aria-label={`Eliminar el grupo ${g.nombre}`}>
                      <IconoCrm nombre="papelera" tam={18} />
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
          <FormGrupo />
        </Seccion>
      </div>
    </>
  );
}
