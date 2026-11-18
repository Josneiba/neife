import type { MetadataRoute } from "next";
import { urlSitio } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  const base = urlSitio();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/admin", "/api/", "/cuenta", "/seguimiento/", "/seguir/", "/ingresar", "/registro", "/recuperar", "/verificar/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
