import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neife · Casos legales",
    short_name: "Neife",
    description: "Cuenta tu caso y conecta con un abogado de la materia. Orientación legal general en Chile.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe6",
    theme_color: "#3b4848",
    lang: "es-CL",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "maskable" },
    ],
  };
}
