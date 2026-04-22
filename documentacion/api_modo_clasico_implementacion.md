# API del modo clasico

## Objetivo del documento
Explicar la implementacion actual de la API del modo clasico, los endpoints disponibles, su finalidad y como encajan dentro del flujo del juego.

## Objetivo del modo clasico

En el modo clasico el usuario debe adivinar un lenguaje de programacion a partir del feedback que recibe despues de cada intento.

El sistema:

- crea una partida nueva para el usuario autenticado
- selecciona un lenguaje objetivo aleatorio
- registra los intentos del jugador
- genera feedback en cada intento
- permite reconstruir la sesion de juego si el usuario vuelve a entrar

## Tablas implicadas

La API del modo clasico trabaja principalmente con estas tablas:

- `usuario`
- `lenguaje`
- `lenguaje_alias`
- `partida`
- `intento_lenguaje`

## Endpoints implementados

Actualmente el modo clasico cuenta con estos endpoints:

- `POST /clasico/crear_partida`
- `GET /clasico/{partida_id}`
- `POST /clasico/guess`

## 1. Crear partida

### Endpoint

```text
POST /clasico/crear_partida
```

### Finalidad

Este endpoint se utiliza cuando el usuario entra al modo clasico y quiere comenzar una nueva partida.

### Funcionamiento

El endpoint:

1. recibe el token del usuario en la cabecera `Authorization`
2. decodifica el token para obtener el `id` del usuario autenticado
3. busca un lenguaje activo de forma aleatoria en la tabla `lenguaje`
4. crea una nueva fila en `partida`
5. devuelve la informacion minima necesaria para identificar la partida

### Campos guardados al crear la partida

- `usuario_id`
- `modo = "CLASICO"`
- `lenguaje_objetivo_id`
- `estado = "en_curso"`
- `fase_actual = "lenguaje"`
- `max_intentos = null`
- `intentos_usados = 0`
- `puntuacion = 0`

### Respuesta

```json
{
  "partida_id": 8,
  "modo": "CLASICO",
  "estado": "en_curso"
}
```

## 2. Obtener partida

### Endpoint

```text
GET /clasico/{partida_id}
```

### Finalidad

Este endpoint no genera feedback ni modifica la partida. Su objetivo es consultar el estado actual de una sesion ya creada.

Se usa para:

- reconstruir la partida si el usuario vuelve a entrar
- recuperar el historial de intentos
- saber si la partida sigue en curso o ya ha terminado

### Funcionamiento

El endpoint:

1. recibe `partida_id` por URL
2. recibe el token del usuario por `Authorization`
3. decodifica el token para obtener el `id` del usuario
4. busca la partida filtrando por:
   - `id`
   - `usuario_id`
5. recupera los intentos de esa partida desde `intento_lenguaje`
6. devuelve la partida y su historial

### Ejemplo de respuesta

```json
{
  "partida": {
    "id": 8,
    "usuario_id": 23,
    "modo": "CLASICO",
    "lenguaje_objetivo_id": 18,
    "reto_codigo_id": null,
    "estado": "ganada",
    "fase_actual": "lenguaje",
    "max_intentos": null,
    "intentos_usados": 1,
    "puntuacion": 0,
    "iniciada_en": "2026-04-20T11:55:07.221675",
    "finalizada_en": "2026-04-20T11:55:07.652119"
  },
  "intentos": [
    {
      "id": 1,
      "partida_id": 8,
      "numero_intento": 1,
      "lenguaje_intentado_id": 18,
      "es_correcto": true,
      "feedback_json": "{\"correcto\": true, \"lenguaje_intentado\": \"Scala\", \"feedback\": {\"anio_creacion\": \"correcto\", \"ejecucion\": true, \"paradigma\": true, \"tipado_tiempo\": true, \"fortaleza_tipado\": true}}",
      "creado_en": "2026-04-20T11:55:07.831804"
    }
  ]
}
```

## 3. Registrar intento

### Endpoint

```text
POST /clasico/guess
```

### Finalidad

Este es el endpoint principal del juego. Se encarga de procesar un intento del usuario, compararlo con el lenguaje objetivo y guardar el resultado en la base de datos.

### Entrada esperada

```json
{
  "partida_id": 8,
  "respuesta": "Scala"
}
```

### Funcionamiento

El endpoint realiza estos pasos:

1. valida el token del usuario
2. recupera la partida y comprueba que pertenece a ese usuario
3. comprueba que la partida sigue `en_curso`
4. resuelve el lenguaje introducido por el usuario:
   - primero por `lenguaje_alias`
   - si no existe alias, intenta por nombre
5. obtiene el lenguaje objetivo desde `partida.lenguaje_objetivo_id`
6. compara ambos lenguajes
7. construye el feedback
8. inserta una fila en `intento_lenguaje`
9. incrementa `intentos_usados`
10. si el usuario acierta:
    - cambia `estado` a `ganada`
    - rellena `finalizada_en`

### Formato del feedback

El feedback compara:

- `anio_creacion`
- `ejecucion`
- `paradigma`
- `tipado_tiempo`
- `fortaleza_tipado`

En el caso del año puede devolver:

- `correcto`
- `mayor`
- `menor`

En el resto de campos se devuelve `true` o `false`.

### Ejemplo de respuesta correcta

```json
{
  "partida_id": 8,
  "numero_intento": 1,
  "estado_partida": "ganada",
  "intento": {
    "id": 1,
    "partida_id": 8,
    "numero_intento": 1,
    "lenguaje_intentado_id": 18,
    "es_correcto": true,
    "feedback_json": "{\"correcto\": true, \"lenguaje_intentado\": \"Scala\", \"feedback\": {\"anio_creacion\": \"correcto\", \"ejecucion\": true, \"paradigma\": true, \"tipado_tiempo\": true, \"fortaleza_tipado\": true}}",
    "creado_en": "2026-04-20T11:55:07.831804"
  },
  "resultado": {
    "correcto": true,
    "lenguaje_intentado": "Scala",
    "feedback": {
      "anio_creacion": "correcto",
      "ejecucion": true,
      "paradigma": true,
      "tipado_tiempo": true,
      "fortaleza_tipado": true
    }
  }
}
```

### Ejemplo de error controlado

Si el usuario introduce un lenguaje inexistente:

```json
{
  "detail": "El lenguaje introducido no existe o no esta soportado"
}
```

## Endpoint auxiliar de datos

Ademas del bloque de `clasico`, se ha creado un endpoint en `getData` para que el frontend pueda cargar los lenguajes activos al iniciar la partida.

### Endpoint

```text
GET /getData/lengAll
```

### Finalidad

Devuelve todos los lenguajes activos de la tabla `lenguaje`.

Esto permite al frontend:

- cargar la lista inicial de lenguajes
- construir sugerencias
- preparar la UI del modo clasico

## Pruebas realizadas

Se validaron manualmente los siguientes flujos:

- registro de un usuario nuevo
- login y obtencion del token
- carga de lenguajes activos con `GET /getData/lengAll`
- creacion de una partida con `POST /clasico/crear_partida`
- recuperacion del estado de la partida con `GET /clasico/{partida_id}`
- intento correcto con `POST /clasico/guess`
- actualizacion del estado de la partida a `ganada`
- error controlado al enviar un lenguaje inexistente

## Conclusiones

La API del modo clasico ya permite:

- iniciar una partida
- reconstruirla posteriormente
- registrar intentos
- generar feedback
- guardar el progreso del usuario

Con esto queda implementado el flujo base del modo clasico de extremo a extremo a nivel de backend.
