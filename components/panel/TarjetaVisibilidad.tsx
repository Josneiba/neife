import Link from "next/link";
import type { Visibilidad } from "@/lib/visibilidad";

/** «Cómo te ven»: un puntaje simple y lo que falta, con enlaces directos. */
export function TarjetaVisibilidad({ v, compacta = false }: { v: Visibilidad; compacta?: boolean }) {
  const faltan = v.items.filter((i) => !i.ok);
  return (
    <section className="cv" data-compacta={compacta ? "1" : "0"} aria-labelledby="cv-t">
      <header className="cv-cab">
        <h2 id="cv-t">Cómo te ven</h2>
        <span className="cv-puntaje"><b>{v.puntaje}</b>/100</span>
      </header>
      <div className="cv-barra" role="progressbar" aria-valuenow={v.puntaje} aria-valuemin={0} aria-valuemax={100} aria-label="Qué tan completo está tu perfil">
        <span style={{ width: `${v.puntaje}%` }} />
      </div>
      <div className="cv-datos">
        <div><b>{v.respuesta}</b><span>Tiempo en responder</span></div>
        <div><b>{v.resenas.total ? `${v.resenas.promedio} ★` : "—"}</b><span>{v.resenas.total} reseña{v.resenas.total === 1 ? "" : "s"}</span></div>
        <div><b>{v.porEnlace}</b><span>Llegaron por tu enlace</span></div>
      </div>
      {v.siguiente ? (
        <p className="cv-sig">
          Siguiente paso: <Link href={v.siguiente.href}>{v.siguiente.texto}</Link> <small>(+{v.siguiente.peso})</small>
        </p>
      ) : (
        <p className="cv-sig">Tu perfil está completo. Comparte tu enlace para recibir más casos.</p>
      )}
      {!compacta && faltan.length > 0 ? (
        <ul className="cv-lista">
          {v.items.map((i) => (
            <li key={i.texto} data-ok={i.ok ? "1" : "0"}>
              <span aria-hidden="true">{i.ok ? "✓" : "○"}</span>
              {i.ok ? i.texto : <Link href={i.href}>{i.texto}</Link>}
              <small>{i.peso} pts</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
