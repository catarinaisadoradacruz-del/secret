/**
 * DB-STATS - Estatisticas do banco
 *
 * USO:
 * node scripts/db-stats.js overview
 * node scripts/db-stats.js table <tabela>
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');

async function getOverview() {
  try {
    console.log('\n========================================');
    console.log('      ESTATISTICAS DO BANCO PCGO       ');
    console.log('========================================\n');

    // Tabelas principais para verificar
    const tables = [
      'users',
      'investigations',
      'alvos',
      'phone_records',
      'erb_locations',
      'forensic_analysis',
      'operations',
      'documents',
      'chat_sessions',
      'chat_messages',
      'chat_attachments',
      'rai_analysis',
      'teams',
      'team_members'
    ];

    for (const table of tables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: {
            ...headers,
            'Prefer': 'count=exact',
            'Range': '0-0'
          }
        });

        const range = response.headers.get('content-range');
        const count = range ? range.split('/')[1] : 'N/A';

        console.log(`  ${table.padEnd(20)} ${count} registros`);
      } catch (e) {
        console.log(`  ${table.padEnd(20)} (nao existe)`);
      }
    }

    console.log('\n========================================\n');

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

async function getTableStats(tableName) {
  try {
    console.log(`\n=== ESTATISTICAS: ${tableName} ===\n`);

    // Contar registros
    const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
      headers: {
        ...headers,
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });

    const range = countResponse.headers.get('content-range');
    const total = range ? range.split('/')[1] : 'N/A';
    console.log(`Total de registros: ${total}`);

    // Buscar alguns registros para analise
    const dataResponse = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=10&order=created_at.desc`, {
      headers
    });

    const data = await dataResponse.json();

    if (data.length > 0) {
      console.log(`\nColunas: ${Object.keys(data[0]).join(', ')}`);
      console.log(`\nUltimos ${data.length} registros:`);

      data.forEach((row, i) => {
        const preview = JSON.stringify(row).substring(0, 100);
        console.log(`  ${i + 1}. ${preview}...`);
      });
    }

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch(command) {
    case 'overview':
      await getOverview();
      break;
    case 'table':
      if (!args[1]) {
        console.log('Uso: node db-stats.js table <tabela>');
        return;
      }
      await getTableStats(args[1]);
      break;
    default:
      console.log(`
DB-STATS - Estatisticas do Banco

Comandos:
  overview         Visao geral de todas as tabelas
  table <tabela>   Estatisticas de uma tabela especifica
      `);
  }
}

main().catch(console.error);
