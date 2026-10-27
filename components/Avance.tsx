import { ETAPAS, TOTAL_ETAPAS, avance, nombreEtapa } from "@/lib/etapas";
import { Icono } from "./Iconos";

/** Barra corta de avance para las tablas: 6 segmentos y «3/6». */
export function AvanceMini({ estado }: { estado: string }) {
  const n = avance(estado);
  if (estado === "rechazada") return <span className="av-texto av-rechazada">Rechazada</span>;
  return (
    <span className="av" title={nombreEtapa(estado)}>
      <span className="av-segmentos" aria-hidden="true">
        {ETAPAS.map((e, i) => (
          <span key={e.clave} className={i < n ? "on" : ""} />
        ))}
      </span>
      <span className="av-texto">
        {n}/{TOTAL_ETAPAS} {nombreEtapa(estado)}
      </span>
    </span>
  );
}

/** Pasos del caso con el actual marcado. Se usa en la ficha del asesor y en el seguimiento de la persona. */
export function Pasos({ estado }: { estado: string }) {
  if (estado === "rechazada") return null;
  const n = avance(estado);
  return (
    <ol className="etapas" aria-label={`Avance ${n} de ${TOTAL_ETAPAS}`}>
      {ETAPAS.map((e, i) => {
        const hecho = i + 1 < n || (i + 1 === n && estado === "cerrada");
        const actual = i + 1 === n && estado !== "cerrada";
        return (
          <li key={e.clave} className={hecho ? "hecho" : actual ? "actual" : ""} aria-current={actual ? "step" : undefined}>
            <span className="paso-marca">{hecho ? <Icono nombre="check" tam={12} /> : <span>{i + 1}</span>}</span>
            <span className="paso-nombre">{e.nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}
