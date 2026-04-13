# Codle - Propuesta de diseno del sistema de juego

## Objetivo

Definir como implementar en la base de datos y en el backend los tres modos de juego de Codle:

- Clasico: adivinar el lenguaje a partir de pistas como anio, creador, paradigma o ejecucion.
- Logo: adivinar el lenguaje viendo su logo.
- Codigo: adivinar primero el lenguaje a partir de un fragmento de codigo y luego decir que salida produce.

La idea es que este documento sirva como base antes de empezar a crear migraciones, endpoints y pantallas.

## Estado actual del proyecto

Actualmente el proyecto ya tiene:

- Login y registro de usuarios.
- Tabla `usuario`.
- Tabla `lenguaje`.
- Catalogos `paradigma`, `tipado` y `ejecucion`.
- Tabla `creador`.
- Tabla intermedia `lenguaje_creador`.

Esto es una buena base para empezar, pero todavia falta la parte especifica del juego: partidas, intentos, retos de codigo y soporte para alias o logos.

## Observaciones sobre el modelo actual

Antes de ampliar la base de datos, conviene ajustar algunos puntos del modelo actual:

### 1. Tabla `creador`

Ahora mismo `creador` obliga a tener `nombre` y `apellido`.

Problema:

- No todos los lenguajes tienen un unico creador con nombre y apellido.
- Algunos pueden estar asociados a empresas, fundaciones o equipos.
- Tambien puede haber creadores conocidos por un unico nombre.

Propuesta:

- Cambiar el modelo para usar un campo como `nombre_mostrar`.
- O dejar `apellido` como nullable.

### 2. Tipado

Ahora `lenguaje` tiene una sola FK a `tipado`.

Problema:

- Un lenguaje puede ser "estatico" y "fuerte" al mismo tiempo.
- Con una sola FK se pierde informacion o hay que mezclar conceptos.

Propuesta:

- Separar `tipado` en dos tablas distintas:
  - `tipado_tiempo`: estatico o dinamico.
  - `fortaleza_tipado`: fuerte o debil.

Decision tomada para el proyecto:

- Se elimina el enfoque de una unica tabla `tipado`.
- Se usaran dos catalogos independientes.
- La tabla `lenguaje` tendra dos foreign keys:
  - `tipado_tiempo_id`
  - `fortaleza_tipado_id`

### 3. Paradigma

Ahora `lenguaje` tiene una sola FK a `paradigma`.

Problema:

- Muchos lenguajes son multiparadigma.
- Un lenguaje puede ser orientado a objetos, funcional e imperativo a la vez.

Propuesta:

- Opcion simple: mantener un `paradigma_principal`.
- Opcion mas fiel: crear tabla intermedia `lenguaje_paradigma`.

Decision tomada para el proyecto:

- Se mantiene la tabla `paradigma` tal y como esta.
- Se mantiene el valor `Multiparadigma`.
- La tabla `lenguaje` seguira teniendo una sola FK a `paradigma`.

### 4. Ejecucion

La tabla `ejecucion` actual encaja bien con el juego y no necesita cambios de modelo.

Valores actuales:

- `Compilado`
- `Interpretado`
- `Hibrido`

Decision tomada para el proyecto:

- Se mantiene `ejecucion` tal y como esta.

### 5. Codificacion de caracteres

En los seeds actuales aparecen textos como `EstÃ¡tico` o `HÃ­brido`.

Esto conviene corregir antes de seguir para evitar datos mal guardados y errores visuales en frontend.

## Enfoque general recomendado

La parte mas importante del diseno es separar:

- Datos del dominio: informacion de los lenguajes, creadores, logos, retos de codigo.
- Datos de juego: partidas, intentos, puntuacion, estado de cada jugador.

Esto permite:

- Reutilizar los mismos datos de lenguajes en varios modos.
- No duplicar logica.
- Escalar mejor si en el futuro quereis rankings, estadisticas o nuevos modos.

## Modelo de datos propuesto

### 1. Tabla `lenguaje`

Mantendria esta tabla como tabla principal del dominio, pero ampliada.

Campos recomendados:

- `id`
- `nombre`
- `anio_creacion`
- `logo_url`
- `descripcion`
- `activo`
- `ejecucion_id`
- `paradigma_id` o relacion `lenguaje_paradigma`
- `tipado_tiempo_id`
- `fortaleza_tipado_id`
- `logo_path`

Objetivo:

- Que `lenguaje` siga siendo la entidad central del juego.
- Guardar la referencia al logo sin almacenar la imagen dentro de la base de datos.

### Catalogo `tipado_tiempo`

Campos:

- `id`
- `nombre`

Valores previstos:

- `Estatico`
- `Dinamico`

### Catalogo `fortaleza_tipado`

Campos:

- `id`
- `nombre`

Valores previstos:

- `Fuerte`
- `Debil`

### Relacion de `lenguaje` con el tipado

Cada lenguaje apuntara a ambos catalogos:

- `tipado_tiempo_id`
- `fortaleza_tipado_id`

Ejemplos:

- Java -> `Estatico` + `Fuerte`
- JavaScript -> `Dinamico` + `Debil`
- C# -> `Estatico` + `Fuerte`

Ventaja:

- El modelo representa correctamente dos dimensiones distintas del tipado.
- El modo clasico puede dar pistas mas precisas al usuario.

## Gestion de imagenes

Para el caso de los logos, la recomendacion es no guardar la imagen dentro de la base de datos.

En este proyecto ya existe un bucket creado, asi que el enfoque recomendado queda asi:

- Los archivos de imagen se guardan en el bucket de Supabase Storage.
- La tabla `lenguaje` guarda solo la referencia al archivo.
- El frontend usa esa referencia para cargar la imagen cuando haga falta.

### Como almacenar la referencia

La mejor opcion es guardar en `lenguaje` un campo como:

- `logo_path`

Ejemplo:

- `logos/python.png`
- `logos/javascript.svg`

Es mejor guardar la ruta o path interno del archivo que una URL completa, porque:

- si cambia el dominio o configuracion del bucket no hay que actualizar todos los registros
- la base de datos queda mas limpia
- es mas facil mantener la aplicacion a futuro

### Flujo recomendado

1. El logo se sube una vez al bucket.
2. En la tabla `lenguaje` se guarda su `logo_path`.
3. Cuando se inicia una partida de modo logo, el backend obtiene ese `logo_path`.
4. El frontend construye o recibe la URL final para mostrar la imagen.

### Que no recomiendo

No recomiendo guardar la imagen como binario dentro de PostgreSQL, por ejemplo en un campo tipo `BYTEA`, porque:

- hace la base de datos mas pesada
- complica backups y consultas
- no aporta ventajas reales para este proyecto

### Uso dentro del juego

En el modo logo:

- la partida sigue apuntando al `lenguaje_objetivo_id`
- el frontend muestra el logo usando el `logo_path` del lenguaje objetivo
- el usuario intenta adivinar el lenguaje igual que en los otros modos

De esta forma, el logo forma parte del contenido del lenguaje, no de la partida.

### 2. Tabla `lenguaje_alias`

Esta tabla sirve para reconocer respuestas validas del usuario.

Campos:

- `id`
- `lenguaje_id`
- `alias`
- `alias_normalizado`

Ejemplos:

- JavaScript -> `javascript`, `js`
- C# -> `c#`, `c sharp`, `csharp`

Ventaja:

- El usuario puede escribir distintas variantes y el sistema sigue aceptando la respuesta.

### 3. Tabla `reto_codigo`

Esta tabla guarda los retos del modo codigo.

Campos:

- `id`
- `lenguaje_id`
- `titulo`
- `snippet`
- `salida_esperada`
- `explicacion`
- `dificultad`
- `activo`

Objetivo:

- Separar los retos del lenguaje en si.
- Permitir que un lenguaje tenga varios retos.
- Poder filtrar retos por dificultad mas adelante.

### 4. Tabla `partida`

Esta es la tabla principal del sistema de juego.

Campos recomendados:

- `id`
- `usuario_id`
- `modo`
- `lenguaje_objetivo_id`
- `reto_codigo_id`
- `estado`
- `fase_actual`
- `max_intentos`
- `intentos_usados`
- `puntuacion`
- `iniciada_en`
- `finalizada_en`

Notas:

- `modo` puede ser `clasico`, `logo` o `codigo`.
- `lenguaje_objetivo_id` se usa en clasico y logo.
- `reto_codigo_id` se usa en modo codigo.
- `fase_actual` es util en modo codigo:
  - primero se adivina el lenguaje
  - despues se adivina la salida

### 5. Tabla `intento_lenguaje`

Registra cada intento de adivinar el lenguaje.

Campos:

- `id`
- `partida_id`
- `numero_intento`
- `lenguaje_intentado_id`
- `es_correcto`
- `feedback_json`
- `creado_en`

Uso:

- Sirve para clasico.
- Sirve para logo.
- Sirve tambien para la primera fase del modo codigo.

`feedback_json` puede guardar pistas comparativas del intento, por ejemplo:

- si el anio es mayor o menor
- si coincide el paradigma
- si coincide la ejecucion
- si coincide el creador

### 6. Tabla `intento_codigo`

Registra respuestas del usuario en la segunda fase del modo codigo.

Campos:

- `id`
- `partida_id`
- `numero_intento`
- `respuesta_usuario`
- `respuesta_normalizada`
- `es_correcto`
- `creado_en`

Uso:

- Solo se usa cuando el usuario ya ha acertado el lenguaje del snippet.

## Como funcionaria cada modo de juego

### Modo clasico

Flujo:

1. El sistema crea una partida con un `lenguaje_objetivo_id`.
2. El usuario escribe un lenguaje.
3. El backend busca ese nombre en `lenguaje` o `lenguaje_alias`.
4. Si no existe, devuelve error controlado.
5. Si existe, guarda el intento en `intento_lenguaje`.
6. Si no acierta, devuelve feedback comparando con el lenguaje objetivo.
7. Si acierta, marca la partida como completada.

Feedback posible:

- anio: mayor, menor o exacto
- creador: coincide o no
- paradigma: coincide o no
- ejecucion: coincide o no
- tipado en tiempo: coincide o no
- fortaleza del tipado: coincide o no

### Modo logo

Flujo:

1. El sistema crea una partida con un `lenguaje_objetivo_id`.
2. El frontend muestra la imagen a partir de `logo_path`.
3. El usuario introduce un lenguaje.
4. El backend valida el intento.
5. Si acierta, gana.
6. Si falla, se registra el intento.

Diferencia frente al clasico:

- No depende tanto del feedback por propiedades.
- El reto principal es reconocer visualmente el lenguaje.

### Modo codigo

Flujo:

1. El sistema crea una partida con un `reto_codigo_id`.
2. El frontend muestra el `snippet`.
3. El usuario intenta adivinar el lenguaje del snippet.
4. Si falla, se registra en `intento_lenguaje`.
5. Si acierta, la partida pasa a `fase_actual = salida`.
6. El usuario responde que devuelve el codigo.
7. Esa respuesta se guarda en `intento_codigo`.
8. Si acierta, la partida termina como completada.

Ventaja de este enfoque:

- El modo codigo reutiliza parte de la logica del modo clasico.
- Solo necesita una segunda fase adicional.

## Implementacion recomendada en backend

Con la estructura actual de FastAPI y Supabase, haria algo asi:

### Nuevos modulos

- `api/game/`
- `api/game/routes.py`
- `api/game/service.py`
- `api/game/schemas.py`

### Endpoints recomendados

#### 1. Crear partida

`POST /game/start`

Entrada:

- `modo`

Salida:

- id de la partida
- datos iniciales para pintar la pantalla

Ejemplos:

- clasico: no devuelve el lenguaje, solo el estado inicial
- logo: devuelve `logo_path`
- codigo: devuelve `snippet`

#### 2. Enviar intento de lenguaje

`POST /game/{partida_id}/guess-language`

Entrada:

- texto introducido por el usuario

Salida:

- si es correcto
- feedback
- estado actualizado de la partida

#### 3. Enviar respuesta de codigo

`POST /game/{partida_id}/guess-output`

Entrada:

- respuesta del usuario

Salida:

- si es correcto
- estado final o actualizado

#### 4. Obtener estado de partida

`GET /game/{partida_id}`

Salida:

- modo
- estado
- intentos
- fase actual
- puntuacion

#### 5. Historial del usuario

`GET /game/history`

Salida:

- partidas jugadas
- modos
- resultados
- fechas

## Implementacion recomendada en frontend

El frontend todavia esta simple, lo cual es bueno porque permite crecer ordenadamente.

Yo haria:

### Rutas nuevas

- `/menu`
- `/game/classic`
- `/game/logo`
- `/game/code`
- `/history`

### Componentes reutilizables

- formulario de intento
- lista de intentos
- panel de feedback
- cabecera con modo y estado

### Logica compartida

Aunque haya tres modos, intentaria compartir:

- creacion de partida
- carga del estado
- guardado de intentos
- pantalla final

## Orden recomendado de implementacion

Para no complicar demasiado el proyecto, este seria el orden que recomiendo:

### Fase 1. Ajustar dominio base

- Corregir datos de `lenguaje`
- Revisar `creador`
- Sustituir `tipado` por `tipado_tiempo` y `fortaleza_tipado`
- Revisar `paradigma`
- Corregir codificacion

### Fase 2. Crear contenido del juego

- Tabla `lenguaje_alias`
- Tabla `reto_codigo`
- Datos iniciales de lenguajes
- Datos iniciales de logos con su `logo_path` apuntando al bucket ya creado
- Datos iniciales de snippets

### Fase 3. Crear sistema de partidas

- Tabla `partida`
- Tabla `intento_lenguaje`
- Tabla `intento_codigo`

### Fase 4. Backend del juego

- Endpoint para iniciar partida
- Endpoint para enviar intento
- Endpoint para estado de partida
- Endpoint para historial

### Fase 5. Frontend del juego

- Menu principal
- Vista clasico
- Vista logo
- Vista codigo
- Historial

## Recomendacion importante

No recomendaria hacer una tabla distinta para cada modo de juego.

Es mejor tener:

- una estructura comun de `partida`
- una estructura comun de `intento_lenguaje`
- una tabla especifica solo para lo que cambia de verdad, que en este caso es `reto_codigo` e `intento_codigo`

Esto simplifica:

- la base de datos
- el backend
- la logica del frontend
- el mantenimiento futuro

## Propuesta resumida

Si hubiera que resumir la solucion en una sola idea:

> Usar `lenguaje` como entidad central, mantener `paradigma` y `ejecucion`, dividir `tipado` en `tipado_tiempo` y `fortaleza_tipado`, anadir tablas de contenido (`lenguaje_alias`, `reto_codigo`) y construir un sistema comun de partidas e intentos (`partida`, `intento_lenguaje`, `intento_codigo`) que soporte los tres modos sin duplicar logica.

## Siguiente paso sugerido

Cuando esta propuesta este validada, el siguiente paso seria convertir este diseno en migraciones de Liquibase concretas.

Lo ideal seria hacerlo en este orden:

1. Definir el esquema final exacto de tablas.
2. Crear las migraciones nuevas.
3. Insertar datos de ejemplo.
4. Implementar los endpoints del backend.
5. Construir el frontend del juego.
