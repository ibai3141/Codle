# Implementacion del modo clasico

## Objetivo del documento
Explicar como se deberia implementar el modo clasico de Codle a nivel de backend y API, de forma que el equipo tenga una guia clara antes de empezar a desarrollar esta parte.

## Idea general del modo clasico

En el modo clasico, el usuario debe adivinar un lenguaje de programacion.

El funcionamiento seria el siguiente:

1. El usuario entra al modo clasico.
2. El sistema crea una partida nueva.
3. El backend elige un lenguaje objetivo de forma aleatoria.
4. El usuario escribe el nombre de un lenguaje.
5. El backend compara ese lenguaje con el lenguaje objetivo.
6. El sistema devuelve feedback para ayudar al usuario.
7. El proceso se repite hasta que el usuario acierta.

En este modo, los intentos seran ilimitados, por lo que la partida no termina por quedarse sin intentos, sino solo cuando el usuario acierta.

## Tablas que intervienen

Para implementar este modo ya existen las tablas necesarias:

- `usuario`
- `lenguaje`
- `lenguaje_alias`
- `partida`
- `intento_lenguaje`

### Papel de cada tabla

- `usuario`
  - identifica quien esta jugando

- `lenguaje`
  - contiene los datos del lenguaje real que se usaran para comparar y generar feedback

- `lenguaje_alias`
  - permite reconocer respuestas equivalentes como `js`, `javascript`, `c#`, `c sharp`, etc.

- `partida`
  - guarda la sesion de juego del usuario

- `intento_lenguaje`
  - guarda cada intento realizado durante esa partida

## Flujo general del backend

El backend del modo clasico deberia tener tres piezas principales:

1. Crear partida
2. Registrar intento
3. Consultar estado de partida

## 1. Crear partida

### Endpoint propuesto

```text
POST /game/classic/start
```

### Que hace este endpoint

Cuando el usuario entra al modo clasico, el frontend debe llamar a este endpoint.

El backend debe:

1. Identificar al usuario autenticado.
2. Elegir un lenguaje objetivo aleatorio de la tabla `lenguaje`.
3. Crear una nueva fila en `partida`.
4. Devolver al frontend el identificador de la partida.

### Campos recomendados al crear la partida

- `usuario_id`
- `modo = "clasico"`
- `lenguaje_objetivo_id`
- `estado = "en_curso"`
- `fase_actual = "lenguaje"`
- `max_intentos = null`
- `intentos_usados = 0`
- `puntuacion = 0`
- `iniciada_en`

### Respuesta esperada

```json
{
  "partida_id": 12,
  "modo": "clasico",
  "estado": "en_curso"
}
```

## 2. Registrar intento

### Endpoint propuesto

```text
POST /game/classic/guess
```

### Entrada esperada

```json
{
  "partida_id": 12,
  "respuesta": "Java"
}
```

### Que hace este endpoint

Este endpoint es el nucleo del modo clasico.

Cada vez que el usuario escribe un lenguaje, el backend debe:

1. Comprobar que la partida existe.
2. Comprobar que la partida sigue en curso.
3. Obtener el `lenguaje_objetivo_id` de la partida.
4. Buscar la respuesta del usuario en `lenguaje_alias`.
5. Si no existe alias, buscar por nombre de lenguaje.
6. Si el lenguaje existe, compararlo con el objetivo.
7. Generar el feedback.
8. Guardar el intento en `intento_lenguaje`.
9. Actualizar `intentos_usados` en `partida`.
10. Si acierta, marcar la partida como `ganada`.

## Busqueda de la respuesta del usuario

La respuesta del jugador no deberia compararse directamente con `lenguaje.nombre` sin mas.

Lo recomendable es:

1. Normalizar el texto recibido:
   - quitar espacios innecesarios
   - pasar a minusculas
2. Buscar en `lenguaje_alias.alias_normalizado`
3. Si no aparece, probar con el nombre del lenguaje

Esto permite aceptar variantes validas del mismo lenguaje.

## Que hacer si el usuario escribe un lenguaje invalido

Si la respuesta no coincide con ningun alias ni con ningun lenguaje, hay dos opciones:

### Opcion recomendada para empezar

- devolver `400`
- no guardar el intento

Ejemplo:

```json
{
  "detail": "El lenguaje introducido no existe o no esta soportado"
}
```

Esto simplifica la logica en una primera version.

## Generacion del feedback

Si la respuesta del usuario corresponde a un lenguaje valido, el backend debe compararlo con el lenguaje objetivo.

Los campos que se pueden comparar en esta primera version son:

- `anio_creacion`
- `ejecucion_id`
- `paradigma_id`
- `tipado_tiempo_id`
- `fortaleza_tipado_id`

### Regla general del feedback

- si el valor coincide, se marca como `correcto`
- si no coincide, se marca como `incorrecto`
- en el caso del año, es mejor devolver una pista mas util:
  - `mayor`
  - `menor`
  - `correcto`

### Ejemplo de feedback si falla

```json
{
  "correcto": false,
  "lenguaje_intentado": "Java",
  "feedback": {
    "anio_creacion": "menor",
    "ejecucion": "correcto",
    "paradigma": "incorrecto",
    "tipado_tiempo": "correcto",
    "fortaleza_tipado": "correcto"
  }
}
```

### Ejemplo de feedback si acierta

```json
{
  "correcto": true,
  "lenguaje_intentado": "Python",
  "feedback": {
    "anio_creacion": "correcto",
    "ejecucion": "correcto",
    "paradigma": "correcto",
    "tipado_tiempo": "correcto",
    "fortaleza_tipado": "correcto"
  },
  "estado_partida": "ganada"
}
```

## Guardado del intento en base de datos

Cada intento valido debe insertarse en `intento_lenguaje`.

Los campos que se deben rellenar son:

- `partida_id`
- `numero_intento`
- `lenguaje_intentado_id`
- `es_correcto`
- `feedback_json`
- `creado_en`

### Como calcular `numero_intento`

Se puede hacer de dos formas:

- leer `intentos_usados` de la partida y sumar 1
- contar los intentos existentes de esa partida y sumar 1

La opcion mas directa para este caso es usar `intentos_usados + 1`.

## Actualizacion de la partida

Despues de guardar el intento, la tabla `partida` tambien debe actualizarse.

### Si el usuario falla

- aumentar `intentos_usados`
- mantener `estado = "en_curso"`

### Si el usuario acierta

- aumentar `intentos_usados`
- cambiar `estado = "ganada"`
- rellenar `finalizada_en`

## 3. Consultar estado de partida

### Endpoint propuesto

```text
GET /game/classic/{partida_id}
```

### Que hace este endpoint

Devuelve el estado actual de la partida para que el frontend pueda reconstruir la pantalla si hace falta.

### Informacion recomendable en la respuesta

- `partida_id`
- `modo`
- `estado`
- `intentos_usados`
- historial de intentos
- feedback acumulado

### Ejemplo de respuesta

```json
{
  "partida_id": 12,
  "modo": "clasico",
  "estado": "en_curso",
  "intentos_usados": 3,
  "intentos": [
    {
      "numero_intento": 1,
      "lenguaje": "Java",
      "correcto": false,
      "feedback": {
        "anio_creacion": "menor",
        "ejecucion": "correcto",
        "paradigma": "incorrecto",
        "tipado_tiempo": "correcto",
        "fortaleza_tipado": "correcto"
      }
    }
  ]
}
```

## Orden recomendado de implementacion

Para no complicar el desarrollo, lo mejor es implementar el modo clasico por fases:

1. Crear el endpoint `POST /game/classic/start`
2. Hacer la funcion que elige un lenguaje aleatorio
3. Hacer la funcion que resuelve un alias o un nombre a un lenguaje valido
4. Implementar la comparacion y el feedback
5. Crear el endpoint `POST /game/classic/guess`
6. Guardar intentos en `intento_lenguaje`
7. Actualizar correctamente la tabla `partida`
8. Crear el endpoint `GET /game/classic/{partida_id}`
9. Conectar el frontend

## Reparto de tareas del equipo

Como el objetivo ahora mismo es dejar el modo clasico funcionando de extremo a extremo, el reparto de tareas se organiza para que la parte mas critica del backend no dependa de una sola persona que pueda retrasar al resto.

### Ibai

- implementar `POST /game/classic/start`
- elegir el lenguaje objetivo aleatorio
- crear la fila correspondiente en `partida`
- asociar la partida al usuario autenticado
- definir y dejar estable el formato de respuesta del backend
- implementar `GET /game/classic/{partida_id}` si da tiempo
- coordinar la integracion general del modo clasico

### Cesar

Sus tareas seran:

- resolver un lenguaje a partir de alias o nombre
- preparar la comparacion entre lenguaje intentado y lenguaje objetivo
- construir el `feedback_json`
- revisar que los datos de `lenguaje` y `lenguaje_alias` necesarios para el modo clasico esten correctos
- apoyar en pruebas manuales de los endpoints ya implementados

### David

- crear la pantalla del modo clasico
- preparar el input donde el usuario escribe el lenguaje
- implementar el envio del intento
- mostrar el feedback recibido del backend
- mostrar el estado de partida
- mostrar el mensaje de victoria cuando el usuario acierte
- conectar la interfaz con la API cuando los endpoints esten listos


## Hito siguiente recomendado

El siguiente hito del proyecto deberia ser:

**Modo clasico jugable de extremo a extremo con usuario autenticado y guardado de intentos**

Eso significa que un usuario pueda:

- iniciar sesion
- entrar al modo clasico
- empezar una partida
- hacer intentos
- recibir feedback
- acertar
- y que todo quede registrado en base de datos
