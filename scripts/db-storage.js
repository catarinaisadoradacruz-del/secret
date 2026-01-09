/**
 * DB-STORAGE - Gerenciamento de arquivos no Storage
 *
 * USO:
 * node scripts/db-storage.js list-buckets
 * node scripts/db-storage.js create-bucket <nome> [public]
 * node scripts/db-storage.js list <bucket>
 * node scripts/db-storage.js upload <bucket> <arquivo> [destino]
 * node scripts/db-storage.js download <bucket> <arquivo> [local]
 * node scripts/db-storage.js delete <bucket> <arquivo>
 */

const { SUPABASE_URL, SERVICE_ROLE_KEY, headers } = require('./supabase-admin');
const fs = require('fs');
const path = require('path');

async function listBuckets() {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers
    });

    const data = await response.json();

    console.log('\n=== BUCKETS ===\n');

    if (Array.isArray(data) && data.length > 0) {
      data.forEach((bucket, i) => {
        console.log(`${i + 1}. ${bucket.name}`);
        console.log(`   Publico: ${bucket.public ? 'Sim' : 'Nao'}`);
        console.log(`   Criado: ${bucket.created_at}`);
        console.log('');
      });
    } else {
      console.log('Nenhum bucket encontrado');
    }

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function createBucket(name, isPublic = false) {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: name,
        name: name,
        public: isPublic === 'true' || isPublic === true
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`\nBucket '${name}' criado com sucesso!`);
      console.log(`Publico: ${isPublic}`);
    } else {
      console.log('Erro:', JSON.stringify(data, null, 2));
    }

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function listFiles(bucketName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucketName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prefix: '',
        limit: 100
      })
    });

    const data = await response.json();

    console.log(`\n=== ARQUIVOS: ${bucketName} ===\n`);

    if (Array.isArray(data) && data.length > 0) {
      data.forEach((file, i) => {
        const size = file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'N/A';
        console.log(`${i + 1}. ${file.name} (${size})`);
      });
      console.log(`\nTotal: ${data.length} arquivos`);
    } else {
      console.log('Nenhum arquivo encontrado');
    }

    return data;
  } catch (err) {
    console.error('Erro:', err.message);
    return null;
  }
}

async function uploadFile(bucketName, localPath, remotePath = null) {
  try {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Arquivo nao encontrado: ${localPath}`);
    }

    const fileName = remotePath || path.basename(localPath);
    const fileContent = fs.readFileSync(localPath);

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream'
      },
      body: fileContent
    });

    if (response.ok) {
      console.log(`\nUpload concluido!`);
      console.log(`Arquivo: ${fileName}`);
      console.log(`Bucket: ${bucketName}`);
      console.log(`URL: ${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`);
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

async function downloadFile(bucketName, remotePath, localPath = null) {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${remotePath}`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Arquivo nao encontrado`);
    }

    const buffer = await response.arrayBuffer();
    const savePath = localPath || path.basename(remotePath);

    fs.writeFileSync(savePath, Buffer.from(buffer));

    console.log(`\nDownload concluido!`);
    console.log(`Salvo em: ${savePath}`);

    return true;
  } catch (err) {
    console.error('Erro:', err.message);
    return false;
  }
}

async function deleteFile(bucketName, remotePath) {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${remotePath}`, {
      method: 'DELETE',
      headers
    });

    if (response.ok) {
      console.log(`\nArquivo deletado: ${remotePath}`);
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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch(command) {
    case 'list-buckets':
      await listBuckets();
      break;
    case 'create-bucket':
      if (!args[1]) {
        console.log('Uso: node db-storage.js create-bucket <nome> [true|false]');
        return;
      }
      await createBucket(args[1], args[2]);
      break;
    case 'list':
      if (!args[1]) {
        console.log('Uso: node db-storage.js list <bucket>');
        return;
      }
      await listFiles(args[1]);
      break;
    case 'upload':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-storage.js upload <bucket> <arquivo> [destino]');
        return;
      }
      await uploadFile(args[1], args[2], args[3]);
      break;
    case 'download':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-storage.js download <bucket> <arquivo> [local]');
        return;
      }
      await downloadFile(args[1], args[2], args[3]);
      break;
    case 'delete':
      if (!args[1] || !args[2]) {
        console.log('Uso: node db-storage.js delete <bucket> <arquivo>');
        return;
      }
      await deleteFile(args[1], args[2]);
      break;
    default:
      console.log(`
DB-STORAGE - Gerenciamento de Arquivos

Comandos:
  list-buckets                        Listar buckets
  create-bucket <nome> [public]       Criar bucket
  list <bucket>                       Listar arquivos
  upload <bucket> <arquivo> [destino] Upload de arquivo
  download <bucket> <arquivo> [local] Download de arquivo
  delete <bucket> <arquivo>           Deletar arquivo
      `);
  }
}

main().catch(console.error);
