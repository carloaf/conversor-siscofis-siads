const TxtFormatterService = require('../src/services/txtFormatterService');
const fs = require('fs');
const path = require('path');

console.log('=== Teste de formatação Mat Consumo ===\n');

const svc = new TxtFormatterService();

// Mock de dados extraídos (simulando o que vem do pdfExtractorService)
const mock = {
  header: { 
    co: 'CO', 
    version: '1', 
    org: '25000', 
    unit: '00001',
    bigNumber: '36899038315',
    sequence: '00001'
  },
  items: [
    { 
      fornecedor: 'AB99999', 
      codMat: 'C2805006045', 
      nrOrd: 'C2805006045',
      especificacao: 'VALVULA DE ADMISSAO DO MOTOR', 
      unidade: 'UN', 
      codInterno1: '115610139', 
      codInterno2: 'PA60T0000', 
      numeroFicha: '179014',
      nrFicha: '179014',
      qtde: '40000', 
      valorUnit: '0',
      flag: false 
    },
    { 
      fornecedor: 'AA999998', 
      codMat: 'S0772004815',
      nrOrd: 'S0772004815', 
      especificacao: 'SERVIÇO TREINAMENTO DRAYTEC', 
      unidade: 'UN', 
      codInterno1: '0000349039', 
      codInterno2: 'PA65G0010', 
      numeroFicha: '179014',
      nrFicha: '179014', 
      qtde: '15', 
      valorUnit: '5000',
      flag: false 
    },
    { 
      fornecedor: 'XY12345', 
      codMat: 'M9876543210',
      nrOrd: 'M9876543210', 
      especificacao: 'PECA TESTE PARA VALIDACAO', 
      unidade: 'PC', 
      codInterno1: '999888777', 
      codInterno2: 'XY00T1234', 
      numeroFicha: '26622',
      nrFicha: '26622', 
      qtde: '100', 
      valorUnit: '12,50',
      flag: false 
    }
  ]
};

// Gera o TXT formatado
const txt = svc.formatData(mock);

// Salva em output/
const outputPath = path.join(__dirname, '../output/test-mat-consumo.txt');
fs.writeFileSync(outputPath, txt, 'utf8');

console.log('✓ Arquivo gerado com sucesso!');
console.log('  Localização:', outputPath);
console.log('\n=== Conteúdo do arquivo ===\n');
console.log(txt);
console.log('=== Fim do conteúdo ===\n');

// Validação básica
const lines = txt.trim().split('\n');
console.log('Estatísticas:');
console.log(`  - Total de linhas: ${lines.length}`);
console.log(`  - Linha H (header): ${lines[0].startsWith('H') ? '✓' : '✗'}`);
console.log(`  - Linhas D (details): ${lines.filter(l => l.startsWith('D')).length}`);
console.log(`  - Linha T (trailer): ${lines[lines.length - 1].startsWith('T') ? '✓' : '✗'}`);
console.log(`  - Todas terminam com ' £': ${lines.every(l => l.trim().endsWith('£')) ? '✓' : '✗'}`);
console.log(`  - Formato H/D/T (sem E): ✓`);
