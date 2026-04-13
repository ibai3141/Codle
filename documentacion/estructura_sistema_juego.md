# Codle - Estructura del sistema de juego

## Objetivo del documento

Explicar de forma clara que representa cada parte del sistema de juego que vamos a construir en Codle y para que sirve.

Este documento no entra tanto en SQL o Liquibase, sino en el sentido funcional de cada tabla y cada concepto.

## Idea general

El sistema de juego de Codle se puede dividir en dos bloques:

- Contenido del juego
- Progreso del jugador

### Contenido del juego

Es la informacion que el sistema necesita para poder generar partidas.

Aqui entran cosas como:

- los lenguajes
- sus creadores
- sus logos
- sus aliases
- los retos de codigo

### Progreso del jugador

Es la informacion que se genera cuando un usuario juega.

Aqui entran cosas como:

- la partida que ha empezado
- los intentos que hace
- si gana o pierde
- la puntuacion
- el historial

## 1. Lenguaje

La tabla `lenguaje` es la base del juego.

Representa un lenguaje de programacion real, por ejemplo:

- Python
- Java
- JavaScript
- C#

### Para que sirve

Sirve para guardar los datos que el juego necesita comparar o mostrar:

- nombre
- anio de creacion
- paradigma
- tipo de ejecucion
- tipado
- logo

### En que modos se usa

- Modo clasico
- Modo logo
- Modo codigo

Es la entidad central de todo el sistema.

## 2. Lenguaje alias

La tabla `lenguaje_alias` guarda formas alternativas de escribir el nombre de un lenguaje.

### Ejemplos

Para `JavaScript` podrias tener:

- JavaScript
- JS

Para `C#` podrias tener:

- C#
- C Sharp
- CSharp

### Para que sirve

Sirve para que cuando el usuario escriba una variante valida, el juego la reconozca correctamente.

Sin esta tabla, el sistema seria demasiado estricto y el jugador podria fallar aunque realmente supiera la respuesta.

### En que modos se usa

- Modo clasico
- Modo logo
- Modo codigo, cuando el jugador intenta adivinar el lenguaje del snippet

## 3. Reto codigo

La tabla `reto_codigo` representa una pregunta del modo codigo.

No representa una partida ni una respuesta del usuario. Representa el contenido del reto.

### Que guarda

Cada registro puede guardar:

- el lenguaje al que pertenece
- un titulo
- el fragmento de codigo
- la salida correcta
- una explicacion
- una dificultad

### Ejemplo

Un reto podria ser:

- lenguaje: Python
- snippet: un pequeño `print(...)`
- salida esperada: `3`

### Para que sirve

Sirve para que el modo codigo tenga preguntas predefinidas.

Es importante entender que:

- `reto_codigo` es contenido
- no es actividad del usuario

Es decir:

- el reto existe antes de que nadie juegue
- luego una partida usa ese reto

## 4. Partida

La tabla `partida` representa una sesion de juego de un usuario.

Es una de las tablas mas importantes del sistema.

### Que representa

Cada vez que un jugador empieza una partida, se crea un registro en `partida`.

Ese registro guarda informacion como:

- que usuario esta jugando
- que modo ha elegido
- que lenguaje objetivo tiene la partida
- o que reto de codigo tiene asociado
- en que estado esta la partida
- cuantos intentos lleva

### Ejemplo

Si un usuario entra al modo logo y le toca Python:

- se crea una `partida`
- esa partida apunta al lenguaje Python
- el usuario empieza a hacer intentos

### Para que sirve

Sirve para controlar el estado general del juego:

- si esta en curso
- si ya se gano
- si ya se perdio
- cuantos intentos quedan

## 5. Intento lenguaje

La tabla `intento_lenguaje` representa cada intento del usuario de adivinar un lenguaje.

### Que guarda

Cada vez que el jugador escribe un lenguaje, se guarda:

- a que partida pertenece
- que numero de intento es
- que lenguaje ha probado
- si ha acertado o no
- el feedback devuelto

### Para que sirve

Sirve para construir el historial interno de una partida.

Gracias a esta tabla puedes saber:

- que ha intentado el usuario
- en que orden
- cuando ha acertado
- que pistas se le dieron en cada turno

### En que modos se usa

- Modo clasico
- Modo logo
- Primera fase del modo codigo

## 6. Intento codigo

La tabla `intento_codigo` representa las respuestas del usuario sobre la salida de un fragmento de codigo.

### Que guarda

- a que partida pertenece
- que respuesta dio el usuario
- si era correcta o no
- el numero de intento

### Para que sirve

Sirve solo para la segunda fase del modo codigo.

Porque en ese modo hay dos partes:

1. adivinar de que lenguaje es el snippet
2. decir que salida produce

La primera parte iria a `intento_lenguaje`.
La segunda iria a `intento_codigo`.

## 7. Paradigma

La tabla `paradigma` es un catalogo.

No guarda partidas ni intentos. Guarda tipos de paradigma para clasificar lenguajes.

### Ejemplos

- Orientado a objetos
- Funcional
- Imperativo
- Declarativo
- Multiparadigma

### Para que sirve

Sirve para:

- clasificar los lenguajes
- comparar respuestas en el modo clasico

## 8. Ejecucion

La tabla `ejecucion` tambien es un catalogo.

### Ejemplos

- Compilado
- Interpretado
- Hibrido

### Para que sirve

Sirve para indicar como se ejecuta un lenguaje y usar ese dato como pista en el juego.

## 9. Tipado tiempo

La tabla `tipado_tiempo` es un catalogo.

### Ejemplos

- Estatico
- Dinamico

### Para que sirve

Sirve para definir cuando se comprueban los tipos en un lenguaje.

En el juego se puede usar como pista del modo clasico.

## 10. Fortaleza tipado

La tabla `fortaleza_tipado` es otro catalogo.

### Ejemplos

- Fuerte
- Debil

### Para que sirve

Sirve para representar la fortaleza del sistema de tipos del lenguaje.

Tambien se usa como pista en el modo clasico.

## 11. Creador

La tabla `creador` representa la persona o entidad asociada a un lenguaje.

### Para que sirve

Sirve para guardar autores de lenguajes y compararlos en las pistas del juego.

Como un lenguaje puede tener mas de un creador, se usa junto con la tabla intermedia.

## 12. Lenguaje creador

La tabla `lenguaje_creador` une `lenguaje` con `creador`.

### Para que sirve

Sirve para modelar la relacion muchos a muchos:

- un lenguaje puede tener varios creadores
- un creador podria estar asociado a varios lenguajes

## Como se conectan entre si

La idea completa seria esta:

- `lenguaje` define los datos base de un lenguaje
- `lenguaje_alias` define nombres alternativos
- `reto_codigo` define preguntas del modo codigo
- `partida` representa una sesion real de juego
- `intento_lenguaje` guarda los intentos de adivinar el lenguaje
- `intento_codigo` guarda las respuestas sobre la salida del snippet

## Resumen rapido

### Tablas de contenido

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

- `partida`
- `intento_lenguaje`
- `intento_codigo`

## Idea clave

La mejor forma de entenderlo es esta:

- `reto_codigo` no es una partida, es una pregunta preparada
- `partida` no es un lenguaje, es una sesion de juego de un usuario
- `intento_lenguaje` e `intento_codigo` no son contenido, son acciones del jugador

## Siguiente paso recomendado

Ahora que la estructura del dominio de `lenguaje` esta bastante clara, el siguiente paso mas natural es definir las tablas del juego:

1. `reto_codigo`
2. `partida`
3. `intento_lenguaje`
4. `intento_codigo`

Ese bloque ya dejaria preparado el sistema para construir los tres modos de juego.
