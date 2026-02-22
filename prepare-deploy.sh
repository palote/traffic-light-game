#!/bin/bash

echo "🚀 Preparación Pre-Deploy para PWA/TWA"
echo "========================================"
echo ""

# Variables de colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar archivos
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        return 0
    else
        echo -e "${RED}❌${NC} $2"
        return 1
    fi
}

# Función para verificar directorio
check_dir() {
    if [ -d "$1" ]; then
        local count=$(ls -1 "$1"/*.png 2>/dev/null | wc -l)
        if [ $count -ge $3 ]; then
            echo -e "${GREEN}✅${NC} $2 ($count archivos)"
            return 0
        else
            echo -e "${YELLOW}⚠️${NC}  $2 ($count/$3 archivos)"
            return 1
        fi
    else
        echo -e "${RED}❌${NC} $2 (directorio no existe)"
        return 1
    fi
}

echo "1️⃣  Verificando archivos de configuración..."
check_file "public/manifest.json" "Manifest PWA"
check_file "public/service-worker.js" "Service Worker"
check_file "src/registerServiceWorker.ts" "Registro de SW"
check_file "public/.well-known/assetlinks.json" "Asset Links (TWA)"
echo ""

echo "2️⃣  Verificando recursos multimedia..."
mkdir -p public/icons public/screenshots
check_dir "public/icons" "Iconos PWA" 8
check_dir "public/screenshots" "Screenshots" 2
echo ""

echo "3️⃣  Verificando dependencias..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅${NC} node_modules instalado"
else
    echo -e "${RED}❌${NC} node_modules NO instalado"
    echo -e "   ${YELLOW}→${NC} Ejecuta: npm install"
fi
echo ""

echo "4️⃣  Verificando configuración Firebase..."
if grep -q "PLACEHOLDER" "public/.well-known/assetlinks.json" 2>/dev/null; then
    echo -e "${YELLOW}⚠️${NC}  Asset Links tiene PLACEHOLDER"
    echo -e "   ${YELLOW}→${NC} Reemplaza con tu SHA-256 fingerprint después de firmar APK"
fi

if grep -q "AIzaSyC8YgUCS8A6FeHXPocKIQCKzrl1zzMkGB4" "src/firebase.config.ts" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} Firebase config presente"
else
    echo -e "${YELLOW}⚠️${NC}  Verifica tu Firebase config"
fi
echo ""

echo "5️⃣  Recomendaciones antes de deploy..."
echo ""

if [ ! -d "public/icons" ] || [ $(ls -1 public/icons/*.png 2>/dev/null | wc -l) -lt 8 ]; then
    echo -e "${YELLOW}📌 ACCIÓN REQUERIDA:${NC} Crear iconos PWA"
    echo "   1. Ve a: https://www.pwabuilder.com/imageGenerator"
    echo "   2. Sube tu logo/imagen base"
    echo "   3. Descarga todos los tamaños"
    echo "   4. Copia a public/icons/"
    echo ""
fi

if [ ! -d "public/screenshots" ] || [ $(ls -1 public/screenshots/*.png 2>/dev/null | wc -l) -lt 2 ]; then
    echo -e "${YELLOW}📌 ACCIÓN REQUERIDA:${NC} Crear screenshots"
    echo "   1. Abre: screenshot-template.html en tu navegador"
    echo "   2. Captura ambas vistas (móvil y tablet)"
    echo "   3. Guarda en public/screenshots/"
    echo ""
fi

echo "6️⃣  Próximos pasos sugeridos..."
echo ""
echo "   a) Generar iconos y screenshots (si falta)"
echo "   b) npm run build"
echo "   c) firebase deploy"
echo "   d) Verificar PWA en: https://traffic-ligths-game.web.app"
echo "   e) Seguir TWA_GUIDE.md para generar APK"
echo ""

echo "========================================"
echo -e "${GREEN}✨ Configuración PWA lista!${NC}"
echo ""
echo "📖 Lee TWA_GUIDE.md para el proceso completo de TWA → APK"
echo "🔧 Usa ./check-pwa.sh en cualquier momento para verificar"
echo ""
