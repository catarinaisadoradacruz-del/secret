# 🌸 MAMÃEFIT AI - DOCUMENTO TÉCNICO COMPLETO
## Aplicativo PWA de Nutrição e Treino para Mulheres, Mães e Gestantes

**Versão:** 1.0.0  
**Data:** Janeiro 2026  
**Autor:** Documento Técnico para Implementação

---

# INSTRUÇÕES PARA O CURSOR/VS CODE

Este documento contém TODAS as instruções necessárias para criar o aplicativo MamãeFit AI do zero.
Siga cada seção na ordem apresentada. Crie cada arquivo exatamente como especificado.

---

# ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Setup Inicial](#2-setup-inicial)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Arquivos de Configuração](#4-arquivos-de-configuração)
5. [Schema do Banco de Dados](#5-schema-do-banco-de-dados)
6. [Lib - Utilitários e Configurações](#6-lib---utilitários-e-configurações)
7. [Sistema de IA e Memória](#7-sistema-de-ia-e-memória)
8. [API Routes](#8-api-routes)
9. [Types](#9-types)
10. [Hooks Customizados](#10-hooks-customizados)
11. [Componentes UI Base](#11-componentes-ui-base)
12. [Componentes de Layout](#12-componentes-de-layout)
13. [Componentes do Chat](#13-componentes-do-chat)
14. [Componentes do Dashboard](#14-componentes-do-dashboard)
15. [Componentes de Nutrição](#15-componentes-de-nutrição)
16. [Componentes de Treino](#16-componentes-de-treino)
17. [Componentes Extras](#17-componentes-extras)
18. [Páginas do App](#18-páginas-do-app)
19. [PWA e Manifest](#19-pwa-e-manifest)
20. [Dados Estáticos](#20-dados-estáticos)
21. [Deploy](#21-deploy)

---

# 1. VISÃO GERAL

## 1.1 Descrição do Projeto

MamãeFit AI é um aplicativo PWA completo de nutrição e treino personalizado com IA para:

- **Gestantes**: Acompanhamento das 40 semanas, alimentação segura por trimestre, exercícios adaptados
- **Pós-parto**: Recuperação, amamentação, exercícios de assoalho pélvico, perda de peso saudável
- **Mulheres Ativas**: Treinos variados, adaptação ao ciclo menstrual, metas fitness personalizadas

## 1.2 Stack Tecnológico

```
Frontend:       Next.js 15 + React 19 + TypeScript
Styling:        Tailwind CSS 4 + Framer Motion 11
Backend:        Next.js API Routes + Server Actions
Database:       Supabase (PostgreSQL + pgvector + Auth + Storage)
AI Principal:   Google Gemini 2.0 Flash via Vercel AI SDK
AI Memory:      Vector Search com pgvector + Embeddings
PWA:            Next.js PWA nativo
```

## 1.3 Funcionalidades Completas

| Módulo | Funcionalidades |
|--------|-----------------|
| **Dashboard** | Resumo diário, semana gestacional, progresso, ações rápidas |
| **Nutrição** | Scanner de refeições com IA, plano alimentar, diário, receitas |
| **Treino** | Planos personalizados, timer, exercícios em vídeo/GIF |
| **Chat IA** | Assistente 24h com memória de longo prazo e contexto |
| **Progresso** | Peso, medidas, fotos, gráficos de evolução |
| **Consultas** | Agenda médica, lembretes, checklist de exames |
| **Parceiro** | Modo acompanhamento para pai/parceiro |
| **Lista Compras** | Gerada automaticamente do plano alimentar |
| **Nomes Bebê** | Sugestões com significado e match com parceiro |
| **Mala Maternidade** | Checklist interativa por categoria |
| **Conteúdo** | Artigos, vídeos e podcasts educativos |

---

# 2. SETUP INICIAL

## 2.1 Criar Projeto

```bash
# Criar projeto Next.js 15
npx create-next-app@latest mamafit-ai --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd mamafit-ai
```

## 2.2 Instalar TODAS as Dependências

```bash
# ========== AI & LLM ==========
npm install ai @ai-sdk/google @google/generative-ai

# ========== Database & Auth ==========
npm install @supabase/supabase-js @supabase/ssr

# ========== UI Components ==========
npm install framer-motion lucide-react clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install @radix-ui/react-progress @radix-ui/react-switch @radix-ui/react-slider
npm install @radix-ui/react-avatar @radix-ui/react-toast @radix-ui/react-popover
npm install @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-label

# ========== Forms & Validation ==========
npm install react-hook-form @hookform/resolvers zod

# ========== Charts ==========
npm install recharts

# ========== Date & Time ==========
npm install date-fns

# ========== Utilities ==========
npm install uuid nanoid
npm install @tanstack/react-query

# ========== Dev Dependencies ==========
npm install -D @types/uuid prettier
```

## 2.3 Configurar Supabase

1. Criar conta em https://supabase.com
2. Criar novo projeto
3. Anotar:
   - Project URL
   - anon public key
   - service_role key (Settings > API)

## 2.4 Configurar Google AI Studio

1. Acessar https://aistudio.google.com/
2. Criar API Key
3. Anotar a chave

---

# 3. ESTRUTURA DE PASTAS

Criar EXATAMENTE esta estrutura:

```
mamafit-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (main)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── nutrition/
│   │   │   │   ├── page.tsx
│   │   │   │   └── scan/
│   │   │   │       └── page.tsx
│   │   │   ├── workout/
│   │   │   │   └── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   ├── progress/
│   │   │   │   └── page.tsx
│   │   │   ├── appointments/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── shopping/
│   │   │   │   └── page.tsx
│   │   │   ├── baby-names/
│   │   │   │   └── page.tsx
│   │   │   ├── maternity-bag/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── chat/
│   │   │   │   └── route.ts
│   │   │   ├── nutrition/
│   │   │   │   ├── analyze/route.ts
│   │   │   │   └── plan/route.ts
│   │   │   ├── workout/
│   │   │   │   └── generate/route.ts
│   │   │   └── user/
│   │   │       └── route.ts
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── manifest.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── modal.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── bottom-nav.tsx
│   │   │   └── page-container.tsx
│   │   ├── chat/
│   │   │   ├── chat-container.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── chat-input.tsx
│   │   │   ├── typing-indicator.tsx
│   │   │   └── quick-suggestions.tsx
│   │   ├── dashboard/
│   │   │   ├── pregnancy-tracker.tsx
│   │   │   ├── daily-summary.tsx
│   │   │   └── quick-actions.tsx
│   │   ├── nutrition/
│   │   │   ├── meal-scanner.tsx
│   │   │   └── macro-display.tsx
│   │   ├── workout/
│   │   │   ├── workout-card.tsx
│   │   │   └── exercise-timer.tsx
│   │   └── shared/
│   │       ├── loading-spinner.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── ai/
│   │   │   ├── gemini.ts
│   │   │   ├── memory-system.ts
│   │   │   └── system-prompts.ts
│   │   └── utils/
│   │       ├── cn.ts
│   │       └── constants.ts
│   ├── hooks/
│   │   ├── use-user.ts
│   │   ├── use-chat.ts
│   │   └── use-meals.ts
│   ├── types/
│   │   └── index.ts
│   ├── providers/
│   │   └── index.tsx
│   └── middleware.ts
├── public/
│   └── icons/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

# 4. ARQUIVOS DE CONFIGURAÇÃO

## 4.1 .env.local

```env
# ========== SUPABASE ==========
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ========== GOOGLE AI (GEMINI) ==========
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...

# ========== APP ==========
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MamãeFit AI
```

## 4.2 next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
```

## 4.3 tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a9ba',
          400: '#ec7a95',
          500: '#E8A5B3',
          600: '#d25d78',
          700: '#b04461',
          800: '#933b54',
          900: '#7d354c',
        },
        secondary: {
          50: '#f4f9f5',
          100: '#e6f2e8',
          200: '#cee5d3',
          300: '#a8d1b1',
          400: '#9DB4A0',
          500: '#5a9a6a',
          600: '#467c54',
          700: '#3a6345',
          800: '#324f3a',
          900: '#2a4231',
        },
        accent: {
          300: '#F4B860',
          400: '#f2a033',
          500: '#eb8114',
        },
        background: '#FBF9F7',
        surface: '#FFFFFF',
        'text-primary': '#2D3436',
        'text-secondary': '#636E72',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

## 4.4 src/app/globals.css

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-200;
  }

  html {
    @apply scroll-smooth;
  }

  body {
    @apply bg-background text-text-primary font-sans antialiased;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-primary-200 rounded-full;
  }
}

@layer components {
  .card {
    @apply bg-surface rounded-2xl shadow-soft p-6;
  }

  .btn-primary {
    @apply inline-flex items-center justify-center rounded-xl font-medium 
           bg-primary-500 text-white hover:bg-primary-600 
           transition-all duration-200 active:scale-95
           disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .input {
    @apply w-full px-4 py-3 rounded-xl border border-gray-200 bg-white 
           text-text-primary placeholder:text-text-secondary/50
           focus:outline-none focus:ring-2 focus:ring-primary-500/20 
           focus:border-primary-500 transition-all duration-200;
  }

  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

@layer utilities {
  .glass {
    @apply bg-white/80 backdrop-blur-lg;
  }

  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-400;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

---

# 5. SCHEMA DO BANCO DE DADOS

Execute este SQL no Supabase SQL Editor:

```sql
-- ==================== HABILITAR EXTENSÕES ====================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ENUMS ====================
CREATE TYPE user_phase AS ENUM ('PREGNANT', 'POSTPARTUM', 'ACTIVE');
CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK');
CREATE TYPE appointment_type AS ENUM ('PRENATAL', 'ULTRASOUND', 'EXAM', 'VACCINATION', 'OTHER');
CREATE TYPE bag_category AS ENUM ('MOM', 'BABY', 'DOCUMENTS', 'PARTNER');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'NEUTRAL');

-- ==================== TABELA DE USUÁRIOS ====================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  phone TEXT,
  
  -- Fase atual
  phase user_phase DEFAULT 'ACTIVE',
  
  -- Dados de gestação
  last_menstrual_date DATE,
  due_date DATE,
  is_first_pregnancy BOOLEAN,
  
  -- Dados de pós-parto
  baby_birth_date DATE,
  is_breastfeeding BOOLEAN,
  delivery_type TEXT,
  
  -- Objetivos e preferências
  goals TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  exercise_level TEXT DEFAULT 'beginner',
  
  -- Métricas
  height FLOAT,
  current_weight FLOAT,
  target_weight FLOAT,
  
  -- Ciclo menstrual
  cycle_length INT DEFAULT 28,
  last_period_date DATE,
  
  -- Configurações
  notifications_enabled BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TABELA DE REFEIÇÕES ====================
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  type meal_type NOT NULL,
  name TEXT,
  
  foods JSONB DEFAULT '[]',
  
  total_calories INT DEFAULT 0,
  total_protein FLOAT DEFAULT 0,
  total_carbs FLOAT DEFAULT 0,
  total_fat FLOAT DEFAULT 0,
  total_fiber FLOAT DEFAULT 0,
  
  image_url TEXT,
  ai_analysis JSONB,
  
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meals_user_date ON meals(user_id, date);

-- ==================== TABELA DE TREINOS ====================
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  duration INT,
  
  exercises JSONB DEFAULT '[]',
  
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  calories_burned INT,
  rating INT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user ON workouts(user_id, completed_at);

-- ==================== TABELA DE PROGRESSO ====================
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  date TIMESTAMPTZ DEFAULT NOW(),
  
  weight FLOAT,
  bust FLOAT,
  waist FLOAT,
  hips FLOAT,
  belly FLOAT,
  
  photo_url TEXT,
  notes TEXT,
  
  mood TEXT,
  energy_level INT,
  symptoms TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_user_date ON progress(user_id, date);

-- ==================== TABELA DE CONSULTAS ====================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  type appointment_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  doctor TEXT,
  clinic TEXT,
  address TEXT,
  
  date DATE NOT NULL,
  time TEXT NOT NULL,
  
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_minutes INT DEFAULT 1440,
  
  completed BOOLEAN DEFAULT false,
  results TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_date ON appointments(user_id, date);

-- ==================== TABELA DE SESSÕES DE CHAT ====================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  title TEXT,
  messages JSONB DEFAULT '[]',
  summary TEXT,
  message_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at);

-- ==================== TABELA DE MEMÓRIAS (PARA IA) ====================
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  importance FLOAT DEFAULT 0.5,
  
  embedding vector(768),
  
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id, type);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ==================== FUNÇÃO DE BUSCA VETORIAL ====================
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  type text,
  importance float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.type,
    m.importance,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = filter_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==================== TABELA DE LISTA DE COMPRAS ====================
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT,
  completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  checked BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TABELA DE NOMES DE BEBÊ ====================
CREATE TABLE baby_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  gender gender NOT NULL,
  origin TEXT,
  meaning TEXT,
  popularity INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE favorite_baby_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name_id UUID REFERENCES baby_names(id) ON DELETE CASCADE,
  
  liked BOOLEAN DEFAULT true,
  partner_liked BOOLEAN,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name_id)
);

-- ==================== TABELA DE MALA MATERNIDADE ====================
CREATE TABLE maternity_bag_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  category bag_category NOT NULL,
  item TEXT NOT NULL,
  quantity INT DEFAULT 1,
  packed BOOLEAN DEFAULT false,
  essential BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maternity_bag_user ON maternity_bag_items(user_id, category);

-- ==================== TABELA DE PARCEIRO ====================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES users(id),
  
  invite_email TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_accepted BOOLEAN DEFAULT false,
  
  notify_appointments BOOLEAN DEFAULT true,
  notify_progress BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== RLS (Row Level Security) ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_baby_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE maternity_bag_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (usuário vê apenas seus dados)
CREATE POLICY "Users own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own meals" ON meals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own progress" ON progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own chat" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own memories" ON memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own shopping" ON shopping_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own names" ON favorite_baby_names FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own bag" ON maternity_bag_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own partners" ON partners FOR ALL USING (auth.uid() = main_user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

# 6. LIB - UTILITÁRIOS E CONFIGURAÇÕES

## 6.1 src/lib/utils/cn.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## 6.2 src/lib/utils/constants.ts

```typescript
export const APP_NAME = 'MamãeFit AI'

export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Café da Manhã', emoji: '🌅' },
  { value: 'MORNING_SNACK', label: 'Lanche da Manhã', emoji: '🍎' },
  { value: 'LUNCH', label: 'Almoço', emoji: '🍽️' },
  { value: 'AFTERNOON_SNACK', label: 'Lanche da Tarde', emoji: '🥤' },
  { value: 'DINNER', label: 'Jantar', emoji: '🌙' },
  { value: 'EVENING_SNACK', label: 'Ceia', emoji: '🌜' },
] as const

export const PREGNANCY_WEEKS = Array.from({ length: 42 }, (_, i) => i + 1)

export const TRIMESTER_INFO = {
  1: { name: '1º Trimestre', weeks: '1-13', color: 'primary' },
  2: { name: '2º Trimestre', weeks: '14-26', color: 'secondary' },
  3: { name: '3º Trimestre', weeks: '27-40', color: 'accent' },
} as const

export const EXERCISE_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
] as const

export const DIETARY_RESTRICTIONS = [
  'Vegetariana',
  'Vegana',
  'Sem Glúten',
  'Sem Lactose',
  'Low Carb',
  'Diabética',
  'Hipertensa',
] as const
```

## 6.3 src/lib/supabase/client.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## 6.4 src/lib/supabase/server.ts

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
```

## 6.5 src/lib/supabase/middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rotas que requerem autenticação
  const protectedRoutes = ['/dashboard', '/nutrition', '/workout', '/chat', '/profile', '/progress', '/appointments']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirecionar usuário logado da página de login
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

## 6.6 src/middleware.ts

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

# 7. SISTEMA DE IA E MEMÓRIA

## 7.1 src/lib/ai/gemini.ts

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export const chatModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
})

export const embeddingModel = genAI.getGenerativeModel({
  model: 'text-embedding-004',
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}

export async function analyzeMealImage(
  imageBase64: string,
  userContext: {
    phase: string
    gestationWeek?: number
    restrictions: string[]
  }
) {
  const isPregnant = userContext.phase === 'PREGNANT'
  
  const prompt = `
Analise esta imagem de refeição e forneça informações nutricionais.

${isPregnant ? `
ATENÇÃO: A usuária é GESTANTE na ${userContext.gestationWeek}ª semana.
Verifique se algum alimento é contraindicado para gestantes.
Alimentos proibidos: peixes crus, carnes mal passadas, queijos não pasteurizados, embutidos, álcool.
` : ''}

${userContext.restrictions.length > 0 ? `Restrições alimentares: ${userContext.restrictions.join(', ')}` : ''}

Retorne APENAS JSON válido (sem markdown):
{
  "foods": [{"name": "nome", "portion": "porção", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFat": 0,
  "isSafeForPregnancy": true,
  "warnings": [],
  "suggestions": []
}
`

  const result = await chatModel.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ])

  const text = result.response.text()
  const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleanJson)
}

export async function generateWorkoutPlan(userProfile: {
  name: string
  phase: string
  gestationWeek?: number
  goals: string[]
  exerciseLevel: string
}) {
  const prompt = `
Crie um plano de treino semanal personalizado.

PERFIL:
- Nome: ${userProfile.name}
- Fase: ${userProfile.phase}
${userProfile.phase === 'PREGNANT' ? `- Semana: ${userProfile.gestationWeek}` : ''}
- Objetivos: ${userProfile.goals.join(', ')}
- Nível: ${userProfile.exerciseLevel}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Evitar exercícios deitada de costas após 1º trimestre
- Sem alto impacto
- Incluir assoalho pélvico
- Frequência cardíaca moderada
` : ''}

Retorne APENAS JSON:
{
  "name": "Nome do plano",
  "description": "Descrição",
  "sessions": [
    {
      "day": "Segunda",
      "focus": "Foco",
      "duration": 30,
      "exercises": [
        {"name": "Exercício", "sets": 3, "reps": 12, "rest": 60, "notes": ""}
      ]
    }
  ]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}

export async function generateMealPlan(userProfile: {
  name: string
  phase: string
  gestationWeek?: number
  goals: string[]
  restrictions: string[]
  isBreastfeeding?: boolean
}) {
  const prompt = `
Crie um plano alimentar semanal personalizado.

PERFIL:
- Nome: ${userProfile.name}
- Fase: ${userProfile.phase}
${userProfile.phase === 'PREGNANT' ? `- Semana: ${userProfile.gestationWeek}` : ''}
${userProfile.isBreastfeeding ? '- Amamentando: Sim' : ''}
- Objetivos: ${userProfile.goals.join(', ')}
- Restrições: ${userProfile.restrictions.length > 0 ? userProfile.restrictions.join(', ') : 'Nenhuma'}

${userProfile.phase === 'PREGNANT' ? `
REGRAS PARA GESTANTES:
- Aumentar 300-500 kcal no 2º/3º trimestre
- Priorizar: ácido fólico, ferro, cálcio, ômega-3
- Evitar: peixes de alto mercúrio, carnes cruas, álcool
` : ''}

${userProfile.isBreastfeeding ? `
REGRAS PARA AMAMENTAÇÃO:
- Adicionar ~500 kcal
- Manter hidratação
- Priorizar proteínas, cálcio, ferro
` : ''}

Retorne APENAS JSON:
{
  "dailyCalories": 2000,
  "dailyProtein": 80,
  "dailyCarbs": 250,
  "dailyFat": 65,
  "meals": [
    {
      "day": "Segunda",
      "breakfast": {"name": "descrição", "calories": 400},
      "morningSnack": {"name": "descrição", "calories": 150},
      "lunch": {"name": "descrição", "calories": 600},
      "afternoonSnack": {"name": "descrição", "calories": 150},
      "dinner": {"name": "descrição", "calories": 500}
    }
  ],
  "tips": ["dica 1", "dica 2"]
}
`

  const result = await chatModel.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}
```

## 7.2 src/lib/ai/memory-system.ts

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding, chatModel } from './gemini'

export interface UserContext {
  id: string
  name: string
  phase: 'PREGNANT' | 'POSTPARTUM' | 'ACTIVE'
  gestationWeek?: number
  goals: string[]
  restrictions: string[]
  isBreastfeeding?: boolean
}

export interface Memory {
  id: string
  content: string
  type: string
  importance: number
}

export async function getUserContext(userId: string): Promise<UserContext | null> {
  const supabase = await createServiceClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !data) return null
  
  let gestationWeek: number | undefined
  if (data.phase === 'PREGNANT' && data.last_menstrual_date) {
    const dum = new Date(data.last_menstrual_date)
    const today = new Date()
    const diffDays = Math.ceil((today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24))
    gestationWeek = Math.floor(diffDays / 7)
  }
  
  return {
    id: data.id,
    name: data.name,
    phase: data.phase,
    gestationWeek,
    goals: data.goals || [],
    restrictions: data.dietary_restrictions || [],
    isBreastfeeding: data.is_breastfeeding,
  }
}

export async function getRelevantMemories(
  userId: string,
  query: string,
  limit: number = 5
): Promise<Memory[]> {
  const supabase = await createServiceClient()
  
  try {
    const embedding = await generateEmbedding(query)
    
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: limit,
      filter_user_id: userId,
    })
    
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Erro ao buscar memórias:', err)
    return []
  }
}

export async function saveMemory(
  userId: string,
  content: string,
  type: string,
  importance: number = 0.5
): Promise<void> {
  const supabase = await createServiceClient()
  
  try {
    const embedding = await generateEmbedding(content)
    
    await supabase.from('memories').insert({
      user_id: userId,
      content,
      type,
      importance,
      embedding,
    })
  } catch (err) {
    console.error('Erro ao salvar memória:', err)
  }
}

export async function extractEntities(conversation: string) {
  const prompt = `
Analise esta conversa e extraia informações importantes.
Retorne APENAS JSON:
{
  "facts": ["fatos sobre a usuária"],
  "preferences": ["preferências mencionadas"],
  "healthInfo": ["informações de saúde"]
}

Conversa: ${conversation}
`

  try {
    const result = await chatModel.generateContent(prompt)
    const text = result.response.text()
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { facts: [], preferences: [], healthInfo: [] }
  }
}

export async function compressHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 10
) {
  if (messages.length <= maxMessages) {
    return { compressed: messages, summary: '' }
  }
  
  const recentMessages = messages.slice(-maxMessages)
  const oldMessages = messages.slice(0, -maxMessages)
  
  const conversationText = oldMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
  
  const prompt = `Resuma em 2-3 frases curtas: ${conversationText}`
  
  try {
    const result = await chatModel.generateContent(prompt)
    const summary = result.response.text()
    return { compressed: recentMessages, summary }
  } catch {
    return { compressed: recentMessages, summary: '' }
  }
}

export async function updateMemoriesFromConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const conversation = `Usuária: ${userMessage}\nAssistente: ${assistantResponse}`
  
  try {
    const entities = await extractEntities(conversation)
    
    for (const fact of entities.facts || []) {
      if (fact.trim()) await saveMemory(userId, fact, 'fact', 0.7)
    }
    for (const pref of entities.preferences || []) {
      if (pref.trim()) await saveMemory(userId, pref, 'preference', 0.9)
    }
    for (const health of entities.healthInfo || []) {
      if (health.trim()) await saveMemory(userId, health, 'health', 0.85)
    }
  } catch (err) {
    console.error('Erro ao atualizar memórias:', err)
  }
}

export async function saveChatMessage(
  userId: string,
  sessionId: string | null,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const supabase = await createServiceClient()
  
  if (sessionId) {
    await supabase
      .from('chat_sessions')
      .update({
        messages,
        message_count: messages.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
    return sessionId
  } else {
    const { data } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        messages,
        message_count: messages.length,
      })
      .select('id')
      .single()
    return data?.id || ''
  }
}
```

## 7.3 src/lib/ai/system-prompts.ts

```typescript
import { UserContext, Memory } from './memory-system'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PromptContext {
  user: UserContext
  memories: Memory[]
  currentDate: Date
}

function getTrimester(week: number): string {
  if (week <= 13) return '1º trimestre'
  if (week <= 26) return '2º trimestre'
  return '3º trimestre'
}

export function buildSystemPrompt(context: PromptContext): string {
  const { user, memories, currentDate } = context

  let prompt = `
Você é a Mia, assistente virtual de nutrição e bem-estar do MamãeFit.

# SUA PERSONALIDADE
- Carinhosa, acolhedora e empática como uma amiga próxima
- Fala de forma natural e descontraída, nunca robótica
- Usa emojis com moderação (1-2 por mensagem)
- Celebra conquistas e oferece apoio em dificuldades
- Explica termos técnicos de forma simples

# REGRAS DE CONVERSA
- Responda de forma concisa (máximo 3 parágrafos)
- Faça perguntas de acompanhamento quando relevante
- Personalize SEMPRE com base no contexto
- Use o nome dela naturalmente
- Para questões médicas específicas, sugira consultar profissional

# SOBRE A USUÁRIA
Nome: ${user.name}
`

  switch (user.phase) {
    case 'PREGNANT':
      prompt += `
Fase: Gestante 🤰
Semana: ${user.gestationWeek}ª semana (${getTrimester(user.gestationWeek!)})

DIRETRIZES PARA GESTANTES:
- Verifique se alimentos são seguros para gravidez
- Adapte exercícios ao trimestre
- Nutrientes: ácido fólico, ferro, cálcio, ômega-3
- Valide sintomas comuns, sugira médico para preocupações
- Celebre cada semana do desenvolvimento do bebê
- Alimentos proibidos: peixes crus, carnes mal passadas, queijos não pasteurizados, álcool
`
      break

    case 'POSTPARTUM':
      prompt += `
Fase: Pós-parto 🤱
${user.isBreastfeeding ? 'Está amamentando' : ''}

DIRETRIZES PARA PÓS-PARTO:
- Se amamentando, considere ~500kcal extras
- Exercícios de recuperação: assoalho pélvico, diástase
- Seja sensível sobre pressão de "voltar ao corpo de antes"
- Valide cansaço e dificuldades como normais
- Fique atenta a sinais de depressão pós-parto
`
      break

    case 'ACTIVE':
      prompt += `
Fase: Mulher ativa 💪
Objetivos: ${user.goals.length > 0 ? user.goals.join(', ') : 'Não especificados'}

DIRETRIZES PARA MULHERES ATIVAS:
- Adapte sugestões ao ciclo menstrual se ela acompanha
- Varie treinos para manter motivação
- Foque nos objetivos específicos
- Incentive progressão gradual
`
      break
  }

  if (user.restrictions && user.restrictions.length > 0) {
    prompt += `
RESTRIÇÕES ALIMENTARES: ${user.restrictions.join(', ')}
SEMPRE respeite essas restrições em qualquer sugestão.
`
  }

  if (memories && memories.length > 0) {
    prompt += `
O QUE VOCÊ SABE SOBRE ELA:
${memories.map((m) => `- ${m.content}`).join('\n')}
Use naturalmente sem mencionar que "lembra".
`
  }

  prompt += `
Data atual: ${format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}

IMPORTANTE:
- Nunca dê diagnósticos médicos
- Para emergências, instrua a ligar para o médico
- Mantenha tom positivo mas realista
`

  return prompt
}
```

---

# 8. API ROUTES

## 8.1 src/app/api/chat/route.ts

```typescript
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import {
  getUserContext,
  getRelevantMemories,
  compressHistory,
  updateMemoriesFromConversation,
  saveChatMessage,
} from '@/lib/ai/memory-system'
import { buildSystemPrompt } from '@/lib/ai/system-prompts'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return new Response('Não autorizado', { status: 401 })
    }
    
    const { messages, sessionId } = await req.json()
    const userId = authUser.id
    
    const userContext = await getUserContext(userId)
    if (!userContext) {
      return new Response('Usuário não encontrado', { status: 404 })
    }
    
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
    const relevantMemories = lastUserMessage 
      ? await getRelevantMemories(userId, lastUserMessage.content, 5)
      : []
    
    const { compressed, summary } = await compressHistory(messages, 15)
    
    const systemPrompt = buildSystemPrompt({
      user: userContext,
      memories: relevantMemories,
      currentDate: new Date(),
    })
    
    let contextualMessages = compressed
    if (summary) {
      contextualMessages = [
        { role: 'assistant' as const, content: `[Contexto: ${summary}]` },
        ...compressed,
      ]
    }
    
    const result = streamText({
      model: google('gemini-2.0-flash-exp'),
      system: systemPrompt,
      messages: contextualMessages,
      maxTokens: 1000,
      temperature: 0.7,
      onFinish: async ({ text }) => {
        const allMessages = [...messages, { role: 'assistant', content: text }]
        await saveChatMessage(userId, sessionId, allMessages)
        
        if (lastUserMessage) {
          await updateMemoriesFromConversation(userId, lastUserMessage.content, text)
        }
      },
    })
    
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Erro no chat:', error)
    return new Response('Erro interno', { status: 500 })
  }
}
```

## 8.2 src/app/api/nutrition/analyze/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeMealImage } from '@/lib/ai/gemini'
import { getUserContext } from '@/lib/ai/memory-system'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const formData = await req.formData()
    const image = formData.get('image') as File
    const mealType = formData.get('mealType') as string
    
    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 })
    }
    
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    
    const userContext = await getUserContext(user.id)
    if (!userContext) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    
    const analysis = await analyzeMealImage(base64, {
      phase: userContext.phase,
      gestationWeek: userContext.gestationWeek,
      restrictions: userContext.restrictions,
    })
    
    // Upload da imagem
    const fileName = `meals/${user.id}/${Date.now()}.jpg`
    await supabase.storage.from('images').upload(fileName, image)
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
    
    // Salvar refeição
    const { data: meal, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        type: mealType,
        foods: analysis.foods,
        total_calories: analysis.totalCalories,
        total_protein: analysis.totalProtein,
        total_carbs: analysis.totalCarbs,
        total_fat: analysis.totalFat,
        image_url: urlData.publicUrl,
        ai_analysis: {
          isSafeForPregnancy: analysis.isSafeForPregnancy,
          warnings: analysis.warnings,
          suggestions: analysis.suggestions,
        },
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, meal, analysis })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
```

## 8.3 src/app/api/nutrition/plan/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMealPlan } from '@/lib/ai/gemini'
import { getUserContext } from '@/lib/ai/memory-system'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const userContext = await getUserContext(user.id)
    if (!userContext) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    
    const plan = await generateMealPlan({
      name: userContext.name,
      phase: userContext.phase,
      gestationWeek: userContext.gestationWeek,
      goals: userContext.goals,
      restrictions: userContext.restrictions,
      isBreastfeeding: userContext.isBreastfeeding,
    })
    
    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 })
  }
}
```

## 8.4 src/app/api/workout/generate/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWorkoutPlan } from '@/lib/ai/gemini'
import { getUserContext } from '@/lib/ai/memory-system'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const userContext = await getUserContext(user.id)
    if (!userContext) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('exercise_level')
      .eq('id', user.id)
      .single()
    
    const plan = await generateWorkoutPlan({
      name: userContext.name,
      phase: userContext.phase,
      gestationWeek: userContext.gestationWeek,
      goals: userContext.goals,
      exerciseLevel: userData?.exercise_level || 'beginner',
    })
    
    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 })
  }
}
```

## 8.5 src/app/api/auth/register/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()
    const supabase = await createClient()
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
    
    if (authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        phase: 'ACTIVE',
        onboarding_completed: false,
      })
    }
    
    return NextResponse.json({ success: true, user: authData.user })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
```

## 8.6 src/app/api/auth/login/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    return NextResponse.json({ success: true, user: data.user, profile })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}
```

## 8.7 src/app/api/auth/logout/route.ts

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 })
  }
}
```

## 8.8 src/app/api/user/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    
    let gestationWeek: number | undefined
    if (profile.phase === 'PREGNANT' && profile.last_menstrual_date) {
      const dum = new Date(profile.last_menstrual_date)
      const diffDays = Math.ceil((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
      gestationWeek = Math.floor(diffDays / 7)
    }
    
    return NextResponse.json({ ...profile, gestationWeek })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const updates = await req.json()
    
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}
```

---

# 9. TYPES

## 9.1 src/types/index.ts

```typescript
export type UserPhase = 'PREGNANT' | 'POSTPARTUM' | 'ACTIVE'

export type MealType = 
  | 'BREAKFAST' 
  | 'MORNING_SNACK' 
  | 'LUNCH' 
  | 'AFTERNOON_SNACK' 
  | 'DINNER' 
  | 'EVENING_SNACK'

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  birth_date?: string
  phone?: string
  phase: UserPhase
  last_menstrual_date?: string
  due_date?: string
  is_first_pregnancy?: boolean
  baby_birth_date?: string
  is_breastfeeding?: boolean
  delivery_type?: string
  goals: string[]
  dietary_restrictions: string[]
  exercise_level?: string
  height?: number
  current_weight?: number
  target_weight?: number
  cycle_length?: number
  last_period_date?: string
  notifications_enabled: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  gestationWeek?: number
}

export interface Meal {
  id: string
  user_id: string
  type: MealType
  name?: string
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fiber?: number
  image_url?: string
  ai_analysis?: {
    isSafeForPregnancy: boolean
    warnings: string[]
    suggestions: string[]
  }
  date: string
  notes?: string
  created_at: string
}

export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Workout {
  id: string
  user_id: string
  name: string
  description?: string
  type?: string
  duration?: number
  exercises: Exercise[]
  completed: boolean
  started_at?: string
  completed_at?: string
  calories_burned?: number
  rating?: number
  notes?: string
  created_at: string
}

export interface Exercise {
  name: string
  sets?: number
  reps?: number
  duration?: number
  rest?: number
  notes?: string
}

export interface Progress {
  id: string
  user_id: string
  date: string
  weight?: number
  bust?: number
  waist?: number
  hips?: number
  belly?: number
  photo_url?: string
  notes?: string
  mood?: string
  energy_level?: number
  symptoms: string[]
  created_at: string
}

export interface Appointment {
  id: string
  user_id: string
  type: string
  title: string
  description?: string
  doctor?: string
  clinic?: string
  address?: string
  date: string
  time: string
  reminder_enabled: boolean
  reminder_minutes: number
  completed: boolean
  results?: string
  notes?: string
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSession {
  id: string
  user_id: string
  title?: string
  messages: ChatMessage[]
  summary?: string
  message_count: number
  created_at: string
  updated_at: string
}
```

---

# 10. HOOKS CUSTOMIZADOS

## 10.1 src/hooks/use-user.ts

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data: { user: auth } } = await supabase.auth.getUser()

        if (auth) {
          const response = await fetch('/api/user')
          if (response.ok) {
            const profile = await response.json()
            setUser(profile)
          }
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  const updateUser = async (updates: Partial<User>) => {
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        const updated = await response.json()
        setUser(updated)
        return updated
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return { user, isLoading, error, updateUser }
}
```

## 10.2 src/hooks/use-chat.ts

```typescript
'use client'

import { useChat as useVercelChat } from 'ai/react'
import { useUser } from './use-user'
import { useCallback, useState } from 'react'

export function useAIChat() {
  const { user } = useUser()
  const [isTyping, setIsTyping] = useState(false)

  const {
    messages,
    input,
    setInput,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    reload,
    stop,
    setMessages,
  } = useVercelChat({
    api: '/api/chat',
    body: { userId: user?.id },
    onResponse: () => setIsTyping(true),
    onFinish: () => setIsTyping(false),
    onError: () => setIsTyping(false),
  })

  const quickSuggestions = useCallback(() => {
    switch (user?.phase) {
      case 'PREGNANT':
        return [
          'O que posso comer hoje?',
          'Como está meu bebê esta semana?',
          'Qual exercício posso fazer?',
          'Estou sentindo enjoo',
        ]
      case 'POSTPARTUM':
        return [
          'Receita rápida para amamentação',
          'Exercício rápido com bebê',
          'Como perder peso amamentando?',
          'Estou muito cansada...',
        ]
      default:
        return [
          'Monte meu treino de hoje',
          'Sugestão de café da manhã',
          'Como acelerar o metabolismo?',
          'Receita low carb',
        ]
    }
  }, [user?.phase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) originalHandleSubmit(e)
  }

  const clearChat = () => setMessages([])

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isTyping,
    error,
    reload,
    stop,
    clearChat,
    quickSuggestions: quickSuggestions(),
  }
}
```

## 10.3 src/hooks/use-meals.ts

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Meal } from '@/types'

export function useMeals(date?: Date) {
  const { user } = useUser()
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const targetDate = date || new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  useEffect(() => {
    if (!user?.id) return

    const fetchMeals = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', `${dateStr}T00:00:00`)
          .lte('date', `${dateStr}T23:59:59`)
          .order('date', { ascending: true })

        if (error) throw error
        setMeals(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeals()
  }, [user?.id, dateStr])

  const dailyTotals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.total_calories,
      protein: acc.protein + meal.total_protein,
      carbs: acc.carbs + meal.total_carbs,
      fat: acc.fat + meal.total_fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const analyzeMeal = async (image: File, mealType: string) => {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('mealType', mealType)

    const response = await fetch('/api/nutrition/analyze', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) throw new Error('Erro ao analisar refeição')

    const result = await response.json()
    setMeals((prev) => [...prev, result.meal])
    return result
  }

  return { meals, dailyTotals, isLoading, error, analyzeMeal }
}
```

---

# 11. COMPONENTES UI BASE

## 11.1 src/components/ui/button.tsx

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500',
        secondary: 'bg-secondary-400 text-white hover:bg-secondary-500 focus-visible:ring-secondary-400',
        outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50',
        ghost: 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-13 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## 11.2 src/components/ui/input.tsx

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-white text-text-primary',
            'placeholder:text-text-secondary/50',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red-500' : 'border-gray-200',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

## 11.3 src/components/ui/card.tsx

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface rounded-2xl shadow-soft p-6',
        hover && 'transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 cursor-pointer',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-text-primary', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardContent }
```

## 11.4 src/components/ui/progress.tsx

```typescript
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils/cn'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-primary-100', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-full bg-primary-500 transition-all duration-500', indicatorClassName)}
        style={{ width: `${value || 0}%` }}
      />
    </ProgressPrimitive.Root>
  )
)
Progress.displayName = 'Progress'

export { Progress }
```

## 11.5 src/components/ui/avatar.tsx

```typescript
import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils/cn'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />
))
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary-600 font-medium', className)}
    {...props}
  />
))
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
```

## 11.6 src/components/ui/badge.tsx

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-700',
        secondary: 'bg-secondary-100 text-secondary-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

## 11.7 src/components/ui/skeleton.tsx

```typescript
import { cn } from '@/lib/utils/cn'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-gray-200', className)} {...props} />
}

export { Skeleton }
```

---

# 12. COMPONENTES DE LAYOUT

## 12.1 src/components/layout/bottom-nav.tsx

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Home, Apple, Dumbbell, MessageCircle, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Início' },
  { href: '/nutrition', icon: Apple, label: 'Nutrição' },
  { href: '/workout', icon: Dumbbell, label: 'Treino' },
  { href: '/chat', icon: MessageCircle, label: 'Mia' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-bottom lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center w-full h-full',
                'transition-colors duration-200',
                isActive ? 'text-primary-500' : 'text-text-secondary'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 w-12 h-1 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

## 12.2 src/components/layout/header.tsx

```typescript
'use client'

import { useUser } from '@/hooks/use-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, Settings } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  const { user } = useUser()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-text-secondary">{getGreeting()} 👋</p>
            <p className="font-semibold text-text-primary">{user?.name?.split(' ')[0]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-text-secondary" />
          </button>
          <Link href="/profile" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Settings className="h-5 w-5 text-text-secondary" />
          </Link>
        </div>
      </div>
    </header>
  )
}
```

## 12.3 src/components/layout/page-container.tsx

```typescript
import { cn } from '@/lib/utils/cn'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function PageContainer({ children, className, noPadding = false }: PageContainerProps) {
  return (
    <main className={cn('min-h-screen bg-background pb-20 lg:pb-8', !noPadding && 'px-4 py-6', className)}>
      {children}
    </main>
  )
}
```

---

# 13. COMPONENTES DO CHAT

## 13.1 src/components/chat/chat-container.tsx

```typescript
'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import { TypingIndicator } from './typing-indicator'
import { QuickSuggestions } from './quick-suggestions'
import { useAIChat } from '@/hooks/use-chat'

export function ChatContainer() {
  const { messages, input, setInput, handleSubmit, isLoading, isTyping, quickSuggestions } = useAIChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-4xl">🌸</span>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Olá! Eu sou a Mia 💚</h2>
            <p className="text-text-secondary max-w-sm mx-auto">
              Sua assistente de nutrição e bem-estar. Como posso te ajudar hoje?
            </p>
            <div className="mt-6">
              <QuickSuggestions suggestions={quickSuggestions} onSelect={setInput} />
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble key={index} role={message.role} content={message.content} />
          ))}
        </AnimatePresence>

        {isTyping && <TypingIndicator />}
      </div>

      {messages.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <QuickSuggestions suggestions={quickSuggestions.slice(0, 3)} onSelect={setInput} compact />
        </div>
      )}

      <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
```

## 13.2 src/components/chat/message-bubble.tsx

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@/hooks/use-user'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const { user } = useUser()
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={cn(isUser ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600')}>
          {isUser ? user?.name?.charAt(0).toUpperCase() : '🌸'}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl',
          isUser ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white shadow-soft rounded-bl-sm'
        )}
      >
        <p className={cn('text-sm leading-relaxed whitespace-pre-wrap', !isUser && 'text-text-primary')}>{content}</p>
      </div>
    </motion.div>
  )
}
```

## 13.3 src/components/chat/chat-input.tsx

```typescript
'use client'

import { useRef, FormEvent, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, Camera } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  isLoading: boolean
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit(e as any)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-end gap-2">
        <button type="button" className="p-3 rounded-xl text-text-secondary hover:bg-gray-100 transition-colors">
          <Camera className="h-5 w-5" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200',
              'bg-gray-50 text-text-primary placeholder:text-text-secondary/50',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'resize-none transition-all duration-200 max-h-[120px]'
            )}
            disabled={isLoading}
          />
          <button type="button" className="absolute right-3 bottom-3 p-1 text-text-secondary hover:text-primary-500">
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={!value.trim() || isLoading}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'p-3 rounded-xl transition-all duration-200',
            value.trim() && !isLoading
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-100 text-text-secondary cursor-not-allowed'
          )}
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>
    </form>
  )
}
```

## 13.4 src/components/chat/typing-indicator.tsx

```typescript
'use client'

import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary-100 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
      <div className="bg-white shadow-soft rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-300"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
```

## 13.5 src/components/chat/quick-suggestions.tsx

```typescript
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface QuickSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  compact?: boolean
}

export function QuickSuggestions({ suggestions, onSelect, compact = false }: QuickSuggestionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'justify-start' : 'justify-center')}>
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(suggestion)}
          className={cn(
            'px-4 py-2 rounded-full border-2 border-primary-200',
            'text-sm text-primary-600 font-medium',
            'hover:bg-primary-50 hover:border-primary-300',
            'transition-all duration-200 active:scale-95'
          )}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  )
}
```

---

# 14. COMPONENTES DO DASHBOARD

## 14.1 src/components/dashboard/pregnancy-tracker.tsx

```typescript
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useUser } from '@/hooks/use-user'
import { Baby, Calendar, Clock } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const BABY_SIZES: Record<number, { size: string; cm: number }> = {
  4: { size: 'semente de papoula', cm: 0.2 },
  8: { size: 'framboesa', cm: 1.6 },
  12: { size: 'limão', cm: 5.4 },
  16: { size: 'abacate', cm: 11.6 },
  20: { size: 'banana', cm: 25.6 },
  24: { size: 'espiga de milho', cm: 30 },
  28: { size: 'berinjela', cm: 37.6 },
  32: { size: 'abacaxi', cm: 43.7 },
  36: { size: 'mamão', cm: 47.4 },
  40: { size: 'melancia pequena', cm: 51.2 },
}

export function PregnancyTracker() {
  const { user } = useUser()

  if (user?.phase !== 'PREGNANT' || !user?.gestationWeek) return null

  const week = user.gestationWeek
  const trimester = week <= 13 ? 1 : week <= 26 ? 2 : 3
  const progress = Math.min((week / 40) * 100, 100)
  const daysRemaining = user.due_date ? differenceInDays(new Date(user.due_date), new Date()) : null

  const babySize = Object.entries(BABY_SIZES).reduce(
    (prev, [w, data]) => (parseInt(w) <= week ? data : prev),
    BABY_SIZES[4]
  )

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary-400 to-secondary-400 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Você está na</p>
            <p className="text-3xl font-bold">Semana {week}</p>
            <p className="text-sm opacity-90">{trimester}º Trimestre</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Baby className="h-8 w-8" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1 opacity-90">
            <span>Início</span>
            <span>{Math.round(progress)}%</span>
            <span>40 semanas</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" indicatorClassName="bg-white" />
        </div>
      </div>

      <CardContent className="p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-3 bg-primary-50 rounded-xl mb-4">
          <div className="text-4xl">🍉</div>
          <div>
            <p className="text-sm text-text-secondary">Seu bebê tem o tamanho de</p>
            <p className="font-semibold text-text-primary">{babySize.size}</p>
            <p className="text-xs text-text-secondary">~{babySize.cm}cm</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {daysRemaining !== null && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Clock className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-xs text-text-secondary">Faltam</p>
                <p className="font-semibold text-text-primary">
                  {daysRemaining > 0 ? `${daysRemaining} dias` : 'A qualquer momento!'}
                </p>
              </div>
            </div>
          )}

          {user.due_date && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Calendar className="h-5 w-5 text-secondary-500" />
              <div>
                <p className="text-xs text-text-secondary">DPP</p>
                <p className="font-semibold text-text-primary">
                  {format(new Date(user.due_date), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

## 14.2 src/components/dashboard/daily-summary.tsx

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Apple, Droplets, Dumbbell } from 'lucide-react'

interface DailySummaryProps {
  calories: { current: number; target: number }
  water: { current: number; target: number }
  workout: { completed: boolean; minutes: number }
}

export function DailySummary({ calories, water, workout }: DailySummaryProps) {
  const stats = [
    {
      icon: Apple,
      label: 'Calorias',
      current: calories.current,
      target: calories.target,
      unit: 'kcal',
      color: 'text-primary-500',
      bgColor: 'bg-primary-100',
    },
    {
      icon: Droplets,
      label: 'Água',
      current: water.current,
      target: water.target,
      unit: 'L',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Dumbbell,
      label: 'Treino',
      current: workout.minutes,
      target: 30,
      unit: 'min',
      color: 'text-secondary-500',
      bgColor: 'bg-secondary-100',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo do Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            const percentage = Math.min((stat.current / stat.target) * 100, 100)

            return (
              <div key={stat.label} className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">{stat.label}</span>
                    <span className="text-sm text-text-secondary">
                      {stat.current}/{stat.target} {stat.unit}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

## 14.3 src/components/dashboard/quick-actions.tsx

```typescript
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Camera, Utensils, Dumbbell, MessageCircle, Calendar, ShoppingCart, Baby, BookOpen } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

export function QuickActions() {
  const { user } = useUser()
  const isPregnant = user?.phase === 'PREGNANT'

  const actions = [
    { icon: Camera, label: 'Escanear Refeição', href: '/nutrition/scan', color: 'bg-primary-100 text-primary-600' },
    { icon: Dumbbell, label: 'Iniciar Treino', href: '/workout', color: 'bg-secondary-100 text-secondary-600' },
    { icon: MessageCircle, label: 'Falar com Mia', href: '/chat', color: 'bg-accent-100 text-accent-600' },
    { icon: Utensils, label: 'Plano Alimentar', href: '/nutrition', color: 'bg-blue-100 text-blue-600' },
    ...(isPregnant
      ? [
          { icon: Calendar, label: 'Consultas', href: '/appointments', color: 'bg-purple-100 text-purple-600' },
          { icon: Baby, label: 'Nomes', href: '/baby-names', color: 'bg-pink-100 text-pink-600' },
        ]
      : []),
    { icon: ShoppingCart, label: 'Lista Compras', href: '/shopping', color: 'bg-green-100 text-green-600' },
    { icon: BookOpen, label: 'Conteúdos', href: '/content', color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.slice(0, 8).map((action, index) => {
        const Icon = action.icon
        return (
          <motion.div key={action.href} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
            <Link href={action.href} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className={`p-3 rounded-xl ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs text-center text-text-secondary font-medium leading-tight">{action.label}</span>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
```

---

# 15. COMPONENTES SHARED

## 15.1 src/components/shared/loading-spinner.tsx

```typescript
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary-500', sizeClasses[size])} />
    </div>
  )
}
```

## 15.2 src/components/shared/empty-state.tsx

```typescript
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-text-secondary">{icon}</div>}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
```

---

# 16. PROVIDERS

## 16.1 src/providers/index.tsx

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

---

# 17. PÁGINAS DO APP

## 17.1 src/app/layout.tsx

```typescript
import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'MamãeFit AI',
  description: 'Nutrição e Treino personalizado para mulheres, mães e gestantes',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MamãeFit AI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E8A5B3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## 17.2 src/app/page.tsx

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

## 17.3 src/app/(auth)/layout.tsx

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-4xl">🌸</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">MamãeFit AI</h1>
          <p className="text-text-secondary">Nutrição e bem-estar personalizado</p>
        </div>
        {children}
      </div>
    </div>
  )
}
```

## 17.4 src/app/(auth)/login/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary-500 hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

## 17.5 src/app/(auth)/register/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="Nome"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Senha"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary-500 hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

## 17.6 src/app/(main)/layout.tsx

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {children}
      <BottomNav />
    </div>
  )
}
```

## 17.7 src/app/(main)/dashboard/page.tsx

```typescript
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout/page-container'
import { PregnancyTracker } from '@/components/dashboard/pregnancy-tracker'
import { DailySummary } from '@/components/dashboard/daily-summary'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: meals } = await supabase
    .from('meals')
    .select('total_calories')
    .eq('user_id', user?.id)
    .gte('date', `${today}T00:00:00`)
    .lte('date', `${today}T23:59:59`)

  const dailyCalories = meals?.reduce((sum, m) => sum + m.total_calories, 0) || 0

  const { data: workout } = await supabase
    .from('workouts')
    .select('duration, completed')
    .eq('user_id', user?.id)
    .gte('started_at', `${today}T00:00:00`)
    .single()

  return (
    <PageContainer>
      <div className="space-y-6">
        <PregnancyTracker />

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Ações Rápidas</h2>
          <QuickActions />
        </section>

        <DailySummary
          calories={{ current: dailyCalories, target: 2000 }}
          water={{ current: 1.2, target: 2.5 }}
          workout={{ completed: workout?.completed || false, minutes: workout?.duration || 0 }}
        />
      </div>
    </PageContainer>
  )
}
```

## 17.8 src/app/(main)/chat/page.tsx

```typescript
import { ChatContainer } from '@/components/chat/chat-container'

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatContainer />
    </div>
  )
}
```

## 17.9 src/app/(main)/nutrition/page.tsx

```typescript
'use client'

import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useMeals } from '@/hooks/use-meals'
import { Camera, Plus, Utensils } from 'lucide-react'
import Link from 'next/link'
import { MEAL_TYPES } from '@/lib/utils/constants'

export default function NutritionPage() {
  const { meals, dailyTotals, isLoading } = useMeals()

  const target = { calories: 2000, protein: 75, carbs: 250, fat: 65 }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Nutrição</h1>
          <Link href="/nutrition/scan">
            <Button size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Escanear
            </Button>
          </Link>
        </div>

        {/* Resumo de Macros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macros do Dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Calorias</span>
                <span className="text-sm text-text-secondary">
                  {dailyTotals.calories}/{target.calories} kcal
                </span>
              </div>
              <Progress value={(dailyTotals.calories / target.calories) * 100} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-xl font-bold text-blue-600">{dailyTotals.protein.toFixed(0)}g</p>
                <p className="text-xs text-text-secondary">Proteína</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-xl">
                <p className="text-xl font-bold text-yellow-600">{dailyTotals.carbs.toFixed(0)}g</p>
                <p className="text-xs text-text-secondary">Carbs</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <p className="text-xl font-bold text-orange-600">{dailyTotals.fat.toFixed(0)}g</p>
                <p className="text-xs text-text-secondary">Gordura</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refeições do dia */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Refeições</h2>
          <div className="space-y-3">
            {MEAL_TYPES.map((mealType) => {
              const meal = meals.find((m) => m.type === mealType.value)

              return (
                <Card key={mealType.value} hover>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mealType.emoji}</span>
                      <div>
                        <p className="font-medium text-text-primary">{mealType.label}</p>
                        {meal ? (
                          <p className="text-sm text-text-secondary">{meal.total_calories} kcal</p>
                        ) : (
                          <p className="text-sm text-text-secondary">Não registrado</p>
                        )}
                      </div>
                    </div>
                    <Link href="/nutrition/scan">
                      <Button variant="ghost" size="icon">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
```

## 17.10 src/app/(main)/nutrition/scan/page.tsx

```typescript
'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/page-container'
import { useMeals } from '@/hooks/use-meals'
import { MEAL_TYPES } from '@/lib/utils/constants'

export default function ScanMealPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedMealType, setSelectedMealType] = useState('LUNCH')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { analyzeMeal } = useMeals()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = () => setSelectedImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setIsAnalyzing(true)
    try {
      const analysisResult = await analyzeMeal(selectedFile, selectedMealType)
      setResult(analysisResult)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetScan = () => {
    setSelectedImage(null)
    setSelectedFile(null)
    setResult(null)
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Escanear Refeição 📸</h1>
          <p className="text-text-secondary">Tire uma foto e a IA vai analisar</p>
        </div>

        {/* Tipo de refeição */}
        <div>
          <p className="text-sm font-medium text-text-primary mb-2">Tipo de refeição:</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedMealType(type.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedMealType === type.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedImage ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card
                className="border-2 border-dashed border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary-500" />
                  </div>
                  <p className="text-text-primary font-medium mb-1">Toque para tirar foto</p>
                  <p className="text-sm text-text-secondary">JPG, PNG até 10MB</p>
                </div>
              </Card>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden">
                <img src={selectedImage} alt="Refeição" className="w-full h-64 object-cover" />
                <button onClick={resetScan} className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {result ? (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-text-primary">Análise completa!</span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-primary-50 rounded-xl">
                      <p className="text-xl font-bold text-primary-600">{result.analysis.totalCalories}</p>
                      <p className="text-xs text-text-secondary">kcal</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-xl font-bold text-blue-600">{result.analysis.totalProtein}g</p>
                      <p className="text-xs text-text-secondary">Prot</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-xl">
                      <p className="text-xl font-bold text-yellow-600">{result.analysis.totalCarbs}g</p>
                      <p className="text-xs text-text-secondary">Carbs</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-xl">
                      <p className="text-xl font-bold text-orange-600">{result.analysis.totalFat}g</p>
                      <p className="text-xs text-text-secondary">Gord</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Alimentos identificados:</p>
                    {result.analysis.foods.map((food: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm">{food.name} ({food.portion})</span>
                        <span className="text-sm font-medium text-text-secondary">{food.calories} kcal</span>
                      </div>
                    ))}
                  </div>

                  {result.analysis.warnings?.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
                      <p className="text-sm font-medium text-yellow-700 mb-1">⚠️ Atenção:</p>
                      {result.analysis.warnings.map((w: string, i: number) => (
                        <p key={i} className="text-sm text-yellow-600">• {w}</p>
                      ))}
                    </div>
                  )}

                  <Button onClick={resetScan} className="w-full mt-4">Escanear outra</Button>
                </Card>
              ) : (
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full" size="lg">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Analisando...
                    </>
                  ) : (
                    'Analisar Refeição'
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  )
}
```

## 17.11 src/app/(main)/workout/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, Play, Clock, Flame, Loader2 } from 'lucide-react'

export default function WorkoutPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [workout, setWorkout] = useState<any>(null)

  const generateWorkout = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/workout/generate', { method: 'POST' })
      const data = await response.json()
      setWorkout(data.plan)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Treino</h1>
          <Button onClick={generateWorkout} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Dumbbell className="h-4 w-4 mr-2" />
            )}
            Gerar Treino
          </Button>
        </div>

        {workout ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{workout.name}</CardTitle>
                <p className="text-sm text-text-secondary">{workout.description}</p>
              </CardHeader>
            </Card>

            {workout.sessions?.map((session: any, index: number) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">{session.day}</h3>
                      <p className="text-sm text-text-secondary">{session.focus}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {session.duration}min
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {session.exercises?.map((exercise: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-medium">{exercise.name}</span>
                        <span className="text-xs text-text-secondary">
                          {exercise.sets}x{exercise.reps || `${exercise.duration}s`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full mt-4" variant="secondary">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Treino
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Nenhum treino gerado</h3>
            <p className="text-text-secondary mb-4">Clique em "Gerar Treino" para criar seu plano personalizado</p>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
```

## 17.12 src/app/(main)/profile/page.tsx

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/use-user'
import { User, Settings, Bell, LogOut, ChevronRight, Heart, Calendar, ShoppingCart } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const phaseLabel = {
    PREGNANT: '🤰 Gestante',
    POSTPARTUM: '🤱 Pós-parto',
    ACTIVE: '💪 Ativa',
  }

  const menuItems = [
    { icon: User, label: 'Dados Pessoais', href: '/profile/personal' },
    { icon: Heart, label: 'Saúde e Objetivos', href: '/profile/health' },
    { icon: Calendar, label: 'Minhas Consultas', href: '/appointments' },
    { icon: ShoppingCart, label: 'Lista de Compras', href: '/shopping' },
    { icon: Bell, label: 'Notificações', href: '/profile/notifications' },
    { icon: Settings, label: 'Configurações', href: '/profile/settings' },
  ]

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header do Perfil */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="text-2xl">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-text-primary">{user?.name}</h1>
                <p className="text-text-secondary">{user?.email}</p>
                <Badge className="mt-2">{user?.phase && phaseLabel[user.phase]}</Badge>
              </div>
            </div>

            {user?.phase === 'PREGNANT' && user?.gestationWeek && (
              <div className="mt-4 p-3 bg-primary-50 rounded-xl">
                <p className="text-sm text-primary-700">
                  <span className="font-semibold">Semana {user.gestationWeek}</span> de gestação
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.href} hover onClick={() => router.push(item.href)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl">
                      <Icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <span className="font-medium text-text-primary">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Logout */}
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </PageContainer>
  )
}
```

---

# 18. ONBOARDING

## 18.1 src/app/onboarding/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

const PHASES = [
  { value: 'PREGNANT', label: 'Estou grávida 🤰', description: 'Acompanhamento gestacional completo' },
  { value: 'POSTPARTUM', label: 'Tive bebê recentemente 🤱', description: 'Recuperação pós-parto' },
  { value: 'ACTIVE', label: 'Sou mulher ativa 💪', description: 'Treinos e nutrição personalizados' },
]

const GOALS = [
  'Alimentação saudável',
  'Perder peso',
  'Ganhar massa muscular',
  'Mais energia',
  'Melhorar sono',
  'Reduzir estresse',
]

const RESTRICTIONS = [
  'Vegetariana',
  'Vegana',
  'Sem Glúten',
  'Sem Lactose',
  'Low Carb',
  'Diabética',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    phase: '',
    lastMenstrualDate: '',
    goals: [] as string[],
    restrictions: [] as string[],
    height: '',
    currentWeight: '',
  })

  const totalSteps = 4

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps - 1))
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
  }

  const handleFinish = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: formData.phase,
          last_menstrual_date: formData.lastMenstrualDate || null,
          goals: formData.goals,
          dietary_restrictions: formData.restrictions,
          height: formData.height ? parseFloat(formData.height) : null,
          current_weight: formData.currentWeight ? parseFloat(formData.currentWeight) : null,
          onboarding_completed: true,
        }),
      })

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Step 0: Fase */}
            {step === 0 && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-text-primary">Qual é a sua fase atual?</h1>
                <p className="text-text-secondary">Isso nos ajuda a personalizar sua experiência</p>

                <div className="space-y-3">
                  {PHASES.map((phase) => (
                    <Card
                      key={phase.value}
                      hover
                      onClick={() => setFormData({ ...formData, phase: phase.value })}
                      className={formData.phase === phase.value ? 'ring-2 ring-primary-500' : ''}
                    >
                      <CardContent className="p-4">
                        <p className="font-semibold text-text-primary">{phase.label}</p>
                        <p className="text-sm text-text-secondary">{phase.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Dados específicos */}
            {step === 1 && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-text-primary">
                  {formData.phase === 'PREGNANT' ? 'Dados da gestação' : 'Seus dados'}
                </h1>

                {formData.phase === 'PREGNANT' && (
                  <Input
                    type="date"
                    label="Data da última menstruação (DUM)"
                    value={formData.lastMenstrualDate}
                    onChange={(e) => setFormData({ ...formData, lastMenstrualDate: e.target.value })}
                  />
                )}

                <Input
                  type="number"
                  label="Altura (cm)"
                  placeholder="Ex: 165"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />

                <Input
                  type="number"
                  label="Peso atual (kg)"
                  placeholder="Ex: 65"
                  value={formData.currentWeight}
                  onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
                />
              </div>
            )}

            {/* Step 2: Objetivos */}
            {step === 2 && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-text-primary">Quais são seus objetivos?</h1>
                <p className="text-text-secondary">Selecione todos que se aplicam</p>

                <div className="flex flex-wrap gap-2">
                  {GOALS.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => setFormData({ ...formData, goals: toggleArrayItem(formData.goals, goal) })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.goals.includes(goal)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Restrições */}
            {step === 3 && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-text-primary">Alguma restrição alimentar?</h1>
                <p className="text-text-secondary">Selecione se houver (opcional)</p>

                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((restriction) => (
                    <button
                      key={restriction}
                      onClick={() =>
                        setFormData({ ...formData, restrictions: toggleArrayItem(formData.restrictions, restriction) })
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.restrictions.includes(restriction)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                    >
                      {restriction}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={prevStep} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {step < totalSteps - 1 ? (
            <Button onClick={nextStep} disabled={step === 0 && !formData.phase}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} isLoading={isLoading}>
              <Check className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

# 19. PWA E MANIFEST

## 19.1 src/app/manifest.ts

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MamãeFit AI',
    short_name: 'MamãeFit',
    description: 'Nutrição e Treino personalizado para mulheres, mães e gestantes',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF9F7',
    theme_color: '#E8A5B3',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
```

---

# 20. CHECKLIST FINAL

## 20.1 Verificar antes de rodar

- [ ] Criar projeto com `npx create-next-app@latest`
- [ ] Instalar todas as dependências
- [ ] Criar arquivo `.env.local` com credenciais
- [ ] Executar SQL no Supabase
- [ ] Criar estrutura de pastas
- [ ] Criar todos os arquivos na ordem apresentada

## 20.2 Comandos para rodar

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start
```

## 20.3 URLs do app

- `/` - Redireciona para login ou dashboard
- `/login` - Página de login
- `/register` - Página de cadastro
- `/onboarding` - Onboarding inicial
- `/dashboard` - Dashboard principal
- `/nutrition` - Módulo de nutrição
- `/nutrition/scan` - Escanear refeição
- `/workout` - Módulo de treino
- `/chat` - Chat com IA (Mia)
- `/progress` - Progresso e métricas
- `/appointments` - Consultas médicas
- `/profile` - Perfil do usuário

---

# FIM DO DOCUMENTO

Este documento contém TODAS as instruções necessárias para criar o MamãeFit AI do zero.
Siga cada seção na ordem e crie cada arquivo exatamente como especificado.

Para dúvidas ou problemas, verifique:
1. Se todas as dependências foram instaladas
2. Se as variáveis de ambiente estão corretas
3. Se o SQL foi executado no Supabase
4. Se a estrutura de pastas está correta
