/**
 * DB-MANAGER - CRUD completo
 *
 * USO:
 * node scripts/db-manager.js select <tabela>
 * node scripts/db-manager.js select <tabela> '{"id":"xxx"}'
 * node scripts/db-manager.js insert <tabela> '{"campo":"valor"}'
 * node scripts/db-manager.js update <tabela> '{"id":"xxx"}' '{"campo":"novo"}'
 * node scripts/db-manager.js delete <tabela> '{"id":"xxx"}'
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');

function buildFilter(filterObj) {
  if (!filterObj) return '';

  const filters = Object.entries(filterObj)
    .map(([key, value]) => `${key}=eq.${value}`)
    .join('&');

  return filters;
}

async function selectData(tableName, filterJson = null) {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${tableName}`;

    if (filterJson) {
      const filter = JSON.parse(filterJson);
      url += '?' + buildFilter(filter);
    }

    const response = await fetch(url, {
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    console.log(`\n=== SELECT ${tableName} ===`);
    console.log(`Registros: ${data.length}\n`);
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function insertData(tableName, dataJson) {
  try {
    const data = JSON.parse(dataJson);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    console.log('\n=== INSERT SUCESSO ===');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function updateData(tableName, filterJson, dataJson) {
  try {
    const filter = JSON.parse(filterJson);
    const data = JSON.parse(dataJson);

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?${buildFilter(filter)}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    console.log('\n=== UPDATE SUCESSO ===');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function deleteData(tableName, filterJson) {
  try {
    const filter = JSON.parse(filterJson);

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?${buildFilter(filter)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('\n=== DELETE SUCESSO ===');
    console.log(`Registro(s) removido(s) de ${tableName}`);

    return true;
  } catch (err) {
    console.error('Erro:', err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tableName = args[1];

  switch(command) {
    case 'select':
      await selectData(tableName, args[2]);
      break;
    case 'insert':
      if (!args[2]) {
        console.log('Uso: node db-manager.js insert <tabela> \'{"campo":"valor"}\'');
        return;
      }
      await insertData(tableName, args[2]);
      break;
    case 'update':
      if (!args[2] || !args[3]) {
        console.log('Uso: node db-manager.js update <tabela> \'{"id":"xxx"}\' \'{"campo":"novo"}\'');
        return;
      }
      await updateData(tableName, args[2], args[3]);
      break;
    case 'delete':
      if (!args[2]) {
        console.log('Uso: node db-manager.js delete <tabela> \'{"id":"xxx"}\'');
        return;
      }
      await deleteData(tableName, args[2]);
      break;
    default:
      console.log(`
DB-MANAGER - CRUD Completo

Comandos:
  select <tabela>                              Buscar todos
  select <tabela> '{"id":"xxx"}'               Buscar com filtro
  insert <tabela> '{"campo":"valor"}'          Inserir
  update <tabela> '{"id":"x"}' '{"campo":"v"}' Atualizar
  delete <tabela> '{"id":"xxx"}'               Deletar
      `);
  }
}

main().catch(console.error);
