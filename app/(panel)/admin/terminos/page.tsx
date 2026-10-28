import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/guards";
import { leerTerminos } from "@/lib/terminos";
import { EditorTerminos } from "@/components/EditorTerminos";

export const metadata: Metadata = { title: "Términos (administrador)" };
export const dynamic = "force-dynamic";

export default async function AdminTerminos() {
  await requerirAdmin();
  const documento = await leerTerminos();
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Términos y condiciones</h1>
          <span className="p-sub">
            {documento.publicado
              ? `Versión publicada ${documento.version} · ${new Date(documento.publicadoEn).toLocaleString("es-CL")}`
              : "Aún no se han publicado; se muestra el borrador base."}
          </span>
        </div>
      </header>
      <div className="aviso aviso-espera" style={{ margin: "0 0 20px" }}>
        Completa la identificación legal del responsable y el correo de contacto. Revisa el texto con un abogado antes de
        publicarlo. El contenido se guarda como texto plano; los campos pendientes entre corchetes impiden publicar.
      </div>
      <EditorTerminos contenido={documento.contenido} />
    </>
  );
}
