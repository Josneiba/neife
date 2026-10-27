import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPerfil } from "@/components/formularios";
import { requerirAbogado } from "@/lib/guards";
import { obtenerPerfil } from "@/lib/datos";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function MiPerfil() {
  const u = await requerirAbogado();
  const p = await obtenerPerfil(u.id);
  if (!p) notFound();
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Mi perfil</h1>
          <span className="p-sub">
            Lo que ven las personas en <Link href="/asesoria">Asesoría</Link>
          </span>
        </div>
      </header>
      <div className="p-cuerpo" style={{ maxWidth: 760 }}>
        <FormPerfil
          inicial={{
            nombre: p.nombre,
            titulo: p.titulo,
            registro: p.registro,
            ubicacion: p.ubicacion,
            bio: p.bio,
            precioInforme: p.precioInforme,
            metaSemanal: p.metaSemanal,
            instruccionesPago: p.instruccionesPago,
            materias: p.materias,
            publicado: p.publicado,
          }}
        />
      </div>
    </>
  );
}
