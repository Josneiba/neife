# Cambios de seguridad

## Integrado

- Las sesiones incluyen la versión vigente de la cuenta. Restablecer una contraseña, usar `npm run cambiar-clave` o actualizar una cuenta existente con `npm run crear-admin` incrementa esa versión e invalida sus sesiones anteriores.
- La migración `20261119000000_sesion_version` agrega la versión con valor inicial `0`, por lo que las sesiones ya emitidas siguen funcionando hasta que se cambie la contraseña o los privilegios de la cuenta.
- Las conexiones a bases remotas usan TLS con validación de certificado por defecto. Los parámetros `sslmode` y `ssl` del URL se normalizan para que no desactiven esa verificación. `DB_TLS_PERMITIR_NO_VALIDO=1` permite explícitamente omitirla; no debe activarse en producción. Las conexiones locales de loopback y socket local no requieren TLS.

## Pruebas y alcance

El ZIP recibido reporta pruebas activas de autenticación, acceso entre cuentas, CSRF, inyección SQL, XSS, archivos, ReDoS, cifrado y cabeceras. Ese informe se recibió como referencia y no se reprodujo independientemente en este checkout. Las nuevas pruebas locales cubren la aceptación de sesiones existentes y su invalidación tras un cambio de versión.

El informe recibido también deja a propósito `unsafe-inline` en la CSP y señala que el registro no tiene límite de intentos por correo, aunque sí por IP. Son riesgos residuales que conviene volver a evaluar si se incorpora HTML proporcionado por usuarios o aumenta el abuso del flujo de registro.

Antes del despliegue, respalda la base, aplica las migraciones pendientes con `npm run db:migrate` y valida el entorno de producción.
