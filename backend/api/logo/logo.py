'''
- implementar `POST /logo/guess`
- reutilizar la logica ya hecha en clasico para resolver alias o nombre
- validar que la partida pertenece al modo logo
- guardar intentos en `intento_lenguaje`
- actualizar `intentos_usados`
- marcar la partida como `ganada` cuando corresponda
- devolver una respuesta simple y estable para que Cesar no dependa de detalles internos
- coordinar la integracion entre front y backend
'''

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
from api.utils import tokens
import random
import json
from datetime import datetime, timezone
from urllib.parse import quote



router = APIRouter(prefix="/logo", tags=["logo"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
SUPABASE_LOGOS_BUCKET = "imagenes"


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


def construir_logo_url(logo_path):
    if not logo_path:
        return None

    logo_limpio = str(logo_path).strip()
    if not logo_limpio:
        return None

    if logo_limpio.startswith("http://") or logo_limpio.startswith("https://"):
        return logo_limpio

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_LOGOS_BUCKET}/{quote(logo_limpio)}"


@router.post("/guess")
def guess_logo(datos: SolicitudGuess, Authorization: str = Header(...)):

    id_usuario = obtener_usuario_desde_token(Authorization)
    partida = obtener_partida_usuario(datos.partida_id, id_usuario)

    if partida["modo"] != "LOGO":
        raise HTTPException(status_code=400, detail="La partida no pertenece al modo logo")

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
        intento = (
            supabase.table("intento_lenguaje")
            .insert({
                "partida_id": datos.partida_id,
                "numero_intento": numero_intento,
                "lenguaje_intentado_id": lenguaje_intentado["id"],
                "es_correcto": correcto,
                "feedback_json": json.dumps(feedback, ensure_ascii=False),
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el intento: {str(e)}")

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
