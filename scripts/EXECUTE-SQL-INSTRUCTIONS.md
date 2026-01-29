# Como Executar o Schema SQL no Supabase

## Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new

2. Copie TODO o conteúdo do arquivo: `scripts/vitafit-complete-schema.sql`

3. Cole no SQL Editor

4. Clique em "RUN" no canto inferior direito

5. Aguarde a execução (pode levar 1-2 minutos)

6. Verifique se não há erros na saída

## O que será criado:

- ✅ Extensões (uuid-ossp, vector)
- ✅ 7 tipos ENUM
- ✅ 20+ tabelas principais
- ✅ Índices para performance
- ✅ Funções de busca vetorial para IA
- ✅ Triggers de updated_at
- ✅ Políticas RLS (Row Level Security)
- ✅ Dados iniciais (30 nomes de bebê, 7 exercícios)
- ✅ Políticas de Storage para buckets

## Após executar o SQL:

Você precisa criar os buckets de Storage manualmente:

### 1. Bucket: images
- Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/storage/buckets
- Clique em "New bucket"
- Nome: `images`
- Public: ✅ SIM
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

### 2. Bucket: progress-photos
- Nome: `progress-photos`
- Public: ❌ NÃO (privado)
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp

### 3. Bucket: recipes
- Nome: `recipes`
- Public: ✅ SIM
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/webp

As políticas de storage já foram incluídas no SQL e serão aplicadas automaticamente.
