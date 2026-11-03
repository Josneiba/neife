"use client";

import type { PersonaCrm } from "@/lib/crm/servicio";
import type { Derivacion } from "@/lib/crm/servicio-seguimiento";
import { BotonHoja } from "./Hoja";
import { FormFicha } from "./FormFicha";
import { FormPaso } from "./FormPaso";
import { FormDerivacion, type Colega } from "./FormDerivacion";
import { FormCita } from "./FormCita";

/** Botones «Editar», «Agregar requisito», «Derivar»…: cada uno abre su formulario en una hoja. */
export function BotonEditarFicha({ p, texto = "Editar" }: { p: PersonaCrm; texto?: string }) {
  return (
    <BotonHoja texto={texto} titulo="Editar ficha del cliente">
      {(cerrar) => <FormFicha p={p} alGuardar={cerrar} />}
    </BotonHoja>
  );
}

export function BotonAgregarPaso({ personaId }: { personaId: number }) {
  return (
    <BotonHoja texto="Agregar requisito" titulo="Nuevo requisito del caso" icono="mas">
      {(cerrar) => <FormPaso personaId={personaId} alGuardar={cerrar} />}
    </BotonHoja>
  );
}

export function BotonDerivar({ personaId, colegas, previa, hoy }: { personaId: number; colegas: Colega[]; previa: Derivacion | null; hoy: string }) {
  return (
    <BotonHoja texto={previa ? "Editar derivación" : "Derivar a un colega"} titulo={previa ? "Editar derivación" : "Derivar a un colega"} clase="btn btn-secundario btn-chico">
      {(cerrar) => <FormDerivacion personaId={personaId} colegas={colegas} previa={previa} hoy={hoy} alGuardar={cerrar} />}
    </BotonHoja>
  );
}

export function BotonAgendarCita({ personaId, personas, hoy }: { personaId: number; personas: { id: number; nombre: string }[]; hoy: string }) {
  return (
    <BotonHoja texto="Agendar cita" titulo="Agendar cita" clase="btn btn-secundario btn-chico" icono="agenda">
      {(cerrar) => <FormCita personas={personas} hoy={hoy} personaFija={personaId} alGuardar={cerrar} />}
    </BotonHoja>
  );
}
