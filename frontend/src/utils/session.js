const TOKEN_KEY = "access_token";
const PARTIDA_KEY_SUFFIX = "_partida_id_";

function decodificarPayloadJwt(token) {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) {
      return null;
    }

    const payloadBase64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export function obtenerUsuarioIdDesdeToken(token) {
  const payload = decodificarPayloadJwt(token);
  return payload?.sub ? String(payload.sub) : null;
}

export function tokenHaExpirado(token) {
  const payload = decodificarPayloadJwt(token);
  if (!payload?.exp) {
    return true;
  }

  const ahoraEnSegundos = Math.floor(Date.now() / 1000);
  return payload.exp <= ahoraEnSegundos;
}

export function limpiarPartidasGuardadas() {
  const claves = Object.keys(localStorage);
  for (const clave of claves) {
    if (clave.includes(PARTIDA_KEY_SUFFIX)) {
      localStorage.removeItem(clave);
    }
  }

  // Limpia tambien la clave antigua del clasico por compatibilidad.
  localStorage.removeItem("clasico_partida_id");
}

export function cerrarSesionCompleta() {
  localStorage.removeItem(TOKEN_KEY);
}

export function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function obtenerTokenValido() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return null;
  }

  if (tokenHaExpirado(token)) {
    cerrarSesionCompleta();
    return null;
  }

  return token;
}

export function tieneSesionActiva() {
  return Boolean(obtenerTokenValido());
}

export function obtenerClavePartidaModo(modo, token) {
  const usuarioId = obtenerUsuarioIdDesdeToken(token);
  if (!usuarioId) {
    return null;
  }

  return `${modo}${PARTIDA_KEY_SUFFIX}${usuarioId}`;
}
