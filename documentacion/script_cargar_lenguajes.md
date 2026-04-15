# Script de carga de lenguajes en la base de datos

## Objetivo del documento
Explicar cómo funciona el script `backend/BDlenguajes/cargar_lenguajes.py`, qué datos utiliza, qué tablas rellena y qué va haciendo paso a paso durante la carga de los lenguajes en la base de datos.

## Objetivo del script

El script `cargar_lenguajes.py` se ha creado para automatizar el guardado de los lenguajes en Supabase a partir del archivo `lenguajes_final.json`.

La idea principal es evitar inserciones manuales una a una, ya que cada lenguaje no solo necesita guardarse en la tabla `lenguaje`, sino también en otras tablas relacionadas:

- `creador`
- `lenguaje`
- `lenguaje_creador`
- `lenguaje_alias`

De esta forma, el script permite cargar varios lenguajes de manera repetible y controlada.

## Datos de entrada

El script toma como fuente de datos el archivo:

- `backend/BDlenguajes/lenguajes_final.json`

En ese JSON cada lenguaje contiene la información necesaria para insertarlo en la base de datos, por ejemplo:

- nombre
- año de creación
- descripción
- creadores
- ejecución
- paradigma
- tipado en el tiempo
- fortaleza del tipado
- activo

Además, el script define un diccionario interno con aliases predefinidos para algunos lenguajes, por ejemplo:

- `JavaScript -> javascript, js`
- `C++ -> c++, cpp`
- `C# -> c#, csharp, c sharp`
- `Go -> go, golang`

## Dependencias del script

Para poder funcionar, el script necesita:

- acceso al archivo `lenguajes_final.json`
- conexión a Supabase
- las claves `SUPABASE_URL` y `SUPABASE_KEY`
- que la estructura de la base de datos ya exista

Por eso el script no crea tablas. Solo inserta datos en tablas que ya han sido creadas previamente mediante Liquibase.

## Tablas que utiliza

El script trabaja con estas tablas:

- `creador`
- `lenguaje`
- `lenguaje_creador`
- `lenguaje_alias`
- `ejecucion`
- `paradigma`
- `tipado_tiempo`
- `fortaleza_tipado`

Las cuatro últimas no se rellenan desde este script, sino que se usan como catálogos para obtener sus identificadores y poder relacionarlos con `lenguaje`.

## Funcionamiento general

El flujo del script sigue este orden:

1. Preparar el entorno para poder importar las claves de Supabase.
2. Crear el cliente de Supabase.
3. Abrir y leer el archivo JSON de lenguajes.
4. Definir los aliases predefinidos.
5. Recorrer los lenguajes seleccionados.
6. Insertar primero los creadores.
7. Insertar después el lenguaje.
8. Crear la relación entre lenguaje y creador.
9. Insertar los aliases del lenguaje.

Ese orden es importante porque un lenguaje no puede relacionarse con un creador si antes no existen ambos registros en la base de datos.

## Preparación inicial del script

Al principio del script se importan las librerías necesarias:

- `json` para leer el archivo JSON
- `sys` y `Path` para ajustar rutas
- `create_client` para conectarse a Supabase

Después se modifica `sys.path` para que Python pueda importar:

- `api.utils.keys`

Esto se hace porque el script está dentro de `backend/BDlenguajes`, pero las claves están en otro directorio distinto dentro del proyecto. Si no se hiciera este ajuste, Python no encontraría el módulo.

Una vez hecho eso, el script crea el cliente de Supabase:

```python
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
```

Este objeto es el que se usa a partir de ahí para hacer todas las consultas e inserciones contra la base de datos.

## Lectura del JSON

Después se abre el archivo `lenguajes_final.json` y se carga en memoria.

```python
with open("lenguajes_final.json","r", encoding="utf-8") as archivojson:
    read = json.load(archivojson)
```

En ese momento, `read` pasa a contener la lista de lenguajes que el script va a recorrer.

## Diccionario de aliases

El bloque `ALIASES_PREDEFINIDOS` guarda formas alternativas de escribir determinados lenguajes.

Esto es importante para el juego porque el usuario puede escribir:

- `js` en vez de `JavaScript`
- `cpp` en vez de `C++`
- `golang` en vez de `Go`

El script usa ese diccionario para poblar la tabla `lenguaje_alias`, que luego servirá para reconocer respuestas equivalentes.

## Función `normalizar_alias`

Esta función se utiliza para transformar un alias a una forma estable antes de guardarlo o compararlo.

Lo que hace es:

- quitar espacios sobrantes
- pasar el texto a minúsculas

Por ejemplo:

- `" JS "` pasa a `"js"`
- `"C Sharp"` pasa a `"c sharp"`

Esto evita que la aplicación trate como distintos dos aliases que en realidad significan lo mismo.

## Función `alta_creador`

La función `alta_creador(creadores)` recibe la lista de creadores de un lenguaje.

Su objetivo es asegurarse de que esos creadores existen en la tabla `creador`.

### Qué hace paso a paso

1. Recorre la lista de creadores porque un lenguaje puede tener uno o varios.
2. Divide cada nombre completo por espacios.
3. Toma la primera palabra como `nombre`.
4. Toma el resto como `apellido`.
5. Busca en la tabla `creador` si ya existe una fila con ese nombre y apellido.
6. Si no existe, inserta el creador.

### Por qué se hace así

Antes de insertar se busca si ya existe para evitar duplicados. Eso permite ejecutar el script varias veces sin que falle por intentar insertar el mismo creador dos veces.

## Función `alta_lenguaje`

La función `alta_lenguaje(...)` se encarga de insertar el lenguaje en la tabla `lenguaje`.

### Qué hace paso a paso

1. Busca si ya existe un lenguaje con ese nombre.
2. Si ya existe, no hace nada y sale de la función.
3. Si no existe, consulta los catálogos:
   - `ejecucion`
   - `paradigma`
   - `tipado_tiempo`
   - `fortaleza_tipado`
4. Recupera el `id` de cada uno de esos valores.
5. Inserta la fila en `lenguaje` usando:
   - los datos directos del JSON
   - los IDs obtenidos de los catálogos

### Qué pasa en las consultas a catálogo

Cuando el script hace algo como esto:

```python
ejecucion_id = supabase.table("ejecucion").select("*").eq("nombre", ejecucion).execute()
```

lo que está haciendo es buscar en la tabla `ejecucion` la fila cuyo `nombre` coincide con el valor del JSON, por ejemplo `Interpretado` o `Compilado`.

El resultado de esa consulta contiene el registro encontrado, y de ahí el script toma su `id` para guardarlo en `lenguaje.ejecucion_id`.

Lo mismo ocurre con:

- `paradigma_id`
- `tiempo_tipado_id`
- `fortaleza_tipado_id`

Es decir, el script no guarda esos textos directamente dentro de `lenguaje`, sino que primero busca el registro correspondiente en el catálogo y después guarda su identificador.

### Por qué se hace así

Se hace así porque la tabla `lenguaje` está relacionada con tablas catálogo mediante claves foráneas. Por tanto, antes de insertar el lenguaje es necesario resolver esos IDs.

## Función `alta_lenguaje_creador`

La función `alta_lenguaje_creador(nombre_lenguaje, creadores)` se encarga de rellenar la tabla intermedia `lenguaje_creador`.

Esta tabla representa una relación muchos a muchos:

- un lenguaje puede tener varios creadores
- un creador puede estar asociado a varios lenguajes

### Qué hace paso a paso

1. Busca el lenguaje por su nombre para obtener `lenguaje_id`.
2. Recorre la lista de creadores.
3. Para cada creador, vuelve a separar nombre y apellido.
4. Busca ese creador en la tabla `creador` para obtener `creador_id`.
5. Comprueba si ya existe la combinación `lenguaje_id + creador_id`.
6. Si no existe, inserta la relación en `lenguaje_creador`.

### Qué hace el `for creador in creadores`

Ese `for` existe porque un mismo lenguaje puede tener más de un creador. El script necesita repetir el proceso para cada creador individual y crear una relación independiente para cada uno.

Por ejemplo, si un lenguaje tuviera dos creadores, el script intentaría crear dos filas en `lenguaje_creador`, una por cada creador.

## Función `alta_alias`

La función `alta_alias(nombre_lenguaje)` rellena la tabla `lenguaje_alias`.

### Qué hace paso a paso

1. Busca el lenguaje en la tabla `lenguaje` para recuperar su `id`.
2. Busca en el diccionario `ALIASES_PREDEFINIDOS` si ese lenguaje tiene aliases definidos.
3. Si los tiene, usa esa lista.
4. Si no los tiene, usa como alias básico el propio nombre del lenguaje.
5. Recorre los aliases uno a uno.
6. Normaliza cada alias con `normalizar_alias`.
7. Comprueba si ese alias ya existe.
8. Si no existe, lo inserta en `lenguaje_alias`.

### Por qué se normaliza el alias

Se normaliza para que el sistema pueda comparar respuestas de forma más consistente y evitar duplicados escritos de forma diferente.

Por ejemplo:

- `JS`
- `js`
- ` js `

terminan tratándose como el mismo alias.

## Bucle principal del script

Al final del archivo aparece el bucle principal:

```python
for i in range(20):
```

Ese bucle recorre los primeros 20 lenguajes del JSON y, para cada uno, extrae sus campos principales:

- `nombre`
- `anio_creacion`
- `descripcion`
- `creadores`
- `ejecucion`
- `paradigma`
- `tipado_tiempo`
- `fortaleza_tipado`
- `activo`

Después llama a las funciones en este orden:

1. `alta_creador(creador)`
2. `alta_lenguaje(...)`
3. `alta_lenguaje_creador(nombre, creador)`
4. `alta_alias(nombre)`

### Por qué el orden importa

Ese orden está pensado para respetar la lógica de la base de datos:

- primero deben existir los creadores
- después debe existir el lenguaje
- luego se puede crear la relación entre ambos
- y finalmente se insertan los aliases asociados al lenguaje

## Comportamiento frente a duplicados

Una característica importante del script es que intenta ser reutilizable.

Antes de insertar información nueva, suele comprobar si esa información ya existe:

- en `creador`
- en `lenguaje`
- en `lenguaje_creador`
- en `lenguaje_alias`

Esto evita errores por duplicidad y permite volver a ejecutar el script sin repetir datos ya insertados.


## Resumen final

El script `cargar_lenguajes.py` automatiza la carga de lenguajes en la base de datos a partir de un JSON ya preparado.

Su función no es crear la estructura de la base de datos, sino rellenarla con datos.

Durante la ejecución:

- lee los lenguajes del JSON
- inserta sus creadores
- inserta el lenguaje
- crea la relación entre lenguaje y creador
- añade los aliases necesarios

Gracias a este script, la carga de lenguajes deja de ser manual y pasa a ser un proceso repetible, más rápido y con menos riesgo de errores humanos.
