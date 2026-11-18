import type { Metadata } from "next";
import { Calculadoras } from "@/components/Calculadoras";

export const metadata: Metadata = {
  title: "Calculadoras de plazos y finiquito",
  description: "Calcula cuánto plazo te queda para reclamar y un finiquito de referencia. Gratis y sin guardar tus datos.",
};

export default function PaginaCalculadoras() {
  return (
    <div className="contenedor cal-pagina">
      <header className="cabecera-pagina">
        <h1>Calculadoras</h1>
        <p>Dos herramientas simples para saber cuánto tiempo tienes y cuánto podría corresponderte. Son orientación general, no reemplazan a un abogado.</p>
      </header>
      <Calculadoras />
    </div>
  );
}
