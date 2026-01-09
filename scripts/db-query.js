/**
 * DB-QUERY - Consultas e estrutura do banco
 *
 * USO:
 * node scripts/db-query.js list-tables
 * node scripts/db-query.js describe <tabela>
 * node scripts/db-query.js count <tabela>
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');

async function listTables() {
  try {
    // Lista tabelas via endpoint REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.definitions) {
      const tables = Object.keys(data.definitions);
      console.log('\n=== TABELAS DISPONIVEIS ===\n');
      tables.forEach((t, i) => console.log(`${i + 1}. ${t}`));
      console.log(`\nTotal: ${tables.length} tabelas`);
      return tables;
    }

    console.log('\nResposta:', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function describeTable(tableName) {
  try {
    // Buscar 1 registro para ver estrutura
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Tabela '${tableName}' nao encontrada`);
    }

    const data = await response.json();

    console.log(`\n=== ESTRUTURA: ${tableName} ===\n`);

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  ${col}: ${type}`);
      });
      console.log(`\nTotal colunas: ${columns.length}`);
    } else {
      console.log('  (Tabela vazia - nao foi possivel inferir estrutura)');
    }

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function countRows(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count`, {
      headers: {
        ...headers,
        'Prefer': 'count=exact'
      }
    });

    const count = response.headers.get('content-range');
    console.log(`\n${tableName}: ${count || 'N/A'} registros`);
    return count;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch(command) {
    case 'list-tables':
      await listTables();
      break;
    case 'describe':
      if (!args[1]) {
        console.log('Uso: node db-query.js describe <tabela>');
        return;
      }
      await describeTable(args[1]);
      break;
    case 'count':
      if (!args[1]) {
        console.log('Uso: node db-query.js count <tabela>');
        return;
      }
      await countRows(args[1]);
      break;
    default:
      console.log(`
DB-QUERY - Consultas e estrutura

Comandos:
  list-tables           Lista todas as tabelas
  describe <tabela>     Mostra estrutura da tabela
  count <tabela>        Conta registros da tabela
      `);
  }
}

main().catch(console.error);
