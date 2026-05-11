#!/bin/bash

# Quick Start Script - PDF Extractor App
# Este script executa comandos comuns rapidamente

case "$1" in
  install)
    echo "📦 Instalando dependências..."
    npm install
    ;;
    
  start)
    echo "🚀 Iniciando aplicação..."
    npm start
    ;;
    
  dev)
    echo "🔧 Iniciando em modo desenvolvimento..."
    npm run dev
    ;;
    
  docker-build)
    echo "🐳 Construindo imagem Docker..."
    docker-compose build
    ;;
    
  docker-up)
    echo "🐳 Iniciando containers Docker..."
    docker-compose up
    ;;
    
  docker-down)
    echo "🐳 Parando containers Docker..."
    docker-compose down
    ;;
    
  clean)
    echo "🧹 Limpando arquivos temporários..."
    rm -rf uploads/*
    rm -rf output/*
    echo "✓ Arquivos limpos!"
    ;;
    
  test)
    echo "🧪 Executando testes..."
    npm test
    ;;
    
  status)
    echo "📊 Status da aplicação:"
    echo ""
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
      echo "✓ Aplicação está rodando em http://localhost:3000"
      curl -s http://localhost:3000/health | json_pp
    else
      echo "✗ Aplicação não está rodando"
    fi
    ;;
    
  *)
    echo "PDF Extractor App - Comandos Rápidos"
    echo ""
    echo "Uso: ./quick.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  install       - Instalar dependências"
    echo "  start         - Iniciar aplicação"
    echo "  dev           - Iniciar em modo desenvolvimento"
    echo "  docker-build  - Build da imagem Docker"
    echo "  docker-up     - Iniciar com Docker"
    echo "  docker-down   - Parar containers Docker"
    echo "  clean         - Limpar arquivos temporários"
    echo "  test          - Executar testes"
    echo "  status        - Verificar status da aplicação"
    echo ""
    echo "Exemplos:"
    echo "  ./quick.sh install"
    echo "  ./quick.sh start"
    echo "  ./quick.sh docker-up"
    ;;
esac
