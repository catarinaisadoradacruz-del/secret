# 🚀 Deploy na Vercel - GUIA SUPER DETALHADO

## ⚠️ ATENÇÃO: Execute PRIMEIRO o `SETUP_SUPABASE.md`!

Se ainda não executou o schema SQL e criou o usuário admin, **PARE AQUI** e faça antes!

---

## 📋 Passo a Passo Completo

### 🔐 Passo 1: Login na Vercel (1 minuto)

1. Abra o navegador
2. Acesse: **https://vercel.com/login**
3. Clique em **"Continue with GitHub"** (botão preto)
4. Se pedir login do GitHub:
   - Email: `catarinaisadoradacruz@gmail.com`
   - Senha: (sua senha do GitHub)
5. Autorize a Vercel se aparecer tela de autorização

✅ Você estará no Dashboard da Vercel

---

### 📦 Passo 2: Importar o Projeto do GitHub (2 minutos)

#### 2.1 Clicar em "Add New Project"

Na tela inicial da Vercel você verá:

```
┌─────────────────────────────────┐
│  Dashboard                       │
│  ┌──────────┐                   │
│  │ Add New  │ ← CLIQUE AQUI    │
│  │    ▼     │                   │
│  └──────────┘                   │
└─────────────────────────────────┘
```

Clique no botão **"Add New..."** (canto superior direito)

No menu que abre, clique em **"Project"**

#### 2.2 Encontrar o Repositório

Você verá uma tela com:
```
Import Git Repository

Search...  [____________]  ← Digite aqui: secret

Your GitHub Repositories:
├─ catarinaisadoradacruz-del/secret  ← Este aqui!
│  └─ [Import] ← CLIQUE AQUI
```

**Procure:** `catarinaisadoradacruz-del/secret`

**Clique** no botão **"Import"** ao lado dele

**IMPORTANTE:** Se o repositório NÃO aparecer:
1. Role até o final da página
2. Clique em "Adjust GitHub App Permissions"
3. Dê permissão de acesso ao repositório `secret`
4. Volte e procure novamente

---

### ⚙️ Passo 3: Configurar o Projeto (5 minutos)

Você verá uma tela de configuração. Vamos preencher passo a passo:

#### 3.1 Configurações Básicas

```
Configure Project

Project Name: secret  ← Pode deixar assim
Framework Preset: Next.js ← Detecta automaticamente
Root Directory: ./  ← Deixe como está
```

**Não precisa mexer em nada aqui!** Tudo detecta automaticamente.

#### 3.2 Build Settings

```
Build and Output Settings

Build Command: next build ← Já vem preenchido
Output Directory: .next ← Já vem preenchido
Install Command: npm install ← Já vem preenchido
```

**Não precisa mexer!** Tudo já está correto.

#### 3.3 Environment Variables (MAIS IMPORTANTE!)

Role a página até ver:

```
Environment Variables

Add environment variables for your project

┌──────────────────────────────────┐
│ Name  │ Value                     │
├──────────────────────────────────┤
│ [____]│ [__________________]  [+] │
└──────────────────────────────────┘
```

Agora você vai adicionar **5 variáveis**. Para cada uma:
1. Digite o **Nome** no campo esquerdo
2. Cole o **Valor** no campo direito
3. Clique no **[+]** (sinal de mais)

---

#### ⭐ VARIÁVEL 1 de 5

```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://qlxabxhszpvetblvnfxl.supabase.co
```

**Copie EXATAMENTE:**
```
https://qlxabxhszpvetblvnfxl.supabase.co
```

Clique no **[+]** depois de colar

---

#### ⭐ VARIÁVEL 2 de 5

```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U
```

**Copie EXATAMENTE:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U
```

Clique no **[+]**

---

#### ⭐ VARIÁVEL 3 de 5

```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo
```

**Copie EXATAMENTE:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo
```

Clique no **[+]**

---

#### ⭐ VARIÁVEL 4 de 5

```
Name:  NEXT_PUBLIC_GEMINI_API_KEY
Value: AIzaSyBIxALj-qqZSEjIfd-PGBvXcyoNjlDZftE
```

**Copie EXATAMENTE:**
```
AIzaSyBIxALj-qqZSEjIfd-PGBvXcyoNjlDZftE
```

Clique no **[+]**

---

#### ⭐ VARIÁVEL 5 de 5 (última!)

```
Name:  ADMIN_EMAIL
Value: brunodivinoa@gmail.com
```

**Copie EXATAMENTE:**
```
brunodivinoa@gmail.com
```

Clique no **[+]**

---

#### ✅ Verificação das Variáveis

Agora você deve ver **5 variáveis** adicionadas:

```
Environment Variables (5)

✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ NEXT_PUBLIC_GEMINI_API_KEY
✓ ADMIN_EMAIL
```

Se estiver **faltando alguma**, clique novamente no **[+]** e adicione.

---

### 🚀 Passo 4: Deploy! (3 minutos)

#### 4.1 Iniciar Deploy

Role até o final da página e clique no botão grande azul:

```
┌─────────────────────┐
│      Deploy         │  ← CLIQUE AQUI
└─────────────────────┘
```

#### 4.2 Aguarde o Build

Você verá uma tela com logs rolando:

```
Building...
▸ Installing dependencies...
▸ npm install
▸ Building Next.js...
▸ Collecting page data...
▸ Finalizing build...
```

**Tempo estimado:** 2-3 minutos

☕ Pode tomar um café!

#### 4.3 Deploy Concluído

Quando terminar, verá:

```
🎉 Congratulations!

Your project has been deployed!

┌─────────────────────────────────┐
│ https://secret-xxxx.vercel.app  │ ← SUA URL
└─────────────────────────────────┘

[Visit] [Continue to Dashboard]
```

**COPIE A URL** que aparece!

---

### 🎯 Passo 5: Primeiro Acesso (1 minuto)

1. Clique no botão **"Visit"** OU
2. Abra a URL copiada em uma nova aba

Você verá a tela de login:

```
┌─────────────────────────────────┐
│   Sistema Investigativo          │
│                                  │
│   E-mail: [_______________]     │
│   Senha:  [_______________]     │
│                                  │
│          [  Entrar  ]           │
└─────────────────────────────────┘
```

**Faça login com:**
- Email: `brunodivinoa@gmail.com`
- Senha: `@Pcgo2026Strong!` (ou a senha que você criou no Supabase)

✅ **PRONTO! VOCÊ ESTÁ DENTRO DO SISTEMA!**

---

## 🎉 Sucesso! O que fazer agora?

### Teste as Funcionalidades

1. **Dashboard** - Você já está nele!
2. **Criar Usuário** - Vá em "Admin > Gerenciar Usuários"
3. **Nova Investigação** - Clique em "Investigações"
4. **Cadastrar Alvo** - Vá em "Alvos"
5. **Testar RAI** - Vá em "Análise RAI" e cole um texto
6. **Testar IA Vision** - Vá em "Análise Forense" e faça upload de uma foto

### Criar Outros Usuários

1. No menu lateral, clique em **"Gerenciar Usuários"** (ícone de pessoas)
2. Clique em **"Novo Usuário"**
3. Preencha:
   - Nome: Nome completo
   - Email: email@exemplo.com
   - Senha: senha segura (min 6 caracteres)
   - Administrador: ☐ (deixe desmarcado se for usuário comum)
4. Clique em **"Criar"**

---

## 🔧 Configurações Avançadas (Opcional)

### Ver Logs da Aplicação

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto **"secret"**
3. Vá na aba **"Logs"**
4. Veja erros, avisos e requisições em tempo real

### Configurar Domínio Customizado (Opcional)

1. No dashboard do projeto, vá em **"Settings"** → **"Domains"**
2. Clique em **"Add"**
3. Digite seu domínio (ex: `investigacoes.pcgo.gov.br`)
4. Siga as instruções para configurar DNS

### Atualizar Variáveis de Ambiente

Se precisar mudar alguma variável depois:

1. Dashboard do projeto → **"Settings"** → **"Environment Variables"**
2. Localize a variável
3. Clique nos **"..."** → **"Edit"**
4. Altere o valor
5. Clique em **"Save"**
6. **IMPORTANTE:** Vá em **"Deployments"** → último deploy → **"..."** → **"Redeploy"**

---

## ⚠️ Troubleshooting - Problemas Comuns

### Erro: "Cannot connect to database"
**Solução:**
- Verifique se executou o schema SQL no Supabase
- Confirme as variáveis de ambiente no Vercel
- Tente fazer Redeploy

### Erro: "Invalid login credentials"
**Solução:**
- Confirme que criou o usuário no Supabase Auth
- Confirme que executou o INSERT na tabela users
- Tente resetar a senha no Supabase

### Erro 500 no deploy
**Solução:**
- Veja os logs: Dashboard → Logs
- Provavelmente falta alguma variável de ambiente
- Verifique se todas as 5 variáveis foram adicionadas

### Build falhou
**Solução:**
- Veja o log de build
- Provavelmente erro de sintaxe (mas não deve acontecer)
- Tente fazer novo deploy

---

## 📱 URLs Importantes

Salve esses links:

- **Seu App:** https://secret-[xxxxx].vercel.app
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl
- **GitHub Repo:** https://github.com/catarinaisadoradacruz-del/secret

---

## ✅ Checklist Final

- [ ] Schema SQL executado no Supabase
- [ ] Usuário admin criado no Auth
- [ ] Registro criado na tabela users
- [ ] Projeto importado na Vercel
- [ ] 5 variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Primeiro login funcionou
- [ ] Dashboard carregou corretamente

---

## 🎯 Próximos Passos

1. ✅ Testar criar uma investigação
2. ✅ Cadastrar um alvo
3. ✅ Fazer análise de RAI
4. ✅ Upload de imagem forense
5. ✅ Criar outros usuários
6. 📅 (Opcional) Configurar Google Maps API

---

**Deu tudo certo? Começa a usar! 🎉**

**Teve algum problema? Me avisa qual passo travou que eu te ajudo!**
