"use client";

import { useActionState } from "react";
import { publicarTerminos } from "@/lib/acciones/admin";
import type { EstadoForm } from "@/lib/validators";

export function EditorTerminos({ contenido }: { contenido: string }) {
  const [estado, action, pendiente] = useActionState(publicarTerminos, {} as EstadoForm);
  return (
    <form action={action} className="formulario editor-legal">
      <div className="campo">
        <label htmlFor="contenido-terminos">Documento vigente</label>
        <p className="ayuda">
          Usa encabezados con ## y separa los párrafos con una línea en blanco. No se interpreta HTML.
        </p>
        <textarea
          id="contenido-terminos"
          name="contenido"
          className="entrada editor-legal-texto"
          maxLength={30_000}
          required
          defaultValue={estado.valores?.contenido ?? contenido}
          aria-invalid={estado.error ? true : undefined}
        />
      </div>
      {estado.error ? <p className="error-campo" role="alert">{estado.error}</p> : null}
      {estado.ok ? <p className="aviso aviso-ok" role="status">{estado.ok}</p> : null}
      <button type="submit" className="btn btn-primario" disabled={pendiente}>
        {pendiente ? "Publicando…" : "Publicar nueva versión"}
      </button>
    </form>
  );
}
