// src/index.tsx
if (window.self !== window.top) {
  // Estamos dentro del iframe de Canva — cargar el SDK dinámicamente
  import("@canva/intents/design").then(({ prepareDesignEditor }) => {
    import("./intents/design_editor").then(({ default: designEditor }) => {
      prepareDesignEditor(designEditor);
    });
  });
} else {
  // Navegador normal — mostrar mensaje simple
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>🚦 Traffic Light Game</h2>
        <p>Esta app se ejecuta dentro del editor de Canva.</p>
      </div>
    `;
  }
}