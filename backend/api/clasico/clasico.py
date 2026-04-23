from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
from api.utils.helpers import (
    buscar_lenguaje_por_respuesta,
    construir_logo_url,
    historial_partidas,
    obtener_lenguaje_objetivo,
    obtener_partida_usuario,
    obtener_usuario_desde_token,
)
import random
import json
from datetime import datetime, timezone
from functools import lru_cache

router = APIRouter(prefix="/clasico", tags=["clasico"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
class SolicitudGuess(BaseModel):
    partida_id: int
    respuesta: str

# Busca los ids de los lenguajes activos disponibles para el juego
# y elige uno de ellos aleatoriamente para usarlo como objetivo de la partida
def buscar_lenguaje():
    try:
        resul = supabase.table("lenguaje").select("id").eq("activo", True).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar un lenguaje objetivo: {str(e)}")

    if not resul.data:
        raise HTTPException(status_code=404, detail="No hay lenguajes activos disponibles para crear la partida")

    lenguaje_elegido = random.choice(resul.data)
    return lenguaje_elegido["id"]
@lru_cache(maxsize=256)
def obtener_nombre_catalogo(tabla: str, identificador: int):
    try:
        resultado = supabase.table(tabla).select("nombre").eq("id", identificador).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos de {tabla}: {str(e)}")

    if not resultado.data:
        return "Desconocido"

    return resultado.data[0]["nombre"]


def obtener_creadores_lenguaje(lenguaje_id: int):
    try:
        relaciones = (
            supabase.table("lenguaje_creador")
            .select("creador_id")
            .eq("lenguaje_id", lenguaje_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los creadores del lenguaje: {str(e)}")

    if not relaciones.data:
        return []

    creador_ids = [relacion["creador_id"] for relacion in relaciones.data]

    try:
        creadores = (
            supabase.table("creador")
            .select("id,nombre,apellido")
            .in_("id", creador_ids)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los creadores del lenguaje: {str(e)}")

    creadores_por_id = {}
    for creador in creadores.data:
        nombre = creador["nombre"]
        apellido = creador["apellido"]
        creadores_por_id[creador["id"]] = f"{nombre} {apellido}".strip()

    nombres_creadores = []
    for creador_id in creador_ids:
        if creador_id in creadores_por_id:
            nombres_creadores.append(creadores_por_id[creador_id])

    return nombres_creadores


def hayCoincidenciaParcial(listaA, listaB):
    listaBNormalizada = {valor.lower() for valor in listaB}

    for valor in listaA:
        if valor.lower() in listaBNormalizada:
            return True

    return False
# Convierte los datos crudos del lenguaje a un formato estable y legible
# para el frontend del modo clásico.
def formatear_lenguaje_para_frontend(lenguaje: dict, creadores=None):
    return {
        "id": lenguaje["id"],
        "nombre": lenguaje["nombre"],
        "anioCreacion": lenguaje["anio_creacion"],
        "logoUrl": construir_logo_url(lenguaje.get("logo_path")),
        "ejecucion": obtener_nombre_catalogo("ejecucion", lenguaje["ejecucion_id"]),
        "paradigma": obtener_nombre_catalogo("paradigma", lenguaje["paradigma_id"]),
        "tipadoTiempo": obtener_nombre_catalogo("tipado_tiempo", lenguaje["tipado_tiempo_id"]),
        "fortalezaTipado": obtener_nombre_catalogo("fortaleza_tipado", lenguaje["fortaleza_tipado_id"]),
        "creadores": creadores if creadores is not None else obtener_creadores_lenguaje(lenguaje["id"]),
    }
# Genera el feedback del modo clásico comparando el intento con el lenguaje objetivo.
def construir_feedback(lenguaje_intentado: dict, lenguaje_objetivo: dict, creadores_intentado=None, creadores_objetivo=None):
    anio_resultado = "incorrecto"
    if lenguaje_intentado["anio_creacion"] == lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "correcto"
    elif lenguaje_intentado["anio_creacion"] > lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "bajo"
    elif lenguaje_intentado["anio_creacion"] < lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "alto"

    creadores_resultado = "incorrecto"
    if creadores_intentado is not None and creadores_objetivo is not None:
        if set(nombre.lower() for nombre in creadores_intentado) == set(nombre.lower() for nombre in creadores_objetivo):
            creadores_resultado = "correcto"
        elif hayCoincidenciaParcial(creadores_intentado, creadores_objetivo):
            creadores_resultado = "parcial"

    return {
        "correcto": lenguaje_intentado["id"] == lenguaje_objetivo["id"],
        "lenguaje_intentado": lenguaje_intentado["nombre"],
        "feedback": {
            "anio_creacion": anio_resultado,
            "ejecucion": lenguaje_intentado["ejecucion_id"] == lenguaje_objetivo["ejecucion_id"],
            "paradigma": lenguaje_intentado["paradigma_id"] == lenguaje_objetivo["paradigma_id"],
            "tipado_tiempo": lenguaje_intentado["tipado_tiempo_id"] == lenguaje_objetivo["tipado_tiempo_id"],
            "fortaleza_tipado": lenguaje_intentado["fortaleza_tipado_id"] == lenguaje_objetivo["fortaleza_tipado_id"],
            "creadores": creadores_resultado,
        },
    }
# Reconstruye cada intento con la estructura que espera el frontend al recuperar una partida.
def formatear_intento_para_frontend(intento: dict):
    try:
        lenguaje_resultado = (
            supabase.table("lenguaje")
            .select("*")
            .eq("id", intento["lenguaje_intentado_id"])
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el lenguaje del intento: {str(e)}")

    if not lenguaje_resultado.data:
        raise HTTPException(status_code=404, detail="Lenguaje del intento no encontrado")

    lenguaje = lenguaje_resultado.data[0]
    creadores = obtener_creadores_lenguaje(lenguaje["id"])

    feedback_json = intento.get("feedback_json") or "{}"
    if isinstance(feedback_json, str):
        try:
            feedback_data = json.loads(feedback_json)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Error al leer el feedback del intento: {str(e)}")
    else:
        feedback_data = feedback_json

    feedback = feedback_data.get("feedback", {})

    return {
        "numeroIntento": intento["numero_intento"],
        "lenguaje": formatear_lenguaje_para_frontend(lenguaje, creadores),
        "estados": {
            "nombre": "correcto" if intento["es_correcto"] else "incorrecto",
            "anioCreacion": feedback.get("anio_creacion", "incorrecto"),
            "ejecucion": "correcto" if feedback.get("ejecucion") else "incorrecto",
            "paradigma": "correcto" if feedback.get("paradigma") else "incorrecto",
            "tipadoTiempo": "correcto" if feedback.get("tipado_tiempo") else "incorrecto",
            "fortalezaTipado": "correcto" if feedback.get("fortaleza_tipado") else "incorrecto",
            "creadores": feedback.get("creadores", "incorrecto"),
        },
    }


    
# Crea una nueva partida clásica para el usuario autenticado.
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)

    # Obtiene el lenguaje secreto que el usuario tendra que adivinar.
    lenguaje_id = buscar_lenguaje()

    try:
        # En el clásico no hay limite de intentos, por eso max_intentos queda a null.
        result = supabase.table("partida").insert({
            "usuario_id": id_usuario,
            "modo": "CLASICO",
            "lenguaje_objetivo_id": lenguaje_id,
            "estado": "en_curso",
            "fase_actual": "lenguaje",
            "max_intentos": None,
            "intentos_usados": 0,
            "puntuacion": 0
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear la partida: {str(e)}")

    if result.data:
        # El frontend solo necesita los datos minimos para empezar a jugar.
        partida = result.data[0]

        return {
            "partida_id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"]
            }
    else:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")
    

@router.post("/guess")
def guess_clasico(datos: SolicitudGuess, Authorization: str = Header(...)):
    # Primero se comprueba que el usuario autenticado es dueño de la partida.
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, datos.partida_id, id_usuario)

    if partida["modo"] != "CLASICO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo clasico")

    if partida["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="La partida ya no esta en curso")

    # Resuelve el texto escrito por el usuario contra alias y nombres soportados.
    lenguaje_intentado = buscar_lenguaje_por_respuesta(supabase, datos.respuesta)

    # Recupera el lenguaje secreto guardado en la partida para compararlo con el intento.
    lenguaje_objetivo = obtener_lenguaje_objetivo(supabase, partida["lenguaje_objetivo_id"])
    creadores_intentado = obtener_creadores_lenguaje(lenguaje_intentado["id"])
    creadores_objetivo = obtener_creadores_lenguaje(lenguaje_objetivo["id"])
    feedback = construir_feedback(
        lenguaje_intentado,
        lenguaje_objetivo,
        creadores_intentado,
        creadores_objetivo,
    )
    # El numero de intento sale del contador actual guardado en la partida.
    numero_intento = partida["intentos_usados"] + 1

    try:
        # Se guarda el intento junto con el feedback para poder reconstruir la sesion.
        intento = (
            supabase.table("intento_lenguaje")
            .insert({
                "partida_id": datos.partida_id,
                "numero_intento": numero_intento,
                "lenguaje_intentado_id": lenguaje_intentado["id"],
                "es_correcto": feedback["correcto"],
                "feedback_json": json.dumps(feedback, ensure_ascii=False),
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el intento: {str(e)}")

    # Siempre se incrementan los intentos usados; si acierta se cierra la partida.
    update_data = {"intentos_usados": numero_intento}
    if feedback["correcto"]:
        update_data["estado"] = "ganada"
        update_data["finalizada_en"] = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("partida").update(update_data).eq("id", datos.partida_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar la partida: {str(e)}")

    return {
        "partida_id": datos.partida_id,
        "numero_intento": numero_intento,
        "estado_partida": "ganada" if feedback["correcto"] else "en_curso",
        "intento": intento.data[0] if intento.data else None,
        "lenguaje_intentado": formatear_lenguaje_para_frontend(lenguaje_intentado, creadores_intentado),
        "resultado": feedback,
    }
@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, partida_id, id_usuario)

    # Devuelve el historial para que el frontend pueda reconstruir la sesion.
    intentos = historial_partidas(supabase, partida_id)

    # La respuesta incluye el estado actual y todos los intentos ya hechos.
    return {
        "partida": {
            "id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "fase_actual": partida["fase_actual"],
            "max_intentos": partida["max_intentos"],
            "intentos_usados": partida["intentos_usados"],
            "puntuacion": partida["puntuacion"],
            "creada_en": partida.get("creada_en"),
            "finalizada_en": partida.get("finalizada_en"),
        },
        "intentos": [formatear_intento_para_frontend(intento) for intento in intentos.data]
    }


