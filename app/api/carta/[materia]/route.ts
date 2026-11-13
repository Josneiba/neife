import PDFDocument from "pdfkit";
import { guiaDe } from "@/lib/guias";
import { limpio } from "@/lib/informe-pdf";
import { permitir } from "@/lib/ratelimit";
import { ipActual } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ materia: string }> }) {
  const guia = guiaDe((await ctx.params).materia);
  if (!guia?.carta) return new Response("No encontrado", { status: 404 });
  if (!(await permitir(`carta:${await ipActual()}`, 20, 3600 * 1000))) {
    return new Response("Demasiados intentos. Prueba más tarde.", { status: 429 });
  }
  const longitud = Number(req.headers.get("content-length") ?? 0);
  if (longitud > 16_384) return new Response("El formulario es demasiado grande.", { status: 413 });

  const formulario = await req.formData();
  const valores: Record<string, string> = {};
  for (const campo of guia.carta.campos) {
    const valor = limpio(String(formulario.get(campo.nombre) ?? "")).replace(/\s+/g, " ").trim();
    const maximo = campo.largo ? 800 : 160;
    valores[campo.nombre] = valor.slice(0, maximo);
    if (!valores[campo.nombre] && !campo.opcional) return new Response(`Falta: ${campo.etiqueta}`, { status: 400 });
  }

  const destinatario = valores[guia.carta.destinatario] ?? "";
  const fecha = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "America/Santiago",
  }).format(new Date());
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 90, bottom: 80, left: 85, right: 85 },
      info: { Title: guia.carta!.titulo, Author: valores.nombre },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Times-Roman").fontSize(12).fillColor("#000").text(`Chile, ${fecha}`, { align: "right" });
    doc.moveDown(2);
    doc.font("Times-Bold").text(`Señores ${destinatario}`);
    doc.font("Times-Roman").text("Presente");
    doc.moveDown(1.2);
    doc.font("Times-Bold").text(`Ref.: ${guia.carta!.asunto}`);
    doc.moveDown(1.2);
    for (const parrafo of guia.carta!.cuerpo(valores)) {
      doc.font("Times-Roman").text(parrafo, { align: "justify", lineGap: 4 });
      doc.moveDown(0.9);
    }
    doc.text("Sin otro particular, saluda atentamente,");
    doc.moveDown(3.5);
    const x = doc.page.margins.left;
    doc.moveTo(x, doc.y).lineTo(x + 210, doc.y).lineWidth(0.6).stroke();
    doc.moveDown(0.3);
    doc.font("Times-Bold").text(valores.nombre);
    if (valores.rut) doc.font("Times-Roman").text(`RUT ${valores.rut}`);
    doc.end();
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carta-${guia.materia}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
