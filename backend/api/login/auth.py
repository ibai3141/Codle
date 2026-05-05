from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client
from api.utils.keys import SUPABASE_URL, SUPABASE_KEY, CLIENT_ID_DE_GOOGLE
from api.utils.tokens import (
    hashear_contrasenia,
    verificar_contrasenia,
    crear_token_acceso,
)
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter(prefix="/auth", tags=["autenticacion"])
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Modelos de datos para las solicitudes de registro e inicio de sesion
class SolicitudRegistro(BaseModel):
    email: EmailStr
    password: str


class SolicitudLogin(BaseModel):
    email: EmailStr
    password: str


class SolicitudGoogle(BaseModel):
    token: str


class SolicitudReenvioVerificacion(BaseModel):
    email: EmailStr


def buscar_usuario_auth_por_email(email: str):
    # Buscamos al usuario dentro de Supabase Auth para saber si existe y
    # comprobar luego si su correo ya ha sido verificado.
    try:
        respuesta = supabase.auth.admin.list_users(page=1, per_page=1000)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al comprobar el estado del correo: {str(e)}",
        )

    usuarios = []
    if hasattr(respuesta, "users"):
        usuarios = respuesta.users or []
    elif isinstance(respuesta, dict):
        usuarios = respuesta.get("users", []) or []

    email_objetivo = email.lower()

    for usuario in usuarios:
        email_usuario = getattr(usuario, "email", None)
        if email_usuario is None and isinstance(usuario, dict):
            email_usuario = usuario.get("email")

        if email_usuario and email_usuario.lower() == email_objetivo:
            return usuario

    return None


def correo_esta_verificado(usuario_auth) -> bool:
    # Supabase guarda la fecha de confirmacion del correo. Si existe,
    # consideramos que el email ya esta verificado.
    confirmado = getattr(usuario_auth, "email_confirmed_at", None)
    if confirmado is None and isinstance(usuario_auth, dict):
        confirmado = usuario_auth.get("email_confirmed_at")

    return bool(confirmado)

# Ruta para registrar un nuevo usuario
@router.post("/register")
def registrar(datos: SolicitudRegistro):
    # Comprobar si el usuario existe antes de intentar crear uno nuevo
    usuario_existente = (
        supabase.table("usuario").select("*").eq("email", datos.email).execute()
    )
    if usuario_existente.data:
        # Si el usuario ya existe, verificamos si es un registro de Google
        # para dar un mensaje mas especifico.
        if usuario_existente.data[0]["password_hash"] == "GOOGLE_OAUTH":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Este email ya esta registrado con Google. "
                    "Usa el boton de continuar con Google para iniciar sesion."
                ),
            )

        # Si no es un registro de Google, solo avisamos de que ya esta registrado.
        raise HTTPException(status_code=400, detail="El email ya esta registrado")

    try:
        # Creamos el usuario tambien en Supabase Auth para que se mande el
        # correo de verificacion automaticamente.
        supabase.auth.sign_up(
            {
                "email": datos.email,
                "password": datos.password,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al iniciar la verificacion del correo: {str(e)}",
        )

    hash_contrasena = hashear_contrasenia(datos.password)
    try:
        # Insertar el nuevo usuario en la base de datos propia de la aplicacion.
        supabase.table("usuario").insert(
            {
                "email": datos.email,
                "password_hash": hash_contrasena,
            }
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear el usuario: {str(e)}")

    return {
        "message": (
            "Cuenta creada correctamente. Revisa tu correo para verificarla "
            "antes de iniciar sesion."
        )
    }


@router.post("/resend-verification")
def reenviar_verificacion(datos: SolicitudReenvioVerificacion):
    # Reenviamos el correo de verificacion solo a usuarios registrados
    # por email y que todavia no hayan confirmado su cuenta.
    resultado = supabase.table("usuario").select("*").eq("email", datos.email).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="No existe ninguna cuenta con ese email")

    usuario = resultado.data[0]
    if usuario["password_hash"] == "GOOGLE_OAUTH":
        raise HTTPException(
            status_code=400,
            detail="Ese email pertenece a una cuenta de Google y no necesita verificacion",
        )

    usuario_auth = buscar_usuario_auth_por_email(datos.email)
    if not usuario_auth:
        raise HTTPException(
            status_code=404,
            detail="No se encontro el usuario en el sistema de autenticacion",
        )

    if correo_esta_verificado(usuario_auth):
        raise HTTPException(status_code=400, detail="El correo ya esta verificado")

    try:
        supabase.auth.resend(
            {
                "type": "signup",
                "email": datos.email,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al reenviar el correo de verificacion: {str(e)}",
        )

    return {"message": "Correo de verificacion reenviado correctamente"}

# Ruta para iniciar sesion, al iniciar sesion se obtiene un token de acceso
@router.post("/login")
def iniciar_sesion(datos: SolicitudLogin):
    # Buscar el usuario por email
    resultado = supabase.table("usuario").select("*").eq("email", datos.email).execute()
    if not resultado.data:
        raise HTTPException(status_code=401, detail="Email no encontrado")

    usuario = resultado.data[0]

    # Logica para que si un usuario esta registrado con Google inicie sesion por ahi
    if usuario["password_hash"] == "GOOGLE_OAUTH":
        raise HTTPException(
            status_code=400,
            detail=(
                "Este email esta asociado a una cuenta de Google. "
                "Usa el boton de continuar con Google."
            ),
        )

    # Comprobamos en Supabase Auth si el correo ya ha sido verificado.
    usuario_auth = buscar_usuario_auth_por_email(datos.email)
    if not usuario_auth:
        raise HTTPException(
            status_code=401,
            detail="No se encontro la cuenta de autenticacion para este email",
        )

    if not correo_esta_verificado(usuario_auth):
        raise HTTPException(
            status_code=401,
            detail="Debes verificar tu correo antes de iniciar sesion",
        )

    # Verificar la contrasena proporcionada con el hash almacenado para ver si es correcta
    if not verificar_contrasenia(datos.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Contrasena incorrecta")

    # Si la contrasena es correcta, crear un token de acceso con los datos
    # del usuario y devolverlo al cliente.
    token = crear_token_acceso({"sub": str(usuario["id"]), "email": usuario["email"]})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/google-login")
def login_google(datos: SolicitudGoogle):
    token_google = datos.token

    try:
        # Por seguridad, validamos que el token de verificacion viene de Google
        # y que sea para nuestra app en especifico.
        info_usuario = id_token.verify_oauth2_token(
            token_google, requests.Request(), CLIENT_ID_DE_GOOGLE
        )
        email = info_usuario["email"]

        # Buscamos al usuario en nuestra BD.
        resultado = supabase.table("usuario").select("*").eq("email", email).execute()

        # Si no existe, lo registramos con una password especial que nos deja
        # claro que es una cuenta creada desde Google.
        if not resultado.data:
            supabase.table("usuario").insert(
                {"email": email, "password_hash": "GOOGLE_OAUTH"}
            ).execute()
            usuario = (
                supabase.table("usuario").select("*").eq("email", email).execute().data[0]
            )
        else:
            usuario = resultado.data[0]

        # Le damos nuestro token de FastAPI para continuar con nuestros tokens
        # y poder definir nuestra propia expiracion.
        token = crear_token_acceso({"sub": str(usuario["id"]), "email": usuario["email"]})
        return {"access_token": token, "token_type": "bearer"}

    except ValueError:
        raise HTTPException(status_code=401, detail="Token de Google invalido")
