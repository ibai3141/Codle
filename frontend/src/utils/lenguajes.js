export function sacarIniciales(texto) {
  return texto
    .split(/\s+/)
    .map(function (parte) {
      return parte[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
