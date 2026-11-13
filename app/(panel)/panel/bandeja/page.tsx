import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/Iconos";
import { requerirAbogado } from "@/lib/guards";
import { contarBandeja, listarBandeja, obtenerPerfil, type FiltrosBandeja } from "@/lib/datos";
import { espera } from "@/lib/formato";
import { nombreNivel } from "@/lib/solicitud-calidad";
import { guardarFiltrosComoAvisos } from "@/lib/acciones/avisos";
import { MATERIAS, nombreMateria, nombreUrgencia, PRESUPUESTOS, REGIONES, URGENCIAS } from "@/lib/materias";

export const metadata: Metadata = { title: "Bandeja de solicitudes" };
export const dynamic = "force-dynamic";

const PESO: Record<string, number> = { urgente: 0, pronto: 1, normal: 2 };

export default async function Bandeja({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const filtros: FiltrosBandeja = {
    materia: MATERIAS.some((m) => m.clave === sp.materia) ? sp.materia : undefined,
    presupuesto: (PRESUPUESTOS as readonly string[]).includes(sp.presupuesto ?? "") ? sp.presupuesto : undefined,
    urgencia: URGENCIAS.some((x) => x.clave === sp.urgencia) ? sp.urgencia : undefined,
    region: (REGIONES as readonly string[]).includes(sp.region ?? "") ? sp.region : undefined,
    texto: (sp.q ?? "").slice(0, 80),
    soloMisMaterias: sp.mias === "1",
    infoMinima: ["45", "75"].includes(sp.info ?? "") ? Number(sp.info) : undefined,
  };
  const [casos, total, perfil] = await Promise.all([listarBandeja(u.id, filtros), contarBandeja(), obtenerPerfil(u.id)]);
  const filtrando = Boolean(filtros.materia || filtros.presupuesto || filtros.urgencia || filtros.region || filtros.texto || filtros.soloMisMaterias || filtros.infoMinima);
  const lista = [...casos].sort((a, b) => (PESO[a.urgencia] ?? 2) - (PESO[b.urgencia] ?? 2) || b.creadoEn.localeCompare(a.creadoEn));
  const tieneMaterias = (perfil?.materias.length ?? 0) > 0;

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Bandeja de solicitudes</h1>
          <span className="p-sub">Todas las solicitudes del sitio, sin asignar. Tú decides cuáles tomar.</span>
        </div>
      </header>

      {sp.ya ? (
        <p className="aviso aviso-info" role="status">
          Ese caso ya lo tomó otro asesor. Aquí quedan los que siguen disponibles.
        </p>
      ) : null}
      {sp.avisos ? (
        <p className="aviso aviso-ok bj-aviso" role="status">
          Listo: te avisaremos por correo solo de casos como estos. Se ajusta en <Link href="/panel/perfil">Mi perfil</Link>.
        </p>
      ) : null}

      <form className="bj-filtros" method="get" action="/panel/bandeja" role="search" aria-label="Filtrar solicitudes disponibles">
        <label>
          <span>Tipo de caso</span>
          <select name="materia" defaultValue={filtros.materia ?? ""}>
            <option value="">Todos</option>
            {MATERIAS.map((m) => (
              <option key={m.clave} value={m.clave}>{m.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Presupuesto de la persona</span>
          <select name="presupuesto" defaultValue={filtros.presupuesto ?? ""}>
            <option value="">Cualquiera</option>
            {PRESUPUESTOS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Urgencia</span>
          <select name="urgencia" defaultValue={filtros.urgencia ?? ""}>
            <option value="">Cualquiera</option>
            {URGENCIAS.map((x) => (
              <option key={x.clave} value={x.clave}>{x.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Región</span>
          <select name="region" defaultValue={filtros.region ?? ""}>
            <option value="">Todas</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Información de la solicitud</span>
          <select name="info" defaultValue={filtros.infoMinima ? String(filtros.infoMinima) : ""}>
            <option value="">Cualquiera</option>
            <option value="45">Media o completa</option>
            <option value="75">Solo completa</option>
          </select>
        </label>
        <label className="bj-texto">
          <span>Situación o circunstancias</span>
          <input type="search" name="q" defaultValue={filtros.texto} placeholder="Ej.: despido, pensión, arriendo…" maxLength={80} />
        </label>
        {tieneMaterias ? (
          <label className="bj-check">
            <input type="checkbox" name="mias" value="1" defaultChecked={filtros.soloMisMaterias} />
            <span>Solo las materias de mi perfil</span>
          </label>
        ) : null}
        <div className="bj-acciones">
          <button type="submit" className="btn btn-chico">Filtrar</button>
          {filtrando ? <Link href="/panel/bandeja" className="btn btn-secundario btn-chico">Quitar filtros</Link> : null}
        </div>
      </form>

      <div className="bj-fila-resumen">
        <span><b>{lista.length}</b> {filtrando ? `de ${total} ` : ""}disponible{lista.length === 1 ? "" : "s"}</span>
        {filtrando ? (
          <form action={guardarFiltrosComoAvisos}>
            <input type="hidden" name="materia" value={filtros.materia ?? ""} />
            <input type="hidden" name="presupuesto" value={filtros.presupuesto ?? ""} />
            <input type="hidden" name="urgencia" value={filtros.urgencia ?? ""} />
            <input type="hidden" name="region" value={filtros.region ?? ""} />
            <button type="submit" className="bj-enlace">Avisarme por correo de casos como estos</button>
          </form>
        ) : null}
      </div>

      {lista.length === 0 ? (
        <p className="p-vacio">{filtrando ? "Ningún caso abierto coincide con esos filtros." : "No hay solicitudes abiertas por ahora. Te avisamos por correo cuando llegue una."}</p>
      ) : (
        <ul className="bj-lista">
          {lista.map((c) => (
            <li key={c.id} className={`bj-caso bj-${c.urgencia}`}>
              <div className="bj-cab">
                <h2>{nombreMateria(c.materia)}</h2>
                <span className={`urg urg-${c.urgencia}`}>
                  {c.urgencia === "urgente" ? <Icono nombre="alerta" tam={15} /> : null}
                  {c.urgencia === "pronto" ? <Icono nombre="reloj" tam={15} /> : null}
                  {nombreUrgencia(c.urgencia)}
                </span>
              </div>
              <dl className="bj-datos">
                <div><dt>Presupuesto</dt><dd>{c.presupuesto || "No indicado"}</dd></div>
                <div><dt>Región</dt><dd>{c.region || "No indicada"}</dd></div>
                <div><dt>Recibida</dt><dd>hace {espera(c.creadoEn)}</dd></div>
              </dl>
              <p className="bj-meta">
                <span className={`bj-nivel-${c.nivel}`} title={c.falta.length ? `Falta: ${c.falta.join(", ")}` : "Trae lo necesario para evaluarla"}>
                  {nombreNivel(c.nivel).replace("Información ", "")} · {c.puntaje}
                </span>
              </p>
              <p className="bj-extracto">{c.extracto}</p>
              <div className="bj-pie">
                {c.sinTomar24h ? <span className="bj-espera">+24 h sin tomar</span> : <span />}
                <Link className="btn btn-chico" href={`/panel/bandeja/${c.id}`}>Leer y decidir</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
