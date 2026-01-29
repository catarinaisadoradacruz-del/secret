/**
 * SUPABASE ADMIN - Configuração central
 * Exporta credenciais e funções para todos os scripts db-*.js
 * 
 * VitaFit - App de Nutrição Materna
 * Criado em: 29/01/2026
 */

const SUPABASE_URL = 'https://qlxabxhszpvetblvnfxl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo';

// Headers padrão para requisições com privilégios de admin
const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Headers para requisições públicas (usuários normais)
const publicHeaders = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Faz uma requisição para a API REST do Supabase
 * @param {string} endpoint - Endpoint da API (ex: '/rest/v1/users')
 * @param {object} options - Opções do fetch (method, body, etc)
 * @returns {Promise<any>} - Resposta da API
 */
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  const text = await response.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Executa uma query SQL via RPC
 * @param {string} query - Query SQL para executar
 * @returns {Promise<any>} - Resultado da query
 */
async function executeSql(query) {
  return supabaseRequest('/rest/v1/rpc/exec_sql', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
}

/**
 * Lista todas as tabelas do schema public
 * @returns {Promise<string[]>} - Array com nomes das tabelas
 */
async function listTables() {
  const result = await supabaseRequest('/rest/v1/rpc/list_tables', {
    method: 'POST',
    body: JSON.stringify({})
  });
  return result;
}

/**
 * Descreve a estrutura de uma tabela
 * @param {string} tableName - Nome da tabela
 * @returns {Promise<object[]>} - Array com colunas da tabela
 */
async function describeTable(tableName) {
  const result = await supabaseRequest('/rest/v1/rpc/describe_table', {
    method: 'POST',
    body: JSON.stringify({ table_name_param: tableName })
  });
  return result;
}

/**
 * Busca dados de uma tabela
 * @param {string} table - Nome da tabela
 * @param {string} select - Colunas para selecionar (default: *)
 * @param {string} filter - Filtro opcional (ex: 'id=eq.123')
 * @returns {Promise<object[]>} - Array com os registros
 */
async function select(table, selectCols = '*', filter = '') {
  let endpoint = `/rest/v1/${table}?select=${selectCols}`;
  if (filter) endpoint += `&${filter}`;
  return supabaseRequest(endpoint);
}

/**
 * Insere dados em uma tabela
 * @param {string} table - Nome da tabela
 * @param {object|object[]} data - Dados para inserir
 * @returns {Promise<object[]>} - Registros inseridos
 */
async function insert(table, data) {
  return supabaseRequest(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Atualiza dados em uma tabela
 * @param {string} table - Nome da tabela
 * @param {object} data - Dados para atualizar
 * @param {string} filter - Filtro (ex: 'id=eq.123')
 * @returns {Promise<object[]>} - Registros atualizados
 */
async function update(table, data, filter) {
  return supabaseRequest(`/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/**
 * Remove dados de uma tabela
 * @param {string} table - Nome da tabela
 * @param {string} filter - Filtro (ex: 'id=eq.123')
 * @returns {Promise<object[]>} - Registros removidos
 */
async function remove(table, filter) {
  return supabaseRequest(`/rest/v1/${table}?${filter}`, {
    method: 'DELETE'
  });
}

// Exporta tudo
module.exports = {
  SUPABASE_URL,
  ANON_KEY,
  SERVICE_ROLE_KEY,
  headers,
  publicHeaders,
  supabaseRequest,
  executeSql,
  listTables,
  describeTable,
  select,
  insert,
  update,
  remove
};

// Se executado diretamente, mostra informações
if (require.main === module) {
  console.log('\n🔧 SUPABASE ADMIN CONFIG - VitaFit\n');
  console.log('━'.repeat(50));
  console.log('URL:', SUPABASE_URL);
  console.log('Project ID: qlxabxhszpvetblvnfxl');
  console.log('Service Role Key:', SERVICE_ROLE_KEY.substring(0, 50) + '...');
  console.log('━'.repeat(50));
  console.log('\n📋 Scripts disponíveis:\n');
  console.log('  node scripts/db-query.js list-tables');
  console.log('  node scripts/db-query.js describe <tabela>');
  console.log('  node scripts/db-manager.js select <tabela>');
  console.log('  node scripts/db-manager.js insert <tabela> <json>');
  console.log('  node scripts/db-auth.js list');
  console.log('  node scripts/db-stats.js');
  console.log('  node scripts/db-backup.js');
  console.log('  node scripts/db-storage.js list');
  console.log('\n✅ Configuração carregada com sucesso!\n');
}
