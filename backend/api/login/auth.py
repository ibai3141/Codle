from fastapi import APIRouter, HTTPException, Header, FastAPI
from pydantic import BaseModel, EmailStr
from supabase import create_client
from backend.api.utils.keys import SUPABASE_URL, SUPABASE_KEY
from backend.api.utils.tokens import hashear_contrasenia, verificar_contrasenia, crear_token_acceso, decodificar_token_acceso
import uvicorn

app = FastAPI()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Modelos de datos para las solicitudes de registro e inicio de sesión
class SolicitudRegistro(BaseModel):
    email: EmailStr
    password: str
    username: str

class SolicitudLogin(BaseModel):
    email: EmailStr
    password: str


# Ruta para registrar un nuevo usuario
@app.post("/auth/register")
def registrar(datos: SolicitudRegistro):
    # Comprobar si el usuario existe antes de intentar crear uno nuevo
    usuario_existente = supabase.table("users").select("*").eq("email", datos.email).execute()
    if usuario_existente.data:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    hash_contrasena = hashear_contrasenia(datos.password)
    try:
        # Insertar el nuevo usuario en la base de datos
        supabase.table("users").insert({
            "email": datos.email,
            "username": datos.username,
            "password_hash": hash_contrasena
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear el usuario: {str(e)}")
    
    return {"message": "Usuario registrado correctamente"}

# Ruta para iniciar sesión, al iniciar sesión se obtiene un token de acceso
@app.post("/auth/login")
def iniciar_sesion(datos: SolicitudLogin):
    # Buscar el usuario por email
    resultado = supabase.table("users").select("*").eq("email", datos.email).execute()
    if not resultado.data:
        raise HTTPException(status_code=401, detail="Email no encontrado")

    usuario = resultado.data[0]
    # Verificar la contraseña proporcionada con el hash almacenado para ver si es correcta
    if not verificar_contrasenia(datos.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # Si la contraseña es correcta, crear un token de acceso con los datos del usuario y devolverlo al cliente
    token = crear_token_acceso({"sub": str(usuario["id"]), "email": usuario["email"]})
    return {"access_token": token, "token_type": "bearer"}



uvicorn.run(app, host="127.0.0.1", port=8090)

