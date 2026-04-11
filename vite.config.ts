import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 🔒 Forzar una sola instancia de React (evita duplicados)
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  // 🚀 Servidor de desarrollo (HTTPS para Canva)
  server: {
    https: true,      // ← HABILITA HTTPS PARA CANVA
    port: 5173,
    host: true,       // Permite conexiones desde la red local (opcional)
  },

  // 📦 Configuración de build (optimizada para PWA y producción)
  build: {
    sourcemap: true,  // Generar source maps para error tracking (Sentry, etc.)

    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        // manualChunks como FUNCIÓN (no objeto) para evitar error
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            return 'vendor';
          }
        },
      },
    },

    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
        drop_debugger: true,
      },
    },

    chunkSizeWarningLimit: 1000,
  },

  // Asegurar que archivos estáticos (service-worker.js) se sirvan correctamente
  publicDir: 'public',

  // Configuración para preview (producción local)
  preview: {
    port: 5173,
    https: true,
    host: true,
  },
});