"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CLAVE_PREFERENCIAS = "neife_cookie_preferencia_v2";
const CLAVE_AVISO_ANTERIOR = "neife_cookie_aviso_v1";
type PreferenciaCookies = "aceptar_necesarias" | "rechazar_opcionales";

export function AvisoCookies() {
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const preferencia = localStorage.getItem(CLAVE_PREFERENCIAS);
      setVisible(!preferencia);
    } catch (error) {
      console.error("No se pudo leer la preferencia del aviso de cookies.", error);
      setError("No pudimos leer tu preferencia. Puedes elegir una opción y volver a intentarlo.");
    }
  }, []);

  function guardarPreferencia(preferencia: PreferenciaCookies) {
    try {
      localStorage.setItem(CLAVE_PREFERENCIAS, preferencia);
      setError("");
      setVisible(false);
    } catch (error) {
      console.error("No se pudo guardar la preferencia del aviso de cookies.", error);
      setError("No pudimos guardar tu elección. Revisa la configuración de almacenamiento de tu navegador e inténtalo otra vez.");
    }
  }

  if (!visible) return null;

  return (
    <aside className="aviso-cookies" aria-label="Información sobre cookies" aria-live="polite">
      <div className="contenedor aviso-cookies-interior">
        <p>
          Usamos cookies necesarias para iniciar sesión y proteger el acceso. No hay cookies opcionales de analítica o publicidad
          activas. Las necesarias seguirán funcionando. <Link href="/cookies">Revisa qué cookies usamos y para qué.</Link>
        </p>
        <div className="aviso-cookies-acciones">
          <button type="button" className="btn btn-primario btn-chico" onClick={() => guardarPreferencia("aceptar_necesarias")}>
            Aceptar necesarias
          </button>
          <button type="button" className="btn btn-secundario btn-chico" onClick={() => guardarPreferencia("rechazar_opcionales")}>
            Rechazar opcionales
          </button>
        </div>
        {error ? <p className="error-campo aviso-cookies-error" role="alert">{error}</p> : null}
      </div>
    </aside>
  );
}

export function PreferenciasCookies() {
  const [preferencia, setPreferencia] = useState<PreferenciaCookies | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_PREFERENCIAS);
      if (guardada === "aceptar_necesarias" || guardada === "rechazar_opcionales") {
        setPreferencia(guardada);
      } else if (localStorage.getItem(CLAVE_AVISO_ANTERIOR) === "aceptado") {
        setPreferencia("aceptar_necesarias");
      }
    } catch (error) {
      console.error("No se pudo leer la preferencia de cookies.", error);
      setError("No pudimos leer la preferencia guardada en este navegador.");
    }
  }, []);

  function guardar(valor: PreferenciaCookies) {
    try {
      localStorage.setItem(CLAVE_PREFERENCIAS, valor);
      localStorage.removeItem(CLAVE_AVISO_ANTERIOR);
      setPreferencia(valor);
      setError("");
    } catch (error) {
      console.error("No se pudo guardar la preferencia de cookies.", error);
      setError("No pudimos guardar tu elección. Revisa la configuración de almacenamiento de tu navegador.");
    }
  }

  return (
    <section className="preferencias-cookies" aria-labelledby="t-preferencias-cookies">
      <h2 id="t-preferencias-cookies">Tu elección en este navegador</h2>
      <p role="status">
        {preferencia === "aceptar_necesarias"
          ? "Elegiste aceptar las cookies necesarias."
          : preferencia === "rechazar_opcionales"
            ? "Elegiste rechazar las cookies opcionales. Las cookies necesarias siguen activas."
            : "Aún no has guardado una elección. Actualmente solo hay cookies necesarias."}
      </p>
      <div className="aviso-cookies-acciones">
        <button type="button" className="btn btn-primario btn-chico" onClick={() => guardar("aceptar_necesarias")}>
          Aceptar necesarias
        </button>
        <button type="button" className="btn btn-secundario btn-chico" onClick={() => guardar("rechazar_opcionales")}>
          Rechazar opcionales
        </button>
      </div>
      {error ? <p className="error-campo" role="alert">{error}</p> : null}
    </section>
  );
}
