#!/bin/bash

echo "================================================"
echo "  PDF Extractor App - Script de Instalação"
echo "================================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo ""
    echo "Por favor, instale o Node.js primeiro:"
    echo ""
    echo "Opção 1 - Usando apt (Ubuntu/Debian):"
    echo "  sudo apt update"
    echo "  sudo apt install nodejs npm"
    echo ""
    echo "Opção 2 - Usando nvm (recomendado):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install 18"
    echo "  nvm use 18"
    echo ""
    exit 1
fi

echo "✓ Node.js encontrado: $(node --version)"
echo "✓ npm encontrado: $(npm --version)"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Dependências instaladas com sucesso!"
    echo ""
    echo "================================================"
    echo "  Instalação concluída!"
    echo "================================================"
    echo ""
    echo "Para iniciar a aplicação:"
    echo "  npm start"
    echo ""
    echo "Para iniciar em modo desenvolvimento:"
    echo "  npm run dev"
    echo ""
    echo "Acesse: http://localhost:3000"
    echo ""
else
    echo ""
    echo "❌ Erro ao instalar dependências"
    exit 1
fi
