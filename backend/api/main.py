from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.login import auth
from api.getData import getData

# App principal de FastAPI (punto de entrada del backend).
app = FastAPI()

# Origenes permitidos para que el frontend pueda llamar a la API desde el navegador.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta las rutas de autenticacion definidas en api/login/auth.py.
app.include_router(auth.router)

app.include_router(getData.router)


@app.get("/test")
def root():
    return {"mensaje": "funciona"}
