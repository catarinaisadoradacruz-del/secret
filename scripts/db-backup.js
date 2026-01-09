/**
 * DB-BACKUP - Backup e restauracao
 *
 * USO:
 * node scripts/db-backup.js table <tabela> json
 * node scripts/db-backup.js table <tabela> csv
 * node scripts/db-backup.js all json
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Criar pasta de backups se nao existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupTable(tableName, format = 'json') {
  try {
    console.log(`\nBackup de ${tableName}...`);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${tableName}_${timestamp}.${format}`;
    const filepath = path.join(BACKUP_DIR, filename);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } else if (format === 'csv') {
      if (data.length === 0) {
        fs.writeFileSync(filepath, '');
      } else {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
          const values = headers.map(h => {
            const val = row[h];
            if (val === null) return '';
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return val;
          });
          csvRows.push(values.join(','));
        });

        fs.writeFileSync(filepath, csvRows.join('\n'));
      }
    }

    console.log(`Salvo: ${filepath}`);
    console.log(`Registros: ${data.length}`);

    return filepath;
  } catch (err) {
    console.error(`Erro ao fazer backup de ${tableName}:`, err.message);
    return null;
  }
}

async function backupAll(format = 'json') {
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
    'rai_analysis'
  ];

  console.log('\n========================================');
  console.log('      BACKUP COMPLETO DO BANCO         ');
  console.log('========================================\n');

  for (const table of tables) {
    await backupTable(table, format);
  }

  console.log('\n========================================');
  console.log('           BACKUP CONCLUIDO            ');
  console.log('========================================\n');
}

async function restoreTable(tableName, filepath) {
  try {
    console.log(`\nRestaurando ${tableName} de ${filepath}...`);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Arquivo nao encontrado: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data) || data.length === 0) {
      console.log('Arquivo vazio ou invalido');
      return false;
    }

    // Inserir em lotes de 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        console.error(`Erro ao inserir lote ${i / batchSize + 1}:`, await response.text());
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Restaurados: ${inserted} registros`);
    return true;
  } catch (err) {
    console.error('Erro:', err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch(command) {
    case 'table':
      if (!args[1]) {
        console.log('Uso: node db-backup.js table <tabela> [json|csv]');
        return;
      }
      await backupTable(args[1], args[2] || 'json');
      break;
    case 'all':
      await backupAll(args[1] || 'json');
      break;
    case 'restore':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-backup.js restore <tabela> <arquivo.json>');
        return;
      }
      await restoreTable(args[1], args[2]);
      break;
    default:
      console.log(`
DB-BACKUP - Backup e Restauracao

Comandos:
  table <tabela> [json|csv]      Backup de uma tabela
  all [json|csv]                 Backup de todas as tabelas
  restore <tabela> <arquivo>     Restaurar de arquivo JSON
      `);
  }
}

main().catch(console.error);
