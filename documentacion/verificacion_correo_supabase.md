# Verificacion de correo para registro sin Google

## Objetivo

Anadir un sistema de verificacion de correo para los usuarios que se registren con email y contrasena, de forma que no puedan usar la cuenta hasta confirmar que el email les pertenece.

Este flujo no seria necesario para los usuarios que entren con Google, ya que Google ya actua como proveedor de identidad verificado.

## Idea general

El flujo recomendado para este proyecto es usar **Supabase Auth** para gestionar la verificacion de correo.

La idea seria:

1. El usuario se registra con email y contrasena.
2. Supabase crea el usuario.
3. Supabase envia automaticamente un correo de verificacion.
4. El usuario pulsa el enlace del correo.
5. Supabase valida ese enlace.
6. El usuario vuelve a la aplicacion ya verificado.

De esta forma:

- el frontend no envia correos directamente
- el backend no tiene que construir tokens de verificacion manuales
- Supabase gestiona el enlace y la comprobacion del token

## Quien mandaria el correo

El correo lo mandaria **Supabase Auth**.

Hay dos escenarios:

### Entorno de prueba

Supabase ofrece un SMTP basico para pruebas, pero tiene limitaciones importantes:

- solo sirve para testing
- puede enviar a direcciones autorizadas o del equipo
- tiene limites muy bajos
- no se recomienda para produccion

### Entorno real o produccion

Para una aplicacion real se deberia configurar un **SMTP propio** en Supabase.

Ejemplos de servicios compatibles:

- Resend
- SendGrid
- Brevo
- Postmark
- AWS SES

En este caso:

- Supabase seguiria enviando el correo
- pero usaria vuestro proveedor SMTP

## Que habria que usar

Para implementar esta funcionalidad en vuestro proyecto haria falta:

### 1. Supabase Auth

Ya lo teneis como base de autenticacion, por lo que lo natural es aprovecharlo tambien para:

- registro con email y contrasena
- verificacion por correo
- reenvio del correo de confirmacion

### 2. Confirm email activado en Supabase

En la configuracion de Auth de Supabase hay que activar la confirmacion por email.

Cuando esta opcion esta activa:

- el usuario puede registrarse
- pero no obtiene una sesion util hasta confirmar el correo

### 3. SITE_URL y Redirect URLs

Hay que configurar correctamente:

- la URL principal de la aplicacion
- las URLs de redireccion permitidas

Esto es importante porque el enlace del correo llevara al usuario a una ruta de vuestra web una vez verificado.

Ejemplo conceptual:

- `https://codle-sigma.vercel.app`
- `https://codle-sigma.vercel.app/login`
- `https://codle-sigma.vercel.app/auth/callback`

## Flujo recomendado en vuestra aplicacion

### Registro normal

1. El usuario rellena email y contrasena en `Register`.
2. El frontend llama al flujo de registro con Supabase Auth.
3. Si el registro va bien:
   - no se le mete directamente en la aplicacion
   - se le muestra un mensaje de tipo:
     - "Te hemos enviado un correo de verificacion"
4. El usuario abre su email y pulsa el enlace.

### Verificacion

Cuando el usuario pulsa el enlace:

1. Supabase procesa el token del enlace.
2. Redirige al usuario a una URL configurada por vosotros.
3. El frontend detecta que el correo ya esta verificado.
4. Se le redirige a login o directamente a la app, segun el flujo que decidais.

### Reenvio del correo

Tambien conviene anadir un boton de:

- `Reenviar correo de verificacion`

Esto evita problemas si:

- el usuario no lo encuentra
- el correo tarda
- el primer enlace caduca

## Que habria que tocar en frontend

### Pantalla de registro

La pantalla de `Register` deberia:

- registrar al usuario
- mostrar mensaje de revision de correo
- no tratar el registro como login automatico

### Pantalla o estado intermedio

Seria recomendable tener un estado visual como:

- "Revisa tu correo para activar la cuenta"

Con acciones como:

- reenviar correo
- volver a login

### Posible ruta de callback

Podeis tener una ruta tipo:

- `/auth/callback`

Para capturar el regreso desde Supabase y mostrar un mensaje del tipo:

- "Tu correo ha sido verificado correctamente"

## Que habria que tocar en backend

Depende de como querais organizar la autenticacion.

### Opcion mas simple

No hacer casi nada en backend para la verificacion.

Dejar que:

- Supabase cree el usuario
- Supabase envie el correo
- Supabase valide el enlace

Y mantener vuestro backend para:

- login tradicional si lo seguis usando
- generacion de token propio si os hace falta
- acceso a endpoints de juego

### Opcion intermedia

Si quereis centralizar mas la autenticacion en FastAPI, el backend podria:

- comprobar si el usuario esta verificado antes de permitir login

Pero aun asi el envio y validacion del correo seguiria siendo mejor dejarlo en Supabase.

## Opcion recomendada para Codle

Para no complicar el proyecto, lo recomendado seria:

1. Mantener Google login como esta.
2. Para registro normal, usar verificacion por email con Supabase.
3. Configurar SMTP propio en Supabase para produccion.
4. Anadir en frontend:
   - mensaje de revisa tu correo
   - boton de reenviar correo
   - callback simple o vuelta a login

## Ventajas de hacerlo asi

- menos codigo propio
- menos riesgo de errores de seguridad
- no teneis que generar ni almacenar tokens de verificacion manualmente
- el proveedor de Auth ya resuelve el enlace y la expiracion
- es una solucion mas profesional para memoria y para despliegue

## Desventajas o puntos a tener en cuenta

- hay que configurar SMTP para produccion
- hay que ajustar bien las URLs de redireccion
- el flujo cambia respecto a un registro que loguea automaticamente

## Riesgos a evitar

No seria recomendable:

- enviar correos manualmente desde frontend
- crear un sistema propio de tokens si ya usais Supabase Auth
- desactivar la verificacion por presion de tiempo si quereis un flujo serio

## Resumen final

La forma correcta de anadir verificacion por correo en este proyecto seria:

- usar **Supabase Auth**
- activar **Confirm email**
- configurar un **SMTP propio** para produccion
- dejar que **Supabase envie el correo y valide el enlace**
- adaptar el frontend para mostrar:
  - revisa tu correo
  - reenviar verificacion
  - volver a login o confirmar la activacion

Es la opcion mas limpia, segura y realista para vuestro stack actual.

## Referencias utiles

- Supabase Auth: https://supabase.com/docs/guides/auth
- Custom SMTP en Supabase: https://supabase.com/docs/guides/auth/auth-smtp
