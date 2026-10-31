# Publicar Neife (Vercel + Supabase + Resend)

Todo esto se hace una sola vez. Tiempo estimado: 30 a 40 minutos.
Neife requiere Node.js 20.19–24.x (Prisma 7). El límite superior evita que Vercel elija automáticamente una versión mayor no configurada.

## 1. Código en GitHub
Sube la carpeta a un repositorio **privado**. `.env.local` no se sube (ya está en `.gitignore`).

## 2. Base de datos: Supabase
1. Crea un proyecto en supabase.com (elige la región más cercana, por ejemplo São Paulo). Anota la contraseña de la base.
2. `Project Settings > Database > Connection string > Transaction pooler`. Copia la dirección (puerto **6543**) y reemplaza `[YOUR-PASSWORD]`. Si la clave tiene símbolos, codifícala (por ejemplo `@` se escribe `%40`).
3. Esa dirección es tu `DATABASE_URL`. Usa también la conexión directa/session (puerto **5432**) como `DIRECT_URL`, para Prisma Migrate. `npm run db:migrate` aplica el esquema; `npm run db:setup` comprueba la conexión.
4. Las tablas quedan con **RLS activado y sin políticas**: la API pública de Supabase no puede leerlas. La app entra con su conexión directa.

## 3. Correo: Resend
1. Crea cuenta en resend.com y una API key (`re_...`) → `RESEND_API_KEY`.
2. Sin dominio propio solo puedes enviar a tu propio correo (con `onboarding@resend.dev`). Para enviar a todos: `Domains > Add Domain`, pega los registros DNS que te da y luego usa `EMAIL_FROM=Neife <avisos@tudominio.cl>`.

## 4. Vercel
1. `Add New > Project`, elige el repositorio. Framework: Next.js (se detecta solo).
2. `Settings > Environment Variables`: carga todo lo de `.env.example` en Production y Preview:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la de Supabase (paso 2) |
| `DIRECT_URL` | conexión directa/session de Supabase (puerto 5432), para migraciones |
| `DATA_ENCRYPTION_KEY` | 64 caracteres hex. `npm run setup` en tu computador crea una; **no la cambies después** |
| `SESSION_SECRET` | texto largo aleatorio |
| `CRON_SECRET` | texto largo aleatorio (protege el aviso diario) |
| `SITE_URL` | `https://tu-dominio` (sin barra final) |
| `CONTACT_EMAIL` | correo público de contacto |
| `CONTACT_PHONE` | teléfono público (opcional) |
| `RESEND_API_KEY`, `EMAIL_FROM` | del paso 3 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | opcionales (paso 5) |

3. El build corre `prisma migrate deploy` usando `DIRECT_URL`. En una base que ya tenía el esquema antiguo, primero respáldala y ejecuta `npx prisma migrate resolve --applied 0_baseline` con esa URL; no lo hagas si el esquema no coincide con la baseline. Después despliega y crea el administrador desde tu computador, apuntando a la misma base:
   `npm run crear-admin -- tu@correo.cl "una-contraseña-larga" "Tu nombre"` (con `DATABASE_URL` de producción en tu `.env.local`).
4. `vercel.json` programa tareas protegidas (Vercel manda `CRON_SECRET` solo): el resumen a los asesores (lunes a viernes, 11:00 UTC ≈ 8:00 en Chile), la **revisión diaria de leyes de LeyChile** (07:00 UTC), el borrado diario de datos personales de asesorías terminadas (07:30 UTC) y la eliminación mensual de casos cerrados/rechazados con más de 12 meses (día 1, 08:00 UTC). En el plan gratuito de Vercel los cron corren una vez al día como máximo.

## 5. Ingreso con Google (opcional)
Google Cloud Console > `APIs y servicios > Credenciales > Crear ID de cliente OAuth` (aplicación web). En «URI de redirección autorizados» pon `https://tu-dominio/api/oauth/google/callback`. Copia el ID y el secreto a Vercel. El botón aparece solo cuando ambas variables existen.

## 6. Cargar las leyes (una vez)
Entra como administrador a `/admin/biblioteca`. Pulsa «Cargar leyes base» (31 normas, segundos). Luego importa desde LeyChile lo que falta (Código Penal, Ley 18.101, 19.968, 20.066, 19.947, CPC y CPP) y todo lo que quieras que se actualice solo. Antes, para los códigos grandes: (Código del Trabajo, Ley 19.496, Código Civil…): quedan **actualizándose solas**. Los PDF de cada caso los lee el abogado desde la ficha (máx. 4 MB, no se guardan). Revisa `/admin` para ver qué materias aún no tienen leyes.

## Lista antes de abrir al público
- [ ] Completar en `/admin/terminos` nombre/razón social, RUT, domicilio y correo real del responsable; publicar una versión sin campos pendientes.
- [ ] Un abogado revisó `/privacidad`, `/terminos`, `/cookies` y los textos de `lib/materias.ts`.
- [ ] `CONTACT_EMAIL` y, si corresponde, `CONTACT_PHONE` configurados con los datos públicos reales.
- [ ] Revisar que los proveedores y ubicaciones indicados en `/privacidad` coincidan con los servicios efectivamente configurados.
- [ ] Probaste que el cron de privacidad y la limpieza mensual están habilitados en Vercel.
- [ ] Copia de `DATA_ENCRYPTION_KEY` guardada fuera de Vercel.
- [ ] Probaste: enviar una solicitud, recibir el correo, aprobar un asesor, recuperar una contraseña.
- [ ] Dominio propio con HTTPS (Vercel lo da gratis).

## Límites que conviene conocer
- Plan gratuito de Supabase: la base se **pausa tras 7 días sin uso** y tiene copias diarias de pocos días. Para recibir casos reales, evalúa el plan de pago.
- Plan gratuito de Vercel Hobby: es para uso personal; un negocio debería usar el plan Pro.
- Resend gratis: 100 correos al día.

## Operación diaria (≈10 consultas y 3 clientes confirmados por semana)

- **Meta semanal**: cada asesor define su meta en *Perfil* (por defecto 3). `/panel` muestra "N de M clientes confirmados esta semana". Un cliente cuenta como confirmado cuando se marca «abogado confirmado».
- **Embudo** en `/admin`: consultas → piden contacto → contactadas → informe entregado → con abogado (30 días). Si «piden contacto» es muy bajo frente a consultas, el problema está en el texto o el flujo del formulario; si «contactadas» es bajo, en el tiempo de respuesta.
- **Monitoreo**: configura UptimeRobot (gratis) sobre `https://TU-DOMINIO/api/salud` cada 5 minutos. También evita que Supabase gratis pause el proyecto por inactividad.
- **Respaldos**: Supabase Free no incluye respaldos descargables automáticos. Una vez por semana: `pg_dump "$DATABASE_URL" > respaldo.sql` y guárdalo cifrado. **Respalda también `DATA_ENCRYPTION_KEY`** (sin ella los datos no se pueden leer).
- **Borrado por la persona**: en su enlace de seguimiento, «Borrar mis datos» elimina solicitud, informe, pendientes e historial. Queda solo una anotación de auditoría sin datos personales.
- **Correos**: al entregar el informe se avisa a la persona. Verifica un dominio en Resend, o los correos solo llegarán a tu propia dirección.

## Privacidad: borrado al terminar la asesoría

- Al pedir ayuda, la persona decide si quiere que se guarden sus datos (casilla «Guardar mis datos para ayudarme de nuevo», apagada por defecto). Puede cambiarlo o borrar todo desde su enlace de seguimiento.
- Un cron diario (`/api/cron/privacidad`, ya en `vercel.json`, protegido con `CRON_SECRET`) elimina relato, contacto, informe, antecedentes e historial de los casos terminados que no pidieron conservarse. «Terminado» = cerrado, rechazado, o derivado con abogado confirmado, más 15 días de gracia para descargar el informe (`DIAS_DE_GRACIA` en `lib/privacidad.ts`).
- Queda solo un registro anónimo (materia, etapa, fechas, resultado), así la meta semanal y el embudo siguen funcionando.
- Los términos y la política de privacidad ya lo explican; deben ser revisados por un abogado.

## Documentos legales y cookies

- Los textos públicos están en `/terminos`, `/privacidad` y `/cookies`. El panel `/admin/terminos` permite editar y publicar términos como texto plano versionado; cada solicitud registra la versión aceptada.
- La publicación rechaza el documento mientras haya campos `[[COMPLETAR: ...]]`. Sustituye todos por datos reales y solicita revisión legal antes de operar.
- Mientras los términos no estén publicados, se pueden consultar sugerencias, pero no enviar solicitudes.
- El aviso de cookies informa el uso de las cookies técnicas de sesión y autenticación OAuth. No se ha añadido analítica ni publicidad; si se incorporan cookies no esenciales, actualizar el inventario y pedir el consentimiento aplicable antes de activarlas.
- La Ley 21.719 fue publicada el 13 de diciembre de 2024; las modificaciones señaladas en su artículo primero transitorio entran en vigor el 1 de diciembre de 2026. La política distingue esa fecha de la normativa actualmente aplicable.
