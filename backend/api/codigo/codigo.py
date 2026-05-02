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



router = APIRouter(prefix="/codigo", tags=["codigo"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.get("/test")
def test():
    return {"mensaje": "esto es un test"}





#




# Busca un lenguaje activo que tenga logo disponible para usarlo
# como objetivo del modo logo.
def buscar_reto_codigo_random():
    try:
        resul = (supabase.table("reto_codigo").select("id", "lenguaje_id").eq("activo", True).execute())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar un lenguaje objetivo: {str(e)}")

    if not resul.data:
        raise HTTPException(status_code=404, detail="No hay lenguajes activos con logo disponibles para crear la partida")

    return random.choice(resul.data)







@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario  = obtener_usuario_desde_token(Authorization)
    reto_codigo = buscar_reto_codigo_random()

    try:
        result = (
            supabase.table("partida")
            .insert(
                {
                    "usuario_id": id_usuario,
                    "modo": "CODIGO",
                    "lenguaje_objetivo_id": reto_codigo["lenguaje_id"],
                    "reto_codigo_id": reto_codigo["id"],
                    "estado": "en_curso",
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
        "reto_codigo_id": reto_codigo["id"],
    }






# Formatea cada intento para que el frontend pueda pintar el historial del modo logo.
def formatear_intento_para_frontend(intento: dict):
    try:
        lenguaje_resultado = (
            supabase.table("codigo")
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
        },
        "correcto": intento["es_correcto"],
    }




@router.get("/test/{id}")
def buscar_reto_codigo(id: int):
    reto_codigo = supabase.table("reto_codigo").select("*").eq("id", id).execute()
    return reto_codigo.data[0]



@router.get("/{partida_id}")
def obtener_partida(partida_id: int):
    id_usuario = 7#obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, partida_id, id_usuario)
    # Se devuelve el snippet del lenguaje objetivo y el historial ya realizado.
    intentos = historial_partidas(supabase, partida_id)

    reto_codigo = buscar_reto_codigo(partida["reto_codigo_id"])

    return {
        "partida": {
            "id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "intentos_usados": partida["intentos_usados"],
            "reto_codigo_id": reto_codigo["id"]
        },
        "intentos": [formatear_intento_para_frontend(intento) for intento in intentos.data],
    }







class SolicitudGuess(BaseModel):
    partida_id: int
    respuesta: str

@router.post("/guess")
def guess_codigo(datos: SolicitudGuess):
    # Se valida el usuario y se comprueba que la partida realmente le pertenece.
    id_usuario = 7#obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, datos.partida_id, id_usuario)
    print(partida)

    if partida["modo"] != "CODIGO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo logo")

    if partida["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="La partida ya no esta en curso")


    reto_codigo = buscar_reto_codigo(partida["reto_codigo_id"])
    numero_intento = partida["intentos_usados"] + 1

    correcto = datos.respuesta == reto_codigo["salida_esperada"]

    try:
        # Se guarda el intento con un feedback simple: nombre e imagen del lenguaje escrito.
        intento = (
            supabase.table("intento_codigo")
            .insert(
                {
                    "partida_id": datos.partida_id,
                    "numero_intento": numero_intento,
                    "respuesta_usuario": datos.respuesta,
                    "es_correcto": correcto,
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
        "respuesta_intentado": {
            "salida_codigo": datos.respuesta,
        },
        "intento": intento.data[0] if intento.data else None,
    }



