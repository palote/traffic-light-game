// Configuración compartida de las Cloud Functions.

// Modelo de Gemini que usan TODAS las funciones de IA de Gemini. Es el único lugar donde
// aparece el nombre: para cambiar de modelo se edita acá (y se compara antes con
// scripts/comparar-modelos.cjs).
export const MODELO_GEMINI = "gemini-3.1-flash-lite-preview";
