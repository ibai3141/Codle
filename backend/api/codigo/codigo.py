from datetime import datetime, timezone
import random

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from supabase import create_client

from api.utils.helpers import obtener_partida_usuario, obtener_usuario_desde_token
from api.utils.keys import SUPABASE_KEY, SUPABASE_URL


router = APIRouter(prefix="/codigo", tags=["codigo"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MAX_INTENTOS_CODIGO = 10


class SolicitudGuess(BaseModel):
    partida_id: int
    respuesta: str


# Normaliza la salida escrita por el usuario y la salida esperada para que
# espacios sobrantes o saltos de linea equivalentes no provoquen falsos fallos.
def normalizar_salida(texto: str | None):
    if texto is None:
        return ""

    texto_unificado = str(texto).replace("\r\n", "\n").replace("\r", "\n").strip()
    lineas = [linea.rstrip() for linea in texto_unificado.split("\n")]
    return "\n".join(lineas).strip()


# Selecciona un reto activo al azar para iniciar una partida del modo codigo.
def buscar_reto_codigo_random():
    try:
        resultado = (
            supabase.table("reto_codigo")
            .select("id,lenguaje_id,titulo,snippet,salida_esperada,explicacion")
            .eq("activo", True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar un reto de codigo: {str(e)}")

    if not resultado.data:
        raise HTTPException(status_code=404, detail="No hay retos de codigo activos disponibles")

    return random.choice(resultado.data)


def obtener_reto_codigo(reto_codigo_id: int):
    try:
        resultado = (
            supabase.table("reto_codigo")
            .select("id,lenguaje_id,titulo,snippet,salida_esperada,explicacion")
            .eq("id", reto_codigo_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el reto de codigo: {str(e)}")

    if not resultado.data:
        raise HTTPException(status_code=404, detail="Reto de codigo no encontrado")

    return resultado.data[0]


def obtener_intentos_codigo(partida_id: int):
    try:
        resultado = (
            supabase.table("intento_codigo")
            .select("*")
            .eq("partida_id", partida_id)
            .order("numero_intento", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el historial de intentos: {str(e)}")

    return resultado.data or []


def formatear_intento_para_frontend(intento: dict):
    return {
        "numeroIntento": intento["numero_intento"],
        "respuestaUsuario": intento["respuesta_usuario"],
        "respuestaNormalizada": intento.get("respuesta_normalizada"),
        "correcto": intento["es_correcto"],
        "creadoEn": intento.get("creado_en"),
    }


@router.get("/test")
def test():
    return {"mensaje": "esto es un test"}


# Crea una partida de modo codigo con un reto aleatorio y deja preparado el
# snippet para que el frontend lo muestre de inmediato.
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    reto_codigo = buscar_reto_codigo_random()

    try:
        resultado = (
            supabase.table("partida")
            .insert(
                {
                    "usuario_id": id_usuario,
                    "modo": "CODIGO",
                    "lenguaje_objetivo_id": reto_codigo["lenguaje_id"],
                    "reto_codigo_id": reto_codigo["id"],
                    "estado": "en_curso",
                    "fase_actual": "salida",
                    "max_intentos": MAX_INTENTOS_CODIGO,
                    "intentos_usados": 0,
                    "puntuacion": 0,
                }
            )
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear la partida: {str(e)}")

    if not resultado.data:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")

    partida = resultado.data[0]
    return {
        "partida_id": partida["id"],
        "modo": partida["modo"],
        "estado": partida["estado"],
        "max_intentos": partida["max_intentos"] or MAX_INTENTOS_CODIGO,
        "intentos_usados": partida["intentos_usados"],
        "reto": {
            "id": reto_codigo["id"],
            "titulo": reto_codigo["titulo"],
            "snippet": reto_codigo["snippet"],
            "explicacion": reto_codigo.get("explicacion"),
        },
    }


# Recupera una partida del modo codigo para reconstruirla tras recargar o volver
# a entrar, incluyendo el reto actual y el historial de respuestas.
@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, partida_id, id_usuario)

    if partida["modo"] != "CODIGO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo codigo")

    reto_codigo = obtener_reto_codigo(partida["reto_codigo_id"])
    intentos = obtener_intentos_codigo(partida_id)

    return {
        "partida": {
            "id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "fase_actual": partida.get("fase_actual"),
            "max_intentos": partida["max_intentos"] or MAX_INTENTOS_CODIGO,
            "intentos_usados": partida["intentos_usados"],
            "puntuacion": partida["puntuacion"],
            "iniciada_en": partida.get("iniciada_en"),
            "finalizada_en": partida.get("finalizada_en"),
        },
        "reto": {
            "id": reto_codigo["id"],
            "titulo": reto_codigo["titulo"],
            "snippet": reto_codigo["snippet"],
            "explicacion": reto_codigo.get("explicacion"),
        },
        "intentos": [formatear_intento_para_frontend(intento) for intento in intentos],
    }


# Comprueba la salida escrita por el usuario, registra el intento y actualiza
# el estado de la partida a ganada o perdida si corresponde.
@router.post("/guess")
def guess_codigo(datos: SolicitudGuess, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(supabase, datos.partida_id, id_usuario)

    if partida["modo"] != "CODIGO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo codigo")

    if partida["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="La partida ya no esta en curso")

    reto_codigo = obtener_reto_codigo(partida["reto_codigo_id"])
    numero_intento = partida["intentos_usados"] + 1

    respuesta_normalizada = normalizar_salida(datos.respuesta)
    salida_esperada_normalizada = normalizar_salida(reto_codigo["salida_esperada"])
    correcto = respuesta_normalizada == salida_esperada_normalizada

    try:
        intento = (
            supabase.table("intento_codigo")
            .insert(
                {
                    "partida_id": datos.partida_id,
                    "numero_intento": numero_intento,
                    "respuesta_usuario": datos.respuesta,
                    "respuesta_normalizada": respuesta_normalizada,
                    "es_correcto": correcto,
                }
            )
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el intento: {str(e)}")

    update_data = {"intentos_usados": numero_intento}
    estado_partida = "en_curso"

    if correcto:
        update_data["estado"] = "ganada"
        update_data["finalizada_en"] = datetime.now(timezone.utc).isoformat()
        estado_partida = "ganada"
    elif numero_intento >= (partida["max_intentos"] or MAX_INTENTOS_CODIGO):
        update_data["estado"] = "perdida"
        update_data["finalizada_en"] = datetime.now(timezone.utc).isoformat()
        estado_partida = "perdida"

    try:
        supabase.table("partida").update(update_data).eq("id", datos.partida_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar la partida: {str(e)}")

    return {
        "partida_id": datos.partida_id,
        "numero_intento": numero_intento,
        "estado_partida": estado_partida,
        "correcto": correcto,
        "intentos_usados": numero_intento,
        "intentos_restantes": max((partida["max_intentos"] or MAX_INTENTOS_CODIGO) - numero_intento, 0),
        "respuesta_usuario": datos.respuesta,
        "respuesta_normalizada": respuesta_normalizada,
        "salida_esperada": reto_codigo["salida_esperada"] if correcto or estado_partida == "perdida" else None,
        "intento": intento.data[0] if intento.data else None,
    }
