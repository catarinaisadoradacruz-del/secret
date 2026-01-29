# 🌸 VITAFIT - DOCUMENTO 4: MELHORIAS AVANÇADAS
## Funcionalidades Premium + Integrações Completas

**Este documento adiciona funcionalidades avançadas ao VitaFit.**

---

# ÍNDICE COMPLETO

1. [SQL Adicional - Novas Tabelas](#1-sql-adicional---novas-tabelas)
2. [Configuração Firebase (Push Notifications)](#2-configuração-firebase-push-notifications)
3. [Sistema de Notificações Push](#3-sistema-de-notificações-push)
4. [Sistema de Gamificação Completo](#4-sistema-de-gamificação-completo)
5. [Desenvolvimento do Bebê Semana a Semana](#5-desenvolvimento-do-bebê-semana-a-semana)
6. [Scanner de Código de Barras](#6-scanner-de-código-de-barras)
7. [Geração de Relatórios PDF](#7-geração-de-relatórios-pdf)
8. [Contador de Contrações](#8-contador-de-contrações)
9. [Controle de Suplementos e Medicamentos](#9-controle-de-suplementos-e-medicamentos)
10. [Diário de Fotos da Barriga](#10-diário-de-fotos-da-barriga)
11. [Meditações e Relaxamento](#11-meditações-e-relaxamento)
12. [Monitoramento de Sono](#12-monitoramento-de-sono)
13. [Integração com Wearables](#13-integração-com-wearables)
14. [Chat por Voz com a Mia](#14-chat-por-voz-com-a-mia)
15. [Comunidade e Fórum](#15-comunidade-e-fórum)
16. [Widgets PWA](#16-widgets-pwa)
17. [IA Avançada - Análise de Humor](#17-ia-avançada---análise-de-humor)
18. [Checklist de Implementação](#18-checklist-de-implementação)

---

# 1. SQL ADICIONAL - NOVAS TABELAS

Execute este SQL no Supabase para adicionar as tabelas das novas funcionalidades:

```sql
-- ============================================================
-- VITAFIT - MELHORIAS AVANÇADAS - SQL ADICIONAL
-- Execute APÓS o SQL do Documento 3
-- ============================================================

-- ==================== NOVOS TIPOS ENUM ====================

DO $$ BEGIN
    CREATE TYPE achievement_type AS ENUM ('STREAK', 'MILESTONE', 'CHALLENGE', 'SPECIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('MEAL', 'WATER', 'WORKOUT', 'APPOINTMENT', 'MEDICATION', 'TIP', 'ACHIEVEMENT', 'CONTRACTION', 'PARTNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contraction_phase AS ENUM ('EARLY', 'ACTIVE', 'TRANSITION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mood_type AS ENUM ('GREAT', 'GOOD', 'OKAY', 'LOW', 'BAD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('QUESTION', 'STORY', 'TIP', 'PHOTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================== GAMIFICAÇÃO ====================

-- Tabela de Conquistas/Badges disponíveis
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  type achievement_type NOT NULL,
  
  -- Ícone e visual
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#E8A5B3',
  
  -- Requisitos
  requirement_type TEXT NOT NULL,
  requirement_value INT NOT NULL,
  
  -- Pontos ganhos
  points INT DEFAULT 10,
  
  -- Ordem de exibição
  sort_order INT DEFAULT 0,
  
  -- Flags
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Conquistas do Usuário
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Progresso (para conquistas graduais)
  progress INT DEFAULT 0,
  
  -- Notificado
  notified BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Tabela de Pontos/XP
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Pontos
  total_points INT DEFAULT 0,
  level INT DEFAULT 1,
  
  -- Streaks
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  
  -- Estatísticas
  meals_logged INT DEFAULT 0,
  workouts_completed INT DEFAULT 0,
  water_goals_met INT DEFAULT 0,
  days_active INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Tabela de Histórico de Pontos
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  points INT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_history_user ON points_history(user_id, created_at);

-- Tabela de Desafios Semanais
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Tipo e requisitos
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL,
  
  -- Recompensa
  reward_points INT DEFAULT 50,
  reward_badge_id UUID REFERENCES achievements(id),
  
  -- Período
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Participação em Desafios
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, challenge_id)
);

-- ==================== NOTIFICAÇÕES ====================

-- Tabela de Tokens de Push
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  device_info JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, token)
);

-- Tabela de Notificações Agendadas
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  -- Agendamento
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  
  -- Status
  is_sent BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications ON scheduled_notifications(scheduled_for, is_sent);

-- Tabela de Histórico de Notificações
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  action_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id, created_at);

-- ==================== CONTADOR DE CONTRAÇÕES ====================

CREATE TABLE IF NOT EXISTS contractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Horários
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  
  -- Duração em segundos
  duration_seconds INT,
  
  -- Intervalo desde a última (em segundos)
  interval_seconds INT,
  
  -- Intensidade (1-10)
  intensity INT DEFAULT 5,
  
  -- Fase detectada automaticamente
  phase contraction_phase,
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractions_user ON contractions(user_id, started_at);

-- Tabela de Sessões de Contrações
CREATE TABLE IF NOT EXISTS contraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Estatísticas
  total_contractions INT DEFAULT 0,
  avg_duration_seconds INT,
  avg_interval_seconds INT,
  
  -- Notas para o médico
  notes TEXT,
  
  -- Exportado
  exported_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SUPLEMENTOS E MEDICAMENTOS ====================

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  dosage TEXT,
  unit TEXT,
  
  -- Tipo
  type TEXT DEFAULT 'supplement',
  
  -- Frequência
  frequency TEXT DEFAULT 'daily',
  times_per_day INT DEFAULT 1,
  specific_times TIME[] DEFAULT '{}',
  
  -- Período
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Instruções
  instructions TEXT,
  take_with_food BOOLEAN DEFAULT false,
  
  -- Estoque
  current_stock INT,
  stock_alert_threshold INT DEFAULT 7,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Cor para exibição
  color TEXT DEFAULT '#E8A5B3',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id, is_active);

-- Tabela de Registros de Medicamentos
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  
  -- Quando deveria tomar
  scheduled_time TIMESTAMPTZ NOT NULL,
  
  -- Quando realmente tomou
  taken_at TIMESTAMPTZ,
  
  -- Status
  taken BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs ON medication_logs(user_id, scheduled_time);

-- ==================== DIÁRIO DE FOTOS ====================

CREATE TABLE IF NOT EXISTS belly_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Semana gestacional
  gestation_week INT NOT NULL,
  gestation_day INT DEFAULT 0,
  
  -- Data da foto
  photo_date DATE DEFAULT CURRENT_DATE,
  
  -- Notas
  caption TEXT,
  mood mood_type,
  
  -- Medida da barriga (opcional)
  belly_measurement FLOAT,
  
  -- Flags
  is_favorite BOOLEAN DEFAULT false,
  include_in_timelapse BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_belly_photos_user ON belly_photos(user_id, gestation_week);

-- ==================== MEDITAÇÕES E RELAXAMENTO ====================

CREATE TABLE IF NOT EXISTS meditations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Tipo
  type TEXT NOT NULL,
  category TEXT,
  
  -- Mídia
  audio_url TEXT,
  image_url TEXT,
  
  -- Duração em segundos
  duration_seconds INT NOT NULL,
  
  -- Fase alvo
  target_phases user_phase[] DEFAULT '{}',
  target_trimester INT[],
  
  -- Instrutor
  instructor TEXT,
  
  -- Flags
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Ordem
  sort_order INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso de Meditações
CREATE TABLE IF NOT EXISTS meditation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  meditation_id UUID REFERENCES meditations(id) ON DELETE CASCADE NOT NULL,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Duração real
  duration_seconds INT,
  
  -- Completou?
  completed BOOLEAN DEFAULT false,
  
  -- Avaliação
  rating INT,
  mood_before mood_type,
  mood_after mood_type,
  
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user ON meditation_sessions(user_id, started_at);

-- ==================== MONITORAMENTO DE SONO ====================

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  date DATE DEFAULT CURRENT_DATE,
  
  -- Horários
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  
  -- Duração em minutos
  duration_minutes INT,
  
  -- Qualidade (1-5)
  quality INT,
  
  -- Interrupções
  interruptions INT DEFAULT 0,
  interruption_reasons TEXT[] DEFAULT '{}',
  
  -- Sintomas
  symptoms TEXT[] DEFAULT '{}',
  
  -- Notas
  notes TEXT,
  
  -- Dados de wearable (se integrado)
  wearable_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id, date);

-- ==================== INTEGRAÇÃO WEARABLES ====================

CREATE TABLE IF NOT EXISTS wearable_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL,
  
  -- Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Dados da conexão
  provider_user_id TEXT,
  scopes TEXT[] DEFAULT '{}',
  
  -- Status
  is_connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- Dados sincronizados de wearables
CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES wearable_connections(id) ON DELETE CASCADE NOT NULL,
  
  date DATE NOT NULL,
  data_type TEXT NOT NULL,
  
  -- Dados
  value FLOAT,
  unit TEXT,
  raw_data JSONB,
  
  -- Fonte
  source TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date, data_type)
);

CREATE INDEX IF NOT EXISTS idx_wearable_data ON wearable_data(user_id, date, data_type);

-- ==================== COMUNIDADE ====================

-- Grupos/Comunidades
CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo
  type TEXT DEFAULT 'public',
  category TEXT,
  
  -- Imagem
  image_url TEXT,
  
  -- Regras
  rules TEXT[] DEFAULT '{}',
  
  -- Contadores
  member_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membros dos Grupos
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  
  role TEXT DEFAULT 'member',
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notificações
  notifications_enabled BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, group_id)
);

-- Posts da Comunidade
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  
  type post_type DEFAULT 'STORY',
  
  title TEXT,
  content TEXT NOT NULL,
  
  -- Mídia
  images TEXT[] DEFAULT '{}',
  
  -- Contadores
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  
  -- Flags
  is_pinned BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts ON community_posts(group_id, created_at);

-- Comentários
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  like_count INT DEFAULT 0,
  
  is_anonymous BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments ON community_comments(post_id, created_at);

-- Likes
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- ==================== ANÁLISE DE HUMOR (IA) ====================

CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  date DATE DEFAULT CURRENT_DATE,
  time TIME DEFAULT CURRENT_TIME,
  
  -- Humor registrado
  mood mood_type NOT NULL,
  energy_level INT,
  anxiety_level INT,
  
  -- Fatores
  factors TEXT[] DEFAULT '{}',
  
  -- Notas
  notes TEXT,
  
  -- Análise da IA
  ai_analysis JSONB,
  ai_suggestions TEXT[] DEFAULT '{}',
  
  -- Alerta de risco
  risk_flag BOOLEAN DEFAULT false,
  risk_level INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user ON mood_logs(user_id, date);

-- ==================== DESENVOLVIMENTO DO BEBÊ ====================

CREATE TABLE IF NOT EXISTS baby_development (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  week INT UNIQUE NOT NULL,
  
  -- Tamanho
  size_comparison TEXT NOT NULL,
  size_cm FLOAT,
  weight_grams FLOAT,
  
  -- Desenvolvimento
  developments TEXT[] DEFAULT '{}',
  baby_movements TEXT,
  
  -- Sintomas comuns da mãe
  common_symptoms TEXT[] DEFAULT '{}',
  
  -- Dicas
  tips TEXT[] DEFAULT '{}',
  nutrition_tips TEXT[] DEFAULT '{}',
  exercise_tips TEXT[] DEFAULT '{}',
  
  -- Exames recomendados
  recommended_exams TEXT[] DEFAULT '{}',
  
  -- Ilustração
  illustration_url TEXT,
  
  -- Curiosidades
  fun_facts TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== FUNÇÕES ADICIONAIS ====================

-- Função para calcular nível baseado em pontos
CREATE OR REPLACE FUNCTION calculate_level(points INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cada nível precisa de mais pontos que o anterior
  -- Nível 1: 0-99, Nível 2: 100-299, Nível 3: 300-599, etc.
  RETURN FLOOR(SQRT(points / 100)) + 1;
END;
$$;

-- Função para verificar e atualizar conquistas
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_points user_points%ROWTYPE;
  v_achievement achievements%ROWTYPE;
BEGIN
  SELECT * INTO v_points FROM user_points WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Verificar cada conquista não desbloqueada
  FOR v_achievement IN 
    SELECT a.* FROM achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua 
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    -- Verificar se atingiu o requisito
    IF (v_achievement.requirement_type = 'streak' AND v_points.current_streak >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'meals' AND v_points.meals_logged >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'workouts' AND v_points.workouts_completed >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'points' AND v_points.total_points >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'level' AND v_points.level >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'days' AND v_points.days_active >= v_achievement.requirement_value)
    THEN
      -- Desbloquear conquista
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_achievement.requirement_value)
      ON CONFLICT DO NOTHING;
      
      -- Adicionar pontos
      UPDATE user_points 
      SET total_points = total_points + v_achievement.points,
          level = calculate_level(total_points + v_achievement.points)
      WHERE user_id = p_user_id;
      
      -- Registrar no histórico
      INSERT INTO points_history (user_id, points, reason, source)
      VALUES (p_user_id, v_achievement.points, 'Conquista: ' || v_achievement.name, 'achievement');
    END IF;
  END LOOP;
END;
$$;

-- Trigger para atualizar streak diário
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se é um novo dia
  IF NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date THEN
    IF NEW.last_activity_date = OLD.last_activity_date + INTERVAL '1 day' THEN
      -- Dia consecutivo, incrementar streak
      NEW.current_streak := OLD.current_streak + 1;
      NEW.days_active := OLD.days_active + 1;
      
      -- Atualizar maior streak
      IF NEW.current_streak > OLD.longest_streak THEN
        NEW.longest_streak := NEW.current_streak;
      END IF;
    ELSIF NEW.last_activity_date > OLD.last_activity_date + INTERVAL '1 day' THEN
      -- Quebrou o streak
      NEW.current_streak := 1;
      NEW.days_active := OLD.days_active + 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_points_streak_trigger ON user_points;
CREATE TRIGGER user_points_streak_trigger
BEFORE UPDATE ON user_points
FOR EACH ROW
EXECUTE FUNCTION update_daily_streak();

-- ==================== RLS PARA NOVAS TABELAS ====================

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE belly_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "Users own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own points" ON user_points FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own points history" ON points_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own challenges" ON user_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own push tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own scheduled notifications" ON scheduled_notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own notification history" ON notification_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own contractions" ON contractions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own contraction sessions" ON contraction_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own medications" ON medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own medication logs" ON medication_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own belly photos" ON belly_photos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own meditation sessions" ON meditation_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own sleep logs" ON sleep_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own wearable connections" ON wearable_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own wearable data" ON wearable_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own community memberships" ON community_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own mood logs" ON mood_logs FOR ALL USING (auth.uid() = user_id);

-- Políticas públicas
CREATE POLICY "Anyone can read achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can read challenges" ON challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read meditations" ON meditations FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read baby development" ON baby_development FOR SELECT USING (true);
CREATE POLICY "Anyone can read community groups" ON community_groups FOR SELECT USING (is_active = true);

-- Políticas de comunidade (membros podem ver posts do grupo)
CREATE POLICY "Members can read posts" ON community_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND group_id = community_posts.group_id)
  OR is_approved = true
);
CREATE POLICY "Members can create posts" ON community_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND group_id = community_posts.group_id)
);
CREATE POLICY "Users own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users own posts delete" ON community_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read comments" ON community_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can comment" ON community_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users own comments" ON community_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users own comments delete" ON community_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users own likes" ON community_likes FOR ALL USING (auth.uid() = user_id);

-- ==================== DADOS INICIAIS ====================

-- Conquistas
INSERT INTO achievements (code, name, description, type, icon, requirement_type, requirement_value, points, sort_order) VALUES
-- Streaks
('streak_3', 'Começando Bem', 'Use o app por 3 dias seguidos', 'STREAK', '🔥', 'streak', 3, 10, 1),
('streak_7', 'Uma Semana!', 'Use o app por 7 dias seguidos', 'STREAK', '🔥', 'streak', 7, 25, 2),
('streak_14', 'Duas Semanas!', 'Use o app por 14 dias seguidos', 'STREAK', '🔥', 'streak', 14, 50, 3),
('streak_30', 'Um Mês Inteiro!', 'Use o app por 30 dias seguidos', 'STREAK', '🏆', 'streak', 30, 100, 4),
('streak_60', 'Dedicação Total', 'Use o app por 60 dias seguidos', 'STREAK', '💎', 'streak', 60, 200, 5),

-- Refeições
('meals_10', 'Alimentação Consciente', 'Registre 10 refeições', 'MILESTONE', '🥗', 'meals', 10, 15, 10),
('meals_50', 'Diário Alimentar', 'Registre 50 refeições', 'MILESTONE', '🥗', 'meals', 50, 50, 11),
('meals_100', 'Nutricionista Pessoal', 'Registre 100 refeições', 'MILESTONE', '🥗', 'meals', 100, 100, 12),
('meals_500', 'Mestre da Nutrição', 'Registre 500 refeições', 'MILESTONE', '👑', 'meals', 500, 250, 13),

-- Treinos
('workouts_5', 'Corpo em Movimento', 'Complete 5 treinos', 'MILESTONE', '💪', 'workouts', 5, 20, 20),
('workouts_20', 'Atleta em Formação', 'Complete 20 treinos', 'MILESTONE', '💪', 'workouts', 20, 50, 21),
('workouts_50', 'Guerreira Fitness', 'Complete 50 treinos', 'MILESTONE', '💪', 'workouts', 50, 100, 22),
('workouts_100', 'Lenda do Exercício', 'Complete 100 treinos', 'MILESTONE', '🏅', 'workouts', 100, 250, 23),

-- Níveis
('level_5', 'Evoluindo!', 'Alcance o nível 5', 'MILESTONE', '⭐', 'level', 5, 30, 30),
('level_10', 'Experiente', 'Alcance o nível 10', 'MILESTONE', '⭐', 'level', 10, 75, 31),
('level_25', 'Veterana', 'Alcance o nível 25', 'MILESTONE', '🌟', 'level', 25, 150, 32),
('level_50', 'Lendária', 'Alcance o nível 50', 'MILESTONE', '✨', 'level', 50, 300, 33),

-- Especiais
('first_scan', 'Primeira Análise', 'Escaneie sua primeira refeição', 'SPECIAL', '📸', 'meals', 1, 10, 40),
('first_workout', 'Primeiro Treino', 'Complete seu primeiro treino', 'SPECIAL', '🎯', 'workouts', 1, 10, 41),
('water_goal_7', 'Hidratada', 'Bata a meta de água por 7 dias', 'CHALLENGE', '💧', 'water_goals', 7, 30, 50)
ON CONFLICT (code) DO NOTHING;

-- Desenvolvimento do Bebê (semanas 4-42)
INSERT INTO baby_development (week, size_comparison, size_cm, weight_grams, developments, common_symptoms, tips, fun_facts) VALUES
(4, 'Semente de papoula', 0.2, 0.001, 
  ARRAY['O embrião está se implantando no útero', 'Formação da placenta começa', 'Células começam a se diferenciar'],
  ARRAY['Atraso menstrual', 'Cansaço', 'Seios sensíveis'],
  ARRAY['Comece a tomar ácido fólico', 'Evite álcool e cigarro', 'Marque sua primeira consulta'],
  ARRAY['O coração do bebê começará a bater em breve!']
),
(5, 'Semente de maçã', 0.3, 0.01,
  ARRAY['Tubo neural se formando', 'Coração primitivo começa a pulsar', 'Broto dos membros aparece'],
  ARRAY['Náuseas matinais', 'Fadiga intensa', 'Micção frequente'],
  ARRAY['Descanse quando precisar', 'Coma pequenas porções frequentes', 'Beba bastante água'],
  ARRAY['O coração já está batendo cerca de 100 vezes por minuto!']
),
(6, 'Lentilha', 0.6, 0.02,
  ARRAY['Rosto começando a se formar', 'Olhos e ouvidos em desenvolvimento', 'Coração batendo regularmente'],
  ARRAY['Enjoos', 'Alterações de humor', 'Aversões alimentares'],
  ARRAY['Gengibre pode ajudar com enjoos', 'Evite odores fortes', 'Converse com seu médico sobre sintomas'],
  ARRAY['O bebê já tem um coração de quatro câmaras!']
),
(7, 'Mirtilo', 1.0, 0.04,
  ARRAY['Braços e pernas crescendo', 'Cérebro desenvolvendo rapidamente', 'Fígado produzindo células sanguíneas'],
  ARRAY['Seios maiores', 'Constipação', 'Salivação excessiva'],
  ARRAY['Aumente a ingestão de fibras', 'Use sutiã confortável', 'Mantenha-se ativa'],
  ARRAY['O bebê já tem mãos e pés, embora pareçam nadadeiras!']
),
(8, 'Framboesa', 1.6, 1.0,
  ARRAY['Dedos das mãos e pés se formando', 'Pálpebras cobrindo os olhos', 'Movimentos começam (você ainda não sente)'],
  ARRAY['Náuseas podem piorar', 'Cansaço extremo', 'Inchaço abdominal'],
  ARRAY['Primeira ultrassom geralmente acontece agora', 'Descanse o suficiente', 'Coma alimentos ricos em ferro'],
  ARRAY['O bebê já está se movendo, mas é muito pequeno para você sentir!']
),
(9, 'Azeitona', 2.3, 2.0,
  ARRAY['Órgãos essenciais formados', 'Cauda embrionária desaparecendo', 'Articulações funcionais'],
  ARRAY['Roupas começam a apertar', 'Variações de humor', 'Dores de cabeça'],
  ARRAY['Comece a pensar em roupas mais confortáveis', 'Mantenha-se hidratada', 'Evite jejum prolongado'],
  ARRAY['O bebê pode fazer punho com as mãos!']
),
(10, 'Morango', 3.1, 4.0,
  ARRAY['Todos os órgãos vitais formados', 'Dedos separados', 'Unhas começando a crescer'],
  ARRAY['Veias mais visíveis', 'Aumento do fluxo sanguíneo', 'Enjoos podem melhorar'],
  ARRAY['Exames de sangue importantes nesta fase', 'Continue com pré-natal regular', 'Pratique exercícios leves'],
  ARRAY['O bebê já é oficialmente chamado de feto!']
),
(11, 'Limão', 4.1, 7.0,
  ARRAY['Genitais começando a se formar', 'Cabeça representa metade do corpo', 'Reflexos começam'],
  ARRAY['Energia pode começar a voltar', 'Prisão de ventre', 'Azia'],
  ARRAY['Ultrassom morfológico em breve', 'Coma alimentos ricos em cálcio', 'Evite deitar logo após comer'],
  ARRAY['O bebê já pode soluçar!']
),
(12, 'Ameixa', 5.4, 14.0,
  ARRAY['Reflexos mais desenvolvidos', 'Sistema digestivo praticando', 'Medula óssea produzindo células'],
  ARRAY['Fim do primeiro trimestre!', 'Risco de aborto diminui', 'Mais energia'],
  ARRAY['Você pode começar a contar para as pessoas!', 'Agende exames do segundo trimestre', 'Celebre esta conquista!'],
  ARRAY['O bebê já tem impressões digitais únicas!']
),
(13, 'Pêssego', 7.4, 23.0,
  ARRAY['Cordas vocais se formando', 'Intestinos movendo para o abdômen', 'Veias visíveis através da pele'],
  ARRAY['Segundo trimestre começa', 'Energia aumentando', 'Apetite voltando'],
  ARRAY['Ótimo momento para exercícios', 'Aproveite para viajar', 'Comece a pensar no enxoval'],
  ARRAY['O bebê já pode colocar o polegar na boca!']
),
(14, 'Limão siciliano', 8.7, 43.0,
  ARRAY['Expressões faciais possíveis', 'Lanugo (pelos finos) aparecendo', 'Fígado produzindo bile'],
  ARRAY['Barriga começando a aparecer', 'Menos enjoos', 'Cabelo mais brilhante'],
  ARRAY['Use protetor solar (manchas são comuns)', 'Durma de lado quando possível', 'Faça exercícios de Kegel'],
  ARRAY['O bebê pode fazer caretas!']
),
(15, 'Maçã', 10.1, 70.0,
  ARRAY['Esqueleto endurecendo', 'Pernas mais longas que braços', 'Ouvidos na posição final'],
  ARRAY['Linha nigra pode aparecer', 'Nariz entupido', 'Gengivas sensíveis'],
  ARRAY['Mantenha boa higiene bucal', 'Use travesseiro entre as pernas para dormir', 'Hidrate a pele da barriga'],
  ARRAY['O bebê pode ouvir seu coração batendo!']
),
(16, 'Abacate', 11.6, 100.0,
  ARRAY['Olhos sensíveis à luz', 'Unhas dos pés crescendo', 'Cordão umbilical fortalecendo'],
  ARRAY['Você pode começar a sentir o bebê!', 'Dores nas costas', 'Congestão nasal'],
  ARRAY['Alongue-se regularmente', 'Considere aulas de preparação para o parto', 'Converse com o bebê'],
  ARRAY['Os primeiros movimentos são chamados de quickening!']
),
(17, 'Pera', 13.0, 140.0,
  ARRAY['Gordura começando a se acumular', 'Cordão umbilical mais forte', 'Reflexo de sucção desenvolvendo'],
  ARRAY['Dor no ligamento redondo', 'Sonhos vívidos', 'Aumento de apetite'],
  ARRAY['Coma mais calorias de qualidade', 'Prepare-se para o ultrassom morfológico', 'Comece a pensar em nomes'],
  ARRAY['O bebê já tem suas próprias impressões digitais!']
),
(18, 'Batata doce', 14.2, 190.0,
  ARRAY['Ouvidos funcionais', 'Mielin cobrindo nervos', 'Pode começar a ouvir sons'],
  ARRAY['Movimentos fetais mais claros', 'Tontura ao levantar', 'Cãibras nas pernas'],
  ARRAY['Levante-se devagar', 'Coma banana para cãibras', 'Toque música para o bebê'],
  ARRAY['O bebê pode ouvir sua voz e músicas!']
),
(19, 'Manga', 15.3, 240.0,
  ARRAY['Vernix caseoso cobrindo a pele', 'Cérebro desenvolvendo sentidos', 'Braços e pernas proporcionais'],
  ARRAY['Tontura', 'Dor nas costas', 'Pele esticando'],
  ARRAY['Mantenha-se hidratada', 'Use óleos na barriga', 'Durma com travesseiro de gestante'],
  ARRAY['O bebê pode sentir você tocando a barriga!']
),
(20, 'Banana', 16.4, 300.0,
  ARRAY['Metade da gravidez!', 'Engolindo líquido amniótico', 'Cabelos crescendo'],
  ARRAY['Barriga bem visível', 'Umbigo pode começar a saltar', 'Inchaço leve'],
  ARRAY['Ultrassom morfológico acontece agora', 'Você pode descobrir o sexo!', 'Celebre a metade da jornada!'],
  ARRAY['O bebê dorme e acorda em ciclos regulares!']
),
(21, 'Cenoura', 26.7, 360.0,
  ARRAY['Papilas gustativas desenvolvidas', 'Movimentos mais coordenados', 'Sobrancelhas e cílios formados'],
  ARRAY['Fome aumentada', 'Azia frequente', 'Varizes podem aparecer'],
  ARRAY['Coma refeições menores e frequentes', 'Eleve as pernas quando possível', 'Use meias de compressão se necessário'],
  ARRAY['O bebê pode provar o que você come através do líquido amniótico!']
),
(22, 'Mamão papaia', 27.8, 430.0,
  ARRAY['Olhos formados mas sem cor', 'Pâncreas desenvolvendo', 'Lábios mais definidos'],
  ARRAY['Estrias podem aparecer', 'Tornozelos inchados', 'Contrações de Braxton Hicks'],
  ARRAY['Hidrate muito a pele', 'Descanse com pés elevados', 'Diferencie Braxton Hicks de contrações reais'],
  ARRAY['O bebê pode ter soluços que você sente!']
),
(23, 'Toranja', 28.9, 500.0,
  ARRAY['Pele enrugada (ainda sem gordura)', 'Pulmões praticando respiração', 'Audição aguçada'],
  ARRAY['Dificuldade para dormir', 'Mãos inchadas', 'Linea nigra mais escura'],
  ARRAY['Durma do lado esquerdo', 'Remova anéis se necessário', 'Pratique técnicas de relaxamento'],
  ARRAY['O bebê pode reconhecer sua voz!']
),
(24, 'Espiga de milho', 30.0, 600.0,
  ARRAY['Viabilidade fora do útero (com suporte)', 'Rosto quase totalmente formado', 'Ciclos de sono definidos'],
  ARRAY['Olhos secos', 'Síndrome do túnel do carpo', 'Esquecimento (mommy brain)'],
  ARRAY['Use colírio se necessário', 'Faça pausas se trabalha no computador', 'Anote coisas importantes'],
  ARRAY['Se nascesse agora, teria chance de sobreviver com cuidados intensivos!']
),
(25, 'Couve-flor', 34.6, 660.0,
  ARRAY['Cabelo com cor e textura', 'Narinas se abrindo', 'Estrutura da coluna completa'],
  ARRAY['Hemorroidas', 'Azia intensa', 'Dificuldade para respirar'],
  ARRAY['Aumente fibras na dieta', 'Durma semi-reclinada se necessário', 'Faça exercícios de respiração'],
  ARRAY['O bebê já pode abrir os olhos!']
),
(26, 'Alface', 35.6, 760.0,
  ARRAY['Olhos completamente formados', 'Pulmões produzindo surfactante', 'Resposta a estímulos externos'],
  ARRAY['Contrações de Braxton Hicks mais frequentes', 'Dor nas costelas', 'Ansiedade sobre o parto'],
  ARRAY['Pratique técnicas de respiração', 'Converse sobre seus medos', 'Considere aulas de preparação'],
  ARRAY['O bebê pode ver luz através da barriga!']
),
(27, 'Couve', 36.6, 875.0,
  ARRAY['Terceiro trimestre começa!', 'Cérebro muito ativo', 'Pode sonhar'],
  ARRAY['Insônia', 'Reta final começando', 'Cansaço voltando'],
  ARRAY['Descanse sempre que possível', 'Prepare o quarto do bebê', 'Finalize a lista do enxoval'],
  ARRAY['O bebê pode ter sonhos!']
),
(28, 'Berinjela', 37.6, 1000.0,
  ARRAY['Cílios completos', 'Pode piscar', 'REM sleep (sonhos)'],
  ARRAY['Falta de ar', 'Vazamento de colostro', 'Dores pélvicas'],
  ARRAY['Use absorventes de seio se necessário', 'Faça exercícios para assoalho pélvico', 'Considere acupuntura para dores'],
  ARRAY['O bebê já pesa cerca de 1kg!']
),
(29, 'Abóbora butternut', 38.6, 1150.0,
  ARRAY['Músculos e pulmões amadurecendo', 'Cabeça crescendo para o cérebro', 'Ossos endurecendo'],
  ARRAY['Dificuldade para achar posição', 'Micção muito frequente', 'Ansiedade aumentando'],
  ARRAY['Durma com vários travesseiros', 'Fique perto do banheiro', 'Pratique mindfulness'],
  ARRAY['O bebê está ficando apertado lá dentro!']
),
(30, 'Repolho', 39.9, 1300.0,
  ARRAY['Olhos podem focar', 'Gordura se acumulando', 'Unhas alcançando pontas dos dedos'],
  ARRAY['Exaustão', 'Dor lombar intensa', 'Inchaço generalizado'],
  ARRAY['Tire licença se possível', 'Faça massagens', 'Prepare a mala da maternidade'],
  ARRAY['O bebê pode segurar o próprio pé!']
),
(31, 'Coco', 41.1, 1500.0,
  ARRAY['Todos os sentidos funcionando', 'Unhas dos pés completas', 'Movimentos de respiração'],
  ARRAY['Vazamento de urina ao espirrar', 'Dor nas articulações', 'Sonhos intensos'],
  ARRAY['Use absorvente se necessário', 'Faça exercícios de Kegel diariamente', 'Descanse a mente'],
  ARRAY['O bebê pode processar informações dos 5 sentidos!']
),
(32, 'Jicama', 42.4, 1700.0,
  ARRAY['Pele menos enrugada', 'Cabelo mais grosso', 'Dedos dos pés com unhas'],
  ARRAY['Azia extrema', 'Dificuldade para comer muito', 'Falta de fôlego'],
  ARRAY['Coma pequenas porções', 'Evite deitar após comer', 'Quase lá!'],
  ARRAY['O bebê está praticando respiração o tempo todo!']
),
(33, 'Abacaxi', 43.7, 1900.0,
  ARRAY['Sistema imunológico desenvolvendo', 'Ossos endurecendo (exceto crânio)', 'Cérebro crescendo rápido'],
  ARRAY['Pressão na pélvis', 'Contrações mais frequentes', 'Excitação e ansiedade'],
  ARRAY['Diferencie trabalho de parto real', 'Tenha número do hospital à mão', 'Revise o plano de parto'],
  ARRAY['O crânio do bebê permanece flexível para o parto!']
),
(34, 'Melão cantaloupe', 45.0, 2100.0,
  ARRAY['Vernix engrossando', 'Sistema nervoso central amadurecendo', 'Pode virar de cabeça para baixo'],
  ARRAY['Fadiga extrema', 'Pressão intensa', 'Dificuldade para dormir'],
  ARRAY['Descanse o máximo possível', 'Verifique posição do bebê', 'Prepare-se emocionalmente'],
  ARRAY['Se o bebê nascer agora, provavelmente ficará bem!']
),
(35, 'Melão honeydew', 46.2, 2400.0,
  ARRAY['Rins completamente desenvolvidos', 'Fígado processando resíduos', 'Maioria dos órgãos prontos'],
  ARRAY['Muito cansada', 'Mãos e pés muito inchados', 'Ansiedade pelo parto'],
  ARRAY['Monitore inchaço excessivo', 'Informe sinais de pré-eclâmpsia', 'Quase na reta final!'],
  ARRAY['O bebê ganha cerca de 200g por semana agora!']
),
(36, 'Alface romana', 47.4, 2600.0,
  ARRAY['Gengivas endurecendo', 'Pode começar a descer', 'Menos espaço para mover'],
  ARRAY['Pode sentir o bebê mais baixo', 'Respiração um pouco mais fácil', 'Pressão na bexiga'],
  ARRAY['Consultas semanais começam', 'Descanse com pés elevados', 'Mantenha a calma'],
  ARRAY['O bebê está quase pronto para nascer!']
),
(37, 'Acelga', 48.6, 2900.0,
  ARRAY['A termo! Bebê considerado pronto', 'Coordenação melhorando', 'Gordura completando'],
  ARRAY['Alívio na respiração se bebê desceu', 'Ansiedade máxima', 'Possível perda do tampão mucoso'],
  ARRAY['Fique atenta aos sinais de trabalho de parto', 'Mantenha celular carregado', 'Você consegue!'],
  ARRAY['O bebê é oficialmente considerado a termo!']
),
(38, 'Alho-poró', 49.8, 3100.0,
  ARRAY['Lanugo quase todo sumiu', 'Reflexos prontos', 'Intestino cheio de mecônio'],
  ARRAY['Muita pressão', 'Possíveis contrações reais', 'Dificuldade para dormir'],
  ARRAY['Diferencie contrações reais das falsas', 'Cronometre se começar', 'Ligue para o médico se necessário'],
  ARRAY['O mecônio será o primeiro cocô do bebê!']
),
(39, 'Mini melancia', 50.7, 3300.0,
  ARRAY['Cordas vocais prontas para chorar', 'Todos os órgãos prontos', 'Esperando o momento'],
  ARRAY['Pode estar muito desconfortável', 'Contrações podem começar', 'Excitação!'],
  ARRAY['Descanse enquanto pode', 'Revise o que levar para o hospital', 'Confie no seu corpo'],
  ARRAY['O bebê está pronto para conhecer você!']
),
(40, 'Melancia pequena', 51.2, 3500.0,
  ARRAY['Pronto para nascer!', 'Pulmões prontos para o primeiro choro', 'Aguardando o trabalho de parto'],
  ARRAY['Data provável do parto', 'Pode nascer a qualquer momento', 'Ansiedade e excitação'],
  ARRAY['Mantenha a calma', 'Confie no processo', 'Você está pronta!'],
  ARRAY['Apenas 5% dos bebês nascem na DPP exata!']
),
(41, 'Melancia', 51.7, 3600.0,
  ARRAY['Bebê continua ganhando peso', 'Vernix diminuindo', 'Pode precisar de indução'],
  ARRAY['Muito desconfortável', 'Médico monitorando de perto', 'Possível indução'],
  ARRAY['Faça monitoramento fetal', 'Confie na equipe médica', 'O bebê virá no momento certo'],
  ARRAY['Muitos bebês nascem após a DPP e está tudo bem!']
),
(42, 'Abóbora', 52.0, 3700.0,
  ARRAY['Limite para indução', 'Bebê saudável mas grande', 'Monitoramento intenso'],
  ARRAY['Provavelmente será induzido', 'Muita ansiedade', 'Fim da espera!'],
  ARRAY['Confie nos profissionais', 'Mantenha a calma', 'Seu bebê está chegando!'],
  ARRAY['A maioria das gestações não passa de 42 semanas!']
)
ON CONFLICT (week) DO NOTHING;

-- Meditações padrão
INSERT INTO meditations (title, description, type, category, duration_seconds, target_phases, instructor, sort_order) VALUES
('Respiração para Calma', 'Técnica de respiração 4-7-8 para acalmar', 'breathing', 'relaxamento', 300, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 1),
('Relaxamento Corporal', 'Escaneamento corporal progressivo', 'body_scan', 'relaxamento', 600, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 2),
('Conexão com o Bebê', 'Meditação guiada para conectar com seu bebê', 'guided', 'gestação', 480, ARRAY['PREGNANT']::user_phase[], 'Mia', 3),
('Preparação para o Parto', 'Visualização positiva do parto', 'visualization', 'parto', 720, ARRAY['PREGNANT']::user_phase[], 'Mia', 4),
('Sono Tranquilo', 'Meditação para melhorar o sono', 'sleep', 'sono', 900, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 5),
('Alívio de Ansiedade', 'Técnicas para momentos de ansiedade', 'anxiety', 'emocional', 420, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 6),
('Energia Matinal', 'Meditação curta para começar o dia', 'morning', 'energia', 300, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 7),
('Gratidão', 'Prática de gratidão guiada', 'gratitude', 'emocional', 360, ARRAY['PREGNANT', 'POSTPARTUM', 'ACTIVE']::user_phase[], 'Mia', 8),
('Recuperação Pós-Parto', 'Apoio emocional no pós-parto', 'postpartum', 'pós-parto', 600, ARRAY['POSTPARTUM']::user_phase[], 'Mia', 9),
('Amamentação Tranquila', 'Relaxamento durante a amamentação', 'breastfeeding', 'pós-parto', 480, ARRAY['POSTPARTUM']::user_phase[], 'Mia', 10)
ON CONFLICT DO NOTHING;

-- Grupos da Comunidade padrão
INSERT INTO community_groups (name, description, type, category, rules) VALUES
('Gestantes - 1º Trimestre', 'Grupo para futuras mamães no primeiro trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Gestantes - 2º Trimestre', 'Grupo para futuras mamães no segundo trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Gestantes - 3º Trimestre', 'Grupo para futuras mamães no terceiro trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Pós-Parto', 'Apoio para mães no pós-parto', 'public', 'pos-parto', ARRAY['Seja respeitosa', 'Não julgue escolhas', 'Apoie outras mães']),
('Receitas Saudáveis', 'Compartilhe receitas nutritivas', 'public', 'receitas', ARRAY['Apenas receitas saudáveis', 'Indique se é seguro para gestantes']),
('Exercícios e Bem-estar', 'Dicas de atividades físicas', 'public', 'exercicios', ARRAY['Sempre indique o nível de intensidade', 'Lembre de consultar o médico']),
('Mães de Primeira Viagem', 'Grupo especial para mães de primeira viagem', 'public', 'geral', ARRAY['Seja acolhedora', 'Nenhuma pergunta é boba', 'Compartilhe experiências'])
ON CONFLICT DO NOTHING;

-- ==================== FIM DO SQL ADICIONAL ====================
```

---

# 2. CONFIGURAÇÃO FIREBASE (PUSH NOTIFICATIONS)

## 2.1 Criar Projeto no Firebase

1. Acesse https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Nome do projeto: `vitafit-app`
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

## 2.2 Configurar Cloud Messaging

1. No projeto, vá em **Configurações do projeto** (engrenagem)
2. Aba **Cloud Messaging**
3. Em "Web Push certificates", clique em **Gerar par de chaves**
4. Copie a **Chave pública** (VAPID Key)

## 2.3 Obter Credenciais

1. Aba **Geral**
2. Role até "Seus apps" e clique em **</>** (Web)
3. Registre o app com nome "VitaFit Web"
4. Copie as configurações do Firebase

## 2.4 Instalar Dependências

```bash
npm install firebase firebase-admin
```

## 2.5 Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Firebase Client (para o frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vitafit-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vitafit-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vitafit-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=sua_vapid_key_publica

# Firebase Admin (para o backend) - Baixe o JSON de Service Account
FIREBASE_PROJECT_ID=vitafit-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@vitafit-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
```

## 2.6 src/lib/firebase/client.ts

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Inicializar Firebase apenas no cliente
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let messaging: Messaging | null = null

export const getFirebaseMessaging = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (!messaging) {
      messaging = getMessaging(app)
    }
    return messaging
  }
  return null
}

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada')
      return null
    }

    const messaging = getFirebaseMessaging()
    if (!messaging) return null

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    return token
  } catch (error) {
    console.error('Erro ao obter token:', error)
    return null
  }
}

export const onMessageListener = () => {
  const messaging = getFirebaseMessaging()
  if (!messaging) return Promise.resolve(null)

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload)
    })
  })
}
```

## 2.7 src/lib/firebase/admin.ts

```typescript
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    }

    const response = await admin.messaging().send(message)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return { success: false, error }
  }
}

export const sendMultipleNotifications = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  try {
    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
      },
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error)
    return { success: false, error }
  }
}
```

## 2.8 public/firebase-messaging-sw.js

Crie o Service Worker para receber notificações em background:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'SUA_API_KEY',
  authDomain: 'vitafit-app.firebaseapp.com',
  projectId: 'vitafit-app',
  storageBucket: 'vitafit-app.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Recebeu mensagem em background:', payload)

  const notificationTitle = payload.notification?.title || 'VitaFit'
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/'
    event.waitUntil(clients.openWindow(url))
  }
})
```

---

# 3. SISTEMA DE NOTIFICAÇÕES PUSH

## 3.1 src/app/api/notifications/register/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { token, platform, deviceInfo } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    // Salvar ou atualizar token
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token,
        platform: platform || 'web',
        device_info: deviceInfo || {},
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro ao registrar token:', error)
    return NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 })
  }
}
```

## 3.2 src/app/api/notifications/send/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { userId, type, title, body, data } = await req.json()

    // Buscar tokens do usuário
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId || user.id)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Nenhum token encontrado' }, { status: 404 })
    }

    // Enviar para todos os dispositivos
    const results = await Promise.all(
      tokens.map((t) => sendPushNotification(t.token, title, body, data))
    )

    // Salvar no histórico
    await supabase.from('notification_history').insert({
      user_id: userId || user.id,
      type,
      title,
      body,
      action_url: data?.url,
    })

    return NextResponse.json({
      success: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 })
  }
}
```

## 3.3 src/app/api/notifications/schedule/route.ts

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

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_cancelled', false)
      .order('scheduled_for', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { type, title, body, scheduledFor, isRecurring, recurrenceRule, data } = await req.json()

    const { data: notification, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        body,
        scheduled_for: scheduledFor,
        is_recurring: isRecurring || false,
        recurrence_rule: recurrenceRule,
        data: data || {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(notification)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao agendar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ is_cancelled: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 })
  }
}
```

## 3.4 src/hooks/use-notifications.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase/client'
import { useUser } from './use-user'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  action_url?: string
}

export function useNotifications() {
  const { user } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Solicitar permissão e registrar token
  const enableNotifications = useCallback(async () => {
    const token = await requestNotificationPermission()
    
    if (token) {
      // Registrar token no servidor
      await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          platform: 'web',
          deviceInfo: {
            userAgent: navigator.userAgent,
          },
        }),
      })
      
      setIsEnabled(true)
      return true
    }
    
    return false
  }, [])

  // Buscar histórico de notificações
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/notifications/history')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/history/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/history/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Agendar notificação
  const scheduleNotification = async (
    type: string,
    title: string,
    body: string,
    scheduledFor: Date,
    options?: { isRecurring?: boolean; recurrenceRule?: string }
  ) => {
    try {
      const response = await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          body,
          scheduledFor: scheduledFor.toISOString(),
          ...options,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Erro ao agendar:', error)
      return false
    }
  }

  // Ouvir notificações em tempo real
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Verificar permissão atual
    if ('Notification' in window) {
      setIsEnabled(Notification.permission === 'granted')
    }

    // Listener para notificações em foreground
    const unsubscribe = onMessageListener().then((payload: any) => {
      if (payload) {
        // Mostrar notificação local
        const notification = new Notification(payload.notification?.title || 'VitaFit', {
          body: payload.notification?.body,
          icon: '/icons/icon-192x192.png',
        })

        // Adicionar à lista
        fetchNotifications()
      }
    })

    return () => {
      // Cleanup se necessário
    }
  }, [fetchNotifications])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isEnabled,
    isLoading,
    enableNotifications,
    markAsRead,
    markAllAsRead,
    scheduleNotification,
    refetch: fetchNotifications,
  }
}
```

## 3.5 src/components/notifications/notification-bell.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, X } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isEnabled,
    enableNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-6 w-6 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-text-primary">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary-500 hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Solicitar permissão */}
              {!isEnabled && (
                <div className="p-4 bg-primary-50 border-b">
                  <p className="text-sm text-text-secondary mb-2">
                    Ative as notificações para não perder nada!
                  </p>
                  <Button size="sm" onClick={enableNotifications}>
                    Ativar Notificações
                  </Button>
                </div>
              )}

              {/* Lista */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-2 text-text-secondary opacity-50" />
                    <p className="text-text-secondary">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary-50/50' : ''
                      }`}
                      onClick={() => {
                        markAsRead(notification.id)
                        if (notification.action_url) {
                          window.location.href = notification.action_url
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            !notification.read ? 'bg-primary-500' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary text-sm">
                            {notification.title}
                          </p>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

# 4. SISTEMA DE GAMIFICAÇÃO COMPLETO

## 4.1 src/app/api/gamification/route.ts

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

    // Buscar ou criar pontos do usuário
    let { data: points } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!points) {
      const { data: newPoints } = await supabase
        .from('user_points')
        .insert({ user_id: user.id })
        .select()
        .single()
      points = newPoints
    }

    // Buscar conquistas do usuário
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    // Buscar todas as conquistas
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // Buscar desafios ativos
    const { data: challenges } = await supabase
      .from('challenges')
      .select(`
        *,
        user_progress:user_challenges(progress, completed)
      `)
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0])

    // Buscar histórico recente de pontos
    const { data: history } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      points,
      userAchievements,
      allAchievements,
      challenges,
      history,
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
```

## 4.2 src/app/api/gamification/points/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const POINTS_CONFIG = {
  meal_logged: 5,
  workout_completed: 15,
  water_goal_met: 10,
  progress_logged: 10,
  daily_login: 5,
  streak_bonus_7: 20,
  streak_bonus_30: 50,
  challenge_completed: 50,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { action, metadata } = await req.json()

    const points = POINTS_CONFIG[action as keyof typeof POINTS_CONFIG] || 0

    if (points === 0) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Buscar pontos atuais
    const { data: currentPoints } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    let newStreak = currentPoints?.current_streak || 0
    let isNewDay = false

    // Verificar se é um novo dia
    if (currentPoints?.last_activity_date !== today) {
      isNewDay = true
      
      // Verificar streak
      const lastDate = currentPoints?.last_activity_date
      if (lastDate) {
        const last = new Date(lastDate)
        const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diff === 1) {
          newStreak = (currentPoints?.current_streak || 0) + 1
        } else if (diff > 1) {
          newStreak = 1
        }
      } else {
        newStreak = 1
      }
    }

    // Calcular pontos totais
    const newTotalPoints = (currentPoints?.total_points || 0) + points
    const newLevel = Math.floor(Math.sqrt(newTotalPoints / 100)) + 1

    // Atualizar contadores específicos
    const updates: any = {
      total_points: newTotalPoints,
      level: newLevel,
      last_activity_date: today,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, currentPoints?.longest_streak || 0),
    }

    if (action === 'meal_logged') {
      updates.meals_logged = (currentPoints?.meals_logged || 0) + 1
    } else if (action === 'workout_completed') {
      updates.workouts_completed = (currentPoints?.workouts_completed || 0) + 1
    } else if (action === 'water_goal_met') {
      updates.water_goals_met = (currentPoints?.water_goals_met || 0) + 1
    }

    if (isNewDay) {
      updates.days_active = (currentPoints?.days_active || 0) + 1
    }

    // Atualizar no banco
    const { data: updatedPoints, error } = await supabase
      .from('user_points')
      .upsert({
        user_id: user.id,
        ...updates,
      })
      .select()
      .single()

    if (error) throw error

    // Registrar no histórico
    await supabase.from('points_history').insert({
      user_id: user.id,
      points,
      reason: action,
      source: metadata?.source || 'app',
    })

    // Verificar conquistas
    await supabase.rpc('check_achievements', { p_user_id: user.id })

    // Verificar se desbloqueou novas conquistas
    const { data: newAchievements } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', user.id)
      .eq('notified', false)

    // Marcar como notificadas
    if (newAchievements && newAchievements.length > 0) {
      await supabase
        .from('user_achievements')
        .update({ notified: true })
        .in('id', newAchievements.map((a) => a.id))
    }

    return NextResponse.json({
      success: true,
      pointsEarned: points,
      totalPoints: updatedPoints.total_points,
      level: updatedPoints.level,
      streak: updatedPoints.current_streak,
      newAchievements: newAchievements || [],
      levelUp: newLevel > (currentPoints?.level || 1),
    })
  } catch (error) {
    console.error('Erro ao adicionar pontos:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
```

## 4.3 src/hooks/use-gamification.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface UserPoints {
  total_points: number
  level: number
  current_streak: number
  longest_streak: number
  meals_logged: number
  workouts_completed: number
  water_goals_met: number
  days_active: number
}

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  type: string
  icon: string
  color: string
  points: number
  requirement_type: string
  requirement_value: number
}

interface UserAchievement {
  id: string
  achievement: Achievement
  unlocked_at: string
  progress: number
}

interface Challenge {
  id: string
  title: string
  description: string
  challenge_type: string
  target_value: number
  reward_points: number
  start_date: string
  end_date: string
  user_progress?: {
    progress: number
    completed: boolean
  }
}

export function useGamification() {
  const { user } = useUser()
  const [points, setPoints] = useState<UserPoints | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([])

  const fetchData = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/gamification')
      if (response.ok) {
        const data = await response.json()
        setPoints(data.points)
        setAchievements(data.allAchievements)
        setUserAchievements(data.userAchievements)
        setChallenges(data.challenges)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addPoints = async (
    action: string,
    metadata?: Record<string, any>
  ): Promise<{
    pointsEarned: number
    levelUp: boolean
    newAchievements: Achievement[]
  } | null> => {
    try {
      const response = await fetch('/api/gamification/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, metadata }),
      })

      if (response.ok) {
        const result = await response.json()

        // Atualizar pontos locais
        if (points) {
          setPoints({
            ...points,
            total_points: result.totalPoints,
            level: result.level,
            current_streak: result.streak,
          })
        }

        // Mostrar novas conquistas
        if (result.newAchievements?.length > 0) {
          setPendingAchievements(result.newAchievements.map((ua: any) => ua.achievement))
        }

        return {
          pointsEarned: result.pointsEarned,
          levelUp: result.levelUp,
          newAchievements: result.newAchievements?.map((ua: any) => ua.achievement) || [],
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error)
    }
    return null
  }

  const dismissAchievement = () => {
    setPendingAchievements((prev) => prev.slice(1))
  }

  const joinChallenge = async (challengeId: string) => {
    try {
      const response = await fetch('/api/gamification/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })

      if (response.ok) {
        fetchData()
        return true
      }
    } catch (error) {
      console.error('Erro:', error)
    }
    return false
  }

  // Calcular progresso para próximo nível
  const currentLevelPoints = points ? Math.pow(points.level - 1, 2) * 100 : 0
  const nextLevelPoints = points ? Math.pow(points.level, 2) * 100 : 100
  const levelProgress = points
    ? ((points.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    : 0

  // Conquistas desbloqueadas vs total
  const unlockedCount = userAchievements.length
  const totalCount = achievements.length

  return {
    points,
    achievements,
    userAchievements,
    challenges,
    isLoading,
    pendingAchievements,
    levelProgress,
    unlockedCount,
    totalCount,
    addPoints,
    dismissAchievement,
    joinChallenge,
    refetch: fetchData,
  }
}
```

## 4.4 src/app/(main)/achievements/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGamification } from '@/hooks/use-gamification'
import { Trophy, Star, Flame, Lock, ChevronRight, Zap, Target, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AchievementsPage() {
  const {
    points,
    achievements,
    userAchievements,
    challenges,
    levelProgress,
    unlockedCount,
    totalCount,
    isLoading,
    joinChallenge,
  } = useGamification()

  const [activeTab, setActiveTab] = useState<'achievements' | 'challenges'>('achievements')

  // Separar conquistas por status
  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement.id))
  const unlockedAchievements = achievements.filter((a) => unlockedIds.has(a.id))
  const lockedAchievements = achievements.filter((a) => !unlockedIds.has(a.id))

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header com Status */}
        <Card className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-3xl font-bold">{points?.level || 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm opacity-90">Nível</p>
                <h2 className="text-2xl font-bold">
                  {points?.level === 1
                    ? 'Iniciante'
                    : points?.level && points.level < 5
                    ? 'Aprendiz'
                    : points?.level && points.level < 10
                    ? 'Praticante'
                    : points?.level && points.level < 25
                    ? 'Experiente'
                    : 'Mestre'}
                </h2>
                <div className="mt-2">
                  <Progress value={levelProgress} className="h-2 bg-white/30" />
                  <p className="text-xs mt-1 opacity-90">
                    {points?.total_points || 0} XP • {Math.ceil(levelProgress)}% para o próximo nível
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <Flame className="h-6 w-6 mx-auto mb-1" />
                <p className="text-2xl font-bold">{points?.current_streak || 0}</p>
                <p className="text-xs opacity-90">Dias seguidos</p>
              </div>
              <div className="text-center">
                <Trophy className="h-6 w-6 mx-auto mb-1" />
                <p className="text-2xl font-bold">{unlockedCount}</p>
                <p className="text-xs opacity-90">Conquistas</p>
              </div>
              <div className="text-center">
                <Star className="h-6 w-6 mx-auto mb-1" />
                <p className="text-2xl font-bold">{points?.total_points || 0}</p>
                <p className="text-xs opacity-90">XP Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'achievements' ? 'default' : 'outline'}
            onClick={() => setActiveTab('achievements')}
            className="flex-1"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Conquistas
          </Button>
          <Button
            variant={activeTab === 'challenges' ? 'default' : 'outline'}
            onClick={() => setActiveTab('challenges')}
            className="flex-1"
          >
            <Target className="h-4 w-4 mr-2" />
            Desafios
          </Button>
        </div>

        {activeTab === 'achievements' ? (
          <div className="space-y-6">
            {/* Conquistas Desbloqueadas */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Desbloqueadas ({unlockedAchievements.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {unlockedAchievements.map((achievement) => {
                    const userAch = userAchievements.find(
                      (ua) => ua.achievement.id === achievement.id
                    )

                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <div
                          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-2"
                          style={{ backgroundColor: achievement.color + '20' }}
                        >
                          {achievement.icon}
                        </div>
                        <p className="text-sm font-medium text-text-primary line-clamp-1">
                          {achievement.name}
                        </p>
                        <p className="text-xs text-text-secondary">+{achievement.points} XP</p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Conquistas Bloqueadas */}
            {lockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-text-secondary" />
                  A Desbloquear ({lockedAchievements.length})
                </h3>
                <div className="space-y-3">
                  {lockedAchievements.map((achievement) => (
                    <Card key={achievement.id} className="opacity-75">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl grayscale">
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{achievement.name}</p>
                          <p className="text-sm text-text-secondary">{achievement.description}</p>
                        </div>
                        <Badge variant="secondary">+{achievement.points} XP</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const progress = challenge.user_progress?.progress || 0
              const progressPercent = (progress / challenge.target_value) * 100
              const daysLeft = Math.ceil(
                (new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )

              return (
                <Card key={challenge.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-text-primary">{challenge.title}</h4>
                        <p className="text-sm text-text-secondary">{challenge.description}</p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {daysLeft} dias
                      </Badge>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Progresso</span>
                        <span className="font-medium">
                          {progress}/{challenge.target_value}
                        </span>
                      </div>
                      <Progress value={progressPercent} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="default">
                        <Zap className="h-3 w-3 mr-1" />
                        +{challenge.reward_points} XP
                      </Badge>

                      {!challenge.user_progress ? (
                        <Button size="sm" onClick={() => joinChallenge(challenge.id)}>
                          Participar
                        </Button>
                      ) : challenge.user_progress.completed ? (
                        <Badge variant="success">✓ Completo</Badge>
                      ) : (
                        <span className="text-sm text-text-secondary">Participando</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {challenges.length === 0 && (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Nenhum desafio ativo
                </h3>
                <p className="text-text-secondary">Novos desafios em breve!</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
```

## 4.5 src/components/gamification/achievement-popup.tsx

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGamification } from '@/hooks/use-gamification'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

export function AchievementPopup() {
  const { pendingAchievements, dismissAchievement } = useGamification()

  const currentAchievement = pendingAchievements[0]

  useEffect(() => {
    if (currentAchievement) {
      // Disparar confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E8A5B3', '#9DB4A0', '#F4B860', '#FFD700'],
      })
    }
  }, [currentAchievement])

  return (
    <AnimatePresence>
      {currentAchievement && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={dismissAchievement}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-5xl mb-4"
                style={{ backgroundColor: currentAchievement.color + '30' }}
              >
                {currentAchievement.icon}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-primary-500 font-semibold mb-1">CONQUISTA DESBLOQUEADA!</p>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  {currentAchievement.name}
                </h2>
                <p className="text-text-secondary mb-4">{currentAchievement.description}</p>

                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                  <span className="text-lg">⭐</span>
                  <span className="font-bold">+{currentAchievement.points} XP</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button className="w-full mt-6" onClick={dismissAchievement}>
                  Incrível! 🎉
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

## 4.6 Instalar confetti

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

---

# 5. DESENVOLVIMENTO DO BEBÊ SEMANA A SEMANA

## 5.1 src/app/api/baby-development/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/ai/memory-system'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const weekParam = searchParams.get('week')

    // Se não especificou semana, pegar a atual do usuário
    let week = weekParam ? parseInt(weekParam) : null

    if (!week) {
      const userContext = await getUserContext(user.id)
      week = userContext?.gestationWeek || 4
    }

    // Buscar dados da semana
    const { data, error } = await supabase
      .from('baby_development')
      .select('*')
      .eq('week', week)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Semana não encontrada' }, { status: 404 })
    }

    // Buscar semanas adjacentes para navegação
    const { data: allWeeks } = await supabase
      .from('baby_development')
      .select('week')
      .order('week')

    return NextResponse.json({
      ...data,
      availableWeeks: allWeeks?.map((w) => w.week) || [],
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
```

## 5.2 src/app/(main)/baby-development/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/use-user'
import {
  Baby,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Scale,
  Stethoscope,
  Apple,
  Dumbbell,
  Lightbulb,
  Loader2,
} from 'lucide-react'

interface BabyDevelopment {
  week: number
  size_comparison: string
  size_cm: number
  weight_grams: number
  developments: string[]
  common_symptoms: string[]
  tips: string[]
  nutrition_tips: string[]
  exercise_tips: string[]
  recommended_exams: string[]
  fun_facts: string[]
  availableWeeks: number[]
}

export default function BabyDevelopmentPage() {
  const { user } = useUser()
  const [data, setData] = useState<BabyDevelopment | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.phase === 'PREGNANT' && user?.last_menstrual_date) {
      const dum = new Date(user.last_menstrual_date)
      const diffDays = Math.ceil((Date.now() - dum.getTime()) / (1000 * 60 * 60 * 24))
      const week = Math.max(4, Math.min(42, Math.floor(diffDays / 7)))
      setCurrentWeek(week)
    } else {
      setCurrentWeek(12) // Semana padrão para demonstração
    }
  }, [user])

  useEffect(() => {
    if (currentWeek) {
      fetchWeekData(currentWeek)
    }
  }, [currentWeek])

  const fetchWeekData = async (week: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/baby-development?week=${week}`)
      if (response.ok) {
        const weekData = await response.json()
        setData(weekData)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    if (currentWeek && currentWeek > 4) {
      setCurrentWeek(currentWeek - 1)
    }
  }

  const goToNextWeek = () => {
    if (currentWeek && currentWeek < 42) {
      setCurrentWeek(currentWeek + 1)
    }
  }

  const getTrimester = (week: number) => {
    if (week <= 13) return { num: 1, label: '1º Trimestre', color: 'bg-green-100 text-green-700' }
    if (week <= 26) return { num: 2, label: '2º Trimestre', color: 'bg-blue-100 text-blue-700' }
    return { num: 3, label: '3º Trimestre', color: 'bg-purple-100 text-purple-700' }
  }

  if (isLoading || !data) {
    return (
      <PageContainer>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    )
  }

  const trimester = getTrimester(data.week)

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Navegação de Semanas */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 4}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="text-center">
            <Badge className={trimester.color}>{trimester.label}</Badge>
            <h1 className="text-3xl font-bold text-text-primary mt-2">Semana {data.week}</h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            disabled={currentWeek === 42}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Card Principal - Tamanho do Bebê */}
        <AnimatePresence mode="wait">
          <motion.div
            key={data.week}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="bg-gradient-to-br from-primary-100 to-secondary-100">
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">
                  {/* Emoji baseado no tamanho */}
                  {data.size_comparison.includes('papoula') && '🌱'}
                  {data.size_comparison.includes('maçã') && '🍎'}
                  {data.size_comparison.includes('limão') && '🍋'}
                  {data.size_comparison.includes('abacate') && '🥑'}
                  {data.size_comparison.includes('banana') && '🍌'}
                  {data.size_comparison.includes('melancia') && '🍉'}
                  {!data.size_comparison.match(/(papoula|maçã|limão|abacate|banana|melancia)/) && '👶'}
                </div>
                <p className="text-lg text-text-secondary mb-2">Seu bebê tem o tamanho de um(a)</p>
                <h2 className="text-2xl font-bold text-text-primary">{data.size_comparison}</h2>

                <div className="flex justify-center gap-8 mt-6">
                  <div className="text-center">
                    <Ruler className="h-6 w-6 mx-auto mb-1 text-primary-600" />
                    <p className="text-2xl font-bold text-text-primary">{data.size_cm} cm</p>
                    <p className="text-sm text-text-secondary">comprimento</p>
                  </div>
                  <div className="text-center">
                    <Scale className="h-6 w-6 mx-auto mb-1 text-secondary-600" />
                    <p className="text-2xl font-bold text-text-primary">
                      {data.weight_grams >= 1000
                        ? `${(data.weight_grams / 1000).toFixed(1)} kg`
                        : `${data.weight_grams} g`}
                    </p>
                    <p className="text-sm text-text-secondary">peso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* O que está acontecendo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary-500" />
              O que está acontecendo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {data.developments.map((dev, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary-500 mt-1">•</span>
                  <span className="text-text-primary">{dev}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sintomas Comuns */}
        {data.common_symptoms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-red-500" />
                Sintomas Comuns
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {data.common_symptoms.map((symptom, i) => (
                  <Badge key={i} variant="secondary">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Dicas para esta semana
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {data.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">💡</span>
                  <span className="text-text-primary">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Nutrição */}
        {data.nutrition_tips && data.nutrition_tips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Apple className="h-5 w-5 text-green-500" />
                Nutrição
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.nutrition_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-1">🥗</span>
                    <span className="text-text-primary">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Exames Recomendados */}
        {data.recommended_exams && data.recommended_exams.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                📋 Exames Recomendados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.recommended_exams.map((exam, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                    <span>•</span>
                    <span>{exam}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Curiosidade */}
        {data.fun_facts && data.fun_facts.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-purple-600 mb-1">✨ Você sabia?</p>
              <p className="text-text-primary">{data.fun_facts[0]}</p>
            </CardContent>
          </Card>
        )}

        {/* Seletor de Semanas */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-2">
            {data.availableWeeks.map((week) => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  week === currentWeek
                    ? 'bg-primary-500 text-white'
                    : week <= (currentWeek || 0)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-text-secondary'
                }`}
              >
                {week}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
```

---

Vou continuar o documento com as demais funcionalidades. O arquivo está muito grande, então vou criar uma segunda parte.
# 🌸 VITAFIT - DOCUMENTO 4: MELHORIAS AVANÇADAS (PARTE 3)
## Continuação - Diário de Fotos, Meditações, Sono, Wearables, Voz e Comunidade

---

# CONTINUAÇÃO DO CONTROLE DE MEDICAMENTOS

## Completar src/app/(main)/medications/page.tsx

```typescript
// ... continuação do código anterior

          <Card className="p-8 text-center">
            <Pill className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Nenhum medicamento cadastrado
            </h3>
            <p className="text-text-secondary mb-4">
              Adicione seus suplementos e medicamentos
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro
            </Button>
          </Card>
        )}

        {/* Lista de Medicamentos */}
        {medications.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Seus Medicamentos</h2>
            <div className="grid gap-3">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: med.color + '30' }}
                      >
                        <Pill className="h-5 w-5" style={{ color: med.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{med.name}</p>
                        <p className="text-sm text-text-secondary">
                          {med.dosage} • {med.times_per_day}x ao dia
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {med.type === 'supplement' ? 'Suplemento' : 'Medicamento'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Adicionar */}
        <Modal open={showModal} onOpenChange={setShowModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Adicionar Medicamento</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              <Input
                label="Nome"
                placeholder="Ex: Ácido Fólico"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Dosagem"
                placeholder="Ex: 400mcg"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Tipo
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === 'supplement' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'supplement' })}
                    className="flex-1"
                  >
                    Suplemento
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'medication' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'medication' })}
                    className="flex-1"
                  >
                    Medicamento
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Vezes ao dia
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={formData.times_per_day === n ? 'default' : 'outline'}
                      onClick={() => {
                        const times =
                          n === 1
                            ? ['08:00']
                            : n === 2
                            ? ['08:00', '20:00']
                            : n === 3
                            ? ['08:00', '14:00', '20:00']
                            : ['08:00', '12:00', '16:00', '20:00']
                        setFormData({ ...formData, times_per_day: n, specific_times: times })
                      }}
                      className="flex-1"
                    >
                      {n}x
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Horários
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.specific_times.map((time, index) => (
                    <Input
                      key={index}
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...formData.specific_times]
                        newTimes[index] = e.target.value
                        setFormData({ ...formData, specific_times: newTimes })
                      }}
                      className="w-28"
                    />
                  ))}
                </div>
              </div>

              <Input
                label="Instruções (opcional)"
                placeholder="Ex: Tomar com alimento"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button onClick={handleSubmit} isLoading={isSaving}>
                Adicionar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </PageContainer>
  )
}
```

---

# 10. DIÁRIO DE FOTOS DA BARRIGA

## 10.1 src/app/api/belly-photos/route.ts

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

    const { data, error } = await supabase
      .from('belly_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('gestation_week', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    const { data, error } = await supabase
      .from('belly_photos')
      .insert({
        user_id: user.id,
        ...body,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
```

## 10.2 src/app/(main)/belly-photos/page.tsx

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal'
import { useUser } from '@/hooks/use-user'
import { uploadProgressPhoto } from '@/lib/storage/upload'
import {
  Camera,
  Plus,
  Play,
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Grid,
  Image as ImageIcon,
} from 'lucide-react'

interface BellyPhoto {
  id: string
  photo_url: string
  gestation_week: number
  photo_date: string
  caption?: string
  belly_measurement?: number
  is_favorite: boolean
}

export default function BellyPhotosPage() {
  const { user } = useUser()
  const [photos, setPhotos] = useState<BellyPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTimelapse, setShowTimelapse] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<BellyPhoto | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline')

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calcular semana gestacional atual
  const currentWeek = user?.last_menstrual_date
    ? Math.floor(
        (Date.now() - new Date(user.last_menstrual_date).getTime()) /
          (1000 * 60 * 60 * 24 * 7)
      )
    : null

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/belly-photos')
      if (response.ok) {
        const data = await response.json()
        setPhotos(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user?.id || !currentWeek) return

    setIsUploading(true)
    try {
      // Upload da foto
      const photoUrl = await uploadProgressPhoto(user.id, selectedFile, 'front')

      if (photoUrl) {
        // Salvar no banco
        await fetch('/api/belly-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_url: photoUrl,
            gestation_week: currentWeek,
            photo_date: new Date().toISOString().split('T')[0],
            caption,
          }),
        })

        fetchPhotos()
        setShowModal(false)
        setSelectedFile(null)
        setPreview(null)
        setCaption('')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleFavorite = async (photo: BellyPhoto) => {
    try {
      await fetch(`/api/belly-photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !photo.is_favorite }),
      })

      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_favorite: !p.is_favorite } : p))
      )
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Agrupar por semana
  const photosByWeek = photos.reduce((acc, photo) => {
    const week = photo.gestation_week
    if (!acc[week]) acc[week] = []
    acc[week].push(photo)
    return acc
  }, {} as Record<number, BellyPhoto[]>)

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Diário de Fotos</h1>
            <p className="text-text-secondary">
              {currentWeek ? `Semana ${currentWeek}` : 'Acompanhe sua barriguinha'}
            </p>
          </div>
          <div className="flex gap-2">
            {photos.length >= 3 && (
              <Button variant="outline" onClick={() => setShowTimelapse(true)}>
                <Play className="h-4 w-4 mr-2" />
                Timelapse
              </Button>
            )}
            <Button onClick={() => setShowModal(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Nova Foto
            </Button>
          </div>
        </div>

        {/* Toggle de visualização */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4 mr-1" />
            Grade
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : photos.length === 0 ? (
          <Card className="p-8 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Nenhuma foto ainda
            </h3>
            <p className="text-text-secondary mb-4">
              Registre a evolução da sua barriguinha semana a semana
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Tirar Primeira Foto
            </Button>
          </Card>
        ) : viewMode === 'grid' ? (
          // Visualização em Grade
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.photo_url}
                  alt={`Semana ${photo.gestation_week}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <Badge className="text-xs">Sem {photo.gestation_week}</Badge>
                </div>
                {photo.is_favorite && (
                  <Heart className="absolute top-2 right-2 h-5 w-5 text-red-500 fill-red-500" />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          // Visualização Timeline
          <div className="space-y-6">
            {Object.keys(photosByWeek)
              .sort((a, b) => Number(b) - Number(a))
              .map((weekStr) => {
                const week = Number(weekStr)
                const weekPhotos = photosByWeek[week]

                return (
                  <div key={week}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-600">{week}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">Semana {week}</p>
                        <p className="text-sm text-text-secondary">
                          {weekPhotos.length} foto{weekPhotos.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="ml-6 pl-6 border-l-2 border-primary-100">
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {weekPhotos.map((photo) => (
                          <motion.div
                            key={photo.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative flex-shrink-0 w-40"
                          >
                            <div
                              className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
                              onClick={() => setSelectedPhoto(photo)}
                            >
                              <img
                                src={photo.photo_url}
                                alt={`Semana ${photo.gestation_week}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              onClick={() => toggleFavorite(photo)}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full"
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  photo.is_favorite
                                    ? 'text-red-500 fill-red-500'
                                    : 'text-text-secondary'
                                }`}
                              />
                            </button>
                            {photo.caption && (
                              <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                                {photo.caption}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Modal de Upload */}
        <Modal open={showModal} onOpenChange={setShowModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Nova Foto - Semana {currentWeek}</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full aspect-[3/4] object-cover rounded-xl"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreview(null)
                    }}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[3/4] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary-300 transition-colors"
                >
                  <Camera className="h-12 w-12 text-text-secondary" />
                  <span className="text-text-secondary">Tirar ou escolher foto</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Input
                label="Legenda (opcional)"
                placeholder="Como você está se sentindo?"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button onClick={handleUpload} disabled={!selectedFile} isLoading={isUploading}>
                Salvar Foto
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal de Visualização */}
        <Modal open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <ModalContent className="max-w-lg">
            {selectedPhoto && (
              <>
                <img
                  src={selectedPhoto.photo_url}
                  alt={`Semana ${selectedPhoto.gestation_week}`}
                  className="w-full rounded-xl"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge>Semana {selectedPhoto.gestation_week}</Badge>
                    <button onClick={() => toggleFavorite(selectedPhoto)}>
                      <Heart
                        className={`h-6 w-6 ${
                          selectedPhoto.is_favorite
                            ? 'text-red-500 fill-red-500'
                            : 'text-text-secondary'
                        }`}
                      />
                    </button>
                  </div>
                  {selectedPhoto.caption && (
                    <p className="text-text-primary mt-2">{selectedPhoto.caption}</p>
                  )}
                </div>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Modal Timelapse */}
        <AnimatePresence>
          {showTimelapse && (
            <TimelapsePlayer photos={photos} onClose={() => setShowTimelapse(false)} />
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  )
}

// Componente de Timelapse
function TimelapsePlayer({
  photos,
  onClose,
}: {
  photos: BellyPhoto[]
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, 1000) // 1 segundo por foto

    return () => clearInterval(interval)
  }, [isPlaying, photos.length])

  const currentPhoto = photos[currentIndex]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onClose} className="text-white">
          ← Voltar
        </Button>
        <Badge className="bg-white/20 text-white">
          Semana {currentPhoto.gestation_week}
        </Badge>
        <Button
          variant="ghost"
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white"
        >
          {isPlaying ? '⏸️ Pausar' : '▶️ Play'}
        </Button>
      </div>

      {/* Foto */}
      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentPhoto.id}
            src={currentPhoto.photo_url}
            alt={`Semana ${currentPhoto.gestation_week}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-h-full max-w-full object-contain rounded-xl"
          />
        </AnimatePresence>
      </div>

      {/* Controles */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="flex-1 flex gap-1">
            {photos.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setCurrentIndex((prev) => Math.min(photos.length - 1, prev + 1))
            }
            className="text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <p className="text-center text-white/70 text-sm mt-2">
          {currentIndex + 1} de {photos.length} fotos
        </p>
      </div>
    </motion.div>
  )
}
```

---

# 11. MEDITAÇÕES E RELAXAMENTO

## 11.1 src/app/api/meditations/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('meditations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    // Buscar sessões do usuário
    const { data: sessions } = await supabase
      .from('meditation_sessions')
      .select('meditation_id, completed')
      .eq('user_id', user.id)
      .eq('completed', true)

    const completedIds = new Set(sessions?.map((s) => s.meditation_id) || [])

    const meditations = data?.map((m) => ({
      ...m,
      is_completed: completedIds.has(m.id),
    }))

    return NextResponse.json(meditations)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}
```

## 11.2 src/app/api/meditations/session/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    const { data, error } = await supabase
      .from('meditation_sessions')
      .insert({
        user_id: user.id,
        ...body,
      })
      .select()
      .single()

    if (error) throw error

    // Adicionar pontos de gamificação
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gamification/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'meditation_completed' }),
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
```

## 11.3 src/app/(main)/meditations/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Heart, Clock, Play, Check, Loader2, Sparkles } from 'lucide-react'

interface Meditation {
  id: string
  title: string
  description: string
  type: string
  category: string
  duration_seconds: number
  instructor: string
  image_url?: string
  is_completed: boolean
}

const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'relaxamento', label: '🧘 Relaxamento' },
  { value: 'gestação', label: '🤰 Gestação' },
  { value: 'sono', label: '😴 Sono' },
  { value: 'emocional', label: '💜 Emocional' },
  { value: 'parto', label: '👶 Parto' },
]

export default function MeditationsPage() {
  const router = useRouter()
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    fetchMeditations()
  }, [activeCategory])

  const fetchMeditations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/meditations?category=${activeCategory}`)
      if (response.ok) {
        const data = await response.json()
        setMeditations(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const typeIcons: Record<string, string> = {
    breathing: '🌬️',
    body_scan: '🧘',
    guided: '🎧',
    visualization: '✨',
    sleep: '🌙',
    anxiety: '💆',
    morning: '☀️',
    gratitude: '🙏',
    postpartum: '💕',
    breastfeeding: '🤱',
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Meditações</h1>
          <p className="text-text-secondary">Relaxe corpo e mente</p>
        </div>

        {/* Destaque */}
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Recomendado para hoje</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Respiração para Calma</h2>
            <p className="text-sm opacity-90 mb-4">Técnica 4-7-8 para relaxar</p>
            <Button
              className="bg-white text-purple-600 hover:bg-white/90"
              onClick={() => router.push('/meditations/play?id=breathing-calm')}
            >
              <Play className="h-4 w-4 mr-2" />
              Começar (5 min)
            </Button>
          </CardContent>
        </Card>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.value)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {meditations.map((meditation) => (
              <motion.div
                key={meditation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  hover
                  onClick={() => router.push(`/meditations/play?id=${meditation.id}`)}
                  className={meditation.is_completed ? 'border-green-200 bg-green-50/50' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                        {typeIcons[meditation.type] || '🧘'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text-primary line-clamp-1">
                            {meditation.title}
                          </h3>
                          {meditation.is_completed && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-1">
                          {meditation.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(meditation.duration_seconds)}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {meditation.instructor}
                          </span>
                        </div>
                      </div>

                      <Button size="icon" variant="ghost">
                        <Play className="h-5 w-5 text-primary-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
```

## 11.4 src/app/(main)/meditations/play/page.tsx

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Play, Pause, X, Volume2, VolumeX, SkipForward } from 'lucide-react'

export default function MeditationPlayerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const meditationId = searchParams.get('id')

  const [meditation, setMeditation] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')

  const audioRef = useRef<HTMLAudioElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Carregar meditação
    // Por enquanto, simulando dados
    setMeditation({
      id: meditationId,
      title: 'Respiração para Calma',
      description: 'Técnica 4-7-8 para relaxar',
      duration_seconds: 300,
      type: 'breathing',
    })
  }, [meditationId])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= (meditation?.duration_seconds || 300)) {
            completeMeditation()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      // Ciclo de respiração 4-7-8
      const breathCycle = () => {
        setBreathPhase('inhale')
        setTimeout(() => setBreathPhase('hold'), 4000)
        setTimeout(() => setBreathPhase('exhale'), 11000)
      }
      breathCycle()
      const breathInterval = setInterval(breathCycle, 19000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        clearInterval(breathInterval)
      }
    }
  }, [isPlaying, meditation])

  const completeMeditation = async () => {
    setIsPlaying(false)

    try {
      await fetch('/api/meditations/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meditation_id: meditationId,
          duration_seconds: currentTime,
          completed: true,
          completed_at: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Erro:', error)
    }

    router.push('/meditations')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = meditation
    ? (currentTime / meditation.duration_seconds) * 100
    : 0

  const breathInstructions = {
    inhale: { text: 'Inspire', count: 4, color: 'from-blue-400 to-cyan-400' },
    hold: { text: 'Segure', count: 7, color: 'from-purple-400 to-pink-400' },
    exhale: { text: 'Expire', count: 8, color: 'from-green-400 to-teal-400' },
  }

  const currentBreath = breathInstructions[breathPhase]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentBreath.color} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white">
          <X className="h-6 w-6" />
        </Button>
        <span className="text-white/80 text-sm">{formatTime(currentTime)}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="text-white"
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Círculo de Respiração */}
        <AnimatePresence mode="wait">
          <motion.div
            key={breathPhase}
            initial={{ scale: breathPhase === 'inhale' ? 0.6 : breathPhase === 'hold' ? 1 : 1 }}
            animate={{
              scale: breathPhase === 'inhale' ? 1 : breathPhase === 'hold' ? 1 : 0.6,
            }}
            transition={{
              duration:
                breathPhase === 'inhale' ? 4 : breathPhase === 'hold' ? 7 : 8,
              ease: 'easeInOut',
            }}
            className="w-48 h-48 rounded-full bg-white/30 flex items-center justify-center"
          >
            <div className="w-36 h-36 rounded-full bg-white/40 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{currentBreath.text}</p>
                <p className="text-white/80">{currentBreath.count}s</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Título */}
        <h1 className="text-2xl font-bold text-white mt-8 text-center">
          {meditation?.title}
        </h1>
        <p className="text-white/80 mt-2">{meditation?.description}</p>
      </div>

      {/* Controles */}
      <div className="p-8">
        {/* Barra de Progresso */}
        <div className="h-1 bg-white/30 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-gray-800" />
            ) : (
              <Play className="h-8 w-8 text-gray-800 ml-1" />
            )}
          </motion.button>

          <Button
            variant="ghost"
            size="icon"
            onClick={completeMeditation}
            className="text-white"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

# 12. MONITORAMENTO DE SONO

## 12.1 src/app/api/sleep/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    // Calcular duração
    if (body.bedtime && body.wake_time) {
      const bedtime = new Date(body.bedtime)
      const wakeTime = new Date(body.wake_time)
      let duration = (wakeTime.getTime() - bedtime.getTime()) / (1000 * 60)
      if (duration < 0) duration += 24 * 60 // Se passou da meia-noite
      body.duration_minutes = Math.round(duration)
    }

    const { data, error } = await supabase
      .from('sleep_logs')
      .upsert({
        user_id: user.id,
        ...body,
      }, {
        onConflict: 'user_id,date',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
```

## 12.2 src/app/(main)/sleep/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal'
import { Moon, Sun, Plus, Clock, Star, TrendingUp, Loader2, Zap } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SleepLog {
  id: string
  date: string
  bedtime: string
  wake_time: string
  duration_minutes: number
  quality: number
  interruptions: number
  symptoms: string[]
  notes?: string
}

export default function SleepPage() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '22:00',
    wake_time: '07:00',
    quality: 3,
    interruptions: 0,
    symptoms: [] as string[],
    notes: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sleep?days=14')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      const bedtime = new Date(`${formData.date}T${formData.bedtime}:00`)
      let wakeDate = formData.date
      
      // Se acordou depois da meia-noite
      if (formData.wake_time < formData.bedtime) {
        const nextDay = new Date(formData.date)
        nextDay.setDate(nextDay.getDate() + 1)
        wakeDate = nextDay.toISOString().split('T')[0]
      }
      const wakeTime = new Date(`${wakeDate}T${formData.wake_time}:00`)

      await fetch('/api/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          bedtime: bedtime.toISOString(),
          wake_time: wakeTime.toISOString(),
          quality: formData.quality,
          interruptions: formData.interruptions,
          symptoms: formData.symptoms,
          notes: formData.notes,
        }),
      })

      fetchLogs()
      setShowModal(false)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Calcular estatísticas
  const avgDuration = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.duration_minutes, 0) / logs.length)
    : 0
  const avgQuality = logs.length > 0
    ? (logs.reduce((sum, l) => sum + l.quality, 0) / logs.length).toFixed(1)
    : 0
  const avgInterruptions = logs.length > 0
    ? (logs.reduce((sum, l) => sum + l.interruptions, 0) / logs.length).toFixed(1)
    : 0

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Dados para o gráfico
  const chartData = logs
    .slice()
    .reverse()
    .map((log) => ({
      date: format(new Date(log.date), 'dd/MM'),
      hours: Math.round((log.duration_minutes / 60) * 10) / 10,
      quality: log.quality,
    }))

  const SYMPTOMS = [
    'Dificuldade para dormir',
    'Acordei várias vezes',
    'Pesadelos',
    'Ronco',
    'Azia',
    'Cãibras',
    'Bebê mexendo muito',
    'Ansiedade',
  ]

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Sono</h1>
            <p className="text-text-secondary">Monitore sua qualidade de sono</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Moon className="h-6 w-6 mx-auto mb-1 text-indigo-500" />
              <p className="text-2xl font-bold text-text-primary">
                {formatDuration(avgDuration)}
              </p>
              <p className="text-xs text-text-secondary">Média/noite</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold text-text-primary">{avgQuality}</p>
              <p className="text-xs text-text-secondary">Qualidade</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-6 w-6 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-text-primary">{avgInterruptions}</p>
              <p className="text-xs text-text-secondary">Interrupções</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos 14 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 12]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ fill: '#6366F1' }}
                      name="Horas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-8 text-center">
            <Moon className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Nenhum registro
            </h3>
            <p className="text-text-secondary mb-4">
              Comece a registrar seu sono
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Primeiro Registro
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">
                        {format(new Date(log.date), "EEEE, d 'de' MMM", { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Moon className="h-3 w-3" />
                          {format(new Date(log.bedtime), 'HH:mm')}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <Sun className="h-3 w-3" />
                          {format(new Date(log.wake_time), 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge className="bg-indigo-100 text-indigo-700">
                        {formatDuration(log.duration_minutes)}
                      </Badge>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < log.quality
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {log.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {log.symptoms.map((symptom, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Registro */}
        <Modal open={showModal} onOpenChange={setShowModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Registrar Sono</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              <Input
                label="Data"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hora de dormir"
                  type="time"
                  value={formData.bedtime}
                  onChange={(e) => setFormData({ ...formData, bedtime: e.target.value })}
                />
                <Input
                  label="Hora de acordar"
                  type="time"
                  value={formData.wake_time}
                  onChange={(e) => setFormData({ ...formData, wake_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Qualidade do sono
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormData({ ...formData, quality: n })}
                      className="flex-1 p-2"
                    >
                      <Star
                        className={`h-8 w-8 mx-auto ${
                          n <= formData.quality
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Quantas vezes acordou?
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={formData.interruptions === n ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, interruptions: n })}
                      className="flex-1"
                    >
                      {n === 5 ? '5+' : n}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Sintomas (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS.map((symptom) => (
                    <Badge
                      key={symptom}
                      variant={formData.symptoms.includes(symptom) ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          symptoms: formData.symptoms.includes(symptom)
                            ? formData.symptoms.filter((s) => s !== symptom)
                            : [...formData.symptoms, symptom],
                        })
                      }}
                    >
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>

              <Input
                label="Notas (opcional)"
                placeholder="Como foi seu sono?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button onClick={handleSubmit} isLoading={isSaving}>
                Salvar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </PageContainer>
  )
}
```

---

# 13. INTEGRAÇÃO COM WEARABLES

## 13.1 Instalar Dependências

```bash
npm install googleapis
```

## 13.2 src/lib/wearables/google-fit.ts

```typescript
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_FIT_CLIENT_ID,
  process.env.GOOGLE_FIT_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/wearables/google-fit/callback`
)

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
]

export function getAuthUrl(userId: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent',
  })
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export async function getSteps(accessToken: string, startTime: Date, endTime: Date) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const fitness = google.fitness({ version: 'v1', auth: oauth2Client })
  
  const response = await fitness.users.dataset.aggregate({
    userId: 'me',
    requestBody: {
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta',
        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
      }],
      bucketByTime: { durationMillis: 86400000 }, // 1 dia
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    },
  })
  
  return response.data.bucket?.map(bucket => ({
    date: new Date(parseInt(bucket.startTimeMillis || '0')).toISOString().split('T')[0],
    steps: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
  })) || []
}

export async function getHeartRate(accessToken: string, startTime: Date, endTime: Date) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const fitness = google.fitness({ version: 'v1', auth: oauth2Client })
  
  const response = await fitness.users.dataset.aggregate({
    userId: 'me',
    requestBody: {
      aggregateBy: [{
        dataTypeName: 'com.google.heart_rate.bpm',
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    },
  })
  
  return response.data.bucket?.map(bucket => {
    const points = bucket.dataset?.[0]?.point || []
    const avgBpm = points.length > 0
      ? points.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0) / points.length
      : null
    
    return {
      date: new Date(parseInt(bucket.startTimeMillis || '0')).toISOString().split('T')[0],
      avgHeartRate: avgBpm ? Math.round(avgBpm) : null,
    }
  }) || []
}

export async function getSleep(accessToken: string, startTime: Date, endTime: Date) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const fitness = google.fitness({ version: 'v1', auth: oauth2Client })
  
  const response = await fitness.users.sessions.list({
    userId: 'me',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    activityType: 72, // Sleep
  })
  
  return response.data.session?.map(session => ({
    date: new Date(parseInt(session.startTimeMillis || '0')).toISOString().split('T')[0],
    durationMinutes: Math.round(
      (parseInt(session.endTimeMillis || '0') - parseInt(session.startTimeMillis || '0')) / 60000
    ),
  })) || []
}
```

## 13.3 src/app/api/wearables/google-fit/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/wearables/google-fit'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar conexão existente
    const { data: connection } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_fit')
      .single()

    if (connection?.is_connected) {
      return NextResponse.json({ connected: true, connection })
    }

    // Gerar URL de autorização
    const authUrl = getAuthUrl(user.id)

    return NextResponse.json({ connected: false, authUrl })
  } catch (error) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
```

## 13.4 src/app/api/wearables/google-fit/callback/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTokens } from '@/lib/wearables/google-fit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const userId = searchParams.get('state')

    if (!code || !userId) {
      return NextResponse.redirect(new URL('/profile/wearables?error=missing_params', req.url))
    }

    const tokens = await getTokens(code)

    const supabase = await createClient()

    await supabase.from('wearable_connections').upsert({
      user_id: userId,
      provider: 'google_fit',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_connected: true,
      scopes: tokens.scope?.split(' ') || [],
    }, {
      onConflict: 'user_id,provider',
    })

    return NextResponse.redirect(new URL('/profile/wearables?success=true', req.url))
  } catch (error) {
    console.error('Erro no callback:', error)
    return NextResponse.redirect(new URL('/profile/wearables?error=auth_failed', req.url))
  }
}
```

## 13.5 src/app/api/wearables/sync/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSteps, getHeartRate, refreshAccessToken } from '@/lib/wearables/google-fit'
import { subDays } from 'date-fns'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar conexão
    const { data: connection } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_fit')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Não conectado' }, { status: 404 })
    }

    let accessToken = connection.access_token

    // Verificar se token expirou
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      const newTokens = await refreshAccessToken(connection.refresh_token)
      accessToken = newTokens.access_token

      await supabase
        .from('wearable_connections')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : null,
        })
        .eq('id', connection.id)
    }

    const endTime = new Date()
    const startTime = subDays(endTime, 7)

    // Sincronizar passos
    const steps = await getSteps(accessToken, startTime, endTime)
    for (const daySteps of steps) {
      await supabase.from('wearable_data').upsert({
        user_id: user.id,
        connection_id: connection.id,
        date: daySteps.date,
        data_type: 'steps',
        value: daySteps.steps,
        unit: 'steps',
        source: 'google_fit',
      }, {
        onConflict: 'user_id,date,data_type',
      })
    }

    // Sincronizar frequência cardíaca
    const heartRate = await getHeartRate(accessToken, startTime, endTime)
    for (const dayHr of heartRate) {
      if (dayHr.avgHeartRate) {
        await supabase.from('wearable_data').upsert({
          user_id: user.id,
          connection_id: connection.id,
          date: dayHr.date,
          data_type: 'heart_rate',
          value: dayHr.avgHeartRate,
          unit: 'bpm',
          source: 'google_fit',
        }, {
          onConflict: 'user_id,date,data_type',
        })
      }
    }

    // Atualizar última sincronização
    await supabase
      .from('wearable_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      synced: {
        steps: steps.length,
        heartRate: heartRate.filter((h) => h.avgHeartRate).length,
      },
    })
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar' }, { status: 500 })
  }
}
```

---

# 14. CHAT POR VOZ COM A MIA

## 14.1 src/hooks/use-voice-chat.ts

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseVoiceChatProps {
  onTranscript: (text: string) => void
  onSpeakEnd?: () => void
}

export function useVoiceChat({ onTranscript, onSpeakEnd }: UseVoiceChatProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Inicializar Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'pt-BR'

      recognition.onresult = (event: any) => {
        const current = event.resultIndex
        const result = event.results[current]
        const text = result[0].transcript

        setTranscript(text)

        if (result.isFinal) {
          onTranscript(text)
          setIsListening(false)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Erro de reconhecimento:', event.error)
        setError(event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } else {
      setError('Reconhecimento de voz não suportado')
    }

    synthRef.current = window.speechSynthesis

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [onTranscript])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return

    setError(null)
    setTranscript('')
    setIsListening(true)

    try {
      recognitionRef.current.start()
    } catch (e) {
      console.error('Erro ao iniciar:', e)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current) return

      // Cancelar fala anterior
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'
      utterance.rate = 1.0
      utterance.pitch = 1.1 // Voz ligeiramente mais aguda para parecer feminina

      // Tentar encontrar voz feminina em português
      const voices = synthRef.current.getVoices()
      const femaleVoice = voices.find(
        (voice) =>
          voice.lang.includes('pt') &&
          (voice.name.toLowerCase().includes('female') ||
            voice.name.toLowerCase().includes('feminina') ||
            voice.name.includes('Luciana') ||
            voice.name.includes('Vitória'))
      )

      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        onSpeakEnd?.()
      }
      utterance.onerror = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    },
    [onSpeakEnd]
  )

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
```

## 14.2 src/components/chat/voice-button.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceChat } from '@/hooks/use-voice-chat'

interface VoiceButtonProps {
  onMessage: (text: string) => Promise<string>
}

export function VoiceButton({ onMessage }: VoiceButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const handleTranscript = async (text: string) => {
    if (!text.trim()) return

    setIsProcessing(true)
    try {
      const response = await onMessage(text)
      if (voiceEnabled && response) {
        speak(response)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoiceChat({
    onTranscript: handleTranscript,
  })

  return (
    <div className="flex items-center gap-2">
      {/* Botão de microfone */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing || isSpeaking}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-500 text-white'
            : isProcessing
            ? 'bg-gray-200 text-gray-400'
            : 'bg-primary-500 text-white hover:bg-primary-600'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}

        {/* Animação de ondas quando ouvindo */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-500"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Toggle de voz */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isSpeaking) stopSpeaking()
          setVoiceEnabled(!voiceEnabled)
        }}
        className={isSpeaking ? 'text-primary-500' : 'text-text-secondary'}
      >
        {voiceEnabled ? (
          <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </Button>

      {/* Transcript em tempo real */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 left-0 right-0 p-3 bg-white rounded-xl shadow-lg border"
          >
            <p className="text-sm text-text-secondary">Ouvindo...</p>
            <p className="text-text-primary">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

Vou criar a parte final do documento com a Comunidade e o Checklist.
# 🌸 VITAFIT - DOCUMENTO 4: MELHORIAS AVANÇADAS (PARTE FINAL)
## Comunidade, IA Avançada e Checklist de Implementação

---

# 15. COMUNIDADE E FÓRUM

## 15.1 src/app/api/community/groups/route.ts

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

    // Buscar grupos
    const { data: groups, error } = await supabase
      .from('community_groups')
      .select('*')
      .eq('is_active', true)
      .order('member_count', { ascending: false })

    if (error) throw error

    // Verificar quais o usuário participa
    const { data: memberships } = await supabase
      .from('community_members')
      .select('group_id')
      .eq('user_id', user.id)

    const memberGroupIds = new Set(memberships?.map((m) => m.group_id) || [])

    const groupsWithMembership = groups?.map((g) => ({
      ...g,
      is_member: memberGroupIds.has(g.id),
    }))

    return NextResponse.json(groupsWithMembership)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar grupos' }, { status: 500 })
  }
}
```

## 15.2 src/app/api/community/posts/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        author:users(id, name, avatar_url),
        group:community_groups(id, name)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    const { data: posts, error } = await query

    if (error) throw error

    // Verificar likes do usuário
    const postIds = posts?.map((p) => p.id) || []
    const { data: userLikes } = await supabase
      .from('community_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    const likedPostIds = new Set(userLikes?.map((l) => l.post_id) || [])

    const postsWithLikes = posts?.map((p) => ({
      ...p,
      is_liked: likedPostIds.has(p.id),
      author: p.is_anonymous ? { name: 'Anônima', avatar_url: null } : p.author,
    }))

    return NextResponse.json(postsWithLikes)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    // Verificar se é membro do grupo
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', body.group_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Você não é membro deste grupo' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        group_id: body.group_id,
        type: body.type || 'STORY',
        title: body.title,
        content: body.content,
        images: body.images || [],
        is_anonymous: body.is_anonymous || false,
      })
      .select()
      .single()

    if (error) throw error

    // Incrementar contador de posts no grupo
    await supabase.rpc('increment_post_count', { group_id: body.group_id })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar post' }, { status: 500 })
  }
}
```

## 15.3 src/app/api/community/join/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { groupId } = await req.json()

    // Verificar se já é membro
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', groupId)
      .single()

    if (existing) {
      // Sair do grupo
      await supabase
        .from('community_members')
        .delete()
        .eq('id', existing.id)

      await supabase.rpc('decrement_member_count', { group_id: groupId })

      return NextResponse.json({ joined: false })
    }

    // Entrar no grupo
    await supabase.from('community_members').insert({
      user_id: user.id,
      group_id: groupId,
    })

    await supabase.rpc('increment_member_count', { group_id: groupId })

    return NextResponse.json({ joined: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
```

## 15.4 src/app/api/community/like/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { postId, commentId } = await req.json()

    if (postId) {
      // Like em post
      const { data: existing } = await supabase
        .from('community_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single()

      if (existing) {
        await supabase.from('community_likes').delete().eq('id', existing.id)
        await supabase
          .from('community_posts')
          .update({ like_count: supabase.rpc('decrement', { x: 1 }) })
          .eq('id', postId)
        return NextResponse.json({ liked: false })
      }

      await supabase.from('community_likes').insert({
        user_id: user.id,
        post_id: postId,
      })
      await supabase.rpc('increment_post_likes', { post_id: postId })
      return NextResponse.json({ liked: true })
    }

    return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
```

## 15.5 SQL Functions para Comunidade

```sql
-- Função para incrementar contador de membros
CREATE OR REPLACE FUNCTION increment_member_count(group_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE community_groups
  SET member_count = member_count + 1
  WHERE id = group_id;
END;
$$;

-- Função para decrementar contador de membros
CREATE OR REPLACE FUNCTION decrement_member_count(group_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE community_groups
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = group_id;
END;
$$;

-- Função para incrementar contador de posts
CREATE OR REPLACE FUNCTION increment_post_count(group_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE community_groups
  SET post_count = post_count + 1
  WHERE id = group_id;
END;
$$;

-- Função para incrementar likes do post
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE community_posts
  SET like_count = like_count + 1
  WHERE id = post_id;
END;
$$;
```

## 15.6 src/app/(main)/community/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal'
import {
  Users,
  MessageCircle,
  Heart,
  Plus,
  Search,
  Loader2,
  Check,
  Image as ImageIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Group {
  id: string
  name: string
  description: string
  category: string
  image_url?: string
  member_count: number
  post_count: number
  is_member: boolean
}

interface Post {
  id: string
  type: string
  title?: string
  content: string
  images: string[]
  like_count: number
  comment_count: number
  is_liked: boolean
  created_at: string
  author: {
    name: string
    avatar_url?: string
  }
  group: {
    id: string
    name: string
  }
}

export default function CommunityPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feed' | 'groups'>('feed')
  const [groups, setGroups] = useState<Group[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // Form de novo post
  const [postContent, setPostContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'groups') {
        const response = await fetch('/api/community/groups')
        if (response.ok) {
          const data = await response.json()
          setGroups(data)
        }
      } else {
        const response = await fetch('/api/community/posts')
        if (response.ok) {
          const data = await response.json()
          setPosts(data)
        }
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const joinGroup = async (groupId: string) => {
    try {
      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })

      if (response.ok) {
        const { joined } = await response.json()
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  is_member: joined,
                  member_count: joined ? g.member_count + 1 : g.member_count - 1,
                }
              : g
          )
        )
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const likePost = async (postId: string) => {
    try {
      const response = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      if (response.ok) {
        const { liked } = await response.json()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  is_liked: liked,
                  like_count: liked ? p.like_count + 1 : p.like_count - 1,
                }
              : p
          )
        )
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const createPost = async () => {
    if (!postContent.trim() || !selectedGroup) return

    setIsPosting(true)
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          content: postContent,
          is_anonymous: isAnonymous,
        }),
      })

      if (response.ok) {
        setShowPostModal(false)
        setPostContent('')
        setIsAnonymous(false)
        setSelectedGroup(null)
        fetchData()
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsPosting(false)
    }
  }

  const myGroups = groups.filter((g) => g.is_member)

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Comunidade</h1>
            <p className="text-text-secondary">Conecte-se com outras mães</p>
          </div>
          {myGroups.length > 0 && (
            <Button onClick={() => setShowPostModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Postar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'feed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('feed')}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Feed
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'default' : 'outline'}
            onClick={() => setActiveTab('groups')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Grupos
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : activeTab === 'groups' ? (
          // Lista de Grupos
          <div className="space-y-3">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
                      <Users className="h-7 w-7 text-primary-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary">{group.name}</h3>
                      <p className="text-sm text-text-secondary line-clamp-1">
                        {group.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                        <span>{group.member_count} membros</span>
                        <span>•</span>
                        <span>{group.post_count} posts</span>
                      </div>
                    </div>

                    <Button
                      variant={group.is_member ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => joinGroup(group.id)}
                    >
                      {group.is_member ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Membro
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Feed de Posts
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Nenhum post ainda
                </h3>
                <p className="text-text-secondary mb-4">
                  Entre em grupos para ver posts no seu feed
                </p>
                <Button onClick={() => setActiveTab('groups')}>Ver Grupos</Button>
              </Card>
            ) : (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary-100 text-primary-600">
                            {post.author.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{post.author.name}</p>
                          <p className="text-xs text-text-secondary">
                            {post.group.name} •{' '}
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <p className="text-text-primary whitespace-pre-wrap">{post.content}</p>

                      {/* Imagens */}
                      {post.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {post.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="rounded-xl object-cover aspect-square"
                            />
                          ))}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                        <button
                          onClick={() => likePost(post.id)}
                          className="flex items-center gap-1 text-sm"
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              post.is_liked
                                ? 'text-red-500 fill-red-500'
                                : 'text-text-secondary'
                            }`}
                          />
                          <span className="text-text-secondary">{post.like_count}</span>
                        </button>
                        <button className="flex items-center gap-1 text-sm text-text-secondary">
                          <MessageCircle className="h-5 w-5" />
                          <span>{post.comment_count}</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Modal de Novo Post */}
        <Modal open={showPostModal} onOpenChange={setShowPostModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Novo Post</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Grupo
                </label>
                <div className="flex flex-wrap gap-2">
                  {myGroups.map((group) => (
                    <Badge
                      key={group.id}
                      variant={selectedGroup === group.id ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setSelectedGroup(group.id)}
                    >
                      {group.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  O que você quer compartilhar?
                </label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Escreva aqui..."
                  className="w-full h-32 p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-text-secondary">Postar anonimamente</span>
              </label>
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button
                onClick={createPost}
                disabled={!postContent.trim() || !selectedGroup}
                isLoading={isPosting}
              >
                Publicar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </PageContainer>
  )
}
```

---

# 16. WIDGETS PWA

## 16.1 Atualizar public/manifest.json

```json
{
  "name": "VitaFit",
  "short_name": "VitaFit",
  "description": "Seu app de saúde materna",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#E8A5B3",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Chat com Mia",
      "short_name": "Chat",
      "description": "Conversar com a assistente Mia",
      "url": "/chat",
      "icons": [{ "src": "/icons/chat-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Escanear Refeição",
      "short_name": "Scanner",
      "description": "Analisar sua refeição",
      "url": "/nutrition/scan",
      "icons": [{ "src": "/icons/scan-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Meu Progresso",
      "short_name": "Progresso",
      "description": "Ver evolução",
      "url": "/progress",
      "icons": [{ "src": "/icons/progress-icon.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["health", "fitness", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/chat.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

---

# 17. IA AVANÇADA - ANÁLISE DE HUMOR

## 17.1 src/app/api/mood/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatModel } from '@/lib/ai/gemini'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    // Buscar contexto do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('phase, last_menstrual_date')
      .eq('id', user.id)
      .single()

    // Buscar histórico recente de humor
    const { data: recentMoods } = await supabase
      .from('mood_logs')
      .select('mood, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7)

    // Análise com IA
    const prompt = `
Analise o registro de humor desta ${userData?.phase === 'PREGNANT' ? 'gestante' : userData?.phase === 'POSTPARTUM' ? 'mãe no pós-parto' : 'mulher'}:

Humor atual: ${body.mood}
Nível de energia: ${body.energy_level}/5
Nível de ansiedade: ${body.anxiety_level}/5
Fatores mencionados: ${body.factors?.join(', ') || 'Nenhum'}
Notas: ${body.notes || 'Nenhuma'}

Histórico recente (últimos 7 dias): ${recentMoods?.map(m => m.mood).join(', ') || 'Sem histórico'}

Forneça:
1. Uma análise breve e empática do estado emocional
2. 2-3 sugestões práticas e gentis
3. Avaliação de risco (0 = normal, 1 = atenção, 2 = preocupante)

Se detectar sinais de depressão pós-parto ou pensamentos preocupantes, indique risco 2.

Retorne JSON:
{
  "analysis": "Análise empática...",
  "suggestions": ["Sugestão 1", "Sugestão 2"],
  "risk_level": 0,
  "risk_message": null
}
`

    const result = await chatModel.generateContent(prompt)
    const text = result.response.text()
    const aiAnalysis = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())

    const { data, error } = await supabase
      .from('mood_logs')
      .insert({
        user_id: user.id,
        date: body.date || new Date().toISOString().split('T')[0],
        time: body.time || new Date().toTimeString().slice(0, 5),
        mood: body.mood,
        energy_level: body.energy_level,
        anxiety_level: body.anxiety_level,
        factors: body.factors || [],
        notes: body.notes,
        ai_analysis: aiAnalysis,
        ai_suggestions: aiAnalysis.suggestions,
        risk_flag: aiAnalysis.risk_level > 0,
        risk_level: aiAnalysis.risk_level,
      })
      .select()
      .single()

    if (error) throw error

    // Se risco alto, criar notificação
    if (aiAnalysis.risk_level >= 2) {
      await supabase.from('notification_history').insert({
        user_id: user.id,
        type: 'TIP',
        title: '💜 Cuidando de você',
        body: 'Notamos que você pode estar passando por um momento difícil. Que tal conversar com alguém de confiança ou um profissional?',
        action_url: '/chat',
      })
    }

    return NextResponse.json({
      ...data,
      ai_analysis: aiAnalysis,
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
```

## 17.2 src/app/(main)/mood/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Smile, Meh, Frown, Sun, Zap, Heart, Loader2, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type MoodType = 'GREAT' | 'GOOD' | 'OKAY' | 'LOW' | 'BAD'

interface MoodLog {
  id: string
  date: string
  mood: MoodType
  energy_level: number
  anxiety_level: number
  factors: string[]
  notes?: string
  ai_analysis?: {
    analysis: string
    suggestions: string[]
    risk_level: number
  }
}

const MOODS = [
  { value: 'GREAT', emoji: '😄', label: 'Ótimo', color: 'bg-green-500' },
  { value: 'GOOD', emoji: '🙂', label: 'Bem', color: 'bg-lime-500' },
  { value: 'OKAY', emoji: '😐', label: 'Ok', color: 'bg-yellow-500' },
  { value: 'LOW', emoji: '😔', label: 'Baixo', color: 'bg-orange-500' },
  { value: 'BAD', emoji: '😢', label: 'Mal', color: 'bg-red-500' },
]

const FACTORS = [
  'Sono ruim',
  'Estresse',
  'Trabalho',
  'Relacionamento',
  'Saúde',
  'Hormônios',
  'Solidão',
  'Dor física',
  'Preocupação com bebê',
  'Cansaço',
]

export default function MoodPage() {
  const [logs, setLogs] = useState<MoodLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(true)

  const [formData, setFormData] = useState({
    mood: '' as MoodType | '',
    energy_level: 3,
    anxiety_level: 3,
    factors: [] as string[],
    notes: '',
  })

  const [aiResponse, setAiResponse] = useState<{
    analysis: string
    suggestions: string[]
  } | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/mood?days=14')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)

        // Se já registrou hoje, esconder form
        const today = new Date().toISOString().split('T')[0]
        if (data.some((l: MoodLog) => l.date === today)) {
          setShowForm(false)
        }
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.mood) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setAiResponse(data.ai_analysis)
        fetchLogs()
        setShowForm(false)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getMoodInfo = (mood: MoodType) => MOODS.find((m) => m.value === mood)

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Como você está?</h1>
          <p className="text-text-secondary">Registre seu humor diário</p>
        </div>

        {/* Resposta da IA */}
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-purple-700">Mia diz:</span>
                </div>
                <p className="text-text-primary mb-3">{aiResponse.analysis}</p>
                <div className="space-y-2">
                  {aiResponse.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-purple-500">💜</span>
                      <span className="text-text-secondary">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Formulário de Registro */}
        {showForm ? (
          <Card>
            <CardContent className="p-4 space-y-6">
              {/* Seleção de Humor */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Como você está se sentindo?
                </label>
                <div className="flex justify-between">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setFormData({ ...formData, mood: mood.value as MoodType })}
                      className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                        formData.mood === mood.value
                          ? 'bg-primary-100 scale-110'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-3xl mb-1">{mood.emoji}</span>
                      <span className="text-xs text-text-secondary">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energia */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <Zap className="h-4 w-4 inline mr-1" />
                  Nível de energia
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormData({ ...formData, energy_level: n })}
                      className={`flex-1 py-2 rounded-lg transition-all ${
                        formData.energy_level >= n
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ansiedade */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  <Heart className="h-4 w-4 inline mr-1" />
                  Nível de ansiedade
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFormData({ ...formData, anxiety_level: n })}
                      className={`flex-1 py-2 rounded-lg transition-all ${
                        formData.anxiety_level >= n
                          ? 'bg-orange-400 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fatores */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  O que está influenciando? (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {FACTORS.map((factor) => (
                    <Badge
                      key={factor}
                      variant={formData.factors.includes(factor) ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          factors: formData.factors.includes(factor)
                            ? formData.factors.filter((f) => f !== factor)
                            : [...formData.factors, factor],
                        })
                      }}
                    >
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <Input
                label="Quer desabafar? (opcional)"
                placeholder="Escreva aqui..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!formData.mood}
                isLoading={isSaving}
              >
                Registrar Humor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            Registrar novo humor
          </Button>
        )}

        {/* Histórico */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : logs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Histórico</h2>
            <div className="space-y-2">
              {logs.map((log) => {
                const moodInfo = getMoodInfo(log.mood)
                return (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${moodInfo?.color} flex items-center justify-center text-xl`}
                      >
                        {moodInfo?.emoji}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{moodInfo?.label}</p>
                        <p className="text-xs text-text-secondary">
                          {format(new Date(log.date), "EEEE, d 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-secondary">
                        <p>Energia: {log.energy_level}/5</p>
                        <p>Ansiedade: {log.anxiety_level}/5</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
```

---

# 18. CHECKLIST FINAL DE IMPLEMENTAÇÃO

## 📦 DEPENDÊNCIAS ADICIONAIS

Execute no terminal:

```bash
npm install firebase firebase-admin @zxing/library @zxing/browser @react-pdf/renderer canvas-confetti googleapis
npm install -D @types/canvas-confetti
```

## 🗄️ SQL PARA EXECUTAR

Execute o SQL da **Seção 1 do Documento 4** no Supabase SQL Editor.

Depois execute as funções de comunidade:

```sql
-- Funções da Comunidade (Seção 15.5)
-- Cole aqui as funções increment_member_count, etc.
```

## 🔑 VARIÁVEIS DE AMBIENTE ADICIONAIS

Adicione ao `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# Google Fit (opcional)
GOOGLE_FIT_CLIENT_ID=...
GOOGLE_FIT_CLIENT_SECRET=...
```

## 📱 ARQUIVOS ESTÁTICOS

Crie em `/public/`:
- `/icons/` - Ícones PWA em vários tamanhos
- `/sounds/bell.mp3` - Som para timer (opcional)
- `/firebase-messaging-sw.js` - Service Worker do Firebase

## ✅ NOVAS PÁGINAS ADICIONADAS

| Página | Rota | Descrição |
|--------|------|-----------|
| Conquistas | `/achievements` | Sistema de gamificação |
| Desenvolvimento Bebê | `/baby-development` | Semana a semana |
| Scanner Barras | `/nutrition/barcode` | Escanear produtos |
| Relatórios | `/reports` | Gerar PDF mensal |
| Contrações | `/contractions` | Contador para parto |
| Medicamentos | `/medications` | Controle de remédios |
| Fotos Barriga | `/belly-photos` | Diário de fotos |
| Meditações | `/meditations` | Lista de meditações |
| Player Meditação | `/meditations/play` | Player com respiração |
| Sono | `/sleep` | Monitoramento de sono |
| Comunidade | `/community` | Fórum e grupos |
| Humor | `/mood` | Registro de humor |

## 🔄 ATUALIZAR NAVEGAÇÃO

Adicione as novas páginas ao menu/navegação do app:

```typescript
// Em src/components/layout/bottom-nav.tsx ou sidebar
const menuItems = [
  // ... itens existentes
  { icon: Trophy, label: 'Conquistas', href: '/achievements' },
  { icon: Baby, label: 'Bebê', href: '/baby-development' },
  { icon: Users, label: 'Comunidade', href: '/community' },
  { icon: Moon, label: 'Sono', href: '/sleep' },
  { icon: Heart, label: 'Humor', href: '/mood' },
  { icon: Pill, label: 'Medicamentos', href: '/medications' },
  { icon: Camera, label: 'Fotos', href: '/belly-photos' },
  { icon: Music, label: 'Meditações', href: '/meditations' },
]
```

## 🎯 ORDEM DE IMPLEMENTAÇÃO SUGERIDA

1. **Prioridade Alta (Implementar primeiro):**
   - [ ] Gamificação (engajamento)
   - [ ] Desenvolvimento do Bebê (valor para gestantes)
   - [ ] Notificações Push (retenção)
   - [ ] Scanner de Barras (praticidade)

2. **Prioridade Média:**
   - [ ] Controle de Medicamentos
   - [ ] Monitoramento de Sono
   - [ ] Diário de Fotos
   - [ ] Meditações

3. **Prioridade Baixa (Nice to have):**
   - [ ] Comunidade/Fórum
   - [ ] Integração Wearables
   - [ ] Chat por Voz
   - [ ] Contador de Contrações

---

# 📊 RESUMO FINAL DOS 4 DOCUMENTOS

| Documento | Linhas | Conteúdo |
|-----------|--------|----------|
| Parte 1 | ~4.500 | Setup, Configs, IA, Chat, Dashboard, Nutrição básica |
| Parte 2 | ~3.500 | Progresso, Consultas, Compras, Nomes, Mala, Perfil |
| Parte 3 | ~3.500 | SQL Completo, Storage, Upload, Parceiro, Receitas |
| Parte 4 | ~5.000 | Gamificação, Push, Scanner, PDF, Sono, Comunidade |
| **TOTAL** | **~16.500** | **App 100% + Melhorias Premium** |

---

# 🌸 VITAFIT ESTÁ COMPLETO!

## Funcionalidades Totais:

### Core (Docs 1-3):
- ✅ Autenticação completa
- ✅ Onboarding personalizado
- ✅ Dashboard inteligente
- ✅ Chat IA com memória
- ✅ Scanner de refeições
- ✅ Planos alimentares
- ✅ Receitas com IA
- ✅ Planos de treino
- ✅ Timer de exercícios
- ✅ Progresso com fotos
- ✅ Consultas médicas
- ✅ Lista de compras
- ✅ Nomes de bebê
- ✅ Mala maternidade
- ✅ Modo parceiro
- ✅ Conteúdo educativo
- ✅ PWA completo

### Premium (Doc 4):
- ✅ Sistema de gamificação
- ✅ Notificações push
- ✅ Desenvolvimento do bebê
- ✅ Scanner de código de barras
- ✅ Relatórios PDF
- ✅ Contador de contrações
- ✅ Controle de medicamentos
- ✅ Diário de fotos
- ✅ Meditações guiadas
- ✅ Monitoramento de sono
- ✅ Integração wearables
- ✅ Chat por voz
- ✅ Comunidade/Fórum
- ✅ Análise de humor

---

## 🚀 Próximos Passos

1. Implemente as funcionalidades na ordem de prioridade
2. Teste cada módulo individualmente
3. Configure Firebase para notificações
4. Adicione conteúdo real (meditações, exercícios, etc.)
5. Faça deploy em produção
6. Colete feedback dos usuários
7. Itere e melhore!

**Parabéns! Você tem agora um app completo e profissional!** 🎉💪🌸
