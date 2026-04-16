from fastapi import APIRouter, HTTPException
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client


router = APIRouter(prefix="/getData", tags=["datos"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)




# rutas para sacar el lenguaje de programacion

# con el nombre
@router.get("/lengByNom")
def lenguajeByNom(nom: str):
    try:
        lenguajeConseguido = supabase.table("lenguaje").select("*").eq("nombre", nom).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el lenguaje con el nombre ({nom}): {str(e)}")

    if not lenguajeConseguido.data:
        raise HTTPException(status_code=404, detail="Lenguaje no encontrado")

    return lenguajeConseguido.data


# con el id
@router.get("/lengById")
def lenguajeById(id: int):
    try:
        lenguajeConseguido = supabase.table("lenguaje").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el lenguaje con el id ({id}): {str(e)}")
    
    if not lenguajeConseguido.data:
        raise HTTPException(status_code=404, detail="Lenguaje no encontrado")
    
    return lenguajeConseguido.data


# con el alias
@router.get("/lengByAlias")
def lenguajeByAlias(alias: str):
    lengId = lengIdByAlias(alias)
    return lenguajeById(lengId)

    
    



# rutas para sacar el creador

# busca un creador por nombre y apellido
@router.get("/creadorByNom")
def creadorByNom(nom: str, ape: str):
    try:
        creadorConseguido = supabase.table("creador").select("*").eq("nombre", nom).eq("apellido", ape).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el creador con el nombre ({nom}) y el apellido ({ape}): {str(e)}")

    if not creadorConseguido.data:
        raise HTTPException(status_code=404, detail="Creador no encontrado")

    return creadorConseguido.data


# busca un creador por id
@router.get("/creadorById")
def creadorById(id: int):
    try:
        creadorConseguido = supabase.table("creador").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el creador con el id ({id}): {str(e)}")

    if not creadorConseguido.data:
        raise HTTPException(status_code=404, detail="Creador no encontrado")

    return creadorConseguido.data





# rutas para sacar la ejecucion
@router.get("/ejecucionById")
def ejecucionById(id: int):
    try:
        ejecucionConseguido = supabase.table("ejecucion").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar la ejecucion con el id ({id}): {str(e)}")
    
    if not ejecucionConseguido.data:
        raise HTTPException(status_code=404, detail="ejecucion no encontrado")
    
    return ejecucionConseguido.data



# rutas para sacar la fortaleza_tipado
@router.get("/fortTipadoById")
def fortTipadoById(id: int):
    try:
        fortalezaTipadoConseguido = supabase.table("fortaleza_tipado").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el fortaleza_tipado con el id ({id}): {str(e)}")
    
    if not fortalezaTipadoConseguido.data:
        raise HTTPException(status_code=404, detail="fortaleza_tipado no encontrado")

    return fortalezaTipadoConseguido.data



# rutas para sacar el paradigma
@router.get("/paradigmaById")
def paradigmaById(id: int):
    try:
        paradigmaCOnseguido = supabase.table("paradigma").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el paradigma con el id ({id}): {str(e)}")
    
    if not paradigmaCOnseguido.data:
        raise HTTPException(status_code=404, detail="paradigma no encontrado")

    return paradigmaCOnseguido.data



# rutas para sacar el tipado_tiempo
@router.get("/tipadoTiempoById")
def tipadoTiempoById(id: int):
    try:
        tipadoTiempoConseguido = supabase.table("tipado_tiempo").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el tipado_tiempo con el id ({id}): {str(e)}")
    
    if not tipadoTiempoConseguido.data:
        raise HTTPException(status_code=404, detail="tipado_tiempo no encontrado")
    
    return tipadoTiempoConseguido.data




# rutas para sacar el lenguaje_alias

# por id
@router.get("/lengAliasById")
def lengAliasById(id: int):
    try:
        lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el lenguaje_alias con el id ({id}): {str(e)}")
    
    if not lengAliasConseguido.data:
        raise HTTPException(status_code=404, detail="alias no encontrado")
    
    return lengAliasConseguido.data


# por alias
@router.get("/lengAliasByAlias")
def lengAliasByNom(alias: str):
    try:
        lengAliasConseguido = supabase.table("lenguaje_alias").select("*").eq("alias", alias).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar el lenguajeAlias con el alias ({alias}): {str(e)}")
    
    if not lengAliasConseguido.data:
        raise HTTPException(status_code=404, detail="alias no encontrado")

    return lengAliasConseguido.data


# sacar id lenguaje por el alias
@router.get("/lengIdByAlias")
def lengIdByAlias(alias: str):
    alias_conseguido = lengAliasByNom(alias)
    return alias_conseguido[0]["lenguaje_id"]




#----------------------------------------------------------------------------------------------------



@router.get("/test")
def test():
    return {"mensaje": "esto es una prueba"}
