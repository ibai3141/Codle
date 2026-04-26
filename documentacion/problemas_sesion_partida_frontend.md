# Problemas de sesion y recuperacion de partida en frontend

## Contexto

Durante el desarrollo de la aplicacion se detectaron varios problemas relacionados con la persistencia de sesion del usuario y con la recuperacion de partidas en curso desde el frontend.

Estos fallos aparecian sobre todo al:

- cerrar la pestaña o el navegador y volver a entrar
- cambiar de usuario en el mismo navegador
- intentar entrar en una ruta protegida con un token ya expirado
- reanudar una partida del modo clasico guardada previamente

El objetivo de esta correccion fue mejorar la coherencia entre el estado de autenticacion del frontend, la validez real del token y la recuperacion de la partida del usuario correcto.

## Problemas detectados

### 1. El frontend consideraba valida cualquier sesion con token guardado

El frontend comprobaba la sesion activa solo verificando si existia un `access_token` en `localStorage`.

Esto provocaba que:

- un token expirado siguiera tratandose como si fuera valido
- el usuario no pudiera volver a la pantalla de login
- la aplicacion permitiera entrar a rutas protegidas aunque el backend ya no aceptara ese token

En la practica, el token seguia existiendo en el navegador, pero ya no era util para autenticarse correctamente.

### 2. No habia cierre automatico de sesion al recibir un 401

Cuando el backend respondia con un error `401 Unauthorized`, el frontend mostraba un error, pero no cerraba la sesion automaticamente.

Esto generaba una situacion inconsistente:

- el usuario parecia seguir logueado en la interfaz
- pero las peticiones reales ya no eran validas

### 3. La partida del modo clasico se guardaba con una clave global

La partida activa del modo clasico se almacenaba en `localStorage` con una unica clave fija:

`clasico_partida_id`

Esto suponia un problema importante cuando varias cuentas usaban el mismo navegador, ya que:

- solo podia existir una referencia guardada
- un segundo usuario podia sobrescribir la partida del primero
- al volver a iniciar sesion con el usuario original, el frontend ya no sabia que partida recuperar

### 4. La sesion y las partidas guardadas no se limpiaban de forma centralizada

La aplicacion eliminaba el token en algunos puntos concretos, pero no existia una logica comun para:

- limpiar el token
- limpiar partidas guardadas
- invalidar estado residual al cerrar sesion o expirar el token

Esto hacia mas facil que quedaran datos antiguos en el navegador.

## Solucion aplicada

Para resolver estos problemas se implemento una estrategia comun de gestion de sesion en frontend.

### 1. Creacion de un helper comun de sesion

Se creo el archivo:

- [session.js](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/src/utils/session.js)

Este modulo centraliza la logica de:

- guardar token
- obtener token valido
- comprobar expiracion del JWT
- obtener el identificador del usuario desde el token
- cerrar sesion completamente
- limpiar partidas guardadas
- construir claves de almacenamiento por modo y usuario

Con esto se evita repetir logica y se garantiza un comportamiento mas consistente en toda la aplicacion.

### 2. Validacion real de la sesion

En lugar de considerar que hay sesion simplemente porque existe un token en `localStorage`, ahora se comprueba si:

- el token existe
- el token sigue siendo valido
- el tiempo de expiracion del JWT no ha sido superado

Si el token ha expirado:

- se limpia la sesion
- se eliminan partidas guardadas
- el usuario deja de ser considerado autenticado

### 3. Manejo global del error 401

En la capa comun de peticiones HTTP del frontend se incorporo un control para detectar respuestas `401`.

Cuando ocurre:

- se limpia el token
- se eliminan las partidas guardadas
- el usuario es redirigido a `/login`

De este modo, si el backend invalida la sesion, la interfaz tambien lo refleja automaticamente.

### 4. Almacenamiento de partidas por usuario y por modo

La partida del clasico dejo de guardarse con una clave fija y paso a almacenarse con una clave dependiente del usuario autenticado.

El nuevo enfoque sigue esta idea:

- `clasico_partida_id_<usuario>`

Esto permite que:

- distintos usuarios no se pisen entre si
- cada cuenta mantenga su propia referencia local a la partida
- el frontend recupere la partida adecuada segun el usuario que ha iniciado sesion

### 5. Limpieza completa al cerrar sesion

Se unifico tambien la logica del cierre manual de sesion.

Ahora, al cerrar sesion:

- se borra el token
- se borran las partidas guardadas
- el frontend vuelve al estado inicial

Esto evita que la siguiente cuenta herede referencias antiguas.

## Archivos modificados

Los cambios principales se aplicaron en:

- [session.js](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/src/utils/session.js)
- [App.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/src/App.jsx)
- [api.js](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/api/api.js)
- [Login.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Login.jsx)
- [Home.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Home.jsx)
- [Clasico.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Clasico.jsx)

## Resultado

Tras esta correccion:

- un token expirado ya no se considera sesion valida
- el usuario es redirigido correctamente al login cuando la sesion deja de ser valida
- el frontend y el backend quedan alineados respecto al estado real de autenticacion
- la partida del clasico ya no se sobrescribe entre usuarios distintos
- la recuperacion de partidas en curso es mas coherente y segura

## Conclusiones

Este problema mostro que no basta con guardar un token en el navegador para considerar resuelta la autenticacion. Tambien es necesario:

- validar su expiracion
- reaccionar correctamente ante errores de autenticacion
- aislar el estado local de cada usuario

La solucion aplicada mejora tanto la experiencia de uso como la consistencia tecnica del sistema, y deja una base mas robusta para los demas modos de juego.
