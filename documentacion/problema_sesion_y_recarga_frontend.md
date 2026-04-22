# Problema de sesion y recarga en frontend

## Objetivo del documento
Documentar uno de los principales problemas detectados durante el desarrollo del frontend, explicar su causa y dejar constancia de la solucion aplicada para la memoria del proyecto.

## Problema detectado

Durante las pruebas del frontend se detectaron dos comportamientos incorrectos:

1. La aplicacion no mantenia correctamente la sesion del usuario.
2. Al recargar una ruta distinta de la pantalla inicial, Vercel devolvia un error `404 NOT_FOUND`.

## 1. Problema de sesion

### Comportamiento observado

Despues de iniciar sesion, el usuario podia navegar por la aplicacion, pero al cerrar la pestaña o volver a entrar parecia que la sesion no se recuperaba correctamente.

### Causa

El token de acceso si se estaba guardando en `localStorage` durante el login, pero la aplicacion no utilizaba ese token al arrancar para decidir que rutas debian estar accesibles.

En otras palabras:

- el token se almacenaba
- pero no se comprobaba al cargar la aplicacion
- ni se controlaban las rutas segun hubiera sesion o no

### Solucion aplicada

Se actualizo `frontend/src/App.jsx` para:

- comprobar si existe `access_token` en `localStorage`
- definir rutas publicas y rutas protegidas
- impedir que un usuario sin token entre en:
  - `/home`
  - `/clasico`
  - `/logo`
  - `/codigo`
- redirigir a `/home` desde `/login` y `/register` si el usuario ya tiene sesion

### Resultado

Con este cambio:

- la aplicacion ya reutiliza el token guardado
- el usuario puede seguir navegando sin tener que iniciar sesion de nuevo de forma inmediata
- el acceso a pantallas internas queda protegido

## 2. Problema de recarga en Vercel

### Comportamiento observado

Cuando el usuario recargaba una ruta como:

- `/login`
- `/home`
- `/clasico`

Vercel devolvia:

```text
404: NOT_FOUND
```

### Causa

El frontend usa `BrowserRouter` de React Router.

En una aplicacion SPA, las rutas como `/login` o `/home` no son archivos reales del servidor, sino rutas internas del frontend.

Al recargar la pagina, Vercel intentaba resolver esa ruta directamente en el servidor. Como no existia un archivo fisico con esa ruta, devolvia `404`.

### Solucion aplicada

Se creo el archivo:

- `frontend/vercel.json`

con una configuracion de rewrite que redirige cualquier ruta al punto de entrada del frontend.

Ejemplo conceptual:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### Resultado

Con esta configuracion:

- al recargar una ruta, Vercel ya no devuelve `404`
- siempre entrega la aplicacion principal
- React Router reconstruye la pantalla correcta desde el cliente

## Ajuste adicional realizado

Durante la correccion se detecto tambien que no era deseable redirigir automaticamente desde `/` a `/home` solo por tener token guardado.

Por ello se ajusto el comportamiento para que:

- `/` siga mostrando siempre la pantalla de bienvenida
- las rutas internas sigan protegidas
- el usuario pueda elegir visualmente si quiere iniciar sesion o registrarse al entrar

## Conclusiones

El problema no estaba en un unico punto, sino en dos capas distintas:

- gestion de sesion en frontend
- configuracion del despliegue en Vercel

La correccion consistio en:

- usar el token almacenado para proteger y redirigir rutas
- añadir una configuracion de rewrite para soportar correctamente `BrowserRouter`

Con estos cambios, la aplicacion queda mejor preparada para un uso real y para su despliegue en produccion.
