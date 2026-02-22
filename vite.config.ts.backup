import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 🔒 Forzar una sola instancia de React
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
