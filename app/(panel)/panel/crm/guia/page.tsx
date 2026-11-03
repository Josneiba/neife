import type { Metadata } from "next";
import { GUIA_ASESORIA } from "@/lib/crm/contenido";
import { ChecklistGuia } from "@/components/crm/ChecklistGuia";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Guía de primera asesoría" };

export default function Guia() {
  return (
    <>
      <BarraApp titulo="Guía de asesoría" volver="/panel/crm" />
      <div className="crm-pagina">
        <ChecklistGuia fases={GUIA_ASESORIA} />
      </div>
    </>
  );
}
