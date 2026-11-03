# Neife CRM v2.1 para abogados · guía de integración

Esta es la **versión 2.1 completa** (corrige la 2.0: Inicio y Casos quedan como antes, sin títulos ni textos de relleno, y las pantallas copian la app de referencia) del módulo CRM. Reemplaza a la v1 (no es un parche): trae todos los archivos, un instalador seguro de repetir y esta guía. Se probó contra tu proyecto original (Next.js 16, React 19, Postgres): tipos sin errores, **39 pruebas automáticas pasan**, el build de producción compila y las 40 pantallas se recorrieron en el navegador con datos de demostración.

Las capturas están en `docs/capturas-crm/`.

---

## 1. Qué cambió respecto de la v1

| Lo que pediste | Cómo quedó |
|---|---|
| «Ver todos» de indicadores semanales | Lleva a **Planificación semanal → Indicadores clave** (`/panel/crm/planificacion?t=indicadores`). Ya no hay página de metas duplicada: `/panel/crm/metas` redirige ahí. |
| Planificación semanal con 3 pestañas | **Clientes** («X de Y con plan», 4 segmentos tocables), **Encontrar** (solo los planes para llegar a los indicadores; sin cifras) e **Indicadores clave**. |
| Indicadores semanal vs mensual | Semanal: filas X/Y + **registro de logros** (qué hiciste, cuándo). Mensual: **gráficos**. |
| Nada vacío ni sin función | Cada «gestión abierta» tiene su pantalla con acciones por fila: `/panel/crm/gestion/<clave>`. Más: notas de zona, plantillas (usables), guía de primera asesoría (lista marcable), consejos, informes de caso, mis casos. |
| Agenda real | Calendario con tira de días, línea de horas, línea de «ahora», vista Día/Semana; tocas un espacio vacío para agendar y tocas una cita para ver, cambiar estado, editar o borrar. |
| Botón «+» contextual | En Clientes solo agrega cliente; en Agenda/Resumen ofrece Tarea, Audiencia, Reunión, Asesoría, Contacto y Evento. |
| Mapa | Pantalla solo de mapa (**Leaflet + OpenStreetMap/relieve**), con fila de filtros, botón de capas y botón flotante que abre Notas de zona, Clientes sin ubicación y Por comuna. Un punto por cliente, con un punto por cliente, coloreado por etapa; en la ficha eliges el punto (buscar dirección, «usar mi ubicación» o arrastrar el pin). |
| Informes reales | `/panel/crm/informes`: **Casos** (avance de cada cliente + informe imprimible), **Derivaciones** (a qué colega, comisión, cómo fue el trato, conformidad), **Conformidad** y **Mes**. |
| Inicio y Casos | **Inicio** (`/panel/crm`) y **Casos** (`/panel`) quedan como antes. Los siguientes pasos, informes de avance, derivaciones y conformidad viven en **Informes** (5.º acceso de la barra inferior). |
| Ficha con Perfil / Progreso / Línea de tiempo | Banner rojo (falta) o verde (al día), % de avance, requisitos con estado, conformidad con estrellas, derivación, y línea de tiempo con lo que viene y la historia. |
| Identificación sin confundir nombres repetidos | Cada solicitud recibe un código único corto `CASO-XXXX-XXXX-XXXX`; al aceptarla, conserva el mismo código en su ficha CRM. Los clientes creados desde el panel reciben uno `CRM-XXXX-XXXX-XXXX`. Se muestra en el seguimiento, la ficha y la lista, y se busca desde Buscar, incluso sin los guiones. |
| Informes que se autogeneran | El informe del cliente se arma solo con su ficha (sin notas internas, teléfono ni comisiones). Aparece «casi listo» desde 65 % y «listo» desde 85 %. |
| Menú unificado | Menú ☰ con listas (Casos, Notificaciones, Colegas, Indicadores, Tareas, Plantillas…); barra inferior: Inicio, Agenda, Clientes, Mapa, Informes y pestañas arriba en pantalla grande. |

Mejoras que agregué por mi cuenta: notificaciones calculadas (con «Posponer» y «Descartar»), contacto rápido («Ya lo contacté»), cruce de citas avisado, citas realizadas que se convierten solas en registro e indicador, y plantillas que se rellenan con el nombre del cliente y abren WhatsApp.

---

## 2. Contenido del ZIP

Todo está en las mismas rutas de tu proyecto. Se descomprime **encima** de la raíz de Neife.

```
db/crm.sql                               esquema CRM completo (el instalador extrae la migración incremental)
lib/crm/catalogo.ts                      indicadores, etapas, tipos de cita, gestiones (lo que más editarás)
lib/crm/contenido.ts                     consejos, plantillas de mensaje, guía de primera asesoría
lib/crm/fechas.ts · vista.ts             fechas (semana lunes-domingo, hora de Chile) y ayudas
lib/crm/progreso.ts                      cálculo del % de avance y de lo que falta (función pura)
lib/crm/servicio*.ts                     lógica y consultas: clientes, citas, seguimiento, avisos, planificación, informes
lib/crm/validadores.ts                   validación de formularios (zod)
lib/acciones/crm.ts · crm2.ts            acciones de servidor
components/crm/*                         piezas visuales (calendario, mapa, formularios…)
components/panel/ShellPanel.tsx          cascarón con menú de hamburguesa
app/crm.css                              estilos del CRM y del cascarón
app/(panel)/panel/crm/**                 pantallas del CRM
instalacion/panel-layout.tsx             nuevo layout del panel (lo copia el instalador)
instalacion/panel-page.tsx               tu pantalla «Casos» original (el instalador la restaura en /panel)
scripts/instalar-crm.ts                  instalador (seguro de repetir, con --dry-run)
scripts/demo-crm.ts                      datos ficticios de demostración
tests/crm.test.ts                        pruebas
```

Los archivos `instalacion/panel-*.tsx` **no están** en su lugar final a propósito: así, al descomprimir, no se pisa tu `panel/page.tsx` ni tu `layout.tsx` antes de que el instalador los respalde.

---

## 3. Instalación (10 minutos)

1. **Respalda tu proyecto** (git commit o copia de la carpeta).
2. **Descomprime el ZIP encima de la carpeta raíz de Neife**, aceptando reemplazar archivos (reemplazará los de la v1).
3. En la raíz del proyecto:
   ```bash
   npx tsx scripts/instalar-crm.ts --dry-run   # solo muestra qué haría
   npx tsx scripts/instalar-crm.ts             # lo aplica
   npm install                                 # instala leaflet
   npm run db:migrate                          # aplica la migración incremental
   npm run typecheck
   npm run dev
   ```
4. Entra como abogado. La base de datos se actualiza con `npm run db:migrate` (ver 4).
5. Opcional, solo en desarrollo: `npm run demo:crm` carga 14 clientes ficticios, citas, requisitos, una derivación y puntos en el mapa (usuario `asesor@neife.test` / `AsesorDemo-2026`, del `npm run demo`).

### Qué hace el instalador

| Archivo | Cambio |
|---|---|
| `prisma/migrations/20261103000000_crm_v2/migration.sql` | Crea una migración incremental a partir de la sección v2 de `db/crm.sql` |
| `lib/db.ts` | No se modifica; Prisma administra y verifica las migraciones |
| `app/(panel)/panel/layout.tsx` | Nuevo cascarón (guarda copia `.bak-crm`/`.bak-crm2`) |
| `app/(panel)/panel/page.tsx` | Nuevo Resumen (guarda copia) |
| `next.config.mjs` | Agrega a la CSP `img-src https://tile.openstreetmap.org` y `connect-src https://nominatim.openstreetmap.org`, y `geolocation=(self)` |
| `package.json` | `leaflet`, `@types/leaflet` y `npm run demo:crm` |
| `components/crm/BarraCrm.tsx` | Se borra (era de la v1) |

Si algo no se reconoce, el instalador lo dice y no adivina; el paso manual correspondiente está en la sección 8.

### Si ya tenías la v1 instalada
Es el mismo procedimiento: el bloque SQL se **reemplaza** (todas las sentencias nuevas son `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`, así que **no se pierden datos** de la v1). Los clientes, interacciones, metas y tareas siguen tal cual.

La migración `20261103190000_crm_ticket_seguimiento` agrega el código único a solicitudes y clientes existentes. Al importar un caso al CRM se conserva el código de la solicitud; los clientes agregados manualmente reciben uno propio. La búsqueda por código requiere iniciar sesión en el dashboard, y el código no sustituye al enlace privado de seguimiento.

La migración `20261103200000_codigo_seguimiento_corto` acorta los códigos ya asignados y conserva el vínculo entre solicitud y cliente; las próximas solicitudes y fichas usarán el mismo formato corto.

---

## 4. Base de datos

- Tablas nuevas: `crm_citas`, `crm_pasos` (requisitos), `crm_derivaciones`, `crm_avisos_ocultos`, `crm_zona_notas`.
- Columnas nuevas en `crm_personas`: dirección, ubicación, disponibilidad, quién lo refirió, `informe_visible`, conformidad y su nota.
- **Todo dato personal va cifrado** (AES-256-GCM, con una clave de contexto distinta por campo `crm.*`): nombre, contacto, notas, dirección, **coordenadas**, títulos de citas, nombre del colega, trato de la derivación.
- Todas las consultas filtran por `abogado_id`, y las tablas `crm_*` tienen seguridad por filas (RLS) activada; una prueba automática lo verifica.
- Este proyecto administra el esquema con Prisma. En desarrollo aplica la migración con `npm run db:migrate`; el comando de producción `npm run build` también ejecuta `prisma migrate deploy`.
- Las notificaciones **no se guardan**: se calculan al abrir la pantalla. Solo se guarda lo que pospones o descartas.

---

## 5. Mapa, OpenStreetMap y privacidad

- Leaflet se carga solo en el navegador; las baldosas vienen de `tile.openstreetmap.org` y la búsqueda de direcciones de `nominatim.openstreetmap.org`.
- **El navegador del abogado envía a esos servicios** la zona que está viendo (baldosas) y el texto que escribe al buscar una dirección. Nunca se envían nombres ni datos del cliente. Aun así, la dirección de un cliente es un dato personal: infórmalo en tu política de privacidad.
- Política de uso de OSM: sirve para uso personal y de bajo volumen. Si el uso crece, contrata un proveedor de baldosas (MapTiler, Stadia, etc.) cambiando `TILES` en `components/crm/leaflet.ts` y la CSP.
- Las coordenadas se guardan **con 5 decimales (~1 m)**. Si prefieres menos precisión (p. ej. solo la comuna), reduce los decimales en `cifrarUbicacion` (`lib/crm/servicio.ts`).
- Para los puntos exactos se usa el punto que tú eliges: no se geolocaliza al cliente de forma automática.

---

## 6. Antes de usarlo con clientes reales (importante)

Soy un asistente, no un abogado: revisa esto con tu criterio y con quien corresponda.

- **Datos personales (Ley 19.628 y su actualización por la Ley 21.719).** Tienes datos de terceros, algunos sensibles por su contexto (casos penales, de familia). Define finalidad, plazo de conservación y cómo atiendes solicitudes de acceso o eliminación. «Eliminar cliente» borra la ficha y su historial; no hay un plazo automático de limpieza: defínelo tú.
- **Secreto profesional y ética.** El informe del cliente omite notas internas, teléfono y comisiones, pero **tú decides** si activas «Informe visible para el cliente» y qué le muestras. Las plantillas traen un recordatorio de revisar las normas de publicidad y captación del Código de Ética del Colegio de Abogados.
- **Comisiones por derivación.** El módulo solo **registra** lo que acordaron; revisa que el acuerdo sea compatible con las normas éticas aplicables a tu caso.
- **El informe no es asesoría legal**; el texto lo aclara al pie.
- **Respaldos.** Los datos cifrados dependen de `DATA_ENCRYPTION_KEY`: si la pierdes, no se recuperan. Respáldala fuera de la base.

---

## 7. Cómo se calculan las cosas

- **Semana:** lunes a domingo, hora de Chile (`America/Santiago`).
- **Indicadores:** se cuentan desde el libro de eventos `crm_eventos` (una fila por hecho, una sola vez por cliente donde corresponde). Borrar un registro corrige los períodos pasados.
- **Cita «realizada»:** crea el registro en el historial y suma a los indicadores. Si la devuelves a «pendiente», se borra ese registro.
- **% de avance:** `lib/crm/progreso.ts`. Pesa: contacto, materia, comuna, asesoría hecha, requisitos listos, fecha de hito, próximo paso definido, conformidad y derivación (según la etapa). Los umbrales (65 % / 85 %) están ahí; cámbialos si quieres.
- **Segmentos de «Personas» en Planificación:** `SEGMENTOS_PLAN` en `catalogo.ts`; las reglas, en `servicio-planificacion.ts`.
- **Gestiones abiertas:** `GESTIONES` en `catalogo.ts` (título, qué es, qué hacer, plantilla sugerida).

### Cambios típicos
| Quiero… | Dónde |
|---|---|
| Otro indicador o meta | `METRICAS` en `lib/crm/catalogo.ts` |
| Textos de plantillas, consejos o guía | `lib/crm/contenido.ts` |
| Requisitos sugeridos por materia | `PASOS_POR_MATERIA` en `catalogo.ts` |
| Colores del calendario/mapa | `crm.css` y `COLOR_ETAPA` en `components/crm/leaflet.ts` |
| Horario visible de la agenda | `H_INI` / `H_FIN` en `components/crm/Calendario.tsx` |

---

## 8. Pasos manuales (si el instalador no reconoce un archivo)

1. **Migración:** crea una migración Prisma nueva con los cambios incrementales de la sección v2 de `db/crm.sql`; no ejecutes todo ese archivo como migración porque incluye también las tablas v1.
2. **`next.config.mjs`:** en la CSP, `img-src 'self' data: https://tile.openstreetmap.org` y `connect-src 'self' https://nominatim.openstreetmap.org`; en Permissions-Policy, `geolocation=(self)`.
3. **Panel:** copia `instalacion/panel-layout.tsx` a `app/(panel)/panel/layout.tsx` y `instalacion/panel-page.tsx` a `app/(panel)/panel/page.tsx`.
4. `npm install leaflet@^1.9.4 && npm install -D @types/leaflet`, y luego `npm run db:migrate`.

## 9. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| «relation crm_citas does not exist» | Ejecuta `npm run db:migrate` y reinicia. |
| El mapa se ve gris | Sin internet o CSP sin `tile.openstreetmap.org` (revisa `next.config.mjs`; la CSP solo rige en producción). |
| El menú antiguo sigue apareciendo | No se copió `instalacion/panel-layout.tsx`; repite el instalador. |
| Estilos del panel rotos | Falta la clase `app` en el cascarón o no se importa `app/crm.css` en el layout. |
| Las pruebas no encuentran la base | `TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/neife npm test` |

## 10. Siguientes pasos sugeridos

Avisos por correo o push (hoy son dentro del panel), exportar informes a PDF con tu membrete (hoy: «Imprimir o guardar PDF» del navegador), y un plazo automático de conservación de datos.


## Novedades de la 2.1

Barra superior en todas las pantallas (sin títulos ni subtítulos); filtros con chips, embudo, búsqueda y vistas guardadas (se guardan en tu navegador); agenda con selector de fecha, filtro y vistas Buscar/Citas/Día/Semana/Tareas. Si venías de la 2.0, el instalador borra `/panel/casos` y restaura `/panel`.
