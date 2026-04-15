# Guardado de datos en la base de datos


## Objetivo del documento
Explicar exactamente cómo se han guardado los datos sobre los lenguajes en la base de datos.

## Origen de los datos

La mayoría de los datos de los lenguajes provienen de `PLDB` (Programming Language Database), una base de datos publica que recopila informacion sobre miles de lenguajes de programacion. Esta base de datos se descargó en formato CSV con mas de 4.300 entradas y columnas como el nombre del lenguaje, el año de creacion, el creador, una descripcion y un ranking de popularidad basado en uso en GitHub y otros indicadores.

El problema de este CSV es que no contiene toda la información necesaria para el juego, como el paradigma, la forma de ejecución, el tipo de tipado o la fortaleza del tipado. Por eso se tuvieron que rellenar manualmente esos campos para cada lenguaje seleccionado.

## Procesamiento del CSV

Para extraer los datos del CSV se escribió un script en Python que utiliza la clase `csv.DictReader`, un estándar en python para manejar archivos csv y convertir cada fila en un diccionario con claves basadas en los nombres de las columnas, lo cual facilita totalmente el acceso a los datos.

```python
with open("leng.csv", encoding="utf-8") as archivocsv:
    reader = csv.DictReader(archivocsv)
    for fila in reader:
        nombre = fila["title"].strip()
        anio = parsear_anio(fila["appeared"])
```

El script aplico algunos filtros y transformaciones como:

- Se filtraron solo las filas con `type = "pl"` (programming language), descartando lenguajes que no son de programación propiamente dichos como lenguajes de marcado, lenguajes de consulta, etc.
- El año de creacion se convirtio de texto a numero entero, ya que algunos valores venian como `1995.0` en vez de `1995`.
- Los creadores venian en un unico campo de texto separados por `comas` o por la palabra `"and"`, por lo que se dividieron en una lista de nombres individuales.
- La descripcion se cogio del campo `wikipedia_summary`, que contiene el primer parrafo del articulo de Wikipedia del lenguaje. Si el campo estaba vacio o contenia el valor NA, se dejo sin descripcion. Estas descripciones han tenido que ser revisadas y editadas manualmente para pasarlas al español sin errores.
- Los campos que no existian en el CSV (paradigma, ejecucion, tipado y fortaleza de tipado) se inicializaron como vacios para rellenarlos despues


## Seleccion de los lenguajes

El resultado del script fue un archivo JSON con `3.368` lenguajes de programacion, pero no necesitamos tantos ni mucho menos en la base de datos. Por ello, se seleccionaron a mano los lenguajes que meter en el nuevo json, usando como criterio principal el `ranking de popularidad` incluido en el CSV, que contiene la mayoría de los lenguajes más conocidos y usados.

Se tomaron los `50` lenguajes con mejor ranking y se añadieron algunos adicionales de forma manual por considerarse relevantes o conocidos aunque no apareciesen entre los primeros por ranking. 

Estos lenguajes añadidos manualmente fueron `SQL, Assembly y Solidity`, que son lenguajes también muy conocidos pero que no aparecen en el filtro porque el CSV los clasifica como queryLanguage o assemblyLanguage.


El total final fue de 53 lenguajes, y el resto de los datos que faltaban en el json se rellenaron manualmente a partir de la información disponible en Wikipedia y otras fuentes fiables, aplicando distintos criterios para asignar el paradigma, la forma de ejecución, el tipo de tipado y la fortaleza del tipado a cada lenguaje.




