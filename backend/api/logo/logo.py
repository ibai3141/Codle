from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
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


router = APIRouter(prefix="/logo", tags=["logo"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class SolicitudGuess(BaseModel):
    partida_id: int
    respuesta: str


# Busca un lenguaje activo que tenga logo disponible para usarlo
# como objetivo del modo logo.
def buscar_lenguaje():
    try:
        resul = (
            supabase.table("lenguaje")
            .select("id, logo_path")
            .eq("activo", True)
            .not_.is_("logo_path", "null")
            .neq("logo_path", "")
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar un lenguaje objetivo: {str(e)}")

    if not resul.data:
        raise HTTPException(status_code=404, detail="No hay lenguajes activos con logo disponibles para crear la partida")

    return random.choice(resul.data)
# Este endpoint crea una nueva partida en modo logo y devuelve la
# informacion minima necesaria para que el frontend empiece a jugar.
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    lenguaje = buscar_lenguaje()

    try:
        result = (
            supabase.table("partida")
            .insert(
                {
                    "usuario_id": id_usuario,
                    "modo": "LOGO",
                    "lenguaje_objetivo_id": lenguaje["id"],
                    "estado": "en_curso",
                    "fase_actual": "logo",
                    "max_intentos": None,
                    "intentos_usados": 0,
                    "puntuacion": 0,
                }
            )
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear la partida: {str(e)}")

    if not result.data:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")

    partida = result.data[0]
    return {
        "partida_id": partida["id"],
        "modo": partida["modo"],
        "estado": partida["estado"],
        "logoUrl": construir_logo_url(lenguaje["logo_path"]),
    }
# Formatea cada intento para que el frontend pueda pintar el historial del modo logo.
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
    return {
        "numeroIntento": intento["numero_intento"],
        "lenguaje": {
            "id": lenguaje["id"],
            "nombre": lenguaje["nombre"],
            "logoUrl": construir_logo_url(lenguaje["logo_path"]),
        },
        "correcto": intento["es_correcto"],
    }


@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, partida_id, id_usuario)
    # Se devuelve el logo del lenguaje objetivo y el historial ya realizado.
    intentos = historial_partidas(supabase, partida_id)
    logo_lenguaje = obtener_lenguaje_objetivo(supabase, partida["lenguaje_objetivo_id"])

    return {
        "partida": {
            "id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "intentos_usados": partida["intentos_usados"],
        },
        "logoUrl": construir_logo_url(logo_lenguaje["logo_path"]),
        "intentos": [formatear_intento_para_frontend(intento) for intento in intentos.data],
    }


@router.post("/guess")
def guess_logo(datos: SolicitudGuess, Authorization: str = Header(...)):
    # Se valida el usuario y se comprueba que la partida realmente le pertenece.
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, datos.partida_id, id_usuario)

    if partida["modo"] != "LOGO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo logo")

    if partida["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="La partida ya no esta en curso")

    # Se resuelve el texto introducido y se compara con el lenguaje del logo mostrado.
    lenguaje_intentado = buscar_lenguaje_por_respuesta(supabase, datos.respuesta)
    lenguaje_objetivo = obtener_lenguaje_objetivo(supabase, partida["lenguaje_objetivo_id"])

    correcto = lenguaje_intentado["id"] == lenguaje_objetivo["id"]
    numero_intento = partida["intentos_usados"] + 1

    feedback = {
        "correcto": correcto,
        "lenguaje_intentado": {
            "id": lenguaje_intentado["id"],
            "nombre": lenguaje_intentado["nombre"],
            "logo_path": lenguaje_intentado.get("logo_path"),
            "logoUrl": construir_logo_url(lenguaje_intentado.get("logo_path")),
        },
    }

    try:
        # Se guarda el intento con un feedback simple: nombre e imagen del lenguaje escrito.
        intento = (
            supabase.table("intento_lenguaje")
            .insert(
                {
                    "partida_id": datos.partida_id,
                    "numero_intento": numero_intento,
                    "lenguaje_intentado_id": lenguaje_intentado["id"],
                    "es_correcto": correcto,
                    "feedback_json": json.dumps(feedback, ensure_ascii=False),
                }
            )
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el intento: {str(e)}")

    # El contador siempre avanza; si acierta, la partida ya queda cerrada.
    update_data = {"intentos_usados": numero_intento}
    if correcto:
        update_data["estado"] = "ganada"
        update_data["finalizada_en"] = datetime.now(timezone.utc).isoformat()

    try:
        supabase.table("partida").update(update_data).eq("id", datos.partida_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar la partida: {str(e)}")

    return {
        "partida_id": datos.partida_id,
        "numero_intento": numero_intento,
        "estado_partida": "ganada" if correcto else "en_curso",
        "correcto": correcto,
        "intentos_usados": numero_intento,
        "lenguaje_intentado": {
            "id": lenguaje_intentado["id"],
            "nombre": lenguaje_intentado["nombre"],
            "logoUrl": construir_logo_url(lenguaje_intentado.get("logo_path")),
        },
        "intento": intento.data[0] if intento.data else None,
    }
