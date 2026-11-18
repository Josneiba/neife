import type { MetadataRoute } from "next";
import { urlSitio } from "@/lib/sitio";
import { MATERIAS } from "@/lib/materias";
import { listarAsesoresPublicos } from "@/lib/datos";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio();
  const estaticas = ["", "/asesoria", "/calculadoras", "/terminos", "/privacidad", "/cookies"].map((ruta) => ({
    url: `${base}${ruta}`,
    changeFrequency: "monthly" as const,
    priority: ruta === "" ? 1 : 0.6,
  }));
  const guias = MATERIAS.map((materia) => ({
    url: `${base}/guia/${materia.clave}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  let asesores: MetadataRoute.Sitemap = [];
  try {
    asesores = (await listarAsesoresPublicos()).map((asesor) => ({
      url: `${base}/a/${asesor.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch (error) {
    console.error("No se pudieron incluir los perfiles públicos en el sitemap.", error);
  }
  return [...estaticas, ...guias, ...asesores];
}
