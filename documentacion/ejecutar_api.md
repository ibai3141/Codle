# Como ejecutar la API con `venv`

## 1) Ir a la carpeta del backend

Desde la raiz del proyecto:

```powershell
cd backend
```

## 2) Crear `venv` (solo la primera vez)

```powershell
python -m venv venv
```

Si `python` no funciona:

```powershell
py -m venv venv
```

## 3) Activar el entorno virtual

En PowerShell:

```powershell
venv\Scripts\Activate.ps1
```

## 4) Instalar dependencias

```powershell
pip install -r requirements.txt
```

## 5) Levantar la API

Desde `backend`:

```powershell
uvicorn api.main:app --reload
```

La API quedara en:

`http://127.0.0.1:8000`

Swagger:

`http://127.0.0.1:8000/docs`

## 6) Probar endpoints de auth

- Registro: `POST /auth/register`
- Login: `POST /auth/login`

Ejemplo body para registro:

```json
{
  "email": "test@example.com",
  "password": "12345678"
}
```

## 7) Cerrar todo

Parar API: `Ctrl + C`

Desactivar `venv`:

```powershell
deactivate
```

## Problemas comunes

- Si falla la activacion en PowerShell, usa `.\venv\Scripts\Activate.ps1` (con `.\`).
- Si sale error de imports, ejecuta `uvicorn` siempre desde la carpeta `backend`.
