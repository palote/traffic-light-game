// src/utils/nextRoute.ts
// Valida el parámetro ?next= usado por /login para volver a donde estaba el usuario.
//
// No alcanza con mirar si el string empieza con "/" y no con "//": el propio parser de URLs
// (el mismo que usa el navegador) interpreta una barra invertida como separador y descarta
// tabs/saltos de línea ANTES de armar la URL final, así que algo como "/\evil.com" o
// "/\t/evil.com" (con un tab real) termina resolviendo a otro origen aunque el string
// "parezca" empezar con una sola barra. Por eso se resuelve con new URL(next, origen) y se
// compara el origen resultante contra el del sitio: si no coincide, se descarta.
export function rutaSiguienteValida(
  next: string | null | undefined,
  origen: string = typeof window !== "undefined" ? window.location.origin : "http://localhost"
): string {
  if (typeof next !== "string" || next.length === 0) return "/";
  if (!next.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, origen);
  } catch {
    return "/";
  }
  if (url.origin !== origen) return "/";
  return url.pathname + url.search + url.hash;
}
