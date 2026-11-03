"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TipoCita } from "@/lib/crm/catalogo";
import { FormCliente, FormInteraccion, FormTarea } from "./AccionesRapidas";
import { FormCita } from "./FormCita";
import { FormPaso } from "./FormPaso";
import { Hoja } from "./Hoja";
import { IconoCrm, type NombreIconoCrm } from "./IconosCrm";

type Opcion = { id: number; nombre: string };
type Forma = "cliente" | "asesoria" | "reunion" | "contacto" | "tarea" | "cita" | "paso" | `cita:${TipoCita}`;

type Accion = { forma: Forma; texto: string; icono: NombreIconoCrm };

const TITULOS: Record<string, string> = {
  cliente: "Nuevo cliente",
  asesoria: "Registrar asesoría realizada",
  reunion: "Registrar reunión o audiencia",
  contacto: "Registrar contacto",
  tarea: "Nueva tarea",
  cita: "Agendar cita",
  paso: "Nuevo requisito del caso",
  "cita:asesoria": "Agendar asesoría",
  "cita:reunion": "Agendar reunión",
  "cita:audiencia": "Agendar audiencia",
  "cita:contacto": "Agendar contacto",
  "cita:evento": "Nuevo evento",
};

const GENERAL: Accion[] = [
  { forma: "cita", texto: "Agendar cita", icono: "agenda" },
  { forma: "tarea", texto: "Tarea", icono: "tarea" },
  { forma: "contacto", texto: "Contacto", icono: "mensaje" },
  { forma: "reunion", texto: "Reunión o audiencia", icono: "balanza" },
  { forma: "asesoria", texto: "Asesoría realizada", icono: "birrete" },
  { forma: "cliente", texto: "Cliente", icono: "usuario-mas" },
];
const AGENDA: Accion[] = [
  { forma: "tarea", texto: "Tarea", icono: "tarea" },
  { forma: "cita:audiencia", texto: "Audiencia", icono: "balanza" },
  { forma: "cita:reunion", texto: "Reunión", icono: "usuarios" },
  { forma: "cita:asesoria", texto: "Asesoría", icono: "birrete" },
  { forma: "cita:contacto", texto: "Contacto", icono: "mensaje" },
  { forma: "cita:evento", texto: "Evento", icono: "agenda" },
];
const PERSONA: Accion[] = [
  { forma: "tarea", texto: "Tarea", icono: "tarea" },
  { forma: "paso", texto: "Requisito", icono: "documento" },
  { forma: "cita", texto: "Agendar cita", icono: "agenda" },
  { forma: "contacto", texto: "Contacto", icono: "mensaje" },
  { forma: "asesoria", texto: "Asesoría realizada", icono: "birrete" },
];

const SIN_BOTON = [/^\/panel\/crm\/informes/, /^\/panel\/crm\/notificaciones/, /^\/panel\/crm\/zonas/, /^\/panel\/crm\/buscar/, /^\/panel\/crm\/clientes\/filtro/, /^\/panel\/crm\/plantillas/, /^\/panel\/crm\/guia/, /^\/panel\/crm\/consejos/];

/**
 * Botón «+» que cambia según donde estés:
 *  - Clientes y Mapa: solo «Agregar cliente».
 *  - Ficha de un cliente: acciones de ESE cliente.
 *  - Agenda: lo que se agenda (tarea, audiencia, reunión, asesoría, contacto, evento).
 *  - Resto: acciones generales.
 */
export function FabCrm({ personas, hoy }: { personas: Opcion[]; hoy: string }) {
  const pathname = usePathname();
  const q = useSearchParams();
  const [abierto, setAbierto] = useState(false);
  const [forma, setForma] = useState<Forma | null>(null);

  useEffect(() => {
    setAbierto(false);
    setForma(null);
  }, [pathname]);

  const enPanel = pathname.startsWith("/panel/crm");
  if (!enPanel || SIN_BOTON.some((r) => r.test(pathname))) return null;

  const ficha = /^\/panel\/crm\/clientes\/(\d+)/.exec(pathname);
  const personaId = ficha ? Number(ficha[1]) : undefined;
  const soloCliente = pathname === "/panel/crm/clientes";
  const acciones = personaId ? PERSONA : pathname.startsWith("/panel/crm/agenda") ? AGENDA : GENERAL;
  const fechaUrl = q.get("d");
  const fechaInicial = fechaUrl && /^\d{4}-\d{2}-\d{2}$/.test(fechaUrl) ? fechaUrl : hoy;
  const cerrar = () => {
    setForma(null);
    setAbierto(false);
  };

  function formulario(f: Forma) {
    if (f === "cliente") return <FormCliente />;
    if (f === "tarea") return <FormTarea personas={personas} hoy={hoy} personaId={personaId} />;
    if (f === "asesoria" || f === "reunion" || f === "contacto") return <FormInteraccion forma={f} personas={personas} hoy={hoy} personaId={personaId} />;
    if (f === "paso" && personaId) return <FormPaso personaId={personaId} alGuardar={cerrar} />;
    if (f === "cita") return <FormCita personas={personas} hoy={hoy} personaFija={personaId} inicial={{ fecha: fechaInicial }} alGuardar={cerrar} />;
    if (f.startsWith("cita:")) return <FormCita personas={personas} hoy={hoy} tipoFijo={f.slice(5) as TipoCita} personaFija={personaId} inicial={{ fecha: fechaInicial }} alGuardar={cerrar} />;
    return null;
  }

  return (
    <>
      {abierto && !forma ? <button type="button" className="crm-velo" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} /> : null}
      <div className="crm-fab-zona">
        {abierto && !forma && !soloCliente ? (
          <ul className="crm-fab-lista" aria-label="Acciones rápidas">
            {acciones.map((a) => (
              <li key={a.forma}>
                <button type="button" className="crm-fab-item" onClick={() => setForma(a.forma)}>
                  <IconoCrm nombre={a.icono} tam={20} />
                  {a.texto}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="crm-fab"
          aria-expanded={soloCliente ? undefined : abierto}
          aria-label={soloCliente ? "Agregar cliente" : abierto ? "Cerrar acciones rápidas" : "Abrir acciones rápidas"}
          title={soloCliente ? "Agregar cliente" : undefined}
          onClick={() => {
            if (soloCliente) return setForma("cliente");
            setForma(null);
            setAbierto((a) => !a);
          }}
        >
          <IconoCrm nombre={abierto && !soloCliente ? "cerrar" : soloCliente ? "usuario-mas" : "mas"} tam={26} />
        </button>
      </div>
      <Hoja titulo={forma ? (TITULOS[forma] ?? "") : ""} abierta={!!forma} cerrar={cerrar}>
        {forma ? formulario(forma) : null}
      </Hoja>
    </>
  );
}
