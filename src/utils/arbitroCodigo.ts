// Código de sesión del árbitro, tal como lo escribe un alumno: puede traer minúsculas,
// espacios de más o guiones (para separar visualmente, como "AB3-XYZ"). Se normaliza antes
// de usarlo en cualquier llamada al servidor o como parte de una URL — ver getSesionArbitro,
// registrarRonda y requestVeredicto, que no normalizan nada (toman el sessionId tal cual
// llega), así que la normalización tiene que pasar en el cliente, antes de llamarlos.
export function normalizarCodigoSesion(crudo: string): string {
  return crudo.trim().toUpperCase().replace(/[\s-]+/g, "");
}
