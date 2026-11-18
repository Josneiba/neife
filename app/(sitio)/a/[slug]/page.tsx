import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaAsesor } from "@/components/FichaAsesor";
import { obtenerAsesorPorSlug } from "@/lib/datos";
import { resumenResenas, tiempoRespuestaHoras } from "@/lib/resenas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await obtenerAsesorPorSlug(slug);
  return a ? { title: a.nombre, description: `${a.titulo}. Cuéntale tu caso y recibe orientación.` } : { title: "Asesor" };
}

/** Enlace personal del asesor (el que comparte en su tarjeta, WhatsApp o QR). */
export default async function PaginaAsesor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await obtenerAsesorPorSlug(slug);
  if (!a) notFound();
  const extras = { resenas: await resumenResenas(a.usuarioId), horas: await tiempoRespuestaHoras(a.usuarioId) };
  return (
    <div className="contenedor">
      <div className="cabecera-pagina">
        <h1>Cuenta tu caso a {a.nombre.split(" ")[0]}</h1>
        <p>Es gratis contar tu caso. {a.nombre.split(" ")[0]} lo revisa y te responde. Después puedes <Link href="/seguir">seguirlo con tu código</Link>.</p>
      </div>
      <FichaAsesor a={a} extras={extras} via />
      <p className="ayuda" style={{ marginTop: 32, maxWidth: 640 }}>
        Orientación general. No reemplaza a un abogado. Si tienes una audiencia o un plazo cerca, busca un abogado de inmediato.
      </p>
    </div>
  );
}
