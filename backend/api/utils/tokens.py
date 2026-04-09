from fastapi import HTTPException
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from api.utils.keys import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
    deprecated="auto",
)

# Método simple para hashear una contraseña
def hashear_contrasenia(contrasena):
    return pwd_context.hash(contrasena)

# Método para verificar una contraseña contra su hash y ver si ha sido modificada
def verificar_contrasenia(contrasena_plana, contrasena_hasheada):
    return pwd_context.verify(contrasena_plana, contrasena_hasheada)  # Este método hashea la contraseña plana y la compara con el hash almacenado
# Data será un dict con los datos del usuario
def crear_token_acceso(datos):
    contenido_token = datos.copy() # Hacemos una copia de los datos para no modificar el dict original

    # Agregamos una fecha de expiración al token a partir de la fecha actual y el tiempo de expiración definido en minutos    
    fecha_expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    contenido_token["exp"] = fecha_expiracion
    # Se codifica el token con la clave secreta y el algoritmo definido, y se devuelve como string al cliente
    return jwt.encode(contenido_token, SECRET_KEY, algorithm=ALGORITHM)


# Este método se usará para decodificar el token de acceso que el cliente envíe en las solicitudes protegidas, y verificar si es válido o no. 
# Lo necesitaremos para próximos accesos a la api, como cuando el cliente quiere jugar
# Devolveremos un dict con los datos del token o None si no es válido
def decodificar_token_acceso(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
