# 📱 Guía: PWA → TWA (Android APK)

## ✅ Paso 1: PWA Ya Configurada

Tu aplicación ya tiene configurado:
- ✅ manifest.json
- ✅ Service Worker
- ✅ Meta tags PWA en index.html
- ✅ Optimizaciones de build

## 🎨 Paso 2: Generar Iconos

Necesitas crear iconos PNG para tu app. Usa una imagen cuadrada (512x512 o mayor) y genera estos tamaños:

### Opción A: Usando herramienta online
1. Ve a: https://www.pwabuilder.com/imageGenerator
2. Sube tu logo/imagen
3. Descarga el ZIP con todos los tamaños
4. Copia los archivos a `/public/icons/`

### Opción B: Usando ImageMagick (terminal)
```bash
# Desde una imagen base 512x512
magick icon-512x512.png -resize 72x72 icon-72x72.png
magick icon-512x512.png -resize 96x96 icon-96x96.png
magick icon-512x512.png -resize 128x128 icon-128x128.png
magick icon-512x512.png -resize 144x144 icon-144x144.png
magick icon-512x512.png -resize 152x152 icon-152x152.png
magick icon-512x512.png -resize 192x192 icon-192x192.png
magick icon-512x512.png -resize 384x384 icon-384x384.png
```

## 📸 Paso 3: Capturas de Pantalla

Necesitas 2 screenshots para el manifest:
1. **Narrow** (540x720): Vista móvil vertical
2. **Wide** (1280x720): Vista tablet horizontal

Guárdalos en `/public/screenshots/`

## 🔧 Paso 4: Generar APK con Bubblewrap

### 4.1 Instalar Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
```

### 4.2 Instalar Android Studio y dependencias
1. Descarga Android Studio: https://developer.android.com/studio
2. Instala Android SDK (API 30+)
3. Instala Java JDK 11+

### 4.3 Inicializar proyecto TWA
```bash
# En la carpeta de tu proyecto
bubblewrap init --manifest https://traffic-ligths-game.web.app/manifest.json

# Responde las preguntas:
# - Application Name: Traffic Light Game
# - Short Name: TL Game
# - Package Name: com.trafficlightgame.app
# - Host: traffic-ligths-game.web.app
# - Start URL: /
# - Theme Color: #646cff
# - Background Color: #1a1a1a
# - Icon URL: /icons/icon-512x512.png
# - Maskable Icon URL: /icons/icon-512x512.png
# - Splash Screen Color: #1a1a1a
# - Navigation Color: #1a1a1a
```

### 4.4 Build APK
```bash
# Generar APK sin firmar (para testing)
bubblewrap build

# El APK estará en: ./app-release-unsigned.apk
```

## 🔐 Paso 5: Firmar APK (para Google Play Store)

### 5.1 Generar Keystore
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Guarda bien:
# - Password del keystore
# - Password del alias
# - Información de la organización
```

### 5.2 Firmar APK
```bash
# Con Bubblewrap
bubblewrap build --signingKeyPath=./my-release-key.jks --signingKeyAlias=my-key-alias
```

### 5.3 Obtener SHA-256 Fingerprint
```bash
keytool -list -v -keystore my-release-key.jks -alias my-key-alias
```

Copia el SHA-256 que aparece y reemplázalo en:
- `/public/.well-known/assetlinks.json`

## 📤 Paso 6: Desplegar assetlinks.json

Sube el archivo a Firebase:
```bash
# El archivo debe ser accesible en:
https://traffic-ligths-game.web.app/.well-known/assetlinks.json

# Verifica que funcione visitando esa URL
```

## 🚀 Paso 7: Publicar en Google Play Store

### 7.1 Crear cuenta de desarrollador
- Ve a: https://play.google.com/console
- Paga el fee único de $25 USD

### 7.2 Crear nueva aplicación
1. Sube el APK firmado
2. Completa la información:
   - Descripción
   - Screenshots
   - Icono de la app
   - Categoría: Educación
   - Clasificación de contenido

### 7.3 Configurar Digital Asset Links
En la consola de Google Play:
1. Ve a: Configuración > Activos de app
2. Agrega: `https://traffic-ligths-game.web.app`
3. Google verificará el assetlinks.json

### 7.4 Publicar
- Elige "Producción" o "Prueba interna/cerrada"
- Envía a revisión

## 🎯 Alternativa RÁPIDA: PWA Builder

Si quieres algo más simple:

```bash
# 1. Ve a https://www.pwabuilder.com/
# 2. Ingresa: https://traffic-ligths-game.web.app
# 3. Click en "Start"
# 4. Click en "Package For Stores"
# 5. Selecciona "Android"
# 6. Genera APK automáticamente
```

## ✅ Checklist Final

Antes de publicar, verifica:
- [ ] PWA funciona correctamente en web
- [ ] Iconos en todos los tamaños
- [ ] Screenshots listos
- [ ] Service Worker funcionando
- [ ] assetlinks.json desplegado
- [ ] APK firmado correctamente
- [ ] Testing en dispositivo físico
- [ ] Política de privacidad (requerida por Google Play)
- [ ] Descripción y metadatos completos

## 🆘 Solución de Problemas

### Error: "App not verified"
- Verifica que assetlinks.json esté en: `/.well-known/assetlinks.json`
- Usa la herramienta de Google: https://developers.google.com/digital-asset-links/tools/generator

### Error: "Invalid signature"
- Regenera el keystore
- Asegúrate de usar el mismo keystore para todas las versiones

### APK no instala
- Habilita "Fuentes desconocidas" en Android
- Verifica que el APK esté firmado

## 📚 Recursos Útiles

- [Bubblewrap CLI Docs](https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli)
- [TWA Quick Start Guide](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Google Play Console](https://play.google.com/console)
- [Asset Links Generator](https://developers.google.com/digital-asset-links/tools/generator)

---

## 🎉 ¿Listo para empezar?

1. Genera tus iconos
2. Haz un build de producción: `npm run build`
3. Despliega a Firebase: `firebase deploy`
4. Sigue esta guía paso a paso

¡Buena suerte! 🚀
