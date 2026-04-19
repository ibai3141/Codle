from fastapi import APIRouter, HTTPException, Header
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
from api.utils import tokens
import random

router = APIRouter(prefix="/clasico", tags=["clasico"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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


    
@router.post("/crear_partida")
def crear_partida(Authorization: str = Header(...)):
    # Comprueba que la cabecera Authorization llega con formato Bearer
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    # Extrae el token de la cabecera y lo decodifica para obtener
    # la informacion del usuario autenticado
    token = Authorization.replace("Bearer ","")
    info = tokens.decodificar_token_acceso(token)
    id_usuario = int(info["sub"])

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
        

@router.get("/{partida_id}")
def obtener_partida(partida_id: int, Authorization: str = Header(...)):
    # Vuelve a validar el token para asegurarse de que quien pide la partida
    # es un usuario autenticado
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    # Se decodifica el token para obtener el id del usuario y comprobar
    # que la partida consultada le pertenece realmente
    token = Authorization.replace("Bearer ", "")
    info = tokens.decodificar_token_acceso(token)
    id_usuario = int(info["sub"])

    try:
        # Busca una partida concreta filtrando tanto por el id de la partida
        # como por el usuario autenticado para evitar accesos a partidas ajenas
        result = supabase.table("partida").select("*").eq("usuario_id", id_usuario).eq("id", partida_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener la partida: {str(e)}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Partida no encontrada")

    # Recupera el historial de intentos ya realizados en esa partida
    intentos = historial_partidas(partida_id)

    # Devuelve el estado completo de la partida para que el frontend
    # pueda reconstruir la sesion si el usuario vuelve a entrar
    return {
        "partida": result.data[0],
        "intentos": intentos.data
    }


