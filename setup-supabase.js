// Script para executar setup completo no Supabase
const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://qlxabxhszpvetblvnfxl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo';
const ADMIN_EMAIL = 'brunodivinoa@gmail.com';
const ADMIN_PASSWORD = '@Pcgo2026Strong!';

// Função para fazer requisição
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 1. Criar usuário admin via Auth API
async function createAdminUser() {
  console.log('📝 Criando usuário admin...');

  const result = await makeRequest('POST', '/auth/v1/admin/users', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true
  });

  if (result.status === 200 || result.status === 201) {
    console.log('✅ Usuário admin criado!');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Senha:', ADMIN_PASSWORD);
    console.log('   User ID:', result.data.id);
    return result.data.id;
  } else if (result.data.msg && result.data.msg.includes('already been registered')) {
    console.log('⚠️  Usuário já existe, tentando buscar ID...');
    // Tentar buscar o usuário existente
    const listResult = await makeRequest('GET', '/auth/v1/admin/users');
    if (listResult.data && listResult.data.users) {
      const user = listResult.data.users.find(u => u.email === ADMIN_EMAIL);
      if (user) {
        console.log('✅ Usuário encontrado! ID:', user.id);
        return user.id;
      }
    }
    throw new Error('Usuário existe mas não foi possível recuperar ID');
  } else {
    console.error('❌ Erro ao criar usuário:', result);
    throw new Error('Falha ao criar usuário admin');
  }
}

// 2. Inserir registro na tabela users
async function insertUserRecord(userId) {
  console.log('📝 Inserindo registro na tabela users...');

  const result = await makeRequest('POST', '/rest/v1/users', {
    id: userId,
    email: ADMIN_EMAIL,
    nome: 'BRUNO DIVINO ALVES',
    is_admin: true
  });

  if (result.status === 201 || result.status === 200) {
    console.log('✅ Registro criado na tabela users!');
    return true;
  } else if (result.status === 409) {
    console.log('⚠️  Registro já existe na tabela users');
    return true;
  } else {
    console.error('❌ Erro ao inserir na tabela users:', result);
    throw new Error('Falha ao criar registro na tabela users');
  }
}

// Main
async function setup() {
  try {
    console.log('🚀 Iniciando setup do Supabase...\n');

    console.log('⚠️  IMPORTANTE: Execute o schema SQL manualmente no Supabase SQL Editor primeiro!');
    console.log('   Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new');
    console.log('   Cole o conteúdo de: supabase/schema.sql');
    console.log('   Clique em "RUN"\n');
    console.log('Pressione ENTER quando tiver executado o schema...');

    // Aguardar Enter
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    console.log('\n📋 Continuando setup...\n');

    // Criar usuário admin
    const userId = await createAdminUser();

    // Aguardar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Inserir na tabela users
    await insertUserRecord(userId);

    console.log('\n✅ ✅ ✅ SETUP COMPLETO! ✅ ✅ ✅\n');
    console.log('📋 Dados para login:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Senha:', ADMIN_PASSWORD);
    console.log('\n🎯 Próximo passo: Deploy na Vercel!');
    console.log('   Siga o guia: DEPLOY_VERCEL_DETALHADO.md\n');

  } catch (error) {
    console.error('\n❌ Erro durante setup:', error.message);
    process.exit(1);
  }
}

setup();
