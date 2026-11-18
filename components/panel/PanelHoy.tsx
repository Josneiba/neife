import Link from "next/link";
import type { DatosHoy } from "@/lib/hoy";
import type { Visibilidad } from "@/lib/visibilidad";
import { TarjetaVisibilidad } from "./TarjetaVisibilidad";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function titulo(hoy: string) {
  const [a, m, d] = hoy.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[dt.getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

/** Panel «Hoy» del inicio del CRM: arriba en el teléfono, a la derecha en pantallas grandes. */
export function PanelHoy({ hoy, d, v, children }: { hoy: string; d: DatosHoy; v: Visibilidad | null; children?: React.ReactNode }) {
  const filas = [
    { n: d.bandeja, t: d.bandejaViejas ? `solicitudes sin tomar (${d.bandejaViejas} con más de 24 h)` : "solicitudes sin tomar", href: "/panel/bandeja", alerta: d.bandejaViejas > 0 },
    { n: d.porResponder, t: "casos tuyos por responder", href: "/panel", alerta: d.porResponder > 0 },
    { n: d.vencidos, t: "contactos vencidos", href: "/panel/crm/gestion/por_contactar", alerta: d.vencidos > 0 },
  ];
  return (
    <aside className="hoy" aria-label="Hoy">
      <section className="hoy-bloque" aria-labelledby="hoy-t">
        <header className="hoy-cab">
          <h2 id="hoy-t">Hoy</h2>
          <span>{titulo(hoy)}</span>
        </header>
        {d.citas.length === 0 ? (
          <p className="hoy-vacio">Sin citas hoy. <Link href="/panel/crm/agenda">Abrir mi agenda</Link></p>
        ) : (
          <ul className="hoy-citas">
            {d.citas.slice(0, 5).map((c) => (
              <li key={c.id}>
                <b>{c.horaIni}</b>
                <span>{c.persona || c.titulo || "Cita"}<small>{c.titulo && c.persona ? c.titulo : ""}</small></span>
                <a className="hoy-ics" href={`/api/citas/${c.id}/ics`} aria-label={`Agregar la cita de las ${c.horaIni} a mi calendario`} title="Agregar a mi calendario">＋📅</a>
              </li>
            ))}
            {d.citas.length > 5 ? <li className="hoy-mas"><Link href="/panel/crm/agenda">Ver las {d.citas.length} citas</Link></li> : null}
          </ul>
        )}
        <p className="hoy-ics-todas"><a href="/api/citas/ics">Llevar mis próximas citas a mi calendario (.ics)</a></p>
      </section>

      <section className="hoy-bloque" aria-labelledby="hoy-at">
        <header className="hoy-cab"><h2 id="hoy-at">Para atender</h2></header>
        <ul className="hoy-filas">
          {filas.map((f) => (
            <li key={f.t} data-cero={f.n === 0 ? "1" : "0"} data-alerta={f.alerta ? "1" : "0"}>
              <Link href={f.href}><b>{f.n}</b><span>{f.t}</span></Link>
            </li>
          ))}
        </ul>
        {d.plazos.length > 0 ? (
          <ul className="hoy-plazos" aria-label="Plazos por vencer">
            {d.plazos.map((p) => (
              <li key={p.id} data-tono={p.plazo.tono}>
                <Link href={`/panel/solicitudes/${p.id}`}>
                  <b>{p.plazo.texto}</b>
                  <span>{p.plazo.titulo} · {p.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {v ? <TarjetaVisibilidad v={v} compacta /> : null}
      {children}
    </aside>
  );
}
