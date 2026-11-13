import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotonEnviar } from "@/components/BotonEnviar";
import { requerirAbogado } from "@/lib/guards";
import { obtenerCasoAbierto, obtenerSolicitudAsesor } from "@/lib/datos";
import { espera } from "@/lib/formato";
import { nombreMateria, nombreUrgencia } from "@/lib/materias";
import { tomarCaso } from "@/lib/acciones/panel";

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
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>{nombreMateria(c.materia)}</h1>
          <span className="p-sub">Solicitud abierta · recibida hace {espera(c.creadoEn)}</span>
        </div>
      </header>
      <article className="bj-detalle">
        <dl className="bj-datos">
          <div><dt>Presupuesto</dt><dd>{c.presupuesto || "No indicado"}</dd></div>
          <div><dt>Región</dt><dd>{c.region || "No indicada"}</dd></div>
          <div><dt>Urgencia</dt><dd>{nombreUrgencia(c.urgencia)}</dd></div>
        </dl>
        <h2>Lo que cuenta la persona</h2>
        <p className="bj-relato">{c.relato}</p>
        <p className="ayuda">
          El nombre y los datos de contacto se muestran cuando tomas el caso. Al tomarlo desaparece de la bandeja de los demás asesores.
        </p>
        <div className="botones">
          <form action={tomarCaso}>
            <input type="hidden" name="id" value={c.id} />
            <BotonEnviar>Tomar este caso</BotonEnviar>
          </form>
          <Link href="/panel/bandeja" className="btn btn-secundario">Volver a la bandeja</Link>
        </div>
      </article>
    </>
  );
}
