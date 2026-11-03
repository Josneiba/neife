import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { gestionDe, nombreEtapaCrm, tipoCita } from "@/lib/crm/catalogo";
import { fechaDMA, haceCuanto, hoyLocal } from "@/lib/crm/fechas";
import { listaGestion } from "@/lib/crm/servicio-avisos";
import { contactoRapidoAccion, etapaRapidaAccion, posponerContactoAccion } from "@/lib/acciones/crm2";
import { nombreMateria } from "@/lib/materias";
import { Vacio } from "@/components/crm/Piezas";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Gestión" };
export const dynamic = "force-dynamic";

export default async function Gestion({ params }: { params: Promise<{ clave: string }> }) {
  const u = await requerirAbogado();
  const g = gestionDe((await params).clave);
  if (!g) notFound();
  const hoy = hoyLocal();
  const { personas, citas } = await listaGestion(u.id, g.clave, hoy);
  const n = personas.length + citas.length;
  return (
    <>
      <BarraApp titulo={g.titulo} subtitulo={`${n}`} volver="/panel/crm" />
      <div className="crm-pagina">
        {n === 0 ? <Vacio>Nada pendiente aquí. ¡Buen trabajo!</Vacio> : null}

        {citas.length > 0 ? (
          <ul className="crm-gestion-lista">
            {citas.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.persona || c.titulo || tipoCita(c.tipo).nombre}</strong>
                  <small>
                    {fechaDMA(c.fecha)} · {c.horaIni} · {tipoCita(c.tipo).nombre}
                  </small>
                </div>
                <div className="crm-acciones-fila">
                  <Link href={`/panel/crm/agenda?d=${c.fecha}`} className="btn btn-secundario btn-chico">Ver en agenda</Link>
                  {c.personaId ? <Link href={`/panel/crm/plantillas?pl=${g.plantilla}&p=${c.personaId}`} className="btn btn-secundario btn-chico">Enviar recordatorio</Link> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {personas.length > 0 ? (
          <ul className="crm-gestion-lista">
            {personas.map((p) => (
              <li key={p.id}>
                <div>
                  <Link href={`/panel/crm/clientes/${p.id}`}>
                    <strong>{p.nombre}</strong>
                  </Link>
                  <small>
                    {nombreMateria(p.materia)} · {nombreEtapaCrm(p.etapa)}
                    {p.fechaHito ? ` · hito ${fechaDMA(p.fechaHito)}` : ""}
                    {p.ultimaAsesoria ? ` · última asesoría ${haceCuanto(p.ultimaAsesoria, hoy)}` : ""}
                  </small>
                </div>
                <div className="crm-acciones-fila">
                  <Link href={`/panel/crm/plantillas?pl=${g.plantilla}&p=${p.id}`} className="btn btn-primario btn-chico">Escribir</Link>
                  <form action={contactoRapidoAccion}>
                    <input type="hidden" name="persona_id" value={p.id} />
                    <input type="hidden" name="dias_siguiente" value="7" />
                    <button type="submit" className="btn btn-secundario btn-chico" title="Anota un contacto hoy y programa el siguiente en 7 días">Ya lo contacté</button>
                  </form>
                  <form action={posponerContactoAccion}>
                    <input type="hidden" name="persona_id" value={p.id} />
                    <input type="hidden" name="dias" value="3" />
                    <button type="submit" className="btn btn-secundario btn-chico">Posponer 3 días</button>
                  </form>
                  {g.clave === "mandatos_por_firmar" ? (
                    <form action={etapaRapidaAccion}>
                      <input type="hidden" name="persona_id" value={p.id} />
                      <input type="hidden" name="etapa" value="mandato" />
                      <button type="submit" className="btn btn-secundario btn-chico">Mandato firmado</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
