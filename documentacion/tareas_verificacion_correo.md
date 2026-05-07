# Tareas para implementar verificacion por correo

## Objetivo

Implementar verificacion por correo para los usuarios que se registren con email y contrasena, manteniendo el acceso con Google sin cambios.

## Lo que hay que hacer

### 1. Configurar Supabase Auth

En Supabase hay que:

- activar `Confirm email`
- configurar `SITE_URL`
- anadir las `Redirect URLs` permitidas

Ejemplos de URLs:

- `http://localhost:5173`
- `https://codle-sigma.vercel.app`
- una ruta de callback si se usa, por ejemplo:
  - `https://codle-sigma.vercel.app/auth/callback`

## 2. Configurar envio de correos

Para pruebas se puede usar el sistema basico de Supabase, pero para produccion habria que configurar un SMTP propio.

Opciones validas:

- Resend
- SendGrid
- Brevo
- Postmark
- AWS SES

La idea es:

- Supabase envia el correo
- no lo envia vuestro frontend
- no lo envia manualmente FastAPI

## 3. Ajustar el flujo de registro

En el registro normal con email y contrasena:

- registrar al usuario
- no meterlo directamente en la aplicacion
- mostrar un mensaje de confirmacion

Ejemplo de mensaje:

- `Te hemos enviado un correo de verificacion. Revisa tu bandeja de entrada.`

## 4. Crear estado o pantalla de espera

Despues del registro deberia existir una pantalla o bloque visual con:

- mensaje de revisa tu correo
- boton para volver a login
- boton para reenviar correo de verificacion

## 5. Implementar reenvio del correo

Anadir una accion de:

- `Reenviar correo de verificacion`

Esto sirve si:

- el usuario no encuentra el correo
- el enlace ha caducado
- el correo no llego a la primera

## 6. Decidir si usareis callback

Podeis hacerlo de dos maneras:

### Opcion simple

- el usuario pulsa el enlace
- vuelve a la aplicacion
- inicia sesion manualmente

### Opcion mas completa

- crear una ruta tipo `/auth/callback`
- mostrar ahi que el correo ya fue verificado
- redirigir luego a login o a home

## 7. Mantener Google sin cambios

No hace falta aplicar esto al login con Google.

Google ya actua como proveedor de identidad verificado, asi que la verificacion por correo solo seria para:

- registro normal con email y contrasena

## 8. Revisar acceso de usuarios no verificados

Hay que asegurar que un usuario no verificado:

- no entre directamente a la aplicacion
- no se trate como usuario activo

Esto normalmente ya lo controla Supabase si `Confirm email` esta activado, pero hay que probarlo en vuestro flujo real.

## 9. Probar casos reales

Casos que habria que probar:

- registro normal correcto
- recepcion del correo
- click en el enlace
- inicio de sesion tras verificar
- usuario que intenta entrar sin verificar
- reenvio del correo
- enlace expirado

## 10. Documentar el flujo final

Cuando este implementado, convendria dejar documentado:

- que el registro normal requiere verificacion
- que Google no la necesita
- como funciona el reenvio
- que servicio SMTP se esta usando

## Resumen corto

Las tareas reales son:

- activar confirmacion de email en Supabase
- configurar URLs de redireccion
- configurar SMTP si vais a produccion
- cambiar el flujo de `Register`
- mostrar pantalla de revisa tu correo
- anadir reenviar verificacion
- probar usuarios verificados y no verificados

