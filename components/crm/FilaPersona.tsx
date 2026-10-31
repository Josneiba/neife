import Link from "next/link";
import type { PersonaCrm } from "@/lib/crm/servicio";
import { nombreHito, nombreEtapaCrm } from "@/lib/crm/catalogo";
import { fechaDMA, haceCuanto } from "@/lib/crm/fechas";
import { nombreMateria } from "@/lib/materias";
import { IconoCrm } from "./IconosCrm";

/**
 * Fila de cliente: estrella = tiene fecha de hito; punto = en asesoría. Muestra materia,
 * hito y última asesoría, como la lista de «Personen» de la referencia.
 */
export function FilaPersona({ p, hoy, extra }: { p: PersonaCrm; hoy: string; extra?: React.ReactNode }) {
  const conHito = p.fechaHito !== "";
  return (
    <li className="crm-persona">
      <Link href={`/panel/crm/clientes/${p.id}`} className="crm-persona-enlace">
        <span className={`crm-marca ${conHito || p.prioritario ? "m-estrella" : "m-punto"}`} aria-hidden="true">
          {conHito || p.prioritario ? <IconoCrm nombre="estrella" tam={22} /> : <span className="crm-circulo" />}
        </span>
        <span className="crm-persona-cuerpo">
          <span className="crm-persona-nombre">
            {p.nombre}
            <span className="crm-chip">{nombreMateria(p.materia)}</span>
            <span className="sr-only">
              {conHito || p.prioritario ? "Con fecha de hito" : nombreEtapaCrm(p.etapa)}
            </span>
          </span>
          {conHito ? (
            <span className="crm-persona-linea">
              {nombreHito(p.tipoHito)}: {fechaDMA(p.fechaHito)}
            </span>
          ) : null}
          <span className="crm-persona-linea">
            {p.ultimaAsesoria ? `Última asesoría: ${haceCuanto(p.ultimaAsesoria, hoy)}` : `${nombreEtapaCrm(p.etapa)} · sin asesorías aún`}
          </span>
        </span>
      </Link>
      {extra}
    </li>
  );
}
