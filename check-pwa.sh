#!/bin/bash

# Script de verificación de configuración PWA
echo "🔍 Verificando configuración PWA..."
echo ""

# Verificar manifest.json
if [ -f "public/manifest.json" ]; then
    echo "✅ manifest.json encontrado"
else
    echo "❌ manifest.json NO encontrado"
fi

# Verificar service-worker.js
if [ -f "public/service-worker.js" ]; then
    echo "✅ service-worker.js encontrado"
else
    echo "❌ service-worker.js NO encontrado"
fi

# Verificar carpeta de iconos
if [ -d "public/icons" ]; then
    echo "✅ Carpeta icons/ encontrada"
    icon_count=$(ls -1 public/icons/*.png 2>/dev/null | wc -l)
    echo "   📊 Iconos encontrados: $icon_count/8"
else
    echo "⚠️  Carpeta icons/ NO encontrada - necesitas crear los iconos"
fi

# Verificar screenshots
if [ -d "public/screenshots" ]; then
    echo "✅ Carpeta screenshots/ encontrada"
    screenshot_count=$(ls -1 public/screenshots/*.png 2>/dev/null | wc -l)
    echo "   📊 Screenshots encontrados: $screenshot_count/2"
else
    echo "⚠️  Carpeta screenshots/ NO encontrada - necesitas crear las capturas"
fi

# Verificar assetlinks.json
if [ -f "public/.well-known/assetlinks.json" ]; then
    echo "✅ assetlinks.json encontrado"
    if grep -q "PLACEHOLDER" "public/.well-known/assetlinks.json"; then
        echo "   ⚠️  Recuerda reemplazar el PLACEHOLDER con tu SHA-256 fingerprint"
    fi
else
    echo "❌ assetlinks.json NO encontrado"
fi

echo ""
echo "📋 Próximos pasos:"
echo "1. Crear iconos en /public/icons/"
echo "2. Crear screenshots en /public/screenshots/"
echo "3. Build de producción: npm run build"
echo "4. Deploy a Firebase: firebase deploy"
echo "5. Seguir TWA_GUIDE.md para generar APK"
