-- ============================================================
-- VITAFIT - SCHEMA SQL COMPLETO
-- Execute este script inteiro no Supabase SQL Editor
-- ============================================================

-- ==================== EXTENSÕES ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== TIPOS ENUM ====================
DO $$ BEGIN
    CREATE TYPE user_phase AS ENUM ('PREGNANT', 'POSTPARTUM', 'ACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_type AS ENUM ('PRENATAL', 'ULTRASOUND', 'EXAM', 'VACCINATION', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bag_category AS ENUM ('MOM', 'BABY', 'DOCUMENTS', 'PARTNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'NEUTRAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('ARTICLE', 'VIDEO', 'PODCAST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workout_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== TABELA DE USUÁRIOS ====================
CREATE TABLE IF NOT EXISTS users (
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
  is_first_pregnancy BOOLEAN DEFAULT false,
  baby_gender gender,
  baby_name TEXT,

  -- Dados de pós-parto
  baby_birth_date DATE,
  is_breastfeeding BOOLEAN DEFAULT false,
  delivery_type TEXT,

  -- Ciclo menstrual (para ACTIVE)
  cycle_length INT DEFAULT 28,
  last_period_date DATE,
  track_cycle BOOLEAN DEFAULT false,

  -- Objetivos e preferências
  goals TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  exercise_level TEXT DEFAULT 'beginner',
  preferred_workout_time TEXT DEFAULT 'morning',
  workout_duration_preference INT DEFAULT 30,

  -- Métricas físicas
  height FLOAT,
  current_weight FLOAT,
  target_weight FLOAT,
  initial_weight FLOAT,

  -- Configurações
  notifications_enabled BOOLEAN DEFAULT true,
  notification_meals BOOLEAN DEFAULT true,
  notification_workout BOOLEAN DEFAULT true,
  notification_water BOOLEAN DEFAULT true,
  notification_appointments BOOLEAN DEFAULT true,

  -- Controle
  onboarding_completed BOOLEAN DEFAULT false,
  premium BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'pt-BR',
  theme TEXT DEFAULT 'light',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TABELA DE REFEIÇÕES ====================
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  type meal_type NOT NULL,
  name TEXT,
  description TEXT,

  -- Alimentos (JSON array)
  foods JSONB DEFAULT '[]',

  -- Totais nutricionais
  total_calories INT DEFAULT 0,
  total_protein FLOAT DEFAULT 0,
  total_carbs FLOAT DEFAULT 0,
  total_fat FLOAT DEFAULT 0,
  total_fiber FLOAT DEFAULT 0,
  total_sodium FLOAT DEFAULT 0,

  -- Imagem e análise
  image_url TEXT,
  ai_analysis JSONB,

  -- Metadata
  date DATE DEFAULT CURRENT_DATE,
  time TIME DEFAULT CURRENT_TIME,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_type ON meals(type);

-- ==================== TABELA DE PLANOS ALIMENTARES ====================
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Metas diárias
  daily_calories INT DEFAULT 2000,
  daily_protein FLOAT DEFAULT 75,
  daily_carbs FLOAT DEFAULT 250,
  daily_fat FLOAT DEFAULT 65,
  daily_fiber FLOAT DEFAULT 25,

  -- Plano semanal (JSON)
  weekly_plan JSONB DEFAULT '{}',

  -- Controle
  is_active BOOLEAN DEFAULT true,
  generated_by_ai BOOLEAN DEFAULT true,

  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user ON nutrition_plans(user_id, is_active);

-- ==================== TABELA DE RECEITAS ====================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Categorização
  category TEXT,
  cuisine TEXT,
  difficulty TEXT DEFAULT 'easy',

  -- Tempo
  prep_time INT DEFAULT 0,
  cook_time INT DEFAULT 0,
  total_time INT DEFAULT 0,

  -- Porções
  servings INT DEFAULT 1,

  -- Ingredientes e instruções (JSON)
  ingredients JSONB DEFAULT '[]',
  instructions JSONB DEFAULT '[]',

  -- Nutrição por porção
  calories_per_serving INT DEFAULT 0,
  protein_per_serving FLOAT DEFAULT 0,
  carbs_per_serving FLOAT DEFAULT 0,
  fat_per_serving FLOAT DEFAULT 0,

  -- Imagem
  image_url TEXT,

  -- Flags
  is_public BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  suitable_for_pregnancy BOOLEAN DEFAULT true,
  suitable_for_postpartum BOOLEAN DEFAULT true,

  -- Tags
  tags TEXT[] DEFAULT '{}',
  dietary_tags TEXT[] DEFAULT '{}',

  -- Avaliação
  rating FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_public ON recipes(is_public);

-- ==================== TABELA DE RECEITAS FAVORITAS ====================
CREATE TABLE IF NOT EXISTS favorite_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, recipe_id)
);

-- ==================== TABELA DE PLANOS DE TREINO ====================
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Configuração
  duration_weeks INT DEFAULT 4,
  sessions_per_week INT DEFAULT 3,
  difficulty TEXT DEFAULT 'beginner',
  focus TEXT,

  -- Plano (JSON com sessões por dia da semana)
  weekly_schedule JSONB DEFAULT '{}',

  -- Controle
  is_active BOOLEAN DEFAULT true,
  generated_by_ai BOOLEAN DEFAULT true,

  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON workout_plans(user_id, is_active);

-- ==================== TABELA DE TREINOS (SESSÕES) ====================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  type TEXT,

  -- Tempo
  estimated_duration INT DEFAULT 30,
  actual_duration INT,

  -- Exercícios (JSON array)
  exercises JSONB DEFAULT '[]',

  -- Status
  status workout_status DEFAULT 'PENDING',
  scheduled_date DATE,
  scheduled_time TIME,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Resultados
  calories_burned INT DEFAULT 0,
  rating INT,
  notes TEXT,
  mood_before TEXT,
  mood_after TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);

-- ==================== TABELA DE EXERCÍCIOS (BIBLIOTECA) ====================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  description TEXT,

  -- Categorização
  muscle_group TEXT,
  category TEXT,
  equipment TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'beginner',

  -- Mídia
  image_url TEXT,
  video_url TEXT,
  gif_url TEXT,

  -- Instruções
  instructions TEXT[] DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',

  -- Flags de segurança
  safe_for_pregnancy BOOLEAN DEFAULT true,
  safe_first_trimester BOOLEAN DEFAULT true,
  safe_second_trimester BOOLEAN DEFAULT true,
  safe_third_trimester BOOLEAN DEFAULT true,
  safe_postpartum BOOLEAN DEFAULT true,
  postpartum_weeks_required INT DEFAULT 0,

  -- Metadata
  calories_per_minute FLOAT DEFAULT 5,
  met_value FLOAT DEFAULT 3.5,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

-- ==================== TABELA DE PROGRESSO ====================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  date DATE DEFAULT CURRENT_DATE,

  -- Medidas
  weight FLOAT,
  bust FLOAT,
  waist FLOAT,
  hips FLOAT,
  belly FLOAT,
  arm FLOAT,
  thigh FLOAT,

  -- Foto
  photo_url TEXT,
  photo_type TEXT,

  -- Estado
  mood TEXT,
  energy_level INT,
  sleep_quality INT,
  stress_level INT,

  -- Sintomas (especialmente para gestantes)
  symptoms TEXT[] DEFAULT '{}',

  -- Hidratação
  water_intake FLOAT DEFAULT 0,

  -- Notas
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_user_date ON progress(user_id, date);

-- ==================== TABELA DE CONSULTAS/APPOINTMENTS ====================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  type appointment_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Profissional
  doctor TEXT,
  specialty TEXT,

  -- Local
  clinic TEXT,
  address TEXT,
  phone TEXT,

  -- Data e hora
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,

  -- Lembrete
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_minutes INT DEFAULT 1440,

  -- Status
  completed BOOLEAN DEFAULT false,
  cancelled BOOLEAN DEFAULT false,

  -- Resultados
  results TEXT,
  attachments TEXT[] DEFAULT '{}',

  -- Notas
  notes TEXT,
  questions TEXT[] DEFAULT '{}',

  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);

-- ==================== TABELA DE SESSÕES DE CHAT ====================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  title TEXT,

  -- Mensagens (JSON array)
  messages JSONB DEFAULT '[]',

  -- Resumo para contexto
  summary TEXT,

  -- Contadores
  message_count INT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at);

-- ==================== TABELA DE MEMÓRIAS (IA) ====================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Conteúdo
  content TEXT NOT NULL,
  type TEXT NOT NULL,

  -- Importância (0-1)
  importance FLOAT DEFAULT 0.5,

  -- Embedding para busca vetorial
  embedding vector(768),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  source TEXT,

  -- Expiração (opcional)
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ==================== TABELA DE LISTA DE COMPRAS ====================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  name TEXT DEFAULT 'Minha Lista',

  -- Status
  completed BOOLEAN DEFAULT false,

  -- Gerado de
  generated_from_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);

-- ==================== TABELA DE ITENS DA LISTA DE COMPRAS ====================
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  category TEXT,

  checked BOOLEAN DEFAULT false,

  -- Preço estimado
  estimated_price FLOAT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);

-- ==================== TABELA DE NOMES DE BEBÊ ====================
CREATE TABLE IF NOT EXISTS baby_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  gender gender NOT NULL,

  origin TEXT,
  meaning TEXT,

  popularity INT DEFAULT 0,

  -- Características
  syllables INT,
  starts_with TEXT,
  ends_with TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baby_names_gender ON baby_names(gender);
CREATE INDEX IF NOT EXISTS idx_baby_names_popularity ON baby_names(popularity);

-- ==================== TABELA DE NOMES FAVORITOS ====================
CREATE TABLE IF NOT EXISTS favorite_baby_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name_id UUID REFERENCES baby_names(id) ON DELETE CASCADE NOT NULL,

  liked BOOLEAN DEFAULT true,
  partner_liked BOOLEAN,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_names_user ON favorite_baby_names(user_id);

-- ==================== TABELA DE MALA MATERNIDADE ====================
CREATE TABLE IF NOT EXISTS maternity_bag_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  category bag_category NOT NULL,
  item TEXT NOT NULL,

  quantity INT DEFAULT 1,
  packed BOOLEAN DEFAULT false,
  essential BOOLEAN DEFAULT true,

  notes TEXT,

  -- Ordem de exibição
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maternity_bag_user ON maternity_bag_items(user_id, category);

-- ==================== TABELA DE PARCEIRO ====================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  partner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Convite
  invite_email TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_sent_at TIMESTAMPTZ DEFAULT NOW(),
  invite_accepted BOOLEAN DEFAULT false,
  invite_accepted_at TIMESTAMPTZ,

  -- Nome do parceiro (antes de aceitar)
  partner_name TEXT,

  -- Permissões
  can_view_progress BOOLEAN DEFAULT true,
  can_view_appointments BOOLEAN DEFAULT true,
  can_view_meals BOOLEAN DEFAULT false,
  can_view_workouts BOOLEAN DEFAULT false,
  can_edit_appointments BOOLEAN DEFAULT false,
  can_edit_shopping BOOLEAN DEFAULT true,
  can_edit_baby_names BOOLEAN DEFAULT true,
  can_edit_maternity_bag BOOLEAN DEFAULT true,

  -- Notificações
  notify_appointments BOOLEAN DEFAULT true,
  notify_progress BOOLEAN DEFAULT true,
  notify_weekly_summary BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_main_user ON partners(main_user_id);
CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(invite_code);

-- ==================== TABELA DE CONTEÚDO EDUCATIVO ====================
CREATE TABLE IF NOT EXISTS educational_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT,
  content TEXT,

  -- Tipo
  type content_type DEFAULT 'ARTICLE',

  -- Categorização
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',

  -- Fase alvo
  target_phase user_phase[],
  target_trimester INT[],
  postpartum_week_min INT,
  postpartum_week_max INT,

  -- Mídia
  image_url TEXT,
  video_url TEXT,
  audio_url TEXT,

  -- Tempo
  read_time INT,
  video_duration INT,

  -- Autor
  author TEXT,
  source TEXT,
  source_url TEXT,

  -- Status
  is_published BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,

  -- Ordem
  sort_order INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_category ON educational_content(category);
CREATE INDEX IF NOT EXISTS idx_content_type ON educational_content(type);

-- ==================== TABELA DE PROGRESSO DE CONTEÚDO ====================
CREATE TABLE IF NOT EXISTS user_content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES educational_content(id) ON DELETE CASCADE NOT NULL,

  -- Status
  started BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,

  -- Progresso (para vídeos)
  progress_percent INT DEFAULT 0,
  last_position INT DEFAULT 0,

  -- Datas
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Avaliação
  rating INT,

  -- Favorito
  is_favorite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, content_id)
);

-- ==================== TABELA DE ÁGUA/HIDRATAÇÃO ====================
CREATE TABLE IF NOT EXISTS water_intake (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  date DATE DEFAULT CURRENT_DATE,

  -- Quantidade em ml
  amount INT NOT NULL,

  -- Hora do registro
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_intake(user_id, date);

-- ==================== TABELA DE METAS DIÁRIAS ====================
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  date DATE DEFAULT CURRENT_DATE,

  -- Metas
  calories_goal INT DEFAULT 2000,
  protein_goal FLOAT DEFAULT 75,
  water_goal FLOAT DEFAULT 2.5,
  workout_goal BOOLEAN DEFAULT true,
  steps_goal INT DEFAULT 8000,

  -- Realizados
  calories_consumed INT DEFAULT 0,
  protein_consumed FLOAT DEFAULT 0,
  water_consumed FLOAT DEFAULT 0,
  workout_completed BOOLEAN DEFAULT false,
  steps_taken INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date);

-- ==================== FUNÇÕES ====================

-- Função de busca vetorial de memórias
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

-- Função de busca híbrida (vetorial + keyword)
CREATE OR REPLACE FUNCTION hybrid_search_memories(
  query_embedding vector(768),
  query_text text,
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  type text,
  importance float,
  similarity float,
  keyword_match boolean
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
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.content ILIKE '%' || query_text || '%' AS keyword_match
  FROM memories m
  WHERE m.user_id = filter_user_id
    AND m.embedding IS NOT NULL
    AND (
      1 - (m.embedding <=> query_embedding) > match_threshold
      OR m.content ILIKE '%' || query_text || '%'
    )
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY
    CASE WHEN m.content ILIKE '%' || query_text || '%' THEN 0 ELSE 1 END,
    m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para calcular semana gestacional
CREATE OR REPLACE FUNCTION calculate_gestation_week(last_menstrual_date DATE)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
  IF last_menstrual_date IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN FLOOR((CURRENT_DATE - last_menstrual_date) / 7);
END;
$$;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGERS ====================

-- Triggers para updated_at
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS nutrition_plans_updated_at ON nutrition_plans;
CREATE TRIGGER nutrition_plans_updated_at BEFORE UPDATE ON nutrition_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS workout_plans_updated_at ON workout_plans;
CREATE TRIGGER workout_plans_updated_at BEFORE UPDATE ON workout_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS recipes_updated_at ON recipes;
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS daily_goals_updated_at ON daily_goals;
CREATE TRIGGER daily_goals_updated_at BEFORE UPDATE ON daily_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE user_content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (usuário vê apenas seus dados)
DROP POLICY IF EXISTS "Users own data" ON users;
CREATE POLICY "Users own data" ON users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users own meals" ON meals;
CREATE POLICY "Users own meals" ON meals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own nutrition plans" ON nutrition_plans;
CREATE POLICY "Users own nutrition plans" ON nutrition_plans FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own recipes" ON recipes;
CREATE POLICY "Users own recipes" ON recipes FOR ALL USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users own favorite recipes" ON favorite_recipes;
CREATE POLICY "Users own favorite recipes" ON favorite_recipes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own workout plans" ON workout_plans;
CREATE POLICY "Users own workout plans" ON workout_plans FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own workouts" ON workouts;
CREATE POLICY "Users own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own progress" ON progress;
CREATE POLICY "Users own progress" ON progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own appointments" ON appointments;
CREATE POLICY "Users own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own chat" ON chat_sessions;
CREATE POLICY "Users own chat" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own memories" ON memories;
CREATE POLICY "Users own memories" ON memories FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own shopping lists" ON shopping_lists;
CREATE POLICY "Users own shopping lists" ON shopping_lists FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own shopping items" ON shopping_items;
CREATE POLICY "Users own shopping items" ON shopping_items FOR ALL USING (
  EXISTS (SELECT 1 FROM shopping_lists WHERE id = list_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users own favorite names" ON favorite_baby_names;
CREATE POLICY "Users own favorite names" ON favorite_baby_names FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own bag items" ON maternity_bag_items;
CREATE POLICY "Users own bag items" ON maternity_bag_items FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own partners" ON partners;
CREATE POLICY "Users own partners" ON partners FOR ALL USING (auth.uid() = main_user_id OR auth.uid() = partner_user_id);

DROP POLICY IF EXISTS "Users own content progress" ON user_content_progress;
CREATE POLICY "Users own content progress" ON user_content_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own water intake" ON water_intake;
CREATE POLICY "Users own water intake" ON water_intake FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own daily goals" ON daily_goals;
CREATE POLICY "Users own daily goals" ON daily_goals FOR ALL USING (auth.uid() = user_id);

-- Tabelas públicas (leitura)
DROP POLICY IF EXISTS "Anyone can read baby names" ON baby_names;
CREATE POLICY "Anyone can read baby names" ON baby_names FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read exercises" ON exercises;
CREATE POLICY "Anyone can read exercises" ON exercises FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read educational content" ON educational_content;
CREATE POLICY "Anyone can read educational content" ON educational_content FOR SELECT USING (is_published = true);

-- ==================== DADOS INICIAIS ====================

-- Inserir nomes de bebê populares
INSERT INTO baby_names (name, gender, origin, meaning, popularity, syllables) VALUES
-- Femininos
('Sofia', 'FEMALE', 'Grego', 'Sabedoria', 1, 3),
('Helena', 'FEMALE', 'Grego', 'Luz brilhante, tocha', 2, 3),
('Alice', 'FEMALE', 'Germânico', 'De linhagem nobre', 3, 3),
('Laura', 'FEMALE', 'Latim', 'Loureiro, vitoriosa', 4, 2),
('Valentina', 'FEMALE', 'Latim', 'Valente, forte, vigorosa', 5, 4),
('Maria', 'FEMALE', 'Hebraico', 'Senhora soberana, a pura', 6, 3),
('Júlia', 'FEMALE', 'Latim', 'Jovem, filha de Júpiter', 7, 3),
('Cecília', 'FEMALE', 'Latim', 'Cega (metafórico: guiada pela fé)', 8, 4),
('Manuela', 'FEMALE', 'Hebraico', 'Deus está conosco', 9, 4),
('Isabella', 'FEMALE', 'Hebraico', 'Consagrada a Deus', 10, 4),
('Luísa', 'FEMALE', 'Germânico', 'Guerreira gloriosa', 11, 3),
('Heloísa', 'FEMALE', 'Germânico', 'Saudável, de boa saúde', 12, 4),
('Lívia', 'FEMALE', 'Latim', 'Pálida, lívida', 13, 3),
('Clara', 'FEMALE', 'Latim', 'Brilhante, ilustre', 14, 2),
('Antonella', 'FEMALE', 'Latim', 'Valiosa, inestimável', 15, 4),
-- Masculinos
('Miguel', 'MALE', 'Hebraico', 'Quem é como Deus?', 1, 2),
('Arthur', 'MALE', 'Celta', 'Urso, nobre, corajoso', 2, 2),
('Heitor', 'MALE', 'Grego', 'Aquele que guarda, defensor', 3, 2),
('Theo', 'MALE', 'Grego', 'Deus, divino', 4, 2),
('Davi', 'MALE', 'Hebraico', 'Amado, querido', 5, 2),
('Gabriel', 'MALE', 'Hebraico', 'Homem de Deus, força de Deus', 6, 3),
('Bernardo', 'MALE', 'Germânico', 'Forte como urso', 7, 3),
('Samuel', 'MALE', 'Hebraico', 'Ouvido por Deus', 8, 3),
('Lucas', 'MALE', 'Grego', 'Luminoso, iluminado', 9, 2),
('Noah', 'MALE', 'Hebraico', 'Descanso, conforto', 10, 2),
('Pedro', 'MALE', 'Grego', 'Pedra, rocha', 11, 2),
('Lorenzo', 'MALE', 'Latim', 'Natural de Laurento', 12, 3),
('Henrique', 'MALE', 'Germânico', 'Senhor do lar', 13, 3),
('Matheus', 'MALE', 'Hebraico', 'Presente de Deus', 14, 3),
('Benjamin', 'MALE', 'Hebraico', 'Filho da felicidade', 15, 3),
-- Neutros
('Ariel', 'NEUTRAL', 'Hebraico', 'Leão de Deus', 1, 3),
('Angel', 'NEUTRAL', 'Grego', 'Mensageiro', 2, 2),
('Eden', 'NEUTRAL', 'Hebraico', 'Paraíso, delícia', 3, 2),
('Jordan', 'NEUTRAL', 'Hebraico', 'Aquele que desce', 4, 2),
('Sam', 'NEUTRAL', 'Hebraico', 'Ouvido por Deus', 5, 1)
ON CONFLICT DO NOTHING;

-- Inserir alguns exercícios básicos
INSERT INTO exercises (name, description, muscle_group, category, difficulty, safe_for_pregnancy, instructions) VALUES
('Caminhada', 'Caminhada em ritmo moderado', 'Cardio', 'Aeróbico', 'beginner', true, ARRAY['Mantenha postura ereta', 'Passos firmes e regulares', 'Respire naturalmente']),
('Agachamento', 'Agachamento com peso corporal', 'Pernas', 'Força', 'beginner', true, ARRAY['Pés na largura dos ombros', 'Desça como se fosse sentar', 'Mantenha joelhos alinhados com os pés']),
('Alongamento de Quadril', 'Alongamento para flexibilidade do quadril', 'Quadril', 'Alongamento', 'beginner', true, ARRAY['Sente em posição de borboleta', 'Pressione joelhos suavemente', 'Mantenha por 30 segundos']),
('Kegel', 'Exercícios para assoalho pélvico', 'Assoalho Pélvico', 'Fortalecimento', 'beginner', true, ARRAY['Contraia os músculos do assoalho pélvico', 'Mantenha por 5 segundos', 'Relaxe por 5 segundos', 'Repita 10 vezes']),
('Ponte', 'Elevação de quadril deitada', 'Glúteos', 'Força', 'beginner', true, ARRAY['Deite de costas com joelhos flexionados', 'Eleve o quadril contraindo glúteos', 'Mantenha por 3 segundos', 'Desça lentamente']),
('Cat-Cow', 'Alongamento de coluna em quatro apoios', 'Coluna', 'Alongamento', 'beginner', true, ARRAY['Fique em quatro apoios', 'Arqueie as costas para cima (gato)', 'Arqueie para baixo (vaca)', 'Alterne suavemente']),
('Respiração Diafragmática', 'Exercício de respiração profunda', 'Core', 'Respiração', 'beginner', true, ARRAY['Sente confortavelmente', 'Inspire expandindo o abdômen', 'Expire lentamente', 'Repita por 5 minutos'])
ON CONFLICT DO NOTHING;

-- ==================== STORAGE POLICIES ====================

-- Políticas para bucket 'images' (público)
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para bucket 'progress-photos' (privado)
DROP POLICY IF EXISTS "Users can view own progress photos" ON storage.objects;
CREATE POLICY "Users can view own progress photos" ON storage.objects
FOR SELECT USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload own progress photos" ON storage.objects;
CREATE POLICY "Users can upload own progress photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own progress photos" ON storage.objects;
CREATE POLICY "Users can delete own progress photos" ON storage.objects
FOR DELETE USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para bucket 'recipes' (público)
DROP POLICY IF EXISTS "Anyone can view recipe images" ON storage.objects;
CREATE POLICY "Anyone can view recipe images" ON storage.objects
FOR SELECT USING (bucket_id = 'recipes');

DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;
CREATE POLICY "Authenticated users can upload recipe images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'recipes' AND auth.role() = 'authenticated');

-- ==================== FIM DO SCHEMA ====================
