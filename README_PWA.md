# 🚦 Traffic Light Game - PWA & TWA Ready

Juego educativo interactivo de semáforos para el aula, ahora con soporte completo para PWA (Progressive Web App) y TWA (Trusted Web Activity para Android).

## 🎯 Características

- ✅ Progressive Web App (PWA)
- ✅ Funcionalidad offline con Service Worker
- ✅ Instalable en dispositivos móviles
- ✅ Preparado para conversión a APK con TWA
- 🔥 Firebase Realtime Database
- 🎮 Múltiples modos de juego
- 👥 Juego colaborativo en tiempo real
- 📊 Métricas y analytics
- 🌐 Multi-idioma (ES, EN, PT)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm o pnpm
- Cuenta de Firebase

### Instalación

```bash
# Clonar repositorio
git clone <tu-repo>
cd traffic-light-game

# Instalar dependencias
npm install

# Configurar Firebase
# (Edita src/firebase.config.ts con tus credenciales)

# Desarrollo
npm run dev

# Build de producción
npm run build

# Deploy a Firebase
firebase deploy
```

## 📱 PWA: Instalación en Dispositivos

### En dispositivos móviles
1. Abre la app en Chrome/Safari
2. Verás un banner "Agregar a pantalla de inicio"
3. Click en "Agregar"
4. ¡Listo! La app se comporta como nativa

### En desktop
1. Abre la app en Chrome
2. Click en el ícono de instalación en la barra de direcciones
3. Click en "Instalar"

## 🤖 Generar APK para Android

Sigue la guía completa en: **[TWA_GUIDE.md](./TWA_GUIDE.md)**

Resumen rápido:
```bash
# 1. Instalar Bubblewrap
npm install -g @bubblewrap/cli

# 2. Inicializar proyecto TWA
bubblewrap init --manifest https://traffic-ligths-game.web.app/manifest.json

# 3. Generar APK
bubblewrap build
```

## 🛠️ Verificar Configuración PWA

```bash
# Ejecutar script de verificación
./check-pwa.sh
```

## 📂 Estructura del Proyecto

```
traffic-light-game/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── service-worker.js          # Service Worker
│   ├── icons/                     # Iconos PWA (crear)
│   ├── screenshots/               # Screenshots (crear)
│   └── .well-known/
│       └── assetlinks.json        # Digital Asset Links para TWA
├── src/
│   ├── components/                # Componentes React
│   ├── pages/                     # Páginas
│   ├── services/                  # Servicios Firebase
│   ├── types/                     # TypeScript types
│   ├── firebase.config.ts         # Config Firebase
│   └── registerServiceWorker.ts   # Registro SW
├── TWA_GUIDE.md                   # Guía TWA completa
├── check-pwa.sh                   # Script verificación
└── package.json
```

## 🎨 Personalización

### Iconos
Necesitas crear iconos en estos tamaños:
- 72x72, 96x96, 128x128, 144x144
- 152x152, 192x192, 384x384, 512x512

Usa: https://www.pwabuilder.com/imageGenerator

### Colores
Edita en `public/manifest.json`:
```json
{
  "theme_color": "#646cff",
  "background_color": "#1a1a1a"
}
```

### Nombre de la App
Edita en `public/manifest.json`:
```json
{
  "name": "Tu Nombre de App",
  "short_name": "Nombre Corto"
}
```

## 🔒 Seguridad

Las API keys de Firebase son seguras para incluir en el código del cliente según la documentación oficial de Google:
https://firebase.google.com/docs/projects/api-keys

La seguridad real se maneja con Firebase Security Rules.

## 📊 Service Worker

El Service Worker implementa una estrategia **Network First, fallback to Cache**:
- Intenta servir contenido desde la red
- Si falla, sirve desde caché
- Cachea automáticamente recursos estáticos
- No cachea peticiones a Firebase

## 🌐 Deploy

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Verificar PWA
1. Ve a: https://traffic-ligths-game.web.app
2. Abre DevTools > Application > Manifest
3. Verifica que el manifest se cargue correctamente
4. Abre DevTools > Application > Service Workers
5. Verifica que el SW esté activo

## 🧪 Testing PWA

### Lighthouse (Chrome DevTools)
```bash
# 1. Abre la app en Chrome
# 2. DevTools > Lighthouse
# 3. Selecciona "Progressive Web App"
# 4. Click "Generate report"
```

Objetivo: Score > 90

### Verificar offline
```bash
# 1. Abre DevTools
# 2. Network tab > Throttling > Offline
# 3. Recarga la página
# 4. Debe seguir funcionando (con limitaciones)
```

## 📱 TWA vs Alternativas

| Método | Pros | Contras |
|--------|------|---------|
| TWA (Bubblewrap) | Gratis, control total | Requiere setup |
| PWA Builder | Automatizado, simple | Menos control |
| Capacitor | Más features nativas | Más complejo |
| Cordova | Maduro, estable | Legacy tech |

**Recomendación**: Empieza con TWA (Bubblewrap)

## 🆘 Troubleshooting

### Service Worker no se registra
- Verifica que esté en HTTPS o localhost
- Revisa la consola del navegador
- Limpia cache: DevTools > Application > Clear storage

### PWA no se puede instalar
- Verifica el manifest: DevTools > Application > Manifest
- Asegúrate de tener iconos 192x192 y 512x512
- Verifica que el Service Worker esté activo

### APK no instala
- Habilita "Fuentes desconocidas" en Android
- Verifica que el APK esté firmado
- Revisa logs: `adb logcat`

## 📚 Recursos

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [TWA Quick Start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWA Builder](https://www.pwabuilder.com/)

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

## 📄 Licencia

[Tu licencia aquí]

## 👨‍💻 Autor

Pablo - Traffic Light Game

---

## 🎉 ¿Listo para el siguiente paso?

1. ✅ PWA configurada - **DONE**
2. 🎨 Crear iconos - **NEXT**
3. 📸 Crear screenshots - **NEXT**
4. 🚀 Deploy a Firebase
5. 🤖 Generar APK con TWA
6. 📱 Publicar en Google Play Store

¡Sigue la guía [TWA_GUIDE.md](./TWA_GUIDE.md) para continuar!
