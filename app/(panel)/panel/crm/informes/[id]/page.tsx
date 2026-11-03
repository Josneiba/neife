import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { CATEGORIAS_PASO, nombreEtapaCrm, nombreResultadoDerivacion } from "@/lib/crm/catalogo";
import { fechaDMA, fechaLarga, hoyLocal } from "@/lib/crm/fechas";
import { obtenerPersona } from "@/lib/crm/servicio";
import { contextoCaso, lineaTiempo } from "@/lib/crm/servicio-seguimiento";
import { nombreMateria } from "@/lib/materias";
import { BotonesInforme } from "@/components/crm/BotonesInforme";
import { BarraProgreso, Estrellas } from "@/components/crm/Piezas";
import { BarraApp } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Informe del cliente" };
export const dynamic = "force-dynamic";

const NOMBRE_ESTADO = { pendiente: "Pendiente", en_curso: "En curso", listo: "Listo", omitido: "No aplica" } as const;

/**
 * Informe de avance de un cliente, armado solo con los datos de su ficha. Está pensado para mostrarlo o
 * imprimirlo: no incluye notas internas, teléfono ni la derivación (comisiones).
 */
export default async function InformeCliente({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirAbogado();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await obtenerPersona(id, u.id);
  if (!p) notFound();
  const hoy = hoyLocal();
  const [{ ev, pasos }, linea] = await Promise.all([contextoCaso(u.id, p, hoy), lineaTiempo(u.id, p, hoy)]);
  const visibles = pasos.filter((x) => x.estado !== "omitido");
  const listos = visibles.filter((x) => x.estado === "listo").length;
  const resumen = [
    `Informe de avance — ${p.nombre}`,
    `Materia: ${nombreMateria(p.materia)} · Etapa: ${nombreEtapaCrm(p.etapa)} · Avance: ${ev.pct} %`,
    `Requisitos: ${listos} de ${visibles.length} listos.`,
    `Siguiente paso: ${ev.siguiente}`,
    p.fechaHito ? `Próxima fecha clave: ${fechaDMA(p.fechaHito)}` : "",
    `Preparado el ${fechaLarga(hoy)} por ${u.nombre ?? "su abogado"}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <div className="no-imprimir"><BarraApp titulo="Informe" subtitulo={p.nombre} volver="/panel/crm/informes" /></div>
      <div className="crm-pagina">
        <BotonesInforme resumen={resumen} />
        <article className="crm-informe-hoja">
          <h2>Informe de avance de su caso</h2>
          <p>
            <strong>{p.nombre}</strong> · {nombreMateria(p.materia)}
            <br />
            Preparado el {fechaLarga(hoy)} por {u.nombre ?? "su abogado"}
          </p>
          <p className="crm-progreso-fila">
            <BarraProgreso pct={ev.pct} etiqueta="Avance" /> <strong>{ev.pct} %</strong> · {nombreEtapaCrm(p.etapa)}
          </p>
          <h3>Qué sigue</h3>
          <p>{ev.siguiente}</p>
          {p.fechaHito ? <p>Fecha clave: <strong>{fechaDMA(p.fechaHito)}</strong></p> : null}

          <h3>Requisitos y trámites ({listos} de {visibles.length})</h3>
          {visibles.length === 0 ? (
            <p>Aún no se han definido requisitos.</p>
          ) : (
            <ul className="crm-pasos imprimible">
              {visibles.map((x) => (
                <li key={x.id} className={`paso-${x.estado}`}>
                  <strong>{x.texto}</strong>
                  <small>
                    {CATEGORIAS_PASO.find((c) => c.clave === x.categoria)?.nombre} · {NOMBRE_ESTADO[x.estado]}
                    {x.vence ? ` · plazo ${fechaDMA(x.vence)}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          )}

          <h3>Lo que se ha hecho</h3>
          {linea.historial.length === 0 ? (
            <p>Todavía no hay actuaciones registradas.</p>
          ) : (
            <ol className="crm-historial">
              {linea.historial.slice(0, 12).map((i) => (
                <li key={i.clave}>
                  <div className="crm-historial-cab">
                    <strong>{i.titulo}</strong>
                    <span>{fechaDMA(i.fecha)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {p.satisfaccion > 0 ? (
            <p>
              Su opinión: <Estrellas n={p.satisfaccion} />
            </p>
          ) : null}
          <p className="crm-ayuda">Este informe es una orientación general sobre el avance y no reemplaza la asesoría legal.</p>
        </article>
      </div>
    </>
  );
}
