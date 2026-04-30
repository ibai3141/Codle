from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY, CLIENT_ID_DE_GOOGLE
from api.utils.tokens import hashear_contrasenia, verificar_contrasenia, crear_token_acceso, decodificar_token_acceso
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(prefix="/auth", tags=["autenticación"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Modelos de datos para las solicitudes de registro e inicio de sesión
class SolicitudRegistro(BaseModel):
    email: EmailStr
    password: str

class SolicitudLogin(BaseModel):
    email: EmailStr
    password: str


# Ruta para registrar un nuevo usuario
@router.post("/register")
def registrar(datos: SolicitudRegistro):
    # Comprobar si el usuario existe antes de intentar crear uno nuevo
    usuario_existente = supabase.table("usuario").select("*").eq("email", datos.email).execute()
    if usuario_existente.data:
        # Si el usuario ya existe, verificamos si es un registro de Google para dar un mensaje más específico
        if(usuario_existente.data[0]["password_hash"] == "GOOGLE_OAUTH"):
            raise HTTPException(
                status_code=400, 
                detail="Este email ya está registrado con Google. Por favor, usa el botón de 'Continuar con Google' para iniciar sesión."
            )
        # Si no es un registro de google, solo avisamos de que esta registrado
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    hash_contrasena = hashear_contrasenia(datos.password)
    try:
        # Insertar el nuevo usuario en la base de datos
        supabase.table("usuario").insert({
            "email": datos.email,
            "password_hash": hash_contrasena
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear el usuario: {str(e)}")
    
    return {"message": "Usuario registrado correctamente"}

# Ruta para iniciar sesión, al iniciar sesión se obtiene un token de acceso
@router.post("/login")
def iniciar_sesion(datos: SolicitudLogin):
    # Buscar el usuario por email
    resultado = supabase.table("usuario").select("*").eq("email", datos.email).execute()
    if not resultado.data:
        raise HTTPException(status_code=401, detail="Email no encontrado")

    usuario = resultado.data[0]

    # Lógica para que si un usuario está registrado con google inicie sesión por ahí
    if usuario["password_hash"] == "GOOGLE_OAUTH":
        raise HTTPException(
            status_code=400, 
            detail="Este email está asociado a una cuenta de Google. Por favor, usa el botón de 'Continuar con Google'."
        )


    # Verificar la contraseña proporcionada con el hash almacenado para ver si es correcta
    if not verificar_contrasenia(datos.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # Si la contraseña es correcta, crear un token de acceso con los datos del usuario y devolverlo al cliente
    token = crear_token_acceso({"sub": str(usuario["id"]), "email": usuario["email"]})
    return {"access_token": token, "token_type": "bearer"}



router.post("/google-login")
def login_google(datos: dict):
    token_google = datos.get("token")
    
    try:
        # Por seguridad, validamos que el token de verificación viene de Google y que sea para nuestra app en específico
        info_usuario = id_token.verify_oauth2_token(
            token_google, requests.Request(), CLIENT_ID_DE_GOOGLE
        )
        email = info_usuario['email']
        
        # 2. Buscamos al usuario en nuestra BD
        resultado = supabase.table("usuario").select("*").eq("email", email).execute()
        
        # Si no existe, lo registramos con una password sin hashear que nos deja claro que es de google
        # No pasará nada por ponerla así, ya que de normal el cuando pone una password en el login la hashea para comprobarla
        if not resultado.data:
            supabase.table("usuario").insert({"email": email, "password_hash": "GOOGLE_OAUTH"}).execute()
            usuario = supabase.table("usuario").select("*").eq("email", email).execute().data[0]
        else:
            usuario = resultado.data[0]
            
        # Le damos NUESTRO token de FastAPI para continuar con nuestros tokens y poder definir nuestra propia expiración
        token = crear_token_acceso({"sub": str(usuario["id"]), "email": usuario["email"]})
        return {"access_token": token, "token_type": "bearer"}
        
    except ValueError:
        raise HTTPException(status_code=401, detail="Token de Google inválido")