import Link from "next/link";
import { Verificacion } from "@/components/Verificacion";
import { MapaFicha } from "@/components/MapaFicha";
import type { Perfil } from "@/lib/datos";
import { nombreMateria } from "@/lib/materias";
import { iniciales, pesos } from "@/lib/formato";
import { textoTiempo } from "@/lib/resenas";
import type { Resena } from "@/lib/resenas";

export type ExtrasFicha = { resenas: { promedio: number; total: number; ultimas: Resena[] }; horas: number | null };

/** Ficha pública de un asesor: la usan la lista de Asesoría y su enlace personal (/a/nombre). */
export function FichaAsesor({ a, extras, via }: { a: Perfil; extras: ExtrasFicha | undefined; via?: boolean }) {
  const r = extras?.resenas;
  const href = `/asesoria/solicitar?asesor=${a.usuarioId}${via ? "&via=enlace" : ""}`;
  const mapaOsm = a.lat != null && a.lng != null ? `https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}` : "";
  return (
    <article className="perfil" aria-labelledby={`asesor-${a.usuarioId}`}>
      <div className="perfil-lado">
        <div className="perfil-iniciales" aria-hidden="true">{iniciales(a.nombre)}</div>
        <h2 id={`asesor-${a.usuarioId}`}>{a.nombre}</h2>
        <p className="perfil-titulo">{a.titulo}</p>
        <Verificacion titulo={a.titulo} verificadoEn={a.verificadoEn} codigo={a.codigoPublico} />
        {r?.total ? (
          <p className="perfil-resena" aria-label={`${r.promedio} de 5 estrellas`}>
            <span aria-hidden="true">★</span> <strong>{r.promedio}</strong> · {r.total} reseña{r.total === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
      <div className="perfil-cuerpo">
        {a.bio ? (
          <div>
            <h3>Presentación</h3>
            <p style={{ whiteSpace: "pre-line" }}>{a.bio}</p>
          </div>
        ) : null}
        <dl className="datos">
          {a.materias.length > 0 ? (<><dt>Materias</dt><dd>{a.materias.map(nombreMateria).join(", ")}</dd></>) : null}
          {a.ubicacion ? (<><dt>Atención</dt><dd>{a.ubicacion}</dd></>) : null}
          {extras?.horas != null ? (<><dt>Suele responder en</dt><dd>{textoTiempo(extras.horas)}</dd></>) : null}
          <dt>Informe de orientación</dt>
          <dd>{pesos(a.precioInforme)}</dd>
        </dl>

        {a.honorarios.length > 0 ? (
          <div className="fa-bloque">
            <h3>Honorarios</h3>
            <ul className="fa-honorarios">
              {a.honorarios.map((l) => {
                const i = l.lastIndexOf(":");
                return i > 0 ? (
                  <li key={l}><span>{l.slice(0, i)}</span><strong>{l.slice(i + 1).trim()}</strong></li>
                ) : (
                  <li key={l}><span>{l}</span></li>
                );
              })}
            </ul>
            <p className="ayuda">Valores de referencia que define el propio asesor; confirma alcance y total antes de contratar.</p>
          </div>
        ) : null}

        {a.direccion ? (
          <div className="fa-bloque">
            <h3>Oficina</h3>
            <p className="fa-direccion">{a.direccion}</p>
            {a.lat != null && a.lng != null ? (
              <>
                <MapaFicha lat={a.lat} lng={a.lng} etiqueta={a.direccion} />
                <p className="ayuda"><a href={mapaOsm} target="_blank" rel="noopener noreferrer">Abrir en el mapa ↗</a></p>
              </>
            ) : null}
          </div>
        ) : null}

        {r?.ultimas.length ? (
          <div>
            <h3>Lo que dicen las personas atendidas</h3>
            {r.ultimas.map((x, i) => (
              <blockquote key={i} className="perfil-cita">“{x.comentario}” <small>— {x.estrellas} de 5</small></blockquote>
            ))}
          </div>
        ) : null}
        <div className="botones">
          <Link href={href} className="btn btn-primario">Contar mi caso</Link>
        </div>
      </div>
    </article>
  );
}
