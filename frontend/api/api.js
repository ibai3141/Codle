const API_BASE_URL = import.meta.env.VITE_API_URL;

function normalizarLenguaje(lenguaje) {
  if (!lenguaje) {
    return null;
  }

  return {
    id: lenguaje.id,
    nombre: lenguaje.nombre,
    anioCreacion: lenguaje.anioCreacion ?? lenguaje.anio_creacion,
    ejecucion: lenguaje.ejecucion,
    paradigma: lenguaje.paradigma,
    tipadoTiempo: lenguaje.tipadoTiempo ?? lenguaje.tipado_tiempo,
    fortalezaTipado: lenguaje.fortalezaTipado ?? lenguaje.fortaleza_tipado,
    creadores: lenguaje.creadores ?? [],
    logoUrl: lenguaje.logoUrl ?? lenguaje.logo_path ?? null,
  };
}

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
    const data = await request(`/clasico/${partidaId}`, {
        token: token,
    });

    return {
        ...data,
        intentos: (data.intentos ?? []).map(function (intento) {
            return {
                ...intento,
                lenguaje: normalizarLenguaje(intento.lenguaje),
            };
        }),
    };
}


export async function obtenerLenguajeById(id) {
    // Obtiene los datos completos de un lenguaje por su ID.
    const data = await request(`/getData/lengById?id=${id}`);
    return Array.isArray(data) ? data.map(normalizarLenguaje) : normalizarLenguaje(data);
}


export async function obtenerLenguajeByAlias(alias) {
    // Obtiene los datos completos de un lenguaje usando alias (ej: "js" para JavaScript).
    const data = await request(`/getData/lengByAlias?alias=${encodeURIComponent(alias)}`);
    return Array.isArray(data) ? data.map(normalizarLenguaje) : normalizarLenguaje(data);
}


export async function obtenerLenguajeByNom(nombre) {
    // Obtiene los datos completos de un lenguaje por su nombre exacto.
    const data = await request(`/getData/lengByNom?nom=${encodeURIComponent(nombre)}`);
    return Array.isArray(data) ? data.map(normalizarLenguaje) : normalizarLenguaje(data);
}


export async function obtenerLenguajesActivos() {
    // Obtiene la lista completa de todos los lenguajes activos disponibles para jugar.
    // Devuelve un array con los datos completos de cada lenguaje.
    const data = await request("/getData/lengAll");
    return (data ?? []).map(normalizarLenguaje);
}


export async function enviarIntento(partidaId, respuesta, token) {
    // Envía un intento de respuesta al backend. El servidor valida, busca el lenguaje,
    // calcula el feedback, persiste el intento en BD y devuelve el resultado oficial.
    const data = await request("/clasico/guess", {
        method: "POST",
        token: token,
        body: {
            partida_id: partidaId,
            respuesta: respuesta,
        },
    });

    return {
        ...data,
        lenguaje_intentado: normalizarLenguaje(data.lenguaje_intentado),
    };
}
