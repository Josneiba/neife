import type { Metadata } from "next";
import { Seccion } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Plantillas y consejos" };

const MENSAJES = [
  {
    t: "Primer contacto (persona que te escribió)",
    c: "Hola [nombre], gracias por escribirme. Soy [tu nombre], [tu condición profesional]. Leí lo que me cuentas y te puedo orientar. ¿Te acomoda que conversemos [día] a las [hora], por teléfono o videollamada?",
  },
  {
    t: "Recordatorio de asesoría",
    c: "Hola [nombre], te recuerdo que tenemos nuestra conversación el [día] a las [hora]. Si puedes, ten a mano los documentos que te mencioné (contrato, comprobantes, mensajes). Si algo cambia, avísame.",
  },
  {
    t: "Seguimiento si no responde",
    c: "Hola [nombre], quería saber cómo sigue tu situación. Si todavía quieres revisarla, aquí estoy. Si ya la resolviste, me alegra, y no te escribiré más por este tema.",
  },
  {
    t: "Después de una asesoría",
    c: "Gracias por la conversación, [nombre]. Quedamos en que [próximo paso] para el [fecha]. Cualquier duda me escribes.",
  },
];

const PRIMERA = [
  "Preséntate con tu condición real (abogado, egresado, estudiante supervisado) y explica que es orientación general.",
  "Pide el relato con sus palabras y deja que termine antes de preguntar.",
  "Aclara plazos: ¿hay audiencia, notificación o fecha límite cerca?",
  "Lista los documentos que faltan (contrato, liquidaciones, comprobantes, mensajes).",
  "Explica las vías posibles y qué no puedes hacer tú (representar, redactar escritos si no corresponde).",
  "Cierra con un próximo paso concreto y una fecha, y regístralo en el CRM.",
];

export default function Plantillas() {
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Plantillas y consejos</h1>
          <span className="p-sub">Textos para copiar y adaptar</span>
        </div>
      </header>
      <div className="crm-pagina">
        <Seccion titulo="Mensajes" id="mensajes">
          {MENSAJES.map((m) => (
            <article key={m.t} className="crm-plantilla">
              <h3>{m.t}</h3>
              <p>{m.c}</p>
            </article>
          ))}
        </Seccion>
        <Seccion titulo="Guía de primera asesoría" id="primera-asesoria">
          <ol className="crm-pasos">
            {PRIMERA.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Seccion>
        <Seccion titulo="Reglas que cuidar" id="reglas">
          <ul className="crm-pasos">
            <li>Escribe solo a quien te contactó, te fue recomendado o aceptó recibir mensajes. Revisa las normas de publicidad y captación de clientes del Código de Ética del Colegio de Abogados.</li>
            <li>Guarda solo los datos necesarios y bórralos cuando ya no los necesites.</li>
            <li>Todo lo que te cuenta el cliente es confidencial. No lo compartas sin su autorización.</li>
          </ul>
        </Seccion>
      </div>
    </>
  );
}
