import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { avisos } from "@/lib/crm/servicio-avisos";
import { AvisoCard } from "@/components/crm/AvisoCard";
import { Vacio } from "@/components/crm/Piezas";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "Notificaciones" };
export const dynamic = "force-dynamic";

export default async function Notificaciones({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const verOcultos = sp.o === "1";
  const lista = await avisos(u.id, { incluirOcultos: verOcultos });
  return (
    <>
      <BarraApp titulo="Notificaciones" volver="/panel/crm" acciones={<IconoBarra href={verOcultos ? "/panel/crm/notificaciones" : "/panel/crm/notificaciones?o=1"} icono={verOcultos ? "check" : "lista"} etiqueta={verOcultos ? "Ocultar los pospuestos" : "Mostrar también los pospuestos"} />} />
      <div className="crm-pagina">
        {lista.length === 0 ? (
          <Vacio>Todo al día. Aquí aparecerán citas de hoy, plazos, clientes sin seguimiento y requisitos pendientes.</Vacio>
        ) : (
          <ul className="crm-avisos">
            {lista.map((a) => (
              <AvisoCard key={a.clave} a={a} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
