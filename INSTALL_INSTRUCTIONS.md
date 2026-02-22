# 📦 Archivos PWA/TWA - Instrucciones de Instalación

## 📂 Contenido de este paquete

```
pwa-files/
├── manifest.json              # ← Copiar a /public/
├── service-worker.js          # ← Copiar a /public/
├── registerServiceWorker.ts   # ← Copiar a /src/
├── .well-known/               # ← Copiar carpeta completa a /public/
│   └── assetlinks.json
├── index.html.NEW             # ← Reemplazar tu index.html
├── main.tsx.NEW               # ← Reemplazar tu src/main.tsx
├── vite.config.ts.NEW         # ← Reemplazar tu vite.config.ts
├── TWA_GUIDE.md               # ← Guía completa TWA
├── README_PWA.md              # ← README del proyecto
├── IMPLEMENTATION_SUMMARY.md  # ← Resumen de cambios
├── screenshot-template.html   # ← Para crear screenshots
├── check-pwa.sh               # ← Script de verificación
└── prepare-deploy.sh          # ← Script pre-deploy
```

---

## 🚀 Instalación Paso a Paso

### 1. Hacer Backup (IMPORTANTE)
```bash
cd C:\Users\pablo\Documents\traffic-light-game

# Crear backup de archivos que se van a modificar
copy index.html index.html.backup
copy src\main.tsx src\main.tsx.backup
copy vite.config.ts vite.config.ts.backup
```

### 2. Copiar Archivos Nuevos

#### A. Archivos para /public/
```bash
# Desde donde descargaste los archivos PWA
cd [carpeta-descarga]\pwa-files

# Copiar manifest y service worker
copy manifest.json C:\Users\pablo\Documents\traffic-light-game\public\
copy service-worker.js C:\Users\pablo\Documents\traffic-light-game\public\

# Copiar carpeta .well-known
xcopy .well-known C:\Users\pablo\Documents\traffic-light-game\public\.well-known\ /E /I
```

#### B. Archivo para /src/
```bash
copy registerServiceWorker.ts C:\Users\pablo\Documents\traffic-light-game\src\
```

#### C. Crear carpetas para iconos y screenshots
```bash
cd C:\Users\pablo\Documents\traffic-light-game\public
mkdir icons
mkdir screenshots
```

### 3. Reemplazar Archivos Modificados

```bash
cd [carpeta-descarga]\pwa-files

# Reemplazar index.html
copy index.html.NEW C:\Users\pablo\Documents\traffic-light-game\index.html

# Reemplazar main.tsx
copy main.tsx.NEW C:\Users\pablo\Documents\traffic-light-game\src\main.tsx

# Reemplazar vite.config.ts
copy vite.config.ts.NEW C:\Users\pablo\Documents\traffic-light-game\vite.config.ts
```

### 4. Copiar Documentación y Scripts

```bash
# Copiar a la raíz del proyecto
copy TWA_GUIDE.md C:\Users\pablo\Documents\traffic-light-game\
copy README_PWA.md C:\Users\pablo\Documents\traffic-light-game\
copy IMPLEMENTATION_SUMMARY.md C:\Users\pablo\Documents\traffic-light-game\
copy screenshot-template.html C:\Users\pablo\Documents\traffic-light-game\
copy check-pwa.sh C:\Users\pablo\Documents\traffic-light-game\
copy prepare-deploy.sh C:\Users\pablo\Documents\traffic-light-game\
```

---

## 🧪 Verificar Instalación

```bash
cd C:\Users\pablo\Documents\traffic-light-game

# Verificar que todos los archivos estén en su lugar
dir public\manifest.json
dir public\service-worker.js
dir src\registerServiceWorker.ts
dir public\.well-known\assetlinks.json

# Si tienes Git Bash instalado, puedes ejecutar:
bash check-pwa.sh
```

---

## 🎨 Próximos Pasos Obligatorios

### 1. Crear Iconos PWA (REQUERIDO)

Ve a: https://www.pwabuilder.com/imageGenerator

1. Sube tu logo/imagen (512x512 o mayor)
2. Descarga el ZIP con todos los tamaños
3. Extrae los archivos PNG a: `C:\Users\pablo\Documents\traffic-light-game\public\icons\`

Necesitas estos tamaños:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### 2. Crear Screenshots (REQUERIDO)

1. Abre `screenshot-template.html` en tu navegador
2. Click en "Cambiar Tamaño" para alternar entre vistas
3. Captura 2 screenshots:
   - Vista móvil (540x720)
   - Vista tablet (1280x720)
4. Guárdalos como:
   - `C:\Users\pablo\Documents\traffic-light-game\public\screenshots\screenshot1.png`
   - `C:\Users\pablo\Documents\traffic-light-game\public\screenshots\screenshot2.png`

---

## 🚢 Deploy

Una vez que tengas iconos y screenshots:

```bash
cd C:\Users\pablo\Documents\traffic-light-game

# Instalar dependencias (si aún no lo hiciste)
npm install

# Build de producción
npm run build

# Deploy a Firebase
firebase deploy
```

---

## ✅ Verificar que Funciona

1. Visita: https://traffic-ligths-game.web.app
2. Abre DevTools (F12)
3. Ve a: Application > Manifest
   - Debe aparecer toda la info de tu PWA
4. Ve a: Application > Service Workers
   - Debe estar activo y registrado
5. En tu móvil:
   - Abre la web en Chrome
   - Debería aparecer un banner "Agregar a pantalla de inicio"

---

## 📖 Documentación

Lee estos archivos en orden:
1. **IMPLEMENTATION_SUMMARY.md** - Resumen de todo lo que cambió
2. **README_PWA.md** - README completo del proyecto
3. **TWA_GUIDE.md** - Guía para generar APK

---

## 🆘 ¿Problemas?

### Los archivos no se copian bien
- Usa el Explorador de Windows en vez de la terminal
- Arrastra y suelta los archivos manualmente

### Service Worker no funciona
```bash
# En DevTools > Application > Clear Storage
# Click en "Clear site data"
# Recarga la página (Ctrl+F5)
```

### PWA no se puede instalar
- Verifica que los iconos estén en /public/icons/
- Verifica que el manifest.json esté bien
- Debe estar en HTTPS (tu Firebase ya lo tiene)

---

## 📞 Estructura Final Esperada

```
traffic-light-game/
├── public/
│   ├── manifest.json          ✅
│   ├── service-worker.js      ✅
│   ├── .well-known/
│   │   └── assetlinks.json    ✅
│   ├── icons/                 ⚠️ Crear
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   └── ... (8 iconos total)
│   └── screenshots/           ⚠️ Crear
│       ├── screenshot1.png
│       └── screenshot2.png
├── src/
│   ├── registerServiceWorker.ts ✅
│   └── main.tsx               ✅ (modificado)
├── index.html                 ✅ (modificado)
├── vite.config.ts             ✅ (modificado)
├── TWA_GUIDE.md               ✅
├── README_PWA.md              ✅
└── IMPLEMENTATION_SUMMARY.md  ✅
```

---

## 🎉 ¡Listo!

Una vez que copies todo y crees los iconos:

1. `npm install` (si no lo hiciste)
2. `npm run build`
3. `firebase deploy`
4. ¡Tu PWA estará lista!

Para generar el APK, sigue **TWA_GUIDE.md** después del deploy.

---

**¿Necesitas ayuda?** Lee el IMPLEMENTATION_SUMMARY.md para más detalles.
