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
