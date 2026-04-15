import json
import sys
from pathlib import Path

from supabase import create_client

# El script esta dentro de backend/BDlenguajes, pero necesita importar
# las keys que estan dentro de backend/api/utils
# Para que Python pueda encontrar ese modulo, se anade la raiz backend al sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from api.utils.keys import SUPABASE_URL, SUPABASE_KEY

# Se crea el cliente de Supabase. Este objeto se usara para lanzar todas
# las consultas e inserciones contra la base de datos
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Se abre el JSON con los lenguajes ya procesados
# Ese JSON sera la fuente de datos que vamos a recorrer para insertar informacion
with open("lenguajes_final.json","r", encoding="utf-8") as archivojson:
    read = json.load(archivojson)

# Este diccionario contiene aliases manuales para algunos lenguajes
# La idea es guardar abreviaturas o formas alternativas de escribir el nombre,
# por ejemplo "js" para JavaScript o "cpp" para C++
# Luego esos aliases se insertaran en la tabla lenguaje_alias
ALIASES_PREDEFINIDOS = {
    "Java": ["java"],
    "JavaScript": ["javascript", "js"],
    "C": ["c"],
    "Python": ["python", "py"],
    "SQL": ["sql"],
    "C++": ["c++", "cpp"],
    "PHP": ["php"],
    "Perl": ["perl", "pl"],
    "MATLAB": ["matlab"],
    "C#": ["c#", "csharp", "c sharp"],
    "Ruby": ["ruby", "rb"],
    "Fortran": ["fortran"],
    "Assembly": ["assembly", "asm"],
    "R": ["r"],
    "Go": ["go", "golang"],
    "COBOL": ["cobol"],
    "Scala": ["scala"],
    "Ada": ["ada"],
    "Swift": ["swift"],
    "Kotlin": ["kotlin", "kt"],
}


def normalizar_alias(texto):
    # Esta funcion toma un alias y lo transforma a una forma estable
    # Lo que hace es:
    # - quitar espacios al inicio y al final
    # - pasar el texto a minusculas
    #
    # Asi se evita que " JS ", "js" o "Js" se traten como cosas distintas
    return texto.strip().lower()


def alta_creador(creadores):
    # Esta funcion recibe la lista de creadores de un lenguaje y se encarga
    # de darlos de alta en la tabla creador si todavia no existen
    try:
        # Se recorre la lista porque un lenguaje puede tener uno o varios creadores
        for creador in creadores:
            # Se divide el nombre completo por espacios
            # Ejemplo:
            # "James Gosling" -> ["James", "Gosling"]
            partes = creador.split()
            # Aqui se aplica una logica simple:
            # - la primera palabra se toma como nombre
            # - el resto se toma como apellido
            nombre = partes[0]
            apellido = " ".join(partes[1:]) if len(partes) > 1 else partes[0]

            # Antes de insertar, se comprueba si ya existe un creador con ese
            # mismo nombre y apellido
            # Esta consulta devuelve las filas que coincidan exactamente
            existente = (
                supabase.table("creador")
                .select("id")
                .eq("nombre", nombre)
                .eq("apellido", apellido)
                .execute()
            )

            # Si la consulta no devuelve datos, significa que ese creador todavia
            # no esta en la tabla y por tanto hay que insertarlo
            if not existente.data:
                supabase.table("creador").insert(
                    {"nombre": nombre, "apellido": apellido}
                ).execute()

           
    except Exception as e:  
        print(e)


def alta_lenguaje(nombre, anio, desc, ejecucion, paradigma,tiempo_tipado, fortaleza_tipado, activo):
    # Esta funcion inserta un lenguaje en la tabla lenguaje
    # Antes de hacerlo, necesita resolver los ids de las tablas catalogo
    # asociadas a ese lenguaje
    try:
        # Primero se comprueba si el lenguaje ya existe en la tabla lenguaje buscando por su nombre
        # Esto hace que el script sea reutilizable y no falle por duplicados si se ejecuta varias veces
        lenguaje_existente = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre)
            .execute()
        )

        # Si ya existe una fila con ese nombre, se sale de la funcion y no se vuelve a insertar
        if lenguaje_existente.data:
            return

        # Aqui se busca en la tabla ejecucion la fila cuyo nombre coincide
        # con el valor que llega desde el JSON
        # Por ejemplo, si ejecucion = "Hibrido", esta consulta devuelve el id
        # del catalogo "Hibrido", que luego se guardara dentro de lenguaje
        ejecucion_id = supabase.table("ejecucion").select("*").eq("nombre",ejecucion).execute()
        # Aqui se hace el mismo proceso con paradigma
        # Se busca por nombre y se recupera su id
        paradigma_id = supabase.table("paradigma").select("*").eq("nombre",paradigma).execute()
        # Aqui se consulta la tabla tipado_tiempo para obtener el id del valor
        # correspondiente, por ejemplo "Estatico" o "Dinamico"
        tiempo_tipado_id = supabase.table("tipado_tiempo").select("*").eq("nombre",tiempo_tipado).execute()
        # Aqui se consulta fortaleza_tipado para obtener el id de "Fuerte" o "Debil"
        fortaleza_tipado_id = supabase.table("fortaleza_tipado").select("*").eq("nombre",fortaleza_tipado).execute()

        # Una vez resueltos todos esos ids, ya se puede hacer el insert final
        # en la tabla lenguaje.
        # En ese insert:
        # - se guardan los datos directos del lenguaje, como nombre o anio
        # - y tambien los ids de los catalogos relacionados
        supabase.table("lenguaje").insert({
            "nombre":nombre,
            "anio_creacion":anio,
            "ejecucion_id":ejecucion_id.data[0]["id"],
            "paradigma_id":paradigma_id.data[0]["id"],
            "descripcion": desc,
            "activo": activo,
            "tipado_tiempo_id":tiempo_tipado_id.data[0]["id"],
            "fortaleza_tipado_id":fortaleza_tipado_id.data[0]["id"]
        }).execute()
    
        
    except Exception as e:
        print(e)


def alta_lenguaje_creador(nombre_lenguaje, creadores):
    # Esta funcion crea la relacion entre un lenguaje y sus creadores
    # en la tabla intermedia lenguaje_creador
    #
    # Esa tabla existe porque la relacion es N:M:
    # - un lenguaje puede tener varios creadores
    # - un creador puede estar asociado a varios lenguajes
    try:
        # Primero se busca el lenguaje por nombre para obtener su id
        # Ese id sera necesario para la tabla lenguaje_creador
        lenguaje = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre_lenguaje)
            .execute()
        )

        if not lenguaje.data:
            return

        lenguaje_id = lenguaje.data[0]["id"]

        # Se recorre la lista de creadores porque el lenguaje puede tener mas de uno
        for creador in creadores:
            # De nuevo se parte el nombre completo para poder localizar al creador
            # con el mismo criterio usado en alta_creador
            partes = creador.split()
            nombre = partes[0]
            apellido = " ".join(partes[1:]) if len(partes) > 1 else partes[0]

            # Aqui se consulta la tabla creador para recuperar el id de ese creador
            # Si no se recupera el id, no se puede crear la relacion
            creador_db = (
                supabase.table("creador")
                .select("id")
                .eq("nombre", nombre)
                .eq("apellido", apellido)
                .execute()
            )

            # Si no existe ese creador en la base de datos, se pasa al siguiente
            # y no se intenta crear la relacion
            if not creador_db.data:
                continue

            creador_id = creador_db.data[0]["id"]

            # Aqui se comprueba si esa combinacion de lenguaje y creador ya existe en la tabla lenguaje_creador
            # Si ya existe, no se vuelve a insertar
            relacion = (
                supabase.table("lenguaje_creador")
                .select("lenguaje_id, creador_id")
                .eq("lenguaje_id", lenguaje_id)
                .eq("creador_id", creador_id)
                .execute()
            )

            # Si la relacion todavia no existe, se inserta en la tabla intermedia
            if not relacion.data:
                supabase.table("lenguaje_creador").insert(
                    {"lenguaje_id": lenguaje_id, "creador_id": creador_id}
                ).execute()
    except Exception as e:
        print(e)


def alta_alias(nombre_lenguaje):
    # Esta funcion inserta los aliases de un lenguaje en la tabla lenguaje_alias
    # Se usa para poder reconocer formas alternativas de escribir el nombre
    try:
        # Primero se busca el lenguaje real por nombre para obtener su id
        # Ese id se guardara luego en lenguaje_alias para unir alias y lenguaje
        lenguaje = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre_lenguaje)
            .execute()
        )

        if not lenguaje.data:
            return

        lenguaje_id = lenguaje.data[0]["id"]
        # Se recupera la lista de aliases del diccionario.
        # Si el lenguaje no tiene aliases definidos, se usa su propio nombre como alias basico
        aliases = ALIASES_PREDEFINIDOS.get(nombre_lenguaje, [nombre_lenguaje])

        # Se recorre cada alias de la lista para insertarlo por separado
        for alias in aliases:
            # Cada alias se normaliza para tener una version comun y estable que luego sirva para comparar respuestas
            alias_normalizado = normalizar_alias(alias)
            # Antes de insertar, se comprueba si ya existe ese alias_normalizado
            existente = (
                supabase.table("lenguaje_alias")
                .select("id")
                .eq("alias_normalizado", alias_normalizado)
                .execute()
            )

            # Si ese alias todavia no existe, se inserta junto al id del lenguaje
            # y la version normalizada
            if not existente.data:
                supabase.table("lenguaje_alias").insert(
                    {
                        "lenguaje_id": lenguaje_id,
                        "alias": alias,
                        "alias_normalizado": alias_normalizado,
                    }
                ).execute()
    except Exception as e:
        print(e)


# Este recorres los 20 primeros lenguajes para añadirlos a la BD
for i in range(20):
    
    nombre = read[i]['nombre']
    anio_creacion = read[i]['anio_creacion']
    descripcion = read[i]['descripcion']
    creador = read[i]['creadores']
    ejecucion = read[i]['ejecucion']
    paradigma = read[i]['paradigma']
    tiempo_tipado = read[i]['tipado_tiempo']
    fortaleza_tipado = read[i]['fortaleza_tipado']
    activo = read[i]['activo']

    
    alta_creador(creador)
    alta_lenguaje(nombre,anio_creacion, descripcion,ejecucion,paradigma,tiempo_tipado,fortaleza_tipado,activo)
    alta_lenguaje_creador(nombre, creador)
    alta_alias(nombre)
