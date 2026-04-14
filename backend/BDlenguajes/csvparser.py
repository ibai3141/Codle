import csv
import json
import re

ARCHIVO_CSV = "leng.csv"
ARCHIVO_JSON = "lenguajes2.json"

# Funciones para parsear los campos del CSV

# El campo de creadores puede tener varios nombres separados por "and" o por coma, o puede estar vacío o ser "NA"
def parsear_creadores(texto):
    # Si el campo está vacío o es "NA", devolvemos una lista vacía
    if not texto or texto == "NA":
        return []

    # Separar por "and" o por coma, primero se reemplaza " and " por ",", luego separamos por coma
    texto_unificado = texto.replace(" and ", ",")
    partes = texto_unificado.split(",")

    creadores = []
    for parte in partes:
        # Eliminar espacios sobrantes
        parte = parte.strip()
        # Si la parte no está vacía ni es "NA", la añadimos a la lista de creadores
        if parte and parte != "NA":
            creadores.append(parte)
    return creadores

# Parsear el propio año, porque el campo puede tener decimales .0
def parsear_anio(texto):
    try:
        return int(float(texto))
    # Si el texto no es un número válido se pone a null
    except (ValueError, TypeError):
        return None


# El campo de descripción puede estar vacío o ser "NA", en ese caso lo dejamos a None, si no, se le quitan los espacios sobrantes
def parsear_descripcion(texto):
    if not texto or texto == "NA":
        return None
    return texto.strip()


lenguajes = []

with open(ARCHIVO_CSV, encoding="utf-8") as archivoCsv:
    reader = csv.DictReader(archivoCsv)
    for fila in reader:
        
        # Solo queremos lenguajes de programacion
        if fila["type"] != "pl":
            # El continue hace que se salte el resto del código dentro del bucle y pase a la siguiente fila del bucle
            continue

        nombre = fila["title"].strip()
        # Si el lenguaje no tuviera nombre no sería válido
        if not nombre or nombre == "NA":
            continue

        anio = parsear_anio(fila["appeared"])
        creadores = parsear_creadores(fila["creators"])
        descripcion = parsear_descripcion(fila["wikipedia_summary"])

        # El rank es un numero, si no existe lo dejamos en None
        try:
            rank = int(fila["language_rank"])
        except:
            rank = None

        lenguaje = {
            # Datos que están en el CSV
            "nombre": nombre,
            "anio_creacion": anio,
            "descripcion": descripcion,
            "language_rank": rank,
            "creadores": creadores,

            # Datos para rellenar a mano
            "ejecucion": None,
            "paradigma": None,
            "tipado_tiempo": None,
            "fortaleza_tipado": None,

            # Campos a parte
            "activo": True, # De momento se ponen todos los lenguajes como activos para jugar
            "logo_path": None, # El logo se añadirá a mano
        }
        lenguajes.append(lenguaje)


# Ordenar por rank, los que no tienen rank van al final
lenguajes.sort(key=lambda x: (x["language_rank"] is None, x["language_rank"] or 0))

# Se guardan los lenguajes en el Json
with open(ARCHIVO_JSON, "w", encoding="utf-8") as archivo_json:
    json.dump(lenguajes, archivo_json, ensure_ascii=False, indent=2) # indent es necesario para que el json sea legible


print(f"Generados {len(lenguajes)} lenguajes en {ARCHIVO_JSON}")