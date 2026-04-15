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
    if not lenguajeConseguido.data:
        raise HTTPException(status_code=401, detail="Lenguaje no encontrado")

    return lenguajeConseguido.data


# con el id
@router.get("/lengById")
def lenguajeById(id: int):
    lenguajeConseguido = supabase.table("lenguaje").select("*").eq("id", id).execute()
    if not lenguajeConseguido.data:
        raise HTTPException(status_code=401, detail="Lenguaje no encontrado")
    
    return lenguajeConseguido.data


# con el alias
@router.get("/lengByAlias")
def lenguajeByAlias(alias: str):
    lengId = lengIdByAlias(alias)
    if not lengId:
        raise HTTPException(status_code=401, detail="No hay ningun lenguaje con el alias proporcionado: "+alias)

    lenguajeConseguido = lenguajeById(lengId)
    if not lenguajeConseguido.data:
        raise HTTPException(status_code=401, detail="No hay ningun lenguaje con el id conseguido del alias: "+lengId)

    return lenguajeConseguido.data




# rutas para sacar el creador

# busca un creador por nombre y apellido
@router.get("/creadorByNom")
def creadorByNom(nom: str, ape: str):
    creadorConseguido = supabase.table("creador").select("*").eq("nombre", nom).eq("apellido", ape).execute()
    if not creadorConseguido.data:
        raise HTTPException(status_code=401, detail="Creador no encontrado")

    return creadorConseguido.data


# busca un creador por id
@router.get("/creadorById")
def creadorById(id: int):
    creadorConseguido = supabase.table("creador").select("*").eq("id", id).execute()
    if not creadorConseguido.data:
        raise HTTPException(status_code=401, detail="Creador no encontrado")

    return creadorConseguido.data





# rutas para sacar la ejecucion
@router.get("/ejecucionById")
def ejecucionById(id: int):
    ejecucionConseguido = supabase.table("ejecucion").select("*").eq("id", id).execute()
    if not ejecucionConseguido.data:
        raise HTTPException(status_code=401, detail="ejecucion no encontrado")
    
    return ejecucionConseguido.data



# rutas para sacar la fortaleza_tipado
@router.get("/fortTipadoById")
def fortTipadoById(id: int):
    fortalezaTipadoConseguido = supabase.table("fortaleza_tipado").select("*").eq("id", id).execute()
    if not fortalezaTipadoConseguido.data:
        raise HTTPException(status_code=401, detail="fortaleza_tipado no encontrado")

    return fortalezaTipadoConseguido.data



# rutas para sacar el paradigma
@router.get("/paradigmaById")
def paradigmaById(id: int):
    paradigmaCOnseguido = supabase.table("paradigma").select("*").eq("id", id).execute()
    if not paradigmaCOnseguido.data:
        raise HTTPException(status_code=401, detail="paradigma no encontrado")

    return paradigmaCOnseguido.data



# rutas para sacar el tipado_tiempo
@router.get("/tipadoTiempoById")
def tipadoTiempoById(id: int):
    tipadoTiempoConseguido = supabase.table("tipado_tiempo").select("*").eq("id", id).execute()
    if not tipadoTiempoConseguido.data:
        raise HTTPException(status_code=401, detail="tipado_tiempo no encontrado")
    
    return tipadoTiempoConseguido.data




# rutas para sacar el lenguaje_alias

# por id
@router.get("/lengAliasById")
def lengAliasById(id: int):
    lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("id", id).execute()
    if not lengAliasConseguido.data:
        raise HTTPException(status_code=401, detail="alias no encontrado")
    
    return lengAliasConseguido.data


# por alias
@router.get("/lengAliasByAlias")
def lengAliasByNom(alias: str):
    lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("alias", alias).execute()
    if not lengAliasConseguido:
        raise HTTPException(status_code=401, detail="alias no encontrado")

    return lengAliasConseguido


# sacar id lenguaje por el alias
@router.get("/lengIdByAlias")
def lengIdByAlias(alias: str):
    alias = lengAliasByNom(alias)
    if not alias.data:
        raise HTTPException(status_code=401, detail="alias no encontrado")

    return alias.data[0]['lenguaje_id']




#----------------------------------------------------------------------------------------------------



@router.get("/test")
def test():
    return {"mensaje": "esto es una prueba"}