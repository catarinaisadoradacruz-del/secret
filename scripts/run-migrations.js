const https = require('https');

const SUPABASE_URL = 'https://qlxabxhszpvetblvnfxl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo';

async function checkTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'qlxabxhszpvetblvnfxl.supabase.co',
      path: `/rest/v1/${tableName}?select=id&limit=1`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ exists: true, data: JSON.parse(data) });
        } else {
          resolve({ exists: false, error: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== Verificando tabelas do PCGO Sistema ===\n');

  const tables = [
    'investigations',
    'alvos',
    'alvo_telefones',
    'alvo_enderecos',
    'alvo_passagens',
    'alvo_veiculos',
    'documentos',
    'unidades',
    'phone_records',
    'operacoes',
    'forensic_images',
    'rai_analises',
    'relatos_pc',
    'chat_sessions',
    'chat_messages'
  ];

  const missing = [];
  const existing = [];

  for (const table of tables) {
    const result = await checkTable(table);
    if (result.exists) {
      console.log(`[OK] ${table}`);
      existing.push(table);
    } else {
      console.log(`[FALTA] ${table}`);
      missing.push(table);
    }
  }

  console.log('\n=== Resumo ===');
  console.log(`Tabelas existentes: ${existing.length}`);
  console.log(`Tabelas faltando: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\n!!! ACAO NECESSARIA !!!');
    console.log('Execute o arquivo scripts/setup-database-simples.sql no Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new');
    console.log('\nTabelas que precisam ser criadas:', missing.join(', '));
  } else {
    console.log('\nTodas as tabelas estao configuradas corretamente!');
  }
}

main().catch(console.error);
