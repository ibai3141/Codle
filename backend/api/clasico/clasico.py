from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
from api.utils import tokens
import random
import json
from datetime import datetime, timezone

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


def obtener_usuario_desde_token(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    token = authorization.replace("Bearer ", "")
    info = tokens.decodificar_token_acceso(token)
    return int(info["sub"])


def obtener_partida_usuario(partida_id: int, usuario_id: int):
    try:
        result = (
            supabase.table("partida")
            .select("*")
            .eq("usuario_id", usuario_id)
            .eq("id", partida_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener la partida: {str(e)}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    return result.data[0]


def buscar_lenguaje_por_respuesta(respuesta: str):
    respuesta_normalizada = respuesta.strip().lower()

    try:
        alias = (
            supabase.table("lenguaje_alias")
            .select("lenguaje_id")
            .eq("alias_normalizado", respuesta_normalizada)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el alias del lenguaje: {str(e)}")

    lenguaje_id = None
    if alias.data:
        lenguaje_id = alias.data[0]["lenguaje_id"]
    else:
        try:
            lenguaje = (
                supabase.table("lenguaje")
                .select("*")
                .ilike("nombre", respuesta.strip())
                .execute()
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al buscar el lenguaje por nombre: {str(e)}")

        if not lenguaje.data:
            raise HTTPException(status_code=400, detail="El lenguaje introducido no existe o no esta soportado")

        return lenguaje.data[0]

    try:
        lenguaje = supabase.table("lenguaje").select("*").eq("id", lenguaje_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recuperar el lenguaje intentado: {str(e)}")

    if not lenguaje.data:
        raise HTTPException(status_code=404, detail="Lenguaje no encontrado")

    return lenguaje.data[0]


def construir_feedback(lenguaje_intentado: dict, lenguaje_objetivo: dict):
    anio_resultado = "incorrecto"
    if lenguaje_intentado["anio_creacion"] == lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "correcto"
    elif lenguaje_intentado["anio_creacion"] > lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "mayor"
    elif lenguaje_intentado["anio_creacion"] < lenguaje_objetivo["anio_creacion"]:
        anio_resultado = "menor"

    return {
        "correcto": lenguaje_intentado["id"] == lenguaje_objetivo["id"],
        "lenguaje_intentado": lenguaje_intentado["nombre"],
        "feedback": {
            "anio_creacion": anio_resultado,
            "ejecucion": lenguaje_intentado["ejecucion_id"] == lenguaje_objetivo["ejecucion_id"],
            "paradigma": lenguaje_intentado["paradigma_id"] == lenguaje_objetivo["paradigma_id"],
            "tipado_tiempo": lenguaje_intentado["tipado_tiempo_id"] == lenguaje_objetivo["tipado_tiempo_id"],
            "fortaleza_tipado": lenguaje_intentado["fortaleza_tipado_id"] == lenguaje_objetivo["fortaleza_tipado_id"],
        },
    }


    
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)

    # Obtiene el lenguaje secreto que el usuario tendra que adivinar
    lenguaje_id = buscar_lenguaje()

    try:
        # Crea la partida en estado inicial. En el modo clasico no hay
        # limite de intentos, por eso max_intentos se guarda como None
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
        # Si la insercion ha ido bien, se devuelve al frontend la informacion
        # minima necesaria para identificar y seguir la partida
        partida = result.data[0]

        return {
            "partida_id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"]
            }
    else:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")
    

# Recupera todos los intentos que pertenecen a una partida concreta
# Esto se usa para poder reconstruir el historial de la sesion
def historial_partidas(id):
    try:
        result = supabase.table("intento_lenguaje").select("*").eq("partida_id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el historial de intentos: {str(e)}")

    return result


@router.post("/guess")
def guess_clasico(datos: SolicitudGuess, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(datos.partida_id, id_usuario)

    if partida["modo"] != "CLASICO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo clasico")

    if partida["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="La partida ya no esta en curso")

    lenguaje_intentado = buscar_lenguaje_por_respuesta(datos.respuesta)

    try:
        lenguaje_objetivo = (
            supabase.table("lenguaje")
            .select("*")
            .eq("id", partida["lenguaje_objetivo_id"])
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el lenguaje objetivo: {str(e)}")

    if not lenguaje_objetivo.data:
        raise HTTPException(status_code=404, detail="Lenguaje objetivo no encontrado")

    lenguaje_objetivo = lenguaje_objetivo.data[0]
    feedback = construir_feedback(lenguaje_intentado, lenguaje_objetivo)
    numero_intento = partida["intentos_usados"] + 1

    try:
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
        "resultado": feedback,
    }
        

@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(partida_id, id_usuario)

    # Recupera el historial de intentos ya realizados en esa partida
    intentos = historial_partidas(partida_id)

    # Devuelve el estado completo de la partida para que el frontend
    # pueda reconstruir la sesion si el usuario vuelve a entrar
    return {
        "partida": partida,
        "intentos": intentos.data
    }


