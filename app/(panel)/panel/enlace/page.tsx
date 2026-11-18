import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonCopiar } from "@/components/BotonCopiar";
import { requerirAbogado } from "@/lib/guards";
import { obtenerPerfil } from "@/lib/datos";
import { enlacePersonal, qrSvg } from "@/lib/enlace";

export const metadata: Metadata = { title: "Mi enlace y QR" };

export default async function MiEnlace() {
  const usuario = await requerirAbogado();
  const perfil = await obtenerPerfil(usuario.id);
  if (!perfil) notFound();
  const url = enlacePersonal(perfil.slug);
  const svg = await qrSvg(url);
  const mensaje = `Hola, soy ${perfil.nombre}. Si necesitas orientación legal, cuéntame tu caso aquí, es gratis: ${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  return (
    <>
      <div className="en-pagina">
        <p className="en-intro">
          Comparte este enlace en tu tarjeta, tu WhatsApp o tus redes. Quien entre cuenta su caso directo contigo y queda marcado en tu CRM como <b>«Mi enlace o QR»</b>.
        </p>
        <div className="en-grid">
          <section className="en-tarjeta" aria-labelledby="en-enlace">
            <h2 id="en-enlace">Tu enlace</h2>
            <p className="en-url">{url}</p>
            <div className="en-botones">
              <BotonCopiar texto="Copiar enlace" valor={url} />
              <a className="btn btn-secundario btn-chico" href={wa} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
              <Link className="btn btn-secundario btn-chico" href={`/a/${perfil.slug}`} target="_blank">Ver cómo se ve</Link>
            </div>
            <h3>Mensaje listo para pegar</h3>
            <p className="en-mensaje">{mensaje}</p>
            <BotonCopiar texto="Copiar mensaje" valor={mensaje} />
          </section>
          <section className="en-tarjeta en-qr" aria-labelledby="en-qr-t">
            <h2 id="en-qr-t">Tu código QR</h2>
            <div className="en-qr-img" role="img" aria-label="Código QR de tu enlace" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="crm-ayuda">Imprímelo en tu tarjeta o muéstralo desde el teléfono.</p>
            <a className="btn btn-primario btn-chico" href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download={`qr-${perfil.slug}.svg`}>Descargar QR</a>
          </section>
        </div>
        {!perfil.publicado ? (
          <p className="aviso aviso-espera" role="status">Tu perfil aún no es público: el enlace funcionará cuando publiques tu perfil.</p>
        ) : null}
      </div>
    </>
  );
}
