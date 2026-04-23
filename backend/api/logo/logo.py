from fastapi import APIRouter, HTTPException, Header
from supabase import create_client, Client
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from api.utils import tokens
import random
import json
from urllib.parse import quote


router = APIRouter(prefix="/logo", tags=["logo"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
SUPABASE_LOGOS_BUCKET = "imagenes"

# Método para buscar un lenguaje activo y cuyo logo no sea null de forma aleatoria
def buscar_lenguaje():
    try:
        resul = supabase.table("lenguaje").select("id,logo_path").eq("activo", True).not_.is_("logo_path", "null").neq("logo_path", "").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar un lenguaje objetivo: {str(e)}")

    if not resul.data:
        raise HTTPException(status_code=404, detail="No hay lenguajes activos disponibles para crear la partida")

    lenguaje_elegido = random.choice(resul.data)
    return lenguaje_elegido


# Método para obtener el id del usuario a partir del token de autorización
def obtener_usuario_desde_token(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    token = authorization.replace("Bearer ", "")
    info = tokens.decodificar_token_acceso(token)
    return int(info["sub"])


# Este endpoint crea una nueva partida en modo logo
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)

    # Obtiene el lenguaje secreto que el usuario tendra que adivinar.
    # Este lenguaje tiene que tener obligatoriamente un logo y tiene que estar activo.
    lenguaje = buscar_lenguaje()

    try:
        # Crea la partida en estado inicial. En el modo logo no hay
        # limite de intentos, por eso max_intentos se guarda como None
        result = supabase.table("partida").insert({
            "usuario_id": id_usuario,
            "modo": "LOGO",
            "lenguaje_objetivo_id": lenguaje["id"],
            "estado": "en_curso",
            "fase_actual": "logo",
            "max_intentos": None,
            "intentos_usados": 0,
            "puntuacion": 0
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear la partida: {str(e)}")

    if result.data:
        # Si la insercion ha ido bien, se devuelve al frontend la informacion
        # minima necesaria para identificar y seguir la partida, junto con la url del logo.
        partida = result.data[0]

        return {
            "partida_id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "logoUrl": lenguaje["logo_path"].strip()
            }
    else:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")
    
    
# Método para obtener una partida concreta de un usuario concreto
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


# Recupera todos los intentos que pertenecen a una partida concreta
# Esto se usa para poder reconstruir el historial de la sesion
def historial_partidas(id):
    try:
        result = supabase.table("intento_lenguaje").select("*").eq("partida_id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el historial de intentos: {str(e)}")

    return result


# Método para obtener todos los campos del lenguaje objetivo por su id
def obtener_lenguaje_objetivo(lenguajeid):
    try:
        lenguaje_objetivo = (
            supabase.table("lenguaje")
            .select("*")
            .eq("id", lenguajeid)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el lenguaje objetivo: {str(e)}")

    if not lenguaje_objetivo.data:
        raise HTTPException(status_code=404, detail="Lenguaje objetivo no encontrado")

    return lenguaje_objetivo.data[0]


# Método para construir la url del logo con la ruta en la que está en la db
def construir_logo_url(logo_path):
    if not logo_path:
        return None

    logo_limpio = str(logo_path).strip()
    if not logo_limpio:
        return None

    if logo_limpio.startswith("http://") or logo_limpio.startswith("https://"):
        return logo_limpio

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_LOGOS_BUCKET}/{quote(logo_limpio)}"


# Método para formatear un intento de lenguaje al formato que espera el frontend
def formatear_intento_para_frontend(intento: dict):
    # Se consiguen los datos del lenguaje que intentó el usuario
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

    # Se formatea cada intento con la info que queremos recuperar, incluido el logo del lenguaje intentado
    return {
        "numeroIntento": intento["numero_intento"],
        "lenguaje": {
            "id": lenguaje["id"],
            "nombre": lenguaje["nombre"],
            "logoUrl": construir_logo_url(lenguaje["logo_path"])
        },
        "correcto": intento["es_correcto"]
    }


# Endpoint para recuperar una partida concreta de un usuario
# Se podrá usar para saber si está empezada o no, y para el historial de intentos
@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(partida_id, id_usuario)

    # Recupera el historial de intentos ya realizados en esa partida
    intentos = historial_partidas(partida_id)

    logoLenguaje = obtener_lenguaje_objetivo(partida["lenguaje_objetivo_id"])

    # Devuelve el estado completo de la partida para que el frontend
    # pueda reconstruir la sesion si el usuario vuelve a entrar
    return {
        "partida": {
            "id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"],
            "intentos_usados": partida["intentos_usados"]
        },
        "logoUrl": construir_logo_url(logoLenguaje["logo_path"]),
        "intentos": [formatear_intento_para_frontend(intento) for intento in intentos.data]
    }
