import { EncabezadoSitio } from "@/components/EncabezadoSitio";
import { PieSitio } from "@/components/PieSitio";
import { AvisoCookies } from "@/components/AvisoCookies";

export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EncabezadoSitio />
      <main id="contenido">{children}</main>
      <AvisoCookies />
      <PieSitio />
    </>
  );
}
