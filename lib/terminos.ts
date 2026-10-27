import { getDb } from "./db";

export const TERMINOS_BASE = `# Términos y condiciones de uso de Neife

## 1. Responsable e identificación
Neife es el nombre de la plataforma operada por [[COMPLETAR: nombre o razón social del responsable, RUT, domicilio en Chile y correo de contacto]]. La identidad, los datos de contacto y la fecha de vigencia deben completarse antes de publicar estos términos.

## 2. Aceptación y alcance
Al crear una cuenta o enviar una solicitud, la persona usuaria declara haber leído y aceptado estos términos y la Política de privacidad. El consentimiento para tratar datos personales se solicita de forma expresa y separada de las autorizaciones opcionales para compartir un informe o conservar datos. La versión vigente se identifica al final de este documento.

## 3. Qué ofrece la plataforma
Neife facilita orientación inicial sobre asuntos jurídicos en Chile, búsqueda de normas que podrían ser pertinentes y, cuando la persona lo solicita, la preparación de un informe por un asesor y una posible conexión con un abogado. La información automatizada es orientativa, puede ser incompleta y no reemplaza la revisión de las fuentes oficiales ni el consejo de un profesional habilitado.

## 4. Límites de la orientación
El uso de la plataforma no crea por sí mismo una relación abogado-cliente, patrocinio, mandato ni representación. No se garantiza que una norma sugerida sea aplicable, que esté actualizada en todo momento ni que un informe determine el resultado de un caso. La persona usuaria debe verificar las normas y sus plazos en fuentes oficiales y consultar oportunamente a un abogado, especialmente si tiene una audiencia o un vencimiento próximo.

## 5. Asesores y abogados
Los asesores actúan según la condición que declaran en su perfil y son responsables de la orientación e informes que preparan. Neife revisa las cuentas de asesores antes de activarlas, pero esa revisión no equivale a certificar sus conclusiones ni a asumir su representación. Compartir un informe con un abogado requiere la autorización opcional de la persona usuaria; la relación profesional posterior se acuerda directamente con dicho abogado.

## 6. Solicitudes, cuentas y uso permitido
La persona usuaria debe entregar información veraz y no enviar datos de terceros sin autorización, salvo que sea necesario para describir el caso y exista una base legítima para hacerlo. Debe proteger sus credenciales, mantener actualizado su correo y usar la plataforma de forma lícita. No se permite interferir con su seguridad, acceder a cuentas ajenas, introducir código malicioso ni usar el servicio para fines ilícitos.

## 7. Precios y pagos
Si un asesor ofrece un servicio pagado, el precio y las condiciones aplicables deben informarse antes de contratarlo. Los pagos se coordinan directamente con el asesor, salvo que la plataforma indique expresamente otro mecanismo. Estos términos no incorporan cargos que no hayan sido informados previamente ni limitan los derechos irrenunciables reconocidos por la legislación de protección al consumidor.

## 8. Datos personales y cookies
El tratamiento de datos se explica en la Política de privacidad, que describe los datos solicitados, las finalidades, los plazos y cómo ejercer derechos. El sitio usa cookies técnicas necesarias para iniciar y mantener sesiones y proteger el flujo de acceso con Google cuando esta función está habilitada. No se usan cookies propias de publicidad ni analítica en la versión revisada. El detalle está en la Política de cookies.

## 9. Contenido, disponibilidad y cambios
La plataforma puede actualizar sus contenidos y funciones, corregir errores o suspender temporalmente el servicio por mantenimiento o seguridad. Las normas citadas deben contrastarse con el texto vigente de BCN/LeyChile. Los cambios materiales a estos términos se publicarán con una nueva fecha y versión; cuando corresponda, se volverá a solicitar aceptación antes de continuar.

## 10. Reclamos y derechos
Para consultas sobre el servicio o el ejercicio de derechos de datos, contacta a [[COMPLETAR: correo de contacto operativo]]. La persona usuaria conserva los derechos que le reconoce la legislación chilena, incluida la Ley 19.628 y, desde su entrada en vigor, las modificaciones introducidas por la Ley 21.719. También se mantienen los derechos irrenunciables establecidos por la Ley 19.496 cuando corresponda.

## 11. Legislación aplicable
Estos términos se interpretan conforme a las leyes de Chile. Ninguna cláusula pretende excluir responsabilidades o derechos que no puedan renunciarse legalmente. Las controversias se resolverán ante los tribunales competentes conforme a las reglas legales aplicables.

## Versión del documento
La versión y fecha vigentes se muestran al inicio de esta página.`;

export type DocumentoTerminos = {
  version: number;
  publicadoEn: string;
  contenido: string;
  publicado: boolean;
};

export function validarContenidoTerminos(contenido: string): string | undefined {
  if (contenido.length < 500) return "El documento es demasiado corto.";
  if (contenido.length > 30_000) return "El documento supera el máximo de 30.000 caracteres.";
  if (/\[\[[^\]]+\]\]/.test(contenido)) {
    return "Completa todos los campos entre corchetes dobles antes de publicar.";
  }
  return undefined;
}

const documentoBase: DocumentoTerminos = {
  version: 0,
  publicadoEn: "",
  contenido: TERMINOS_BASE,
  publicado: false,
};

export async function leerTerminos(): Promise<DocumentoTerminos> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT valor FROM meta WHERE clave = ?",
    args: ["terminos_publicados"],
  });
  const value = result.rows[0]?.valor;
  if (typeof value !== "string") return documentoBase;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "version" in parsed &&
      "publicadoEn" in parsed &&
      "contenido" in parsed &&
      typeof parsed.version === "number" &&
      Number.isInteger(parsed.version) &&
      typeof parsed.publicadoEn === "string" &&
      typeof parsed.contenido === "string" &&
      parsed.contenido.length >= 500
    ) {
      return {
        version: parsed.version,
        publicadoEn: parsed.publicadoEn,
        contenido: parsed.contenido,
        publicado: true,
      };
    }
    throw new Error("El documento de términos almacenado tiene un formato inválido.");
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("No se pudo leer el documento de términos publicado.", { cause: error });
    }
    throw error;
  }
}
