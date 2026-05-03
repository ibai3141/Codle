# API del modo codigo

## Objetivo

El modo codigo permite al usuario visualizar un fragmento de codigo y tratar de adivinar su salida por consola.  
La API de este modo se encarga de:

- crear una partida asociada al usuario autenticado
- seleccionar un reto de codigo aleatorio
- devolver el fragmento que debe mostrarse en pantalla
- registrar los intentos del usuario
- comprobar si la respuesta es correcta
- actualizar el estado de la partida
- recuperar una partida en curso con su historial

## Estructura general

La implementacion del modo codigo se encuentra en:

- [codigo.py](C:/Users/IbaiTituañaBuenaño/Codle/backend/api/codigo/codigo.py)

Este modulo define los endpoints del modo, la logica de validacion de respuestas y el tratamiento del historial de intentos.

## Funcionamiento general del modo

El flujo de juego es el siguiente:

1. El usuario autenticado entra al modo codigo.
2. El frontend solicita al backend la creacion de una partida o la recuperacion de una ya activa.
3. El backend selecciona un reto de codigo activo de la base de datos.
4. El frontend muestra el `snippet` del reto.
5. El usuario escribe la salida que cree correcta.
6. El backend normaliza la respuesta introducida y la compara con la salida esperada.
7. El intento queda registrado en la base de datos.
8. La partida se actualiza como:
   - `en_curso` si aun quedan intentos
   - `ganada` si el usuario acierta
   - `perdida` si agota los intentos disponibles

## Tablas implicadas

Para este modo se utilizan principalmente las siguientes tablas:

- `partida`
- `reto_codigo`
- `intento_codigo`

### Tabla `reto_codigo`

Contiene los retos disponibles del modo codigo.  
Cada reto almacena:

- el lenguaje al que pertenece
- un titulo
- el fragmento de codigo (`snippet`)
- la salida esperada
- una explicacion opcional
- si el reto esta activo o no

### Tabla `partida`

Guarda la sesion del usuario durante el juego.  
En este modo se utilizan especialmente estos campos:

- `usuario_id`
- `modo`
- `reto_codigo_id`
- `estado`
- `fase_actual`
- `max_intentos`
- `intentos_usados`
- `finalizada_en`

### Tabla `intento_codigo`

Registra cada respuesta enviada por el usuario durante una partida.  
Guarda:

- el numero de intento
- la respuesta original del usuario
- la respuesta normalizada
- si el intento fue correcto
- la fecha de creacion

## Endpoints implementados

### `POST /codigo/crear_partida`

Este endpoint crea una nueva partida del modo codigo.

#### Funcionamiento

- obtiene el usuario a partir del token JWT
- selecciona un reto de codigo activo de forma aleatoria
- crea una fila en la tabla `partida`
- devuelve la informacion minima necesaria para que el frontend inicie el juego

#### Respuesta

La respuesta incluye:

- `partida_id`
- `modo`
- `estado`
- `max_intentos`
- `intentos_usados`
- `reto`

Dentro de `reto` se devuelve:

- `id`
- `titulo`
- `snippet`
- `explicacion`

### `GET /codigo/{partida_id}`

Este endpoint recupera una partida ya existente del modo codigo.

#### Funcionamiento

- obtiene el usuario desde el token
- comprueba que la partida pertenece a ese usuario
- valida que la partida sea del modo `CODIGO`
- recupera el reto asociado
- recupera el historial de intentos
- devuelve toda la informacion necesaria para reconstruir la partida en frontend

#### Respuesta

La respuesta contiene:

- `partida`
- `reto`
- `intentos`

Dentro de `partida` se devuelve:

- `id`
- `modo`
- `estado`
- `fase_actual`
- `max_intentos`
- `intentos_usados`
- `puntuacion`
- `iniciada_en`
- `finalizada_en`

Dentro de `reto` se devuelve:

- `id`
- `titulo`
- `snippet`
- `explicacion`

Dentro de `intentos` se devuelve una lista con:

- `numeroIntento`
- `respuestaUsuario`
- `respuestaNormalizada`
- `correcto`
- `creadoEn`

### `POST /codigo/guess`

Este endpoint procesa una respuesta del usuario.

#### Entrada

Recibe:

- `partida_id`
- `respuesta`

#### Funcionamiento

- obtiene el usuario desde el token
- valida que la partida exista y pertenezca al usuario
- comprueba que la partida siga en curso
- recupera el reto asociado
- normaliza la respuesta del usuario
- normaliza la salida esperada
- compara ambas salidas
- guarda el intento en `intento_codigo`
- incrementa `intentos_usados`
- marca la partida como ganada o perdida si corresponde

#### Respuesta

La respuesta incluye:

- `partida_id`
- `numero_intento`
- `estado_partida`
- `correcto`
- `intentos_usados`
- `intentos_restantes`
- `respuesta_usuario`
- `respuesta_normalizada`
- `salida_esperada` en caso de acierto o derrota
- `intento`

## Normalizacion de respuestas

Uno de los puntos clave del modo codigo es evitar falsos errores debidos al formato del texto.

Para ello se utiliza la funcion `normalizar_salida(...)`, que:

- convierte saltos de linea a un formato comun
- elimina espacios sobrantes al inicio y al final
- elimina espacios innecesarios al final de cada linea

De esta forma, respuestas equivalentes como:

```text
hola mundo
```

y

```text
   hola mundo
```

se consideran correctas si representan la misma salida real.

## Gestion de intentos

El modo codigo utiliza un limite de intentos definido mediante la constante:

```python
MAX_INTENTOS_CODIGO = 10
```

Cada vez que el usuario envia una respuesta:

- se incrementa `intentos_usados`
- se calcula `intentos_restantes`
- se comprueba si ha llegado al limite

Si el usuario acierta:

- la partida pasa a `ganada`

Si el usuario falla y consume el ultimo intento:

- la partida pasa a `perdida`
- se devuelve tambien la salida esperada

## Integracion con el frontend

La API del modo codigo ha sido diseñada para integrarse con la pantalla:

- [Codigo.jsx](C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Codigo.jsx)

Desde el frontend se realizan estas acciones:

- crear partida
- recuperar partida activa
- mostrar el titulo y el snippet
- enviar respuestas
- mostrar historial de intentos
- mostrar la salida correcta al perder
- mostrar la explicacion del reto al finalizar

## Validacion realizada

Se realizaron pruebas funcionales sobre la API del modo codigo:

- registro de usuario
- login
- creacion de partida
- recuperacion de partida
- envio de respuestas incorrectas
- transicion a estado `perdida`
- envio de respuesta correcta con espacios sobrantes
- validacion de normalizacion

Las pruebas confirmaron que:

- el reto se crea correctamente
- el snippet se devuelve al frontend
- el historial se guarda correctamente
- la partida cambia de estado cuando corresponde
- la normalizacion evita errores por formato

## Conclusion

La API del modo codigo proporciona una base completa para el funcionamiento del reto de salida de codigo.  
Permite crear partidas, recuperar sesiones en curso, registrar respuestas y validar correctamente la salida del fragmento mostrado.

Su diseño sigue la misma estructura general utilizada en el resto de modos del proyecto, lo que facilita su mantenimiento y su integracion con el frontend.
