from fastapi import HTTPException
from urllib.parse import quote

from api.utils import tokens
from api.utils.keys import SUPABASE_URL


SUPABASE_LOGOS_BUCKET = "imagenes"


# Extrae el usuario autenticado a partir del token Bearer enviado por el frontend.
def obtener_usuario_desde_token(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    token = authorization.replace("Bearer ", "")
    info = tokens.decodificar_token_acceso(token)
    return int(info["sub"])


# Comprueba que la partida exista y que realmente pertenezca al usuario autenticado.
def obtener_partida_usuario(supabase, partida_id: int, usuario_id: int):
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


# Resuelve lo que escribe el usuario intentando primero por alias normalizado
# y, si no existe alias, buscando por nombre del lenguaje.
def buscar_lenguaje_por_respuesta(supabase, respuesta: str):
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


# Recupera el lenguaje objetivo guardado en la partida para compararlo con el intento.
def obtener_lenguaje_objetivo(supabase, lenguaje_id: int):
    try:
        lenguaje_objetivo = (
            supabase.table("lenguaje")
            .select("*")
            .eq("id", lenguaje_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el lenguaje objetivo: {str(e)}")

    if not lenguaje_objetivo.data:
        raise HTTPException(status_code=404, detail="Lenguaje objetivo no encontrado")

    return lenguaje_objetivo.data[0]


# Devuelve todos los intentos guardados de una partida para reconstruir su historial.
def historial_partidas(supabase, partida_id: int):
    try:
        result = supabase.table("intento_lenguaje").select("*").eq("partida_id", partida_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el historial de intentos: {str(e)}")

    return result


# Convierte la ruta guardada en la BD en una URL pública consumible por el frontend.
def construir_logo_url(logo_path):
    if not logo_path:
        return None

    logo_limpio = str(logo_path).strip()
    if not logo_limpio:
        return None

    if logo_limpio.startswith("http://") or logo_limpio.startswith("https://"):
        return logo_limpio

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_LOGOS_BUCKET}/{quote(logo_limpio)}"
