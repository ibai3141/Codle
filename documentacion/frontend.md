# Guia rapida Frontend (React + Vite)

## Requisitos

- Tener instalado Node.js (incluye `npm`).

## 1) Entrar al frontend

```powershell
cd frontend
```

## 2) Instalar dependencias (`node_modules`)

Esto se hace la primera vez (o cuando cambie `package.json`):

```powershell
npm install
```

## 3) Configurar variables de entorno

Crear/editar `frontend/.env` con:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## 4) Levantar servidor de desarrollo

```powershell
npm run dev
```

Vite mostrara una URL tipo:

`http://localhost:5173`


## Comandos resumen

```powershell
cd frontend
npm install
npm run dev
```

## Notas

- Si falla una dependencia, borra `node_modules` y reinstala con `npm install`.
