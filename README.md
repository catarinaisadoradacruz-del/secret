# Sistema Investigativo - PCGO

Plataforma Integrada de Gestão de Investigações desenvolvida com Next.js 14, TypeScript, Supabase e IA (Google Gemini).

## Funcionalidades

### Autenticação e Usuários
- Login seguro com Supabase Auth
- Gestão de usuários (apenas admin pode criar/editar/excluir)
- Usuário admin: brunodivinoa@gmail.com

### Gestão de Investigações
- Criar, editar e excluir investigações
- Classificação por tipo (IP, PI, TC, Flagrante)
- Status (Em Andamento, Concluído, Arquivado)
- Compartilhamento com equipes
- Row Level Security (RLS) para isolamento de dados

### Gestão de Alvos
- Cadastro completo de alvos
- Fotos, documentos, telefones, veículos
- Status (Investigação, Indiciado, Preso, Foragido)
- Vinculação com investigações

### Análise de RAI com IA
- Upload de texto RAI
- Extração automática com Google Gemini 2.0 Flash
- Dados da vítima, autor, narrativa, objetos, testemunhas
- Não inventa dados - apenas extração factual

### Análise Forense com IA
- Upload de imagens
- Análise com Gemini Vision
- Descrição, elementos relevantes, evidências
- Características identificáveis

### Registros Telefônicos
- Gestão de chamadas, SMS, WhatsApp
- Origem, destino, data/hora, duração
- Vinculação com alvos

### Operações
- Planejamento de operações policiais
- Data, hora, local, objetivo
- Status (Planejada, Em Execução, Concluída, Cancelada)

### Documentos
- Estrutura para geração de documentos (RELINT, Representações)
- Logos PCGO integrados
- PDF exportável

### Mapa Interativo
- Preparado para Google Maps API
- Marcadores de alvos, ERBs, eventos
- Timeline de deslocamentos

## Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **IA**: Google Gemini 2.0 Flash, Gemini Pro Vision
- **UI**: shadcn/ui components
- **Deploy**: Vercel

## Instalação

### Pré-requisitos
- Node.js 18+
- Conta Supabase
- Conta Google Cloud (Gemini API)
- Conta Vercel (deploy)

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/catarinaisadoradacruz-del/secret.git
cd secret
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Copie `.env.local` e preencha as variáveis:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google APIs
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key

# Admin
ADMIN_EMAIL=brunodivinoa@gmail.com
```

4. **Execute o schema SQL no Supabase**

Acesse o Supabase Dashboard > SQL Editor e execute o arquivo `supabase/schema.sql`

5. **Crie o usuário admin inicial**

No Supabase Dashboard > Authentication > Users, crie manualmente:
- Email: brunodivinoa@gmail.com
- Senha: (escolha uma senha segura)

Depois, no SQL Editor:
```sql
INSERT INTO public.users (id, email, nome, is_admin)
VALUES (
  'uuid-do-usuario-criado',
  'brunodivinoa@gmail.com',
  'BRUNO DIVINO ALVES',
  true
);
```

6. **Execute o projeto localmente**
```bash
npm run dev
```

Acesse http://localhost:3000

## Deploy na Vercel

1. Conecte o repositório GitHub à Vercel
2. Configure as variáveis de ambiente no dashboard
3. Deploy automático a cada push na branch `main`

## Estrutura do Projeto

```
pcgo-sistema/
├── app/
│   ├── api/                 # API routes
│   │   ├── admin/          # Admin endpoints
│   │   ├── rai/            # RAI analysis
│   │   └── forensic/       # Forensic analysis
│   ├── dashboard/          # Protected pages
│   │   ├── admin/          # Admin pages
│   │   ├── investigations/ # Investigations
│   │   ├── alvos/          # Targets
│   │   ├── rai/            # RAI analysis
│   │   ├── forensic/       # Forensic analysis
│   │   ├── phone-records/  # Phone records
│   │   ├── map/            # Interactive map
│   │   ├── operations/     # Operations
│   │   └── documents/      # Documents
│   ├── login/              # Login page
│   └── layout.tsx          # Root layout
├── components/
│   └── Sidebar.tsx         # Navigation sidebar
├── lib/
│   ├── supabase/           # Supabase clients
│   └── gemini.ts           # Gemini AI integration
├── supabase/
│   └── schema.sql          # Database schema
└── package.json
```

## Segurança

- **Row Level Security (RLS)**: Usuários veem apenas seus dados + dados compartilhados
- **Admin**: Vê todos os dados do sistema
- **Permissões granulares**: view, edit, delete por recurso
- **Audit Log**: Registro de todas as ações
- **LGPD**: Compliance com proteção de dados

## Equipes e Compartilhamento

- Qualquer usuário pode criar equipes
- Investigações podem ser compartilhadas com equipes
- Membros da equipe têm acesso aos dados compartilhados
- Permissões configuráveis por recurso

## IA - Regras de Objetividade

O sistema segue regras críticas anti-especulação:

❌ **PROIBIDO**:
- Inventar dados ausentes
- Fazer suposições sobre relacionamentos
- Deduzir informações implícitas
- Criar análises especulativas

✅ **PERMITIDO**:
- Extrair dados explícitos
- Usar "Não informado" quando ausente
- Análise factual de evidências
- Timeline baseada em dados reais

## Suporte

Para dúvidas ou problemas:
- Email: brunodivinoa@gmail.com
- GitHub Issues: https://github.com/catarinaisadoradacruz-del/secret/issues

## Licença

Uso restrito à Polícia Civil do Estado de Goiás (PCGO).

---

Desenvolvido com Claude Code (Anthropic) - Janeiro/2026
