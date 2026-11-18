import type { Metadata } from "next";
import { FichaAsesor } from "@/components/FichaAsesor";
import Link from "next/link";
import { listarAsesoresPublicos } from "@/lib/datos";
import { resumenResenas, tiempoRespuestaHoras } from "@/lib/resenas";

export const metadata: Metadata = {
  title: "Asesoría",
  description: "Revisa qué normas chilenas podrían aplicar a tu caso y pide contacto con un abogado.",
};

export const dynamic = "force-dynamic";

export default async function Asesoria() {
  const asesores = await listarAsesoresPublicos();
  const extras = new Map(
    await Promise.all(
      asesores.map(async (asesor) => [
        asesor.usuarioId,
        { resenas: await resumenResenas(asesor.usuarioId), horas: await tiempoRespuestaHoras(asesor.usuarioId) },
      ] as const),
    ),
  );

  return (
    <div className="contenedor">
      <div className="cabecera-pagina">
        <h1>Asesoría</h1>
        <p>Cuenta tu caso, mira qué normas podrían aplicar y pide que un asesor te conecte con un abogado.</p>
      </div>

      {asesores.length === 0 ? (
        <div className="aviso aviso-espera" role="status" style={{ marginTop: 32 }}>
          <p>Todavía no hay asesores disponibles para recibir solicitudes. Mientras tanto, puedes contar tu caso y revisar normas oficiales relacionadas.</p>
          <Link href="/asesoria/solicitar" className="btn btn-primario" style={{ marginTop: 12 }}>
            Contar mi caso
          </Link>
        </div>
      ) : (
        asesores.map((a) => <FichaAsesor key={a.usuarioId} a={a} extras={extras.get(a.usuarioId)} />)
      )}

      <section className="seccion" aria-labelledby="t-como">
        <h2 id="t-como">Cómo funciona</h2>
        <ol className="pasos">
          <li>Cuentas tu caso y ves las normas que podrían aplicar. No se guarda nada.</li>
          <li>Si quieres ayuda, dejas tus datos. El asesor revisa el caso y prepara tu informe.</li>
          <li>Recibes el informe y, con tu autorización, te conecta con un abogado del rubro.</li>
        </ol>
      </section>

      <p className="ayuda" style={{ marginTop: 40, maxWidth: 640 }}>
        Orientación general. No reemplaza a un abogado. Si tienes una audiencia o un plazo cerca, busca un abogado de inmediato.
      </p>
    </div>
  );
}
