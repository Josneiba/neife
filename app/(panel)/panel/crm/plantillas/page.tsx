import type { Metadata } from "next";
import { requerirAbogado } from "@/lib/guards";
import { AVISO_ETICA, PLANTILLAS } from "@/lib/crm/contenido";
import { listarPersonas } from "@/lib/crm/servicio";
import { UsarPlantilla } from "@/components/crm/UsarPlantilla";
import { Seccion } from "@/components/crm/Piezas";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Plantillas de mensaje" };
export const dynamic = "force-dynamic";

export default async function Plantillas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const personas = await listarPersonas(u.id, {});
  return (
    <>
      <BarraApp titulo="Plantillas" />
      <div className="crm-pagina">
        <Seccion titulo="Preparar un mensaje">
          <UsarPlantilla
            plantillas={PLANTILLAS}
            personas={personas.map((p) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono }))}
            abogado={u.nombre ?? ""}
            inicial={sp.pl}
            personaInicial={Number(sp.p) > 0 ? Number(sp.p) : undefined}
          />
        </Seccion>
        <p className="crm-ayuda">{AVISO_ETICA}</p>
      </div>
    </>
  );
}
