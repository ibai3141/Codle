# Guia de uso de `venv` (Backend)

Esta guia explica como crear, activar y usar el entorno virtual de Python para este proyecto.

## 1) Entrar a la carpeta del backend

Desde la raiz del proyecto:

```powershell
cd backend
```

## 2) Crear el entorno virtual

Si no existe, crear `venv` con:

```powershell
python -m venv venv
```

Si `python` no funciona, prueba con:

```powershell
py -m venv venv
```

## 3) Activar el entorno virtual

### Windows (PowerShell)

```powershell
venv\Scripts\Activate.ps1
```

### Windows (CMD)

```bat
venv\Scripts\activate.bat
```

Cuando este activo, veras `(venv)` al inicio de la terminal.

## 4) Instalar dependencias

Con el entorno activado:

```powershell
pip install -r requirements.txt
```


## 5) Desactivar el entorno virtual

Cuando termines:

```powershell
deactivate
```

## 6) Flujo rapido (resumen)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
