const https = require('https');

const SUPABASE_URL = 'https://qlxabxhszpvetblvnfxl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo';

async function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    const options = {
      hostname: url.hostname,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.end();
  });
}

async function createTable(tableName, columns) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (response.status === 404 || response.status === 400) {
    console.log(`Tabela ${tableName} não existe.`);
    return false;
  }
  console.log(`Tabela ${tableName} já existe.`);
  return true;
}

async function main() {
  console.log('Verificando tabelas existentes...\n');

  const tables = [
    'investigations',
    'alvos',
    'alvo_telefones',
    'alvo_enderecos',
    'alvo_passagens',
    'alvo_veiculos',
    'rai_analises',
    'documentos',
    'unidades',
    'phone_records',
    'operacoes',
    'forensic_images',
    'relatos_pc'
  ];

  for (const table of tables) {
    await createTable(table);
  }

  console.log('\n========================================');
  console.log('IMPORTANTE: Execute o script SQL manualmente');
  console.log('no Supabase Dashboard > SQL Editor:');
  console.log('scripts/setup-database.sql');
  console.log('========================================\n');
}

main().catch(console.error);
