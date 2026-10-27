import type { Metadata, Viewport } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";
import { BarraNavegacion } from "@/components/BarraNavegacion";

export const metadata: Metadata = {
  title: { default: "Neife · Casos legales", template: "%s | Neife" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
  description: "Cuenta tu caso, conoce qué leyes de Chile pueden favorecerte y conecta con un abogado de la materia. Orientación legal general.",
};

export const viewport: Viewport = {
  themeColor: "#3b4848",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>
        <a href="#contenido" className="saltar">
          Saltar al contenido
        </a>
        <BarraNavegacion />
        {children}
      </body>
    </html>
  );
}
