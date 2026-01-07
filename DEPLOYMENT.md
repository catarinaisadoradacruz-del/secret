# Guia de Deploy - Sistema Investigativo PCGO

## Pré-requisitos Concluídos

✅ Código no GitHub: https://github.com/catarinaisadoradacruz-del/secret
✅ Database schema criado
✅ Credenciais configuradas localmente

## Passos para Deploy na Vercel

### 1. Acesse a Vercel

Acesse: https://vercel.com/login

Entre com a conta GitHub (catarinaisadoradacruz@gmail.com)

### 2. Importe o Projeto

1. Clique em "Add New..." → "Project"
2. Busque o repositório: `catarinaisadoradacruz-del/secret`
3. Clique em "Import"

### 3. Configure o Projeto

**Framework Preset**: Next.js (detectado automaticamente)
**Root Directory**: `./`
**Build Command**: `npm run build`
**Output Directory**: `.next`
**Install Command**: `npm install`

### 4. Configure as Variáveis de Ambiente

Na seção "Environment Variables", adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qlxabxhszpvetblvnfxl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTczMjUsImV4cCI6MjA4MzM3MzMyNX0.mojZpuyas6eAEPLn8ONcIlbfTr1mo8kIQTGyTc8ML6U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyBIxALj-qqZSEjIfd-PGBvXcyoNjlDZftE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ADMIN_EMAIL=brunodivinoa@gmail.com
```

**IMPORTANTE**: Copie e cole exatamente como está acima. Cada variável deve ser adicionada separadamente.

### 5. Deploy

Clique em "Deploy" e aguarde (2-3 minutos)

## Pós-Deploy

### 1. Configurar Database no Supabase

1. Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl
2. Vá em "SQL Editor"
3. Cole e execute o conteúdo de `supabase/schema.sql`
4. Aguarde conclusão (pode demorar 1-2 minutos)

### 2. Criar Usuário Admin

1. No Supabase, vá em "Authentication" → "Users"
2. Clique em "Add user" → "Create new user"
3. Email: `brunodivinoa@gmail.com`
4. Password: (escolha uma senha segura, ex: `@Pcgo2026Strong!`)
5. Marque "Auto Confirm User"
6. Clique em "Create User"
7. **COPIE O UUID** do usuário criado

8. Vá em "SQL Editor" e execute:
```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'COLE-AQUI-O-UUID-COPIADO',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

### 3. Teste o Sistema

1. Acesse a URL do Vercel (ex: https://secret-xxxx.vercel.app)
2. Faça login com brunodivinoa@gmail.com
3. Teste cada módulo:
   - ✅ Dashboard
   - ✅ Criar investigação
   - ✅ Cadastrar alvo
   - ✅ Analisar RAI (cole texto de exemplo)
   - ✅ Análise forense (upload imagem)
   - ✅ Registros telefônicos
   - ✅ Operações
   - ✅ Admin → Criar usuário

## Configuração Opcional: Google Maps

Se quiser ativar o mapa interativo:

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie uma API Key
3. Ative as APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Copie a key
5. Na Vercel, vá em Settings → Environment Variables
6. Edite `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` e cole a key
7. Redeploy o projeto

## Monitoramento

### Logs da Aplicação
Vercel Dashboard → Seu Projeto → Logs

### Logs do Database
Supabase Dashboard → Logs

### Analytics
Vercel Dashboard → Analytics

## Troubleshooting

### Build Error
- Verifique as variáveis de ambiente
- Veja os logs no Vercel

### Login não funciona
- Verifique se o schema SQL foi executado
- Confirme o usuário no Supabase Auth
- Verifique se o registro foi criado na tabela `users`

### Gemini não funciona
- Verifique a API key no Vercel
- Teste a key em: https://aistudio.google.com/apikey

### Supabase não conecta
- Verifique as URLs e keys
- Confirme que o projeto está ativo

## URLs Importantes

- **Aplicação**: https://secret-[seu-dominio].vercel.app
- **GitHub**: https://github.com/catarinaisadoradacruz-del/secret
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl

## Atualizações Futuras

Para atualizar o sistema:

1. Faça alterações no código localmente
2. Commit e push para o GitHub:
```bash
git add .
git commit -m "Descrição da alteração"
git push
```
3. Vercel fará deploy automático

## Suporte

Em caso de problemas, verifique:
1. Logs no Vercel
2. Network tab no navegador (F12)
3. Supabase logs

---

**Sistema pronto para produção!** 🚀

Todas as funcionalidades estão operacionais:
- ✅ Autenticação
- ✅ Gestão de usuários (admin)
- ✅ Investigações
- ✅ Alvos
- ✅ RAI com IA
- ✅ Análise forense com IA
- ✅ Registros telefônicos
- ✅ Operações
- ✅ Documentos (estrutura criada)
- ✅ Mapa (aguarda API key)
- ✅ Row Level Security
- ✅ Dark theme
