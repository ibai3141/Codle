'''
### Ibai

- implementar `POST /game/classic/start`
- elegir el lenguaje objetivo aleatorio
- crear la fila correspondiente en `partida`
- asociar la partida al usuario autenticado
- definir y dejar estable el formato de respuesta del backend
- implementar `GET /game/classic/{partida_id}` si da tiempo
- coordinar la integracion general del modo clasico
'''

from fastapi import APIRouter, HTTPException, Header
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
from api.utils import tokens
import random

router = APIRouter(prefix="/clasico", tags=["clasico"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


'''
### Que hace este endpoint

Cuando el usuario entra al modo clasico, el frontend debe llamar a este endpoint.

El backend debe:

1. Identificar al usuario autenticado.
2. Elegir un lenguaje objetivo aleatorio de la tabla `lenguaje`.
3. Crear una nueva fila en `partida`.
4. Devolver al frontend el identificador de la partida.

### Campos recomendados al crear la partida

- `usuario_id`
- `modo = "clasico"`
- `lenguaje_objetivo_id`
- `estado = "en_curso"`
- `fase_actual = "lenguaje"`
- `max_intentos = null`
- `intentos_usados = 0`
- `puntuacion = 0`
- `iniciada_en`

### Respuesta esperada

```json
{
  "partida_id": 12,
  "modo": "clasico",
  "estado": "en_curso"
}

- `usuario_id`
- `modo = "clasico"`
- `lenguaje_objetivo_id`
- `estado = "en_curso"`
- `fase_actual = "lenguaje"`
- `max_intentos = null`
- `intentos_usados = 0`
- `puntuacion = 0`
- `iniciada_en`
```'''
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
    
    if not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado correctamente")

    token = Authorization.replace("Bearer ","")
    info = tokens.decodificar_token_acceso(token)
    id_usuario = int(info["sub"])

    lenguaje_id = buscar_lenguaje()

    try:
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
        partida = result.data[0]

        return {
            "partida_id": partida["id"],
            "modo": partida["modo"],
            "estado": partida["estado"]
            }
    else:
        raise HTTPException(status_code=500, detail="No se pudo crear la partida")
        

    



@router.get("/prueba")
def prueba():
    return{"mensaje":"funciona"}
