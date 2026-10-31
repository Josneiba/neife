# Neife

Sitio de la empresa **Neife** (herramientas para casos legales) y su producto **Neife Asesoría**: orientación legal general con cuentas de asesores verificados, solicitudes, biblioteca legal e informes en PDF.

Hecho con Next.js, PostgreSQL, migraciones de esquema con Prisma, correo con Resend, cifrado AES-256-GCM y sesiones propias. La app conserva SQL directo con `pg` para sus consultas actuales. **Para publicarlo, sigue [DEPLOY.md](DEPLOY.md).**

## Cómo partir (primera vez)

Necesitas Node.js 20.19 o superior.

```bash
npm install
npm run setup          # crea .env.local con claves nuevas (guárdalas)
# completa DATABASE_URL y DIRECT_URL en .env.local; en local pueden ser iguales
# configura CONTACT_EMAIL (y opcionalmente CONTACT_PHONE) antes de publicar
npm run db:migrate     # crea/actualiza el esquema desde Prisma
npm run db:setup
npm run demo           # datos falsos para probar sugerencias y pantallas
npm run dev            # abre http://localhost:3000
```

En un entorno real local, omite `npm run demo` y crea el administrador con `npm run crear-admin -- tu@correo.cl "una-contraseña-larga" "Tu nombre"`.

Para Postgres local con Docker:

```bash
docker run -d --name neife-pg -e POSTGRES_DB=neife -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:16
```

Para una base local, usa `postgres://postgres@127.0.0.1:5432/neife` como `DATABASE_URL` y `DIRECT_URL`. `npm run demo` crea un administrador (`admin@neife.test` / `AdminDemo-2026`), un asesor ya verificado (`asesor@neife.test` / `AsesorDemo-2026`), normas **inventadas** y solicitudes de ejemplo. No lo uses en producción: el comando se niega a correr si `NODE_ENV=production`.

### Esquema y migraciones

`prisma/schema.prisma` define las tablas y relaciones. La migración `prisma/migrations/0_baseline` incluye además la función `ahora()`, la columna/index GIN de búsqueda, las restricciones `CHECK` y RLS sin políticas. La app valida al iniciar que todas las migraciones versionadas estén aplicadas; no modifica el esquema al arrancar.

- Base nueva: `npm run db:migrate`.
- Base existente creada por la versión anterior: primero verifica que coincide con la baseline y respáldala; después, usando `DIRECT_URL`, ejecuta `npx prisma migrate resolve --applied 0_baseline` y `npm run db:migrate`. **No marques una base como baseline si no coincide ni ejecutes este paso sin respaldo.**
- Cambio de esquema: edita `prisma/schema.prisma`, corre `npx prisma migrate dev --name describe_el_cambio` en desarrollo, revisa el SQL generado (en especial si toca búsqueda, RLS o `ahora()`), y prueba con `npm test`.
- `npm run build` aplica migraciones pendientes con `DIRECT_URL`, genera Prisma Client y compila Next.js. En producción, configura ambas URLs antes del build.

La app todavía usa `pg` y SQL directo en sus consultas; la incorporación de Prisma en esta fase gestiona el esquema y las migraciones, sin reescribir los flujos ni los datos existentes. `docs/esquema-historico.sql` conserva el esquema anterior como referencia.

## Quién puede hacer qué

| Rol | Cómo se crea | Qué ve |
|---|---|---|
| Persona que pide asesoría | Sin cuenta (solo formulario), o con cuenta en `/registro` sin verificación | `/cuenta` y el enlace de seguimiento de cada solicitud |
| Abogado o asesor | `/registro?tipo=asesor`. Queda **en verificación** hasta que el administrador lo aprueba | `/panel`: solicitudes, informes, biblioteca (solo lectura), perfil |
| Administrador (tú) | `npm run crear-admin` | `/admin`: resumen, biblioteca legal, asesores y actividad. No ve los casos de las personas, solo cantidades |

## Recorrido

1. La persona entra a **Asesoría**, cuenta su caso (materia, región, relato) y ve **las normas que podrían aplicar**. Esa consulta no se guarda.
2. Si quiere ayuda, deja sus datos y autoriza (o no) que su informe se comparta con un abogado. Recibe un enlace de seguimiento con el avance.
3. El asesor ve el caso en **Casos** (tabla con avance, lo que falta y el siguiente paso), lo acepta y reúne los antecedentes.
4. **Preparar informe** arma una ficha tipo minuta con hechos, normas, derechos, vía habitual, plazos a verificar, prueba y preguntas para el abogado. El asesor la edita, la marca final, descarga el PDF y la entrega.
5. Con la autorización de la persona, **deriva** el caso a un abogado del rubro y lo cierra.

Etapas (el «número de avance» que ven asesor y persona): 1 Recibida, 2 En contacto, 3 Informe en curso, 4 Informe entregado, 5 Derivada, 6 Cerrada. Cada cambio queda en el historial del caso junto con las notas del asesor.

## Subir las leyes (tu parte como desarrollador)

**Desde LeyChile (recomendado).** En `/admin/biblioteca`, «Importar desde LeyChile»: escribe el número de norma o pega la dirección de la ley. El servidor descarga el XML oficial (`leychile.cl/Consulta/obtxml?opt=7&idNorma=NÚMERO`), guarda cada artículo vigente (omite los derogados) y anota la versión. En las sugerencias, la fuente lleva un enlace a la ficha oficial de BCN Ley Chile cuando la norma tiene un `idNorma` asociado. El botón «Actualizar» vuelve a descargarla cuando cambie la ley. Hay botones con normas habituales (Código del Trabajo, Ley 19.496, Ley 19.968, ley de alimentos, Código Civil); para otras, busca la ley en [LeyChile (BCN)](https://www.bcn.cl/leychile/) y copia el número que aparece como `idNorma=` en la dirección.

**Leyes base (rápido, sin internet).** En `/admin/biblioteca`, «Cargar leyes base» carga el paquete `biblioteca/base.json.gz`: 31 normas y ~4.900 artículos vigentes tomados del repositorio legalize-cl (BCN Ley Chile en Markdown). Carga en segundos y solo toca lo que cambió. Desde terminal: `npm run biblioteca -- cargar`. Para regenerar el paquete con una versión nueva del repositorio: `npm run biblioteca -- empaquetar <carpeta-legalize-cl>` (el catálogo está en `lib/legalize.ts`). **No vienen en el repositorio** y deben importarse desde LeyChile: Ley 18.101 (arriendos), 19.968 (tribunales de familia), 20.066 (VIF), 19.947 (matrimonio civil), Código Penal, Código Procesal Penal y Código de Procedimiento Civil.

**Respaldo en la web oficial (LeyChile).** Lo que el repositorio no trae se pide a LeyChile, pero solo de una lista cerrada (`lib/fuentes.ts`). En `/admin/biblioteca`, «Normas que faltan»: pegas el enlace de la ley y, **antes de guardar**, la app comprueba que el título y el número que informa LeyChile corresponden a esa norma (así un enlace equivocado no carga otra ley). Si LeyChile no responde, se dice y no se inventa nada. Una norma importada queda con su fuente y versión, y se actualiza sola. En cada artículo (consulta de la persona e informe PDF) se muestra «Fuente: BCN Ley Chile, versión del …». Mientras falte una norma de la materia, se avisa; y si falta la **norma principal** (hoy, el Código Penal para penal), a la persona no se le muestran resultados parciales.

**Los PDF ya no se suben a la biblioteca.** La lectura de PDF está solo en la ficha de cada caso (panel del abogado, sección «Documentos»): lee carta de despido, contrato, demanda, sentencia, etc.; detecta fechas, montos, RUT, causa, partes, artículos citados y líneas clave, y los pasa al borrador del informe con un botón. El archivo no se guarda: solo lo extraído, cifrado; se borra junto con el caso.

**Búsqueda.** Índice de texto + ordenamiento BM25, traducción de lenguaje cotidiano a términos legales (`lib/vocabulario.ts`) y artículos de cabecera por tema. Descarta los artículos que solo modifican otras leyes. Responde en ~40 ms. Es orientación, no una opinión legal: un abogado debe revisar lo que sugiere.

Importante:
- La importación necesita que el servidor llegue a leychile.cl. Se probó con el formato del XML, no con una descarga real desde este entorno: prueba con una ley y revisa el conteo en `/panel/biblioteca`.
- En `ejemplos/` hay normas **inventadas** (`norma-de-ejemplo.txt`, `mock-arriendos.txt`, `mock-familia.txt`) solo para probar. No son leyes.
- Un informe guarda su propia copia del texto de cada artículo: si la ley cambia, rehaz los informes que la usen.
- Los datos de cada materia en `lib/materias.ts` (derechos, vías, plazos) son un punto de partida redactado con criterio general. **Un abogado debe revisarlos** antes de usarlos con personas reales.

## Cómo busca (sin inteligencia artificial)

Cada artículo se guarda también como «raíces de palabras» en español (despedido, despido y despidos coinciden). La búsqueda compara las raíces del relato con las de cada artículo y ordena por relevancia (el índice de texto de Postgres, ordenado por relevancia). Es rápida, gratis y no envía datos a nadie. Tiene límites: no entiende sinónimos ni contexto, por eso el asesor siempre revisa y puede agregar o quitar artículos. Si más adelante quieres sumar IA, el lugar es `lib/informe.ts`. No uses servicios gratuitos que entrenen con lo que envías (por ejemplo, el nivel gratuito de Google AI Studio): usa un servicio de pago con acuerdo de no entrenamiento, o un modelo local, y envía solo texto sin datos personales.

## Seguridad: qué hay y qué no

Hay:
- **Cifrado AES-256-GCM** del relato, nombre, correo y teléfono de la persona y del contenido del informe. El formato lleva versión y el dato queda atado a su columna (no se puede copiar el texto cifrado a otra).
- Contraseñas con **bcrypt** (costo 12). Sesión en cookie `httpOnly`, `sameSite=lax` y `secure` en producción, firmada (JWT HS256). El rol y el estado se leen de la base en cada visita: si rechazas o desactivas a un asesor, pierde el acceso de inmediato.
- Cada asesor solo puede abrir **sus** solicitudes e informes (la consulta siempre filtra por su cuenta). El administrador no ve casos.
- Enlace de seguimiento con código aleatorio de 128 bits. El informe solo se descarga si el asesor lo entregó.
- Límite de intentos (login, registro, solicitudes, descargas), campo trampa anti-robots, validación de todos los datos en el servidor, y limpieza automática de RUT, correos y teléfonos que se cuelen en el relato.
- Cabeceras de seguridad (CSP, HSTS, X-Frame-Options…) en producción, y registro de acciones sensibles (tabla `auditoria`).
- `npm run limpiar -- 12` borra solicitudes cerradas o rechazadas con más de 12 meses. En Vercel esa retención también se aplica automáticamente cada mes mediante `/api/cron/limpiar`.

## Alcance y preparación antes de producción

- **Verificación del correo** al crear cuenta: no está habilitada. Los asesores se verifican **a mano** con el administrador. La recuperación de contraseña está en `/recuperar` y requiere configurar Resend para entregar los correos.
- **Segundo factor** para asesores y administrador: no implementado; requiere decidir y configurar un proveedor de identidad o una solución propia.
- **Respaldos**: configura y prueba respaldos periódicos de la base según el plan del proveedor. Guarda `DATA_ENCRYPTION_KEY` aparte. **Si la pierdes, los datos cifrados no se pueden recuperar.**
- El límite de intentos se guarda en la base de datos y vale entre instancias de Vercel. Para tráfico real, añade los controles del proveedor.
- Antes de recibir casos reales, completa la identidad legal y el correo de contacto en `/admin/terminos`, publica la versión vigente y pide a un abogado revisar `/privacidad`, `/terminos` y los textos jurídicos. Hasta entonces, el sitio no acepta solicitudes. También hace falta una revisión de seguridad independiente.

## Publicar el sitio

Paso a paso (Supabase, Vercel, Resend, Google): **[DEPLOY.md](DEPLOY.md)**. `/admin/terminos` permite revisar y publicar una nueva versión de los términos; no permite publicar mientras queden campos entre corchetes dobles. Antes de abrir al público, completa la identificación legal del responsable y pide revisión profesional de `/privacidad`, `/terminos` y `/cookies`.

## Cambiar textos y colores

- Textos de la portada y nombre: `lib/contenido.ts`. Configura `CONTACT_EMAIL` y, opcionalmente, `CONTACT_PHONE` en `.env.local` y en el proveedor de despliegue; sin esos datos no se muestra un enlace de contacto falso.
- Colores y estilos: variables al inicio de `app/globals.css`. Los botones principales son pizarra; el amarillo se usa solo en detalles chicos.
- Materias, regiones, rangos de presupuesto y los documentos y preguntas de cada materia: `lib/materias.ts`.
- Precio del informe e instrucciones de pago: cada asesor las cambia en `/panel/perfil`.

## Orden del código

```
app/                 páginas (sitio público, panel del asesor, administrador) y descargas de PDF
components/          piezas reutilizables y formularios
lib/                 base de datos, cifrado, sesiones, biblioteca legal, informe y PDF
lib/acciones/        lo que ocurre al enviar formularios (todo se valida en el servidor)
prisma/              esquema tipado y migraciones versionadas
docs/                documentación y esquema SQL histórico
scripts/             setup, migraciones, crear-admin, cambiar-clave, limpiar, demo
tests/               pruebas automáticas (npm test)
```

## Aviso legal del proyecto

Neife Asesoría es **orientación general**. Quien la preste debe presentarse con su condición real (por ejemplo, estudiante de Derecho), no redactar escritos ni representar a nadie, y no cobrar comisiones a los abogados por derivar casos sin revisar antes las reglas éticas de la profesión. Esto no es asesoría legal: confírmalo con un abogado.

## Seguimiento del CRM (última ronda)

- Cada caso registra si el abogado de destino **confirmó** que toma el caso, la fecha del **próximo contacto** y el **resultado** al cerrar (con abogado, solo informe, sin respuesta, desistió).
- `/panel` muestra un resumen (por responder, contactos vencidos, detenidos 7 días o más, por derivar, con abogado), columna de abogado y contacto, y las vistas Por derivar / Con abogado.
- La respuesta de normas a la persona se ordena en: normas que podrían favorecerle, derechos en juego, dónde se acude y plazos. El presupuesto es opcional.

## Contactos rápidos, correos y recuperación (última ronda)

- **Cuentas**: al registrarse se elige entre cliente (pedir y consultar asesorías) o abogado/asesor (gestionar un perfil profesional, sujeto a revisión). La cuenta se activa al confirmar el correo.
- **Ingreso sin contraseña**: `/ingresar/codigo` envía un código de un solo uso, válido por 10 minutos; si la cuenta aún no confirmó su correo, envía un enlace de confirmación. Los códigos tienen límite de intentos y no se guardan en texto plano.
- **Nuevo contacto** en `/panel`: nombre + teléfono o correo + materia, Enter y listo (menos de un segundo en pruebas). Queda «En contacto», con antecedentes típicos y seguimiento para mañana. «Origen y nota» es opcional.
- **Correos (Resend)**: aviso al asesor por cada solicitud nueva, confirmación a la persona con su enlace de seguimiento, verificación de cuenta, código de ingreso, recuperación de contraseña y un resumen diario (lunes a viernes, vía Vercel Cron) con cantidades, sin nombres ni relatos. Sin `RESEND_API_KEY`, los códigos y enlaces de acceso no se imprimen en la consola.
- **Recuperar contraseña**: `/recuperar` envía un enlace de un solo uso que vale 1 hora (en la base solo se guarda su huella). Responde igual exista o no la cuenta.
- **Ingreso con Google** (opcional, aparece solo si configuras `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`): OAuth con PKCE. Solo se une a una cuenta existente si Google confirma el correo. Quien entra por primera vez queda como persona (no como asesor).
- **Cargas y errores**: barra fina al cambiar de página, pantallas de carga y barras en búsquedas y subidas; los errores técnicos se traducen a frases claras (sin conexión, enlace vencido, archivo muy pesado…) y las pantallas de falla muestran un código para soporte.

## Panel del administrador (la biblioteca se mantiene sola)

El asesor solo atiende clientes; la biblioteca la mantienes tú desde `/admin`:

- **Resumen**: solicitudes de la semana, casos sin respuesta, casos con abogado conseguido, asesores, artículos; una lista de **lo que requiere atención** (materias sin leyes, normas sin revisar, errores, correos sin configurar) y el **estado del sistema** (base, cifrado, correo, tareas diarias, Google, dirección del sitio).
- **Biblioteca legal**: «Cargar leyes base» (legalize-cl), importar desde LeyChile por número o enlace, **Probar la búsqueda** (escribe un caso y ve qué artículos encontraría) y aviso de las leyes que faltan.
- **Leyes que se actualizan solas**: las importadas desde LeyChile se revisan cada día (`/api/cron/normas`); si cambió la versión se reemplazan, y te llega un correo solo si hubo cambios, derogaciones o fallas. «Revisar actualizaciones» lo hace al momento.
- **Cobertura**: por materia, documentos, artículos y cuántas consultas de las últimas semanas no encontraron nada (solo se anota la materia y si hubo resultados, nunca lo que escribió la persona). Es la guía de qué leyes subir después.
- **Actividad**: quién hizo qué y cuándo (subidas, aprobaciones, ingresos, entregas), sin contenido de casos.
