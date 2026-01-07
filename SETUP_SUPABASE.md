# 🔧 Setup Supabase - PASSO A PASSO COMPLETO

## ⚠️ IMPORTANTE: Faça isso ANTES do deploy na Vercel!

---

## 📋 Passo 1: Executar Schema SQL (3 minutos)

### 1.1 Abra o Supabase SQL Editor

Acesse este link direto:
**https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new**

(Vai pedir login se não estiver logado - use: catarinaisadoradacruz@gmail.com)

### 1.2 Copie o Schema SQL

Abra o arquivo no seu computador:
```
C:\Users\Administrador\Desktop\Investigações\App\pcgo-sistema\supabase\schema.sql
```

**Selecione TUDO** (Ctrl+A) e **Copie** (Ctrl+C)

### 1.3 Cole e Execute

1. **Cole** (Ctrl+V) no SQL Editor do Supabase
2. Clique no botão **"RUN"** (canto inferior direito) ou pressione **F5**
3. Aguarde aparecer **"Success. No rows returned"** (30 segundos - 2 minutos)

✅ **PRONTO!** Todas as tabelas, políticas RLS e índices foram criados!

---

## 👤 Passo 2: Criar Seu Usuário Admin (2 minutos)

### 2.1 Crie o Usuário no Auth

Acesse direto:
**https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/auth/users**

1. Clique no botão verde **"Add user"** (canto superior direito)
2. Selecione **"Create new user"**
3. Preencha:

```
Email: brunodivinoa@gmail.com
Password: @Pcgo2026Strong!
```

(⚠️ **ANOTE essa senha** - você vai usar para fazer login!)

4. **IMPORTANTE:** Marque a checkbox **"Auto Confirm User"** ✅
5. Clique em **"Create user"**

### 2.2 Copie o UUID do Usuário

Depois de criar, você verá uma lista com o usuário. Ele terá um **ID** (UUID) parecido com:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Clique no ID para copiar** (ou selecione e Ctrl+C)

### 2.3 Registre o Admin na Tabela Users

1. Volte ao SQL Editor: **https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new**
2. **Limpe** o editor (delete tudo)
3. Cole este SQL (substituindo o UUID):

```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'COLE-O-UUID-QUE-VOCÊ-COPIOU-AQUI',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

**Exemplo de como deve ficar:**
```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

4. Clique em **"RUN"** ou **F5**
5. Deve aparecer: **"Success. 1 row affected"**

✅ **PRONTO!** Seu usuário admin está criado!

---

## ✅ Verificação (Opcional)

Para confirmar que está tudo certo, execute no SQL Editor:

```sql
SELECT email, nome, is_admin
FROM public.users
WHERE email = 'brunodivinoa@gmail.com';
```

Deve retornar:
```
email: brunodivinoa@gmail.com
nome: BRUNO DIVINO ALVES
is_admin: true
```

---

## 🎯 Próximo Passo

Agora vá para o **VERCEL** e faça o deploy!

Leia o arquivo: `DEPLOY_VERCEL_DETALHADO.md`

---

**Dúvidas nessa parte? Me avise antes de ir pro Vercel!**
