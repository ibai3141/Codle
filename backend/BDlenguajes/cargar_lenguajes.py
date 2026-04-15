import json
import sys
from pathlib import Path

from supabase import create_client

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from api.utils.keys import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


with open("lenguajes_final.json","r", encoding="utf-8") as f:
    read = json.load(f)

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
    return texto.strip().lower()


def alta_creador(creadores):

    try:
        for creador in creadores:
            partes = creador.split()
            nombre = partes[0]
            apellido = " ".join(partes[1:]) if len(partes) > 1 else partes[0]

            existente = (
                supabase.table("creador")
                .select("id")
                .eq("nombre", nombre)
                .eq("apellido", apellido)
                .execute()
            )

            if not existente.data:
                supabase.table("creador").insert(
                    {"nombre": nombre, "apellido": apellido}
                ).execute()

           
    except Exception as e:  
        print(e)


def alta_lenguaje(nombre, anio, desc, ejecucion, paradigma,tiempo_tipado, fortaleza_tipado, activo):
    ### ejecucion_id, paradigma_id, tiempo_tipado_id, fortaleza_tipado_id
    try:
        lenguaje_existente = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre)
            .execute()
        )

        if lenguaje_existente.data:
            return

        ejecucion_id = supabase.table("ejecucion").select("*").eq("nombre",ejecucion).execute()
        paradigma_id = supabase.table("paradigma").select("*").eq("nombre",paradigma).execute()
        tiempo_tipado_id = supabase.table("tipado_tiempo").select("*").eq("nombre",tiempo_tipado).execute()
        fortaleza_tipado_id = supabase.table("fortaleza_tipado").select("*").eq("nombre",fortaleza_tipado).execute()

        result = supabase.table("lenguaje").insert({
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
    try:
        lenguaje = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre_lenguaje)
            .execute()
        )

        if not lenguaje.data:
            return

        lenguaje_id = lenguaje.data[0]["id"]

        for creador in creadores:
            partes = creador.split()
            nombre = partes[0]
            apellido = " ".join(partes[1:]) if len(partes) > 1 else partes[0]

            creador_db = (
                supabase.table("creador")
                .select("id")
                .eq("nombre", nombre)
                .eq("apellido", apellido)
                .execute()
            )

            if not creador_db.data:
                continue

            creador_id = creador_db.data[0]["id"]

            relacion = (
                supabase.table("lenguaje_creador")
                .select("lenguaje_id, creador_id")
                .eq("lenguaje_id", lenguaje_id)
                .eq("creador_id", creador_id)
                .execute()
            )

            if not relacion.data:
                supabase.table("lenguaje_creador").insert(
                    {"lenguaje_id": lenguaje_id, "creador_id": creador_id}
                ).execute()
    except Exception as e:
        print(e)


def alta_alias(nombre_lenguaje):
    try:
        lenguaje = (
            supabase.table("lenguaje")
            .select("id")
            .eq("nombre", nombre_lenguaje)
            .execute()
        )

        if not lenguaje.data:
            return

        lenguaje_id = lenguaje.data[0]["id"]
        aliases = ALIASES_PREDEFINIDOS.get(nombre_lenguaje, [nombre_lenguaje])

        for alias in aliases:
            alias_normalizado = normalizar_alias(alias)
            existente = (
                supabase.table("lenguaje_alias")
                .select("id")
                .eq("alias_normalizado", alias_normalizado)
                .execute()
            )

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


