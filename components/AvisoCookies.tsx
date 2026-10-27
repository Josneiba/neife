import Link from "next/link";

export function AvisoCookies() {
  return (
    <aside className="aviso-cookies" aria-label="Información sobre cookies">
      <div className="contenedor aviso-cookies-interior">
        <p>
          Este sitio usa cookies técnicas necesarias para iniciar sesión y proteger el acceso. No usamos cookies de publicidad
          ni analítica. <Link href="/cookies">Revisa qué cookies usamos y para qué.</Link>
        </p>
      </div>
    </aside>
  );
}
