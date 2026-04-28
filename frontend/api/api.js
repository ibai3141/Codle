const API_BASE_URL = import.meta.env.VITE_API_URL;
import {
  cerrarSesionCompleta,
  obtenerTokenValido,
  tokenHaExpirado,
} from "../src/utils/session";

const MODOS_JUEGO_VALIDOS = ["clasico", "logo", "codigo"];

function normalizarModoJuego(modo) {
  const modoNormalizado = String(modo ?? "").trim().toLowerCase();
  if (!MODOS_JUEGO_VALIDOS.includes(modoNormalizado)) {
    throw new Error(`Modo de juego no soportado: ${modo}`);
  }

  return modoNormalizado;
}

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
  let token = options.token ?? obtenerTokenValido();
  if (token && tokenHaExpirado(token)) {
    cerrarSesionCompleta();
    window.location.assign("/login");
    throw new Error("La sesion ha expirado. Vuelve a iniciar sesion.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (response.status === 401) {
    cerrarSesionCompleta();
    window.location.assign("/login");
    throw new Error("La sesion ha expirado. Vuelve a iniciar sesion.");
  }

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


export async function crearPartidaPorModo(modo, token) {
  // Crea una partida para el modo indicado (clasico, logo o codigo).
  const modoNormalizado = normalizarModoJuego(modo);
  return request(`/${modoNormalizado}/crear_partida`, {
    method: "POST",
    token: token,
  });
}


export async function obtenerPartidaPorModo(modo, partidaId, token) {
  // Obtiene el estado de una partida existente y su historial para el modo indicado.
  const modoNormalizado = normalizarModoJuego(modo);
  const data = await request(`/${modoNormalizado}/${partidaId}`, {
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


export async function obtenerPartidaActivaPorModo(modo, token) {
  const modoNormalizado = normalizarModoJuego(modo);
  const data = await request(`/partidas/activa/${modoNormalizado}`, {
    token: token,
  });

  return data?.partida ?? null;
}


export async function enviarIntentoPorModo(modo, partidaId, respuesta, token) {
  // Envía un intento para el modo indicado. El backend devuelve el resultado oficial.
  const modoNormalizado = normalizarModoJuego(modo);
  const data = await request(`/${modoNormalizado}/guess`, {
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


export async function crearPartida(token) {
  // Compatibilidad: mantiene el contrato actual del modo clásico.
  return crearPartidaPorModo("clasico", token);
}


export async function obtenerPartida(partidaId, token) {
  // Compatibilidad: mantiene el contrato actual del modo clásico.
  return obtenerPartidaPorModo("clasico", partidaId, token);
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
    // Compatibilidad: mantiene el contrato actual del modo clásico.
    return enviarIntentoPorModo("clasico", partidaId, respuesta, token);
}


// Helpers explícitos para modos no clásicos.
export async function crearPartidaLogo(token) {
  return crearPartidaPorModo("logo", token);
}

export async function obtenerPartidaLogo(partidaId, token) {
  return obtenerPartidaPorModo("logo", partidaId, token);
}

export async function enviarIntentoLogo(partidaId, respuesta, token) {
  return enviarIntentoPorModo("logo", partidaId, respuesta, token);
}

export async function crearPartidaCodigo(token) {
  return crearPartidaPorModo("codigo", token);
}

export async function obtenerPartidaCodigo(partidaId, token) {
  return obtenerPartidaPorModo("codigo", partidaId, token);
}

export async function enviarIntentoCodigo(partidaId, respuesta, token) {
  return enviarIntentoPorModo("codigo", partidaId, respuesta, token);
}
