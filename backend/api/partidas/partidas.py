from fastapi import APIRouter, Header, HTTPException

from api.utils.helpers import obtener_usuario_desde_token
from api.utils.keys import SUPABASE_KEY, SUPABASE_URL
from supabase import create_client


router = APIRouter(prefix="/partidas", tags=["partidas"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MODOS_VALIDOS = {"clasico": "CLASICO", "logo": "LOGO", "codigo": "CODIGO"}


# Devuelve la partida activa del usuario para un modo concreto.
# Esto permite reanudar una sesion aunque el usuario entre desde otro navegador.
@router.get("/activa/{modo}")
def obtener_partida_activa(modo: str, Authorization: str = Header(...)):
    modo_normalizado = modo.strip().lower()
    if modo_normalizado not in MODOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Modo no soportado")

    usuario_id = obtener_usuario_desde_token(Authorization)

    try:
        resultado = (
            supabase.table("partida")
            .select("id,modo,estado")
            .eq("usuario_id", usuario_id)
            .eq("modo", MODOS_VALIDOS[modo_normalizado])
            .eq("estado", "en_curso")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener la partida activa: {str(e)}")

    if not resultado.data:
        return {"partida": None}

    return {"partida": resultado.data[0]}
