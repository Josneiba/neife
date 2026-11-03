import Link from "next/link";
import type { PersonaCrm } from "@/lib/crm/servicio";
import { nombreHito, nombreEtapaCrm, nombreOrigenCrm } from "@/lib/crm/catalogo";
import { fechaDMA, haceCuanto } from "@/lib/crm/fechas";
import { nombreMateria } from "@/lib/materias";
import { IconoCrm } from "./IconosCrm";

/**
 * Fila de cliente: estrella = tiene fecha de hito; punto = en asesoría. Muestra materia,
 * hito y última asesoría, como la lista de «Personen» de la referencia.
 */
export function FilaPersona({ p, hoy, extra, campos = ["materia", "hito", "asesoria"] }: { p: PersonaCrm; hoy: string; extra?: React.ReactNode; campos?: string[] }) {
  const conHito = p.fechaHito !== "";
  const ve = (c: string) => campos.includes(c);
  return (
    <li className="crm-persona">
      <Link href={`/panel/crm/clientes/${p.id}`} className="crm-persona-enlace">
        <span className={`crm-marca ${conHito || p.prioritario ? "m-estrella" : "m-punto"}`} aria-hidden="true">
          {conHito || p.prioritario ? <IconoCrm nombre="estrella" tam={22} /> : <span className="crm-circulo" />}
        </span>
        <span className="crm-persona-cuerpo">
          <span className="crm-persona-nombre">
            {p.nombre}
            {ve("materia") ? <span className="crm-chip">{nombreMateria(p.materia)}</span> : null}
            <span className="sr-only">
              {conHito || p.prioritario ? "Con fecha de hito" : nombreEtapaCrm(p.etapa)}
            </span>
          </span>
          <span className="crm-persona-linea">Código: {p.codigoSeguimiento}</span>
          {conHito && ve("hito") ? (
            <span className="crm-persona-linea">
              {nombreHito(p.tipoHito)}: {fechaDMA(p.fechaHito)}
            </span>
          ) : null}
          {ve("contacto") && (p.telefono || p.email) ? <span className="crm-persona-linea">{[p.telefono, p.email].filter(Boolean).join(" · ")}</span> : null}
          {ve("zona") && (p.comuna || p.region) ? <span className="crm-persona-linea">{[p.comuna, p.region].filter(Boolean).join(", ")}</span> : null}
          {ve("origen") ? <span className="crm-persona-linea">Llegó por: {nombreOrigenCrm(p.origen)}</span> : null}
          {ve("asesoria") ? <span className="crm-persona-linea">
            {p.ultimaAsesoria ? `Última asesoría: ${haceCuanto(p.ultimaAsesoria, hoy)}` : `${nombreEtapaCrm(p.etapa)} · sin asesorías aún`}
          </span> : null}
        </span>
      </Link>
      {extra}
    </li>
  );
}
