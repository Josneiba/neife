import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotonEnviar } from "@/components/BotonEnviar";
import { requerirAbogado } from "@/lib/guards";
import { obtenerCasoAbierto, obtenerSolicitudAsesor } from "@/lib/datos";
import { espera } from "@/lib/formato";
import { nombreMateria, nombreUrgencia } from "@/lib/materias";
import { tomarCaso } from "@/lib/acciones/panel";
import { buscarConflictos } from "@/lib/conflictos";
import { plazoDe } from "@/lib/plazos";
import { AlertaConflicto } from "@/components/panel/AlertaConflicto";
import { hoyLocal } from "@/lib/crm/fechas";

export const metadata: Metadata = { title: "Solicitud abierta" };
export const dynamic = "force-dynamic";

export default async function CasoAbierto({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirAbogado();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const c = await obtenerCasoAbierto(id);
  if (!c) {
    // Si ya es mío, voy a la ficha; si lo tomó otro, vuelvo a la bandeja.
    if (await obtenerSolicitudAsesor(id, u.id)) redirect(`/panel/solicitudes/${id}`);
    redirect("/panel/bandeja?ya=1");
  }
  const conflictos = c.contraparte ? await buscarConflictos(u.id, c.contraparte) : [];
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>{nombreMateria(c.materia)}</h1>
          <span className="p-sub">Solicitud abierta · recibida hace {espera(c.creadoEn)}</span>
        </div>
      </header>
      <div className="bj-vista">
      <article className="bj-detalle">
        <dl className="bj-datos">
          <div><dt>Presupuesto</dt><dd>{c.presupuesto || "No indicado"}</dd></div>
          <div><dt>Región</dt><dd>{c.region || "No indicada"}</dd></div>
          <div><dt>Urgencia</dt><dd>{nombreUrgencia(c.urgencia)}</dd></div>
        </dl>
        <h2>Lo que cuenta la persona</h2>
        <p className="bj-relato">{c.relato}</p>
        <div className="botones">
          <form action={tomarCaso}>
            <input type="hidden" name="id" value={c.id} />
            <BotonEnviar>Tomar este caso</BotonEnviar>
          </form>
          <Link href="/panel/bandeja" className="btn btn-secundario">Volver a la bandeja</Link>
        </div>
      </article>
        <aside className="bj-lado" aria-label="Antes de tomar el caso">
          <h2>Antes de tomarlo</h2>
          <dl className="bj-datos bj-datos-col">
            <div><dt>Código</dt><dd className="bj-cod">{c.codigoSeguimiento}</dd></div>
            <div><dt>Otra parte</dt><dd>{c.contraparte || "No indicada"}</dd></div>
            {(() => {
              const pl = plazoDe(c.materia, c.fechaHecho, hoyLocal());
              return pl ? (
                <div><dt>Plazo para reclamar</dt><dd className="plazo-chip" data-tono={pl.tono}>{pl.texto} · hasta {pl.limite.split("-").reverse().join("-")}</dd></div>
              ) : null;
            })()}
          </dl>
          {(() => {
            const pl = plazoDe(c.materia, c.fechaHecho, hoyLocal());
            return pl ? <p className="ayuda">{pl.base} Sin contar feriados.</p> : null;
          })()}
          {c.contraparte ? <AlertaConflicto conflictos={conflictos} /> : null}
          <p className="ayuda">
            El nombre y los datos de contacto de la persona se muestran al tomar el caso. Al tomarlo desaparece de la bandeja de los demás asesores.
          </p>
        </aside>
      </div>
    </>
  );
}
