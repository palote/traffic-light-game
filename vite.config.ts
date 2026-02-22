import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 🔒 Forzar una sola instancia de React (evita duplicados)
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  // 🚀 Servidor de desarrollo (lo que necesitas para Canva)
  server: {
    https: true,      // ← HABILITA HTTPS PARA CANVA
    port: 5173,       // Puerto que ya usas
    host: true        // Permite conexiones desde la red local (opcional)
  },

  // 📦 Configuración de build (optimizada para PWA y producción)
  build: {
    // Generar source maps (útil para Sentry o debugging)
    sourcemap: false, // Cambia a true si necesitas debugging en producción
    
    // Generar manifest y service worker en la raíz del build
    rollupOptions: {
      input: {
        main: './index.html',
      },
      // Optimización: separa librerías externas en chunks aparte
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase'],
          // Puedes añadir más si lo deseas
        }
      }
    },
    
    // Optimizar para producción móvil
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
        drop_debugger: true // Eliminar debugger
      },
    },
    
    // Asegurar que los archivos grandes se dividan correctamente
    chunkSizeWarningLimit: 1000, // Aumenta el límite de advertencia (opcional)
  },

  // Asegurar que archivos estáticos (como service-worker.js) se sirvan correctamente
  publicDir: 'public',
  
  // Configuración adicional para el servidor de preview (producción local)
  preview: {
    port: 5173,
    https: true,      // También HTTPS en preview
    host: true
  }
});