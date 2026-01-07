# 🎯 SETUP SUPER SIMPLES - 3 Passos

## ⏱️ Tempo total: 5 minutos

---

## 📋 Passo 1: Executar Schema SQL (3 minutos)

### 1. Abra este link:
**https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new**

(Se pedir login, use: catarinaisadoradacruz@gmail.com)

### 2. Abra este arquivo no seu computador:
```
C:\Users\Administrador\Desktop\Investigações\App\pcgo-sistema\supabase\schema.sql
```

### 3. Copie TUDO:
- Pressione **Ctrl+A** (selecionar tudo)
- Pressione **Ctrl+C** (copiar)

### 4. Cole no Supabase:
- Clique no SQL Editor (a caixa grande em branco)
- Pressione **Ctrl+V** (colar)

### 5. Execute:
- Clique no botão **"RUN"** (canto inferior direito)
- OU pressione **F5**

### 6. Aguarde:
- Vai aparecer "Running query..."
- Aguarde até aparecer **"Success. No rows returned"**
- Pode levar 30 segundos a 2 minutos

✅ **PRONTO!** Todas as tabelas foram criadas!

---

## 👤 Passo 2: Criar Usuário Admin (2 minutos)

### Opção A: Executar Script Python (Recomendado)

1. Abra o **Terminal** ou **Prompt de Comando**

2. Vá para a pasta do projeto:
```bash
cd "C:\Users\Administrador\Desktop\Investigações\App\pcgo-sistema"
```

3. Execute o script:
```bash
python setup_completo_supabase.py
```

4. Pressione **ENTER** quando pedir

✅ **PRONTO!** Usuário criado automaticamente!

**Email:** brunodivinoa@gmail.com
**Senha:** @Pcgo2026Strong!

---

### Opção B: Criar Manualmente (se não tiver Python)

1. Acesse: **https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/auth/users**

2. Clique em **"Add user"** → **"Create new user"**

3. Preencha:
   - Email: `brunodivinoa@gmail.com`
   - Password: `@Pcgo2026Strong!`
   - Marque: **"Auto Confirm User"** ✅

4. Clique em **"Create user"**

5. **COPIE O UUID** que aparece (ex: `a1b2c3d4-...`)

6. Volte ao SQL Editor: **https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new**

7. **Limpe** tudo (Ctrl+A, Delete)

8. Cole este SQL (substituindo o UUID):
```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'COLE-O-UUID-QUE-VOCÊ-COPIOU-AQUI',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

9. Clique em **"RUN"**

10. Deve aparecer: **"Success. 1 row affected"**

✅ **PRONTO!** Usuário admin criado!

---

## 🎉 Passo 3: Confirmar que Funcionou

Execute no SQL Editor:
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

Se retornou isso, **ESTÁ TUDO PRONTO!** ✅

---

## 🚀 Agora vai pro Vercel!

Abra este guia:
**DEPLOY_VERCEL_DETALHADO.md**

---

## 🆘 Problemas?

### "Could not find the function..."
- Você não executou o schema SQL ainda
- Volte ao Passo 1

### "User already exists"
- Normal! Usuário já foi criado antes
- Pule para o Passo 3 (confirmação)

### "Table users does not exist"
- Você não executou o schema SQL ainda
- Volte ao Passo 1

### Python não instalado?
- Use a Opção B (manual)
- OU instale Python: https://python.org/downloads

---

**Dúvida? Me avisa qual passo travou!** 💪
