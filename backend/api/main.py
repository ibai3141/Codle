from fastapi import FastAPI

from api.login import auth

app = FastAPI()



app.include_router(auth.router)


@app.get("/")
def root():
    return{"mensaje": "funciona"}