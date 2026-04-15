from fastapi import APIRouter, HTTPException
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client


router = APIRouter(prefix="/getData", tags=["autenticación"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)




# rutas para sacar el lenguaje de programacion

# con el nombre
@router.get("/lengByNom")
def lenguajeByNom(nom: str):
    lenguajeConseguido = supabase.table("lenguaje").select("*").eq("nombre", nom).execute()
    return {"encontrado": lenguajeConseguido}

# con el id
@router.get("/lengById")
def lenguajeById(id: int):
    lenguajeConseguido = supabase.table("lenguaje").select("*").eq("id", id).execute()
    return {"encontrado": lenguajeConseguido}

# con el alias
@router.get("/lengByAlias")
def lenguajeByAlias(alias: str):
    lengId = lengIdByAlias(alias)
    return lenguajeById(lengId)



# rutas para sacar el creador

# busca un creador por nombre y apellido
@router.get("/creadorByNom")
def creadorByNom(nom: str, ape: str):
    creadorConseguido = supabase.table("creador").select("*").eq("nombre", nom).eq("apellido", ape).execute()
    return creadorConseguido

# busca un creador por id
@router.get("/creadorById")
def creadorById(id: int):
    creadorConseguido = supabase.table("creador").select("*").eq("id", id).execute()
    return creadorConseguido





# rutas para sacar la ejecucion
@router.get("/ejecucionById")
def ejecucionById(id: int):
    ejecucionConseguido = supabase.table("ejecucion").select("*").eq("id", id).execute()
    return ejecucionConseguido



# rutas para sacar la fortaleza_tipado
@router.get("/fortTipadoById")
def fortTipadoById(id: int):
    ejecucionConseguido = supabase.table("fortaleza_tipado").select("*").eq("id", id).execute()
    return ejecucionConseguido



# rutas para sacar el paradigma
@router.get("/paradigmaById")
def paradigmaById(id: int):
    ejecucionConseguido = supabase.table("paradigma").select("*").eq("id", id).execute()
    return ejecucionConseguido



# rutas para sacar el tipado_tiempo
@router.get("/tipadoTiempoById")
def tipadoTiempoById(id: int):
    ejecucionConseguido = supabase.table("tipado_tiempo").select("*").eq("id", id).execute()
    return ejecucionConseguido


# rutas para sacar el lenguaje_alias

# por id
@router.get("/lengAliasById")
def lengAliasById(id: int):
    lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("id", id).execute()
    return lengAliasConseguido

# por alias
@router.get("/lengAliasByNom")
def lengAliasByNom(nom: str):
    lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("alias", nom).execute()
    return lengAliasConseguido

# sacar id lenguaje por el alias
@router.get("/lengIdByAlias")
def lengIdByAlias(alias: str):
    alias = lengAliasByNom(alias)
    return alias.data[0]['lenguaje_id']

#----------------------------------------------------------------------------------------------------

@router.get("/test")
def test():
    return {"mensaje": "esto es una prueba"}