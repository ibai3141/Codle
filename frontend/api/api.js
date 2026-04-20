const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper comun para todas las peticiones HTTP al backend.
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.detail ?? "Ha ocurrido un error en la peticion");
  }

  return data;
}


export async function login(email, password) {
    // Login con email/password contra el endpoint de auth.
    return request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
}


export async function register(payload) {
    // Registro de un nuevo usuario.
    return request("/auth/register", {method:"POST", body:payload})
    
}


export async function crearPartida(token) {
    // Crea una partida en modo clásico. Requiere token autenticado.
    // Devuelve partida_id, modo y estado.
    return request("/clasico/crear_partida", {
        method: "POST",
        token: token,
    });
}


export async function obtenerPartida(partidaId, token) {
    // Obtiene el estado de una partida existente y su historial de intentos.
    return request(`/clasico/${partidaId}`, {
        token: token,
    });
}


export async function obtenerLenguajeById(id) {
    // Obtiene los datos completos de un lenguaje por su ID.
    return request(`/getData/lengById?id=${id}`);
}


export async function obtenerLenguajeByAlias(alias) {
    // Obtiene los datos completos de un lenguaje usando alias (ej: "js" para JavaScript).
    return request(`/getData/lengByAlias?alias=${encodeURIComponent(alias)}`);
}


export async function obtenerLenguajeByNom(nombre) {
    // Obtiene los datos completos de un lenguaje por su nombre exacto.
    return request(`/getData/lengByNom?nom=${encodeURIComponent(nombre)}`);
}


export async function obtenerLenguajesActivos() {
    // Obtiene la lista completa de todos los lenguajes activos disponibles para jugar.
    // Devuelve un array con los datos completos de cada lenguaje.
    return request("/getData/lengAll");
}


export async function enviarIntento(partidaId, respuesta, token) {
    // Envía un intento de respuesta al backend. El servidor valida, busca el lenguaje,
    // calcula el feedback, persiste el intento en BD y devuelve el resultado oficial.
    return request("/clasico/guess", {
        method: "POST",
        token: token,
        body: {
            partida_id: partidaId,
            respuesta: respuesta,
        },
    });
}
