// Acceso seguro a localStorage / sessionStorage.
// En modo privado, con los datos del sitio bloqueados, con la cuota llena o en vistas embebidas, el navegador puede LANZAR una
// excepción tanto al nombrar `localStorage` como al leer o escribir. Estas envolturas tienen la misma API (getItem / setItem /
// removeItem) pero nunca lanzan: leer devuelve null y escribir o borrar no hace nada. La app tiene que funcionar igual sin almacenamiento.

function envolver(obtener: () => Storage) {
  return {
    getItem(clave: string): string | null {
      try { return obtener().getItem(clave); } catch { return null; }
    },
    setItem(clave: string, valor: string): void {
      try { obtener().setItem(clave, valor); } catch { /* sin almacenamiento: se sigue sin guardar */ }
    },
    removeItem(clave: string): void {
      try { obtener().removeItem(clave); } catch { /* idem */ }
    },
  };
}

export const almacenLocal = envolver(() => window.localStorage);
export const almacenSesion = envolver(() => window.sessionStorage);
