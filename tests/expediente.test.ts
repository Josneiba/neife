import assert from "node:assert/strict";
import { test } from "node:test";
import { contenidoVacio, type Solicitud } from "../lib/datos";
import { calcularAvance, type Expediente } from "../lib/expediente";
import { generarExpedientePdf } from "../lib/expediente-pdf";

function expedienteBase(): Expediente {
  const solicitud: Solicitud = {
    id: 1,
    codigo: "PRUEBA123",
    codigoSeguimiento: "CASO-ABCD-EFGH-IJKL",
    asesorId: 7,
    clienteId: null,
    materia: "civil",
    region: "Metropolitana",
    urgencia: "normal",
    presupuesto: "",
    relato: "Relato de prueba.",
    nombre: "Persona de prueba",
    email: "persona@example.test",
    telefono: "",
    estado: "nueva",
    motivoRechazo: "",
    derivarOk: false,
    conservarDatos: false,
    anonimizada: false,
    abogadoDestino: "",
    abogadoConfirmado: false,
    proximoContacto: "",
    resultado: "",
    origen: "web",
    creadoEn: "2026-11-13",
    actualizadoEn: "2026-11-13",
  };
  return {
    solicitud,
    asesor: null,
    informe: null,
    pendientes: [],
    documentosLeidos: [],
    persona: null,
    actuaciones: [],
  };
}

test("el avance del expediente aumenta con los hitos registrados", () => {
  const e = expedienteBase();
  assert.equal(calcularAvance(e).porcentaje, 11);

  e.solicitud.estado = "aceptada";
  e.actuaciones.push({ fecha: "2026-11-13", titulo: "Contacto", detalle: "Llamada", interna: true });
  e.documentosLeidos.push("contrato.pdf");
  const c = contenidoVacio();
  c.objeto = "Revisar el contrato";
  c.resumen = "Hechos del caso";
  c.derechos.push("Derecho de prueba");
  c.vias = "Presentar una acción";
  c.plazos = "Dentro del plazo legal";
  c.conclusiones = "Conclusión de prueba";
  e.informe = { contenido: c, entregado: true, actualizadoEn: "2026-11-13" };

  const avance = calcularAvance(e);
  assert.equal(avance.porcentaje, 100);
  assert.equal(avance.etapa, "Informe final");
});

test("la copia para la persona omite las notas internas del expediente", async () => {
  const e = expedienteBase();
  e.actuaciones = [
    { fecha: "2026-11-13", titulo: "Cambio de etapa: Recibida", detalle: "", interna: false },
    { fecha: "2026-11-13", titulo: "Nota del caso", detalle: "Nota interna confidencial", interna: true },
  ];

  const { extractText, getDocumentProxy } = await import("unpdf");
  const paraPersona = await generarExpedientePdf(e, { paraPersona: true });
  assert.equal(paraPersona.subarray(0, 4).toString("ascii"), "%PDF");
  const pdfPersona = await getDocumentProxy(new Uint8Array(paraPersona));
  const textoPersona = await extractText(pdfPersona, { mergePages: true });
  const textoParaPersona = Array.isArray(textoPersona.text) ? textoPersona.text.join("\n") : textoPersona.text;
  assert.doesNotMatch(textoParaPersona, /Nota interna confidencial/);

  const interno = await generarExpedientePdf(e, { paraPersona: false });
  const pdfInterno = await getDocumentProxy(new Uint8Array(interno));
  const textoInterno = await extractText(pdfInterno, { mergePages: true });
  const textoParaAsesor = Array.isArray(textoInterno.text) ? textoInterno.text.join("\n") : textoInterno.text;
  assert.match(textoParaAsesor, /Nota interna confidencial/);
});
