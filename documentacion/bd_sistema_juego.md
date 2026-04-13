# Codle - Documentacion de base de datos del sistema de juego

## Objetivo

Este documento explica la estructura de base de datos que se ha creado para soportar el sistema de juego de Codle.

La idea es que sirva como referencia para la persona que implemente los endpoints del backend, para que entienda:

- que tablas existen
- que representa cada una
- que campos tiene
- como se relacionan entre si
- para que se usa cada una dentro del juego

## Vision general

La base de datos del juego se divide en dos bloques:

- Tablas de contenido
- Tablas de juego

### Tablas de contenido

Son las que guardan informacion preparada por el sistema.

Incluyen:

- `lenguaje`
- `lenguaje_alias`
- `reto_codigo`
- `creador`
- `lenguaje_creador`
- `paradigma`
- `ejecucion`
- `tipado_tiempo`
- `fortaleza_tipado`

### Tablas de juego

Son las que guardan la actividad real del usuario cuando juega.

Incluyen:

- `partida`
- `intento_lenguaje`
- `intento_codigo`

## 1. Tabla `lenguaje`

Es la tabla principal del dominio.

Representa un lenguaje de programacion real.

Ejemplos:

- Python
- Java
- JavaScript
- C#

### Campos

`id`
- Identificador unico del lenguaje.
- Tipo: `smallint`.

`nombre`
- Nombre principal del lenguaje.
- Ejemplo: `Python`.

`anio_creacion`
- Anio en que fue creado el lenguaje.
- Se usa como pista en el modo clasico.

`ejecucion_id`
- Referencia a la tabla `ejecucion`.
- Indica si el lenguaje es compilado, interpretado o hibrido.

`paradigma_id`
- Referencia a la tabla `paradigma`.
- Indica el paradigma asociado al lenguaje.

`tipado_tiempo_id`
- Referencia a la tabla `tipado_tiempo`.
- Indica si el lenguaje es estatico o dinamico.

`fortaleza_tipado_id`
- Referencia a la tabla `fortaleza_tipado`.
- Indica si el lenguaje es fuerte o debil.

`descripcion`
- Texto opcional descriptivo del lenguaje.
- Puede usarse mas adelante para fichas, paneles o detalles.

`activo`
- Booleano que indica si el lenguaje esta disponible para jugar.
- Permite ocultar lenguajes sin borrarlos.

`logo_path`
- Ruta o referencia al logo del lenguaje en el bucket de almacenamiento.
- Se usa en el modo logo.

### Proposito

La tabla `lenguaje` es la entidad central de los tres modos de juego.

Se usa para:

- elegir el lenguaje objetivo en modo clasico
- elegir el lenguaje objetivo en modo logo
- asociar retos del modo codigo
- comparar respuestas del usuario

## 2. Tabla `lenguaje_alias`

Guarda variantes validas del nombre de un lenguaje.

### Campos

`id`
- Identificador unico del alias.

`lenguaje_id`
- Referencia al lenguaje al que pertenece ese alias.

`alias`
- Texto alternativo que puede escribir el usuario.
- Ejemplo: `JS`.

`alias_normalizado`
- Version normalizada del alias para comparar respuestas.
- Ejemplo: `js`.

### Proposito

Permite reconocer respuestas equivalentes del jugador sin exigir que escriba exactamente el nombre oficial del lenguaje.

Ejemplos:

- `JavaScript` -> `JS`
- `C#` -> `C Sharp`
- `C#` -> `CSharp`

### Uso en endpoints

Cuando el usuario envia una respuesta de lenguaje:

1. se normaliza el texto
2. se busca en `lenguaje_alias`
3. si existe, se obtiene el `lenguaje_id`
4. con eso se valida el intento

## 3. Tabla `reto_codigo`

Representa una pregunta preparada del modo codigo.

No representa una partida. Representa contenido reutilizable.

### Campos

`id`
- Identificador unico del reto.

`lenguaje_id`
- Referencia al lenguaje al que pertenece el snippet.

`titulo`
- Nombre corto del reto.
- Ejemplo: `Print basico`.

`snippet`
- Fragmento de codigo que se muestra al jugador.
- Es el contenido visible principal del modo codigo.

`salida_esperada`
- Resultado correcto que el jugador debe responder.

`explicacion`
- Texto opcional para explicar la solucion al finalizar.

`activo`
- Booleano que indica si el reto esta disponible.

### Proposito

Permite que un mismo lenguaje tenga varios fragmentos de codigo distintos.

Relacion:

- un `lenguaje` puede tener muchos `reto_codigo`

### Uso en endpoints

Cuando se crea una partida de modo codigo:

1. se selecciona un `reto_codigo`
2. se guarda en la partida
3. se devuelve su `snippet` al frontend
4. si el jugador acierta el lenguaje, luego se valida contra `salida_esperada`

## 4. Tabla `partida`

Representa una sesion de juego concreta de un usuario.

Es la tabla principal del bloque de juego.

### Campos

`id`
- Identificador unico de la partida.

`usuario_id`
- Referencia al usuario que juega la partida.

`modo`
- Modo de juego.
- Valores esperados:
  - `clasico`
  - `logo`
  - `codigo`

`lenguaje_objetivo_id`
- Referencia al lenguaje que el jugador debe adivinar.
- Se usa en modo clasico y modo logo.

`reto_codigo_id`
- Referencia al reto de codigo de la partida.
- Se usa en modo codigo.

`estado`
- Estado global de la partida.
- Valores tipicos:
  - `en_curso`
  - `ganada`
  - `perdida`

`fase_actual`
- Paso actual dentro de la partida.
- Especialmente util en modo codigo.
- Valores tipicos:
  - `lenguaje`
  - `salida`

`max_intentos`
- Numero maximo de intentos permitidos.

`intentos_usados`
- Numero de intentos que el jugador ya ha consumido.

`puntuacion`
- Puntuacion conseguida en la partida.

`iniciada_en`
- Fecha y hora de inicio de la partida.

`finalizada_en`
- Fecha y hora de fin de la partida.
- Solo se rellena al terminar.

### Proposito

Controla el estado general de la sesion de juego.

Desde esta tabla se sabe:

- quien juega
- a que modo juega
- que objetivo tiene
- en que estado esta
- cuantos intentos lleva

### Uso en endpoints

Los endpoints de juego van a trabajar continuamente con `partida`.

Ejemplos:

- crear una partida nueva
- consultar el estado actual
- actualizar intentos usados
- marcarla como ganada o perdida
- cerrar la partida al finalizar

## 5. Tabla `intento_lenguaje`

Guarda cada intento del usuario de adivinar un lenguaje.

Sirve para:

- modo clasico
- modo logo
- primera fase del modo codigo

### Campos

`id`
- Identificador unico del intento.

`partida_id`
- Referencia a la partida a la que pertenece.

`numero_intento`
- Orden del intento dentro de la partida.
- Ejemplo:
  - `1`
  - `2`
  - `3`

`lenguaje_intentado_id`
- Referencia al lenguaje que el usuario ha intentado.

`es_correcto`
- Indica si el intento acierta o no el lenguaje objetivo.

`feedback_json`
- Texto que guarda la informacion de feedback del intento.
- Aunque se llame `json`, ahora mismo esta guardado como `text`.
- Esta pensado para almacenar una estructura flexible.

Ejemplo conceptual de feedback:

- si el anio es mayor o menor
- si coincide el paradigma
- si coincide la ejecucion
- si coincide el tipado
- si coincide el creador

`creado_en`
- Fecha y hora del intento.

### Restriccion importante

Existe una restriccion unica por:

- `partida_id`
- `numero_intento`

Eso asegura que no haya dos intentos con el mismo numero dentro de una misma partida.

### Proposito

Permite reconstruir todo lo que ha hecho el jugador en una partida.

Desde esta tabla puedes saber:

- que ha respondido
- en que orden
- si acerto
- que feedback recibio

## 6. Tabla `intento_codigo`

Guarda las respuestas del usuario sobre la salida del snippet en el modo codigo.

Solo se usa en la segunda fase del modo codigo.

### Campos

`id`
- Identificador unico del intento.

`partida_id`
- Referencia a la partida a la que pertenece.

`numero_intento`
- Numero de intento dentro de la fase de salida o dentro del flujo del modo codigo.

`respuesta_usuario`
- Texto que envia el jugador como respuesta.

`respuesta_normalizada`
- Version normalizada de la respuesta para comparar sin problemas de formato.

`es_correcto`
- Indica si la respuesta coincide con la salida esperada.

`creado_en`
- Fecha y hora del intento.

### Restriccion importante

Tambien existe una restriccion unica por:

- `partida_id`
- `numero_intento`

### Proposito

Permite validar y guardar la segunda parte del modo codigo:

1. adivinar el lenguaje
2. adivinar que devuelve el codigo

La primera parte va a `intento_lenguaje`.
La segunda parte va a `intento_codigo`.

## 7. Tabla `creador`

Representa autores o creadores asociados a lenguajes.

### Campos principales

- `id`
- `nombre`
- `apellido`

### Proposito

Sirve para guardar quien creo un lenguaje y usar esa informacion como pista o comparacion.

## 8. Tabla `lenguaje_creador`

Tabla intermedia entre `lenguaje` y `creador`.

### Campos

`lenguaje_id`
- Referencia al lenguaje.

`creador_id`
- Referencia al creador.

### Proposito

Modela una relacion muchos a muchos:

- un lenguaje puede tener varios creadores
- un creador puede estar asociado a varios lenguajes

## 9. Tabla `paradigma`

Catalogo de paradigmas.

### Campos

- `id`
- `nombre`

### Valores esperados

- Orientado a objetos
- Funcional
- Imperativo
- Declarativo
- Multiparadigma

### Proposito

Clasifica el lenguaje y se usa como pista en el modo clasico.

## 10. Tabla `ejecucion`

Catalogo del tipo de ejecucion.

### Campos

- `id`
- `nombre`

### Valores esperados

- Compilado
- Interpretado
- Hibrido

### Proposito

Describe como se ejecuta un lenguaje y se usa como pista comparativa.

## 11. Tabla `tipado_tiempo`

Catalogo para el tipo de tipado segun el momento en que se comprueba.

### Campos

- `id`
- `nombre`

### Valores esperados

- Estatico
- Dinamico

### Proposito

Se usa para describir el comportamiento del lenguaje y como pista en el modo clasico.

## 12. Tabla `fortaleza_tipado`

Catalogo para la fortaleza del sistema de tipos.

### Campos

- `id`
- `nombre`

### Valores esperados

- Fuerte
- Debil

### Proposito

Complementa la descripcion del lenguaje y tambien se usa como pista en el modo clasico.

## Relaciones principales

### Relaciones de contenido

- `lenguaje.ejecucion_id -> ejecucion.id`
- `lenguaje.paradigma_id -> paradigma.id`
- `lenguaje.tipado_tiempo_id -> tipado_tiempo.id`
- `lenguaje.fortaleza_tipado_id -> fortaleza_tipado.id`
- `lenguaje_alias.lenguaje_id -> lenguaje.id`
- `reto_codigo.lenguaje_id -> lenguaje.id`
- `lenguaje_creador.lenguaje_id -> lenguaje.id`
- `lenguaje_creador.creador_id -> creador.id`

### Relaciones de juego

- `partida.usuario_id -> usuario.id`
- `partida.lenguaje_objetivo_id -> lenguaje.id`
- `partida.reto_codigo_id -> reto_codigo.id`
- `intento_lenguaje.partida_id -> partida.id`
- `intento_lenguaje.lenguaje_intentado_id -> lenguaje.id`
- `intento_codigo.partida_id -> partida.id`

## Logica de los endpoint a implementar

### Para iniciar una partida

El backend debe:

1. recibir el modo
2. elegir un objetivo
3. crear una fila en `partida`

Segun el modo:

- `clasico` -> seleccionar un `lenguaje`
- `logo` -> seleccionar un `lenguaje`
- `codigo` -> seleccionar un `reto_codigo`

### Para procesar un intento de lenguaje

El backend debe:

1. recibir el texto del usuario
2. normalizarlo
3. buscarlo en `lenguaje_alias` o `lenguaje`
4. obtener el `lenguaje_id`
5. compararlo con el objetivo de la `partida`
6. guardar un registro en `intento_lenguaje`
7. actualizar `partida.intentos_usados`
8. decidir si la partida sigue, se gana o se pierde

### Para procesar un intento de salida en modo codigo

El backend debe:

1. comprobar que la `partida` esta en modo `codigo`
2. comprobar que `fase_actual = salida`
3. normalizar la respuesta
4. compararla con `reto_codigo.salida_esperada`
5. guardar un registro en `intento_codigo`
6. actualizar estado de la `partida`

## Resumen corto para endpoints

Si hubiera que resumir que hace cada tabla:

- `lenguaje`: que es cada lenguaje
- `lenguaje_alias`: como puede escribirlo el usuario
- `reto_codigo`: que fragmentos de codigo existen
- `partida`: que esta jugando el usuario ahora
- `intento_lenguaje`: que ha intentado adivinar
- `intento_codigo`: que ha respondido sobre la salida

## Siguiente paso recomendado

Con esta documentacion ya se puede pasar a la capa de backend.

El siguiente bloque natural de trabajo seria:

1. crear esquemas Pydantic para juego
2. crear rutas FastAPI de juego
3. implementar logica para iniciar partida
4. implementar logica para registrar intentos
5. implementar lectura del estado de partida
