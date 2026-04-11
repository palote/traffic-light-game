// src/intents/design_editor/index.tsx
// ⚠️ Este archivo renderiza la UI del panel lateral de Canva.
// Usa CanvaApp (ConfigPanel + ReadyPanel), NO la App principal de Traffic Light Game.

import "@canva/app-ui-kit/styles.css";
import type { DesignEditorIntent } from "@canva/intents/design";
import { AppUiProvider } from "@canva/app-ui-kit";
import { createRoot } from "react-dom/client";
import { CanvaApp } from "./CanvaApp";

async function render() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("No se encontró #root");

  createRoot(rootElement).render(
    <AppUiProvider>
      <CanvaApp />
    </AppUiProvider>
  );
}

const designEditor: DesignEditorIntent = { render };
export default designEditor;
