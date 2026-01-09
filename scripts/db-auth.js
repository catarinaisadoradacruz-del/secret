/**
 * DB-AUTH - Gerenciamento de usuarios
 *
 * USO:
 * node scripts/db-auth.js list
 * node scripts/db-auth.js create email@test.com senha123
 * node scripts/db-auth.js delete <user_id>
 * node scripts/db-auth.js reset-password <user_id> novaSenha
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');

async function listUsers() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers
    });

    const data = await response.json();

    console.log('\n=== USUARIOS ===\n');

    if (data.users && data.users.length > 0) {
      data.users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Criado: ${user.created_at}`);
        console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Nao'}`);
        console.log('');
      });
      console.log(`Total: ${data.users.length} usuarios`);
    } else {
      console.log('Nenhum usuario encontrado');
    }

    return data.users;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function createUser(email, password, metadata = {}) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })
    });

    const data = await response.json();

    if (data.id) {
      console.log('\n=== USUARIO CRIADO ===');
      console.log(`Email: ${data.email}`);
      console.log(`ID: ${data.id}`);
    } else {
      console.log('\nErro:', JSON.stringify(data, null, 2));
    }

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function deleteUser(userId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    });

    if (response.ok) {
      console.log('\n=== USUARIO DELETADO ===');
      console.log(`ID: ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.log('Erro:', error);
      return false;
    }
  } catch (err) {
    console.error('Erro:', err.message);
    return false;
  }
}

async function resetPassword(userId, newPassword) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password: newPassword
      })
    });

    if (response.ok) {
      console.log('\n=== SENHA ALTERADA ===');
      console.log(`ID: ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.log('Erro:', error);
      return false;
    }
  } catch (err) {
    console.error('Erro:', err.message);
    return false;
  }
}

async function getUser(userId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers
    });

    const data = await response.json();
    console.log('\n=== USUARIO ===');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch(command) {
    case 'list':
      await listUsers();
      break;
    case 'create':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-auth.js create email@test.com senha123');
        return;
      }
      await createUser(args[1], args[2]);
      break;
    case 'delete':
      if (!args[1]) {
        console.log('Uso: node db-auth.js delete <user_id>');
        return;
      }
      await deleteUser(args[1]);
      break;
    case 'reset-password':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-auth.js reset-password <user_id> novaSenha');
        return;
      }
      await resetPassword(args[1], args[2]);
      break;
    case 'get':
      if (!args[1]) {
        console.log('Uso: node db-auth.js get <user_id>');
        return;
      }
      await getUser(args[1]);
      break;
    default:
      console.log(`
DB-AUTH - Gerenciamento de Usuarios

Comandos:
  list                              Listar todos usuarios
  create <email> <senha>            Criar usuario
  delete <user_id>                  Deletar usuario
  reset-password <user_id> <senha>  Alterar senha
  get <user_id>                     Ver detalhes do usuario
      `);
  }
}

main().catch(console.error);
