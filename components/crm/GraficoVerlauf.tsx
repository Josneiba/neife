import { etiquetaCorta, type Periodo } from "@/lib/crm/fechas";
import type { PuntoHistorial } from "@/lib/crm/servicio";

/**
 * «Evolución»: barras grises = meta de cada período; línea con círculos = lo logrado.
 * Es SVG dibujado en el servidor (sin librerías) y se adapta al ancho de la pantalla.
 */
export function GraficoVerlauf({ puntos, periodo, titulo }: { puntos: PuntoHistorial[]; periodo: Periodo; titulo: string }) {
  const W = 360;
  const H = 230;
  const m = { izq: 30, der: 10, arr: 14, aba: 48 };
  const max = Math.max(1, ...puntos.map((p) => Math.max(p.real, p.meta)));
  const tope = max <= 5 ? max : Math.ceil(max / 2) * 2;
  const ancho = W - m.izq - m.der;
  const alto = H - m.arr - m.aba;
  const paso = ancho / puntos.length;
  const barra = Math.min(34, paso * 0.55);
  const y = (v: number) => m.arr + alto - (v / tope) * alto;
  const x = (i: number) => m.izq + paso * i + paso / 2;
  const ticks = tope <= 5 ? Array.from({ length: tope + 1 }, (_, i) => i) : [0, tope / 2, tope];
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.real)}`).join(" ");
  const descripcion = puntos.map((p) => `${etiquetaCorta(periodo, p.inicio).join(" a ")}: ${p.real} de ${p.meta}`).join(". ");

  return (
    <figure className="crm-grafico">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}. ${descripcion}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.izq} x2={W - m.der} y1={y(t)} y2={y(t)} className="g-rejilla" />
            <text x={m.izq - 8} y={y(t) + 4} textAnchor="end" className="g-eje">
              {t}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => (
          <rect key={`b${p.inicio}`} x={x(i) - barra / 2} y={y(p.meta)} width={barra} height={Math.max(0, m.arr + alto - y(p.meta))} rx={2} className="g-meta" />
        ))}
        <path d={linea} className="g-linea" fill="none" />
        {puntos.map((p, i) => (
          <g key={`p${p.inicio}`}>
            <circle cx={x(i)} cy={y(p.real)} r={7} className="g-punto" />
            <text x={x(i)} y={y(p.real) - 12} textAnchor="middle" className="g-valor">
              {p.real}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const lineas = etiquetaCorta(periodo, p.inicio);
          return (
            <text key={`e${p.inicio}`} x={x(i)} y={H - m.aba + 18} textAnchor="middle" className="g-eje">
              {lineas.map((l, k) => (
                <tspan key={k} x={x(i)} dy={k === 0 ? 0 : 14}>
                  {l}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      <figcaption className="g-leyenda">
        <span>
          <i className="l-real" /> Logrado
        </span>
        <span>
          <i className="l-meta" /> Meta
        </span>
      </figcaption>
    </figure>
  );
}
