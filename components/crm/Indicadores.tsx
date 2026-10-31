import Link from "next/link";
import { metricaDe, type MetricaClave } from "@/lib/crm/catalogo";
import { porcentaje } from "@/lib/crm/vista";
import { IconoCrm } from "./IconosCrm";
import { subirMetaHoyAccion } from "@/lib/acciones/crm";

/** Tarjeta de un indicador: icono, nombre, «real/meta» y una barra fina de avance. */
export function TarjetaIndicador({
  clave,
  real,
  meta,
  href,
  ancha,
  lateral,
}: {
  clave: MetricaClave;
  real: number;
  meta: number;
  href: string;
  ancha?: boolean;
  lateral?: React.ReactNode;
}) {
  const def = metricaDe(clave);
  const pct = porcentaje(real, meta);
  const cumplida = meta > 0 && real >= meta;
  return (
    <div className={`crm-kpi${ancha ? " ancha" : ""}${cumplida ? " cumplida" : ""}`}>
      <Link href={href} className="crm-kpi-enlace" aria-label={`${def.nombre}: ${real} de ${meta}. Editar meta.`}>
        <span className="crm-kpi-icono">
          <IconoCrm nombre={def.icono} tam={28} />
        </span>
        <span className="crm-kpi-texto">
          <span className="crm-kpi-nombre">{def.corto}</span>
          <span className="crm-kpi-valor">
            {real}
            <span className="sep">/</span>
            {meta}
            {cumplida ? <IconoCrm nombre="check" tam={16} className="ok" /> : null}
          </span>
        </span>
        <span className="crm-kpi-barra" role="progressbar" aria-valuenow={real} aria-valuemin={0} aria-valuemax={Math.max(meta, 1)} aria-label={`Avance de ${def.corto}`}>
          <span style={{ width: `${pct}%` }} />
        </span>
      </Link>
      {lateral}
    </div>
  );
}

/** «Meta de hoy 0/2 [+]» junto a «Clientes nuevos». */
export function MetaHoy({ real, meta }: { real: number; meta: number }) {
  return (
    <div className="crm-lateral" aria-label="Meta de hoy">
      <Link href="/panel/crm/metas/consultas_nuevas?p=dia" className="crm-lateral-dato">
        <span className="crm-lateral-etiqueta">Meta de hoy</span>
        <span className="crm-lateral-valor">
          {real}/{meta}
        </span>
      </Link>
      <form action={subirMetaHoyAccion}>
        <button type="submit" className="crm-mas" aria-label="Subir la meta de hoy en 1" title="Subir la meta de hoy en 1">
          <IconoCrm nombre="mas" tam={18} />
        </button>
      </form>
    </div>
  );
}

/** «Meta de octubre 0/4» junto a «Mandatos firmados». */
export function MetaMes({ nombreMes, real, meta, href }: { nombreMes: string; real: number; meta: number; href: string }) {
  return (
    <Link href={href} className="crm-lateral crm-lateral-dato" aria-label={`Meta de ${nombreMes}`}>
      <span className="crm-lateral-etiqueta">Meta de {nombreMes}</span>
      <span className="crm-lateral-valor">
        {real}/{meta}
      </span>
    </Link>
  );
}
