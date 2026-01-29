# VitaFit - Guia de Configuração Completo

## 1. EXECUTAR SQL NO SUPABASE

### Passo 1.1: Schema Principal
1. Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new
2. Copie TODO o conteúdo de: `scripts/vitafit-complete-schema.sql`
3. Cole no SQL Editor
4. Clique em **RUN**
5. Aguarde execução (1-2 minutos)

**O que será criado:**
- ✅ Extensões (uuid-ossp, vector para IA)
- ✅ 7 tipos ENUM
- ✅ 20+ tabelas: users, meals, nutrition_plans, recipes, workout_plans, workouts, exercises, progress, appointments, chat_sessions, memories, shopping_lists, shopping_items, baby_names, favorite_baby_names, maternity_bag_items, partners, educational_content, water_intake, daily_goals
- ✅ Índices para performance
- ✅ Funções de busca vetorial (match_memories, hybrid_search_memories)
- ✅ Triggers de updated_at
- ✅ Políticas RLS (Row Level Security)
- ✅ Dados iniciais: 30 nomes de bebê, 7 exercícios
- ✅ Políticas de Storage

### Passo 1.2: Trigger de Sincronização de Usuários
1. No mesmo SQL Editor
2. Copie o conteúdo de: `scripts/create-user-sync-trigger.sql`
3. Cole e execute (RUN)

**O que faz:**
- ✅ Cria trigger que sincroniza auth.users → users table
- ✅ Funciona para registro por email E Google OAuth
- ✅ Sincroniza usuários existentes que não têm registro

---

## 2. CRIAR BUCKETS DE STORAGE

Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/storage/buckets

### Bucket 1: images (Público)
- Clique em **New bucket**
- Nome: `images`
- Public: ✅ **SIM**
- File size limit: 10MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

### Bucket 2: progress-photos (Privado)
- Nome: `progress-photos`
- Public: ❌ **NÃO**
- File size limit: 10MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### Bucket 3: recipes (Público)
- Nome: `recipes`
- Public: ✅ **SIM**
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

**Nota:** As políticas de storage já foram criadas no SQL do Passo 1.

---

## 3. VERIFICAR CONFIGURAÇÕES

### 3.1 Verificar Auth
Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/auth/users

Deve haver pelo menos o usuário:
- brunodivinoa@gmail.com (premium: true)

### 3.2 Verificar Google OAuth
Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/auth/providers

Google deve estar:
- ✅ Enabled
- ✅ Client ID configurado
- ✅ Client Secret configurado

### 3.3 Verificar URL Configuration
Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/auth/url-configuration

Deve ter:
- Site URL: `https://vita-fit-nutricao.vercel.app`
- Redirect URLs:
  - `https://vita-fit-nutricao.vercel.app/**`
  - `http://localhost:3000/**`
  - `https://vita-fit-nutricao.vercel.app/auth/callback`

---

## 4. ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais

#### users
Perfis de usuários com dados de gestação, pós-parto ou ciclo ativo
- Campos: name, email, phase, goals, dietary_restrictions, pregnancy data, etc.
- RLS: Usuário vê apenas seus dados

#### meals
Refeições registradas com análise nutricional
- Campos: type, foods (JSONB), totals (calories, protein, carbs, fat), ai_analysis
- RLS: Usuário vê apenas suas refeições

#### nutrition_plans
Planos alimentares personalizados
- Campos: daily targets, weekly_plan (JSONB), is_active
- RLS: Usuário vê apenas seus planos

#### recipes
Biblioteca de receitas (públicas ou privadas)
- Campos: ingredients, instructions, nutrition per serving, tags
- RLS: Usuário vê suas receitas OU receitas públicas

#### workout_plans
Planos de treino personalizados
- Campos: duration_weeks, sessions_per_week, weekly_schedule (JSONB)
- RLS: Usuário vê apenas seus planos

#### workouts
Sessões individuais de treino
- Campos: exercises (JSONB), status, calories_burned, mood
- RLS: Usuário vê apenas seus treinos

#### exercises
Biblioteca de exercícios (pública)
- Campos: muscle_group, instructions, safe_for_pregnancy flags
- RLS: Leitura pública

#### progress
Acompanhamento de progresso físico
- Campos: weight, measurements, photo_url, mood, symptoms
- RLS: Usuário vê apenas seu progresso

#### appointments
Consultas médicas e exames
- Campos: type, doctor, clinic, date/time, results, reminder
- RLS: Usuário vê apenas suas consultas

#### chat_sessions
Histórico de conversas com IA
- Campos: messages (JSONB), summary, message_count
- RLS: Usuário vê apenas suas sessões

#### memories
Memórias da IA para personalização (com embeddings)
- Campos: content, embedding (vector), importance, metadata
- RLS: Usuário vê apenas suas memórias

#### shopping_lists / shopping_items
Listas de compras (geradas de planos ou manuais)
- RLS: Usuário vê apenas suas listas

#### baby_names / favorite_baby_names
Sugestões de nomes de bebê
- RLS: Nomes públicos, favoritos privados

#### maternity_bag_items
Checklist de mala maternidade
- RLS: Usuário vê apenas seus itens

#### partners
Modo parceiro (compartilhar dados)
- Campos: permissions, notifications, invite_code
- RLS: Usuário vê parceiros linkados a ele

#### educational_content / user_content_progress
Conteúdo educativo e progresso
- RLS: Conteúdo público, progresso privado

#### water_intake / daily_goals
Acompanhamento de hidratação e metas diárias
- RLS: Usuário vê apenas seus dados

---

## 5. FUNCIONALIDADES IMPLEMENTADAS

### ✅ Autenticação
- Login por email/senha
- Google OAuth
- Recuperação de senha
- Reset de senha
- Email templates customizados

### ✅ APIs Existentes
- `/api/auth/register` - Registro de usuários
- `/api/chat` - Chat com IA (Gemini)
- `/api/ai/meal-plan` - Geração de plano alimentar
- `/api/ai/workout-plan` - Geração de plano de treino
- `/api/progress` - CRUD de progresso
- `/api/appointments` - CRUD de consultas
- `/api/shopping` - CRUD de listas de compras

### ✅ Páginas Implementadas
- Dashboard com resumo e ações rápidas
- Chat com assistente IA
- Login/Registro/Recuperação de senha
- (Outras páginas de acordo com os documentos)

---

## 6. PRÓXIMOS PASSOS

### 6.1 Testar Funcionalidades
Acesse: https://vita-fit-nutricao.vercel.app/dashboard

Verificar:
- [ ] Nome do usuário aparece corretamente
- [ ] Chat funciona e responde
- [ ] Dados reais (não mockados) aparecem
- [ ] Todas as navegações funcionam

### 6.2 Implementar Recursos Premium (Doc 4)
Ainda faltam implementar do Documento 4:
- Gamificação (pontos, badges, níveis, desafios)
- Desenvolvimento do bebê (marcos, fotos, comparações)
- Scanner de código de barras
- Relatórios PDF
- Contador de contrações
- Controle de medicamentos
- Diário de fotos
- Meditações guiadas
- Monitoramento de sono
- Integração com wearables
- Chat por voz
- Comunidade

### 6.3 Deploy
```bash
git add .
git commit -m "feat: implementação completa schema database VitaFit"
git push origin main
```

Vercel fará deploy automático.

---

## 7. PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: Username não aparece no dashboard
**Causa:** Usuários OAuth não eram criados na tabela users
**Solução:** Trigger criado no Passo 1.2 resolve isso

### Problema: Chat não funciona
**Causa:** Usuários sem registro na tabela users não têm contexto
**Solução:** Mesmo trigger resolve

### Problema: Dados mockados
**Solução:** Com schema criado, todas as queries agora buscam dados reais do Supabase

---

## 8. VARIÁVEIS DE AMBIENTE

Arquivo `.env.local` (já configurado):
```
NEXT_PUBLIC_SUPABASE_URL=https://qlxabxhszpvetblvnfxl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=VitaFit AI
ADMIN_EMAIL=brunodivinoa@gmail.com
```

---

## 9. COMANDOS ÚTEIS

```bash
# Desenvolvimento local
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Deploy (automático no Vercel)
git push origin main
```

---

## 10. LINKS IMPORTANTES

- **App Produção:** https://vita-fit-nutricao.vercel.app
- **Supabase Dashboard:** https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl
- **Vercel Dashboard:** https://vercel.com/
- **Google Cloud Console:** https://console.cloud.google.com/

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

- [ ] Executar `scripts/vitafit-complete-schema.sql`
- [ ] Executar `scripts/create-user-sync-trigger.sql`
- [ ] Criar bucket `images` (público)
- [ ] Criar bucket `progress-photos` (privado)
- [ ] Criar bucket `recipes` (público)
- [ ] Verificar usuário brunodivinoa@gmail.com está premium
- [ ] Testar login por email
- [ ] Testar login por Google OAuth
- [ ] Testar chat
- [ ] Testar dashboard (nome aparecendo)
- [ ] Deploy para produção
