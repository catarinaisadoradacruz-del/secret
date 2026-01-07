# Quick Start - Sistema Investigativo PCGO

## 🚀 Deploy Rápido (5 Passos)

### 1️⃣ Configure o Database (Supabase)

Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/editor

Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`

### 2️⃣ Crie o Usuário Admin

No Supabase, vá em **Authentication > Users** e crie:
- Email: brunodivinoa@gmail.com
- Password: (senha segura)
- Auto Confirm: ✅

Copie o UUID do usuário e execute no SQL Editor:

```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'UUID-AQUI',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

### 3️⃣ Deploy na Vercel

1. Acesse: https://vercel.com/new
2. Importe: `catarinaisadoradacruz-del/secret`
3. Adicione as variáveis de ambiente (veja abaixo)
4. Clique em Deploy

**Variáveis de Ambiente:**
```
NEXT_PUBLIC_SUPABASE_URL=https://qlxabxhszpvetblvnfxl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyBIxALj-qqZSEjIfd-PGBvXcyoNjlDZftE
ADMIN_EMAIL=brunodivinoa@gmail.com
```

### 4️⃣ Primeiro Login

1. Acesse a URL da Vercel (ex: https://secret-xxx.vercel.app)
2. Login: brunodivinoa@gmail.com
3. Senha: (a que você criou)

### 5️⃣ Crie Outros Usuários

1. Vá em **Admin > Gerenciar Usuários**
2. Clique em "Novo Usuário"
3. Preencha os dados
4. Marque "Administrador" se necessário

## ✅ Testando Funcionalidades

### Criar Investigação
1. Dashboard > Investigações
2. "Nova Investigação"
3. Preencha título, tipo, datas
4. Salvar

### Cadastrar Alvo
1. Dashboard > Alvos
2. "Novo Alvo"
3. Selecione investigação
4. Preencha dados (nome, CPF, etc.)
5. Salvar

### Analisar RAI
1. Dashboard > Análise RAI
2. "Analisar RAI"
3. Selecione investigação
4. Cole o texto completo do RAI
5. "Analisar com IA"
6. Aguarde 10-30 segundos

### Análise Forense
1. Dashboard > Análise Forense
2. "Analisar Imagem"
3. Selecione investigação
4. Arraste uma imagem ou clique para selecionar
5. "Analisar com IA"
6. Aguarde 15-45 segundos

### Registros Telefônicos
1. Dashboard > Registros Telefônicos
2. "Novo Registro"
3. Preencha origem, destino, data/hora
4. Vincule a alvo (opcional)
5. Salvar

### Operações
1. Dashboard > Operações
2. "Nova Operação"
3. Defina nome, data, local, objetivo
4. Salvar

## 🔐 Segurança

- **Admin**: Só você pode criar/editar/excluir usuários
- **RLS**: Cada usuário vê apenas seus dados + dados compartilhados
- **Equipes**: Qualquer usuário pode criar equipes e compartilhar
- **Logs**: Todas as ações são registradas

## 📱 Acesso Mobile

O sistema é responsivo e funciona em:
- ✅ Desktop
- ✅ Tablet
- ✅ Smartphone

## 🆘 Problemas Comuns

### Erro ao fazer login
- Confirme que o schema SQL foi executado
- Verifique se o usuário existe em Auth > Users
- Confirme que o registro foi criado na tabela users

### Gemini não responde
- Aguarde até 45 segundos
- Verifique a API key no Vercel
- Veja os logs: Vercel Dashboard > Logs

### Dados não aparecem
- Recarregue a página (F5)
- Verifique o console do navegador (F12)
- Confirme que está logado

## 🎯 Próximos Passos

1. ✅ Sistema funcionando
2. 📝 Criar primeiras investigações
3. 👥 Cadastrar outros usuários
4. 🧪 Testar RAI e análise forense
5. 🗺️ (Opcional) Configurar Google Maps

## 📞 Contato

Em caso de dúvidas: brunodivinoa@gmail.com

---

**Tudo pronto! Comece a usar o sistema agora.** 🎉
