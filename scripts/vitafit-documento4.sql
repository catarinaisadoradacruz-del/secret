-- ============================================================
-- VITAFIT - DOCUMENTO 4 - MELHORIAS AVANÇADAS
-- Execute no SQL Editor do Supabase
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

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type achievement_type NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#E8A5B3',
  requirement_type TEXT NOT NULL,
  requirement_value INT NOT NULL,
  points INT DEFAULT 10,
  sort_order INT DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INT DEFAULT 0,
  notified BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  total_points INT DEFAULT 0,
  level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  meals_logged INT DEFAULT 0,
  workouts_completed INT DEFAULT 0,
  water_goals_met INT DEFAULT 0,
  days_active INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_history_user ON points_history(user_id, created_at);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL,
  reward_points INT DEFAULT 50,
  reward_badge_id UUID REFERENCES achievements(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  is_sent BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications ON scheduled_notifications(scheduled_for, is_sent);

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
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  interval_seconds INT,
  intensity INT DEFAULT 5,
  phase contraction_phase,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractions_user ON contractions(user_id, started_at);

CREATE TABLE IF NOT EXISTS contraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_contractions INT DEFAULT 0,
  avg_duration_seconds INT,
  avg_interval_seconds INT,
  notes TEXT,
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
  type TEXT DEFAULT 'supplement',
  frequency TEXT DEFAULT 'daily',
  times_per_day INT DEFAULT 1,
  specific_times TIME[] DEFAULT '{}',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  take_with_food BOOLEAN DEFAULT false,
  current_stock INT,
  stock_alert_threshold INT DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#E8A5B3',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id, is_active);

CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  taken BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
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
  gestation_week INT NOT NULL,
  gestation_day INT DEFAULT 0,
  photo_date DATE DEFAULT CURRENT_DATE,
  caption TEXT,
  mood mood_type,
  belly_measurement FLOAT,
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
  type TEXT NOT NULL,
  category TEXT,
  audio_url TEXT,
  image_url TEXT,
  duration_seconds INT NOT NULL,
  target_phases user_phase[] DEFAULT '{}',
  target_trimester INT[],
  instructor TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meditation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  meditation_id UUID REFERENCES meditations(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INT,
  completed BOOLEAN DEFAULT false,
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
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  duration_minutes INT,
  quality INT,
  interruptions INT DEFAULT 0,
  interruption_reasons TEXT[] DEFAULT '{}',
  symptoms TEXT[] DEFAULT '{}',
  notes TEXT,
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
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  scopes TEXT[] DEFAULT '{}',
  is_connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES wearable_connections(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  data_type TEXT NOT NULL,
  value FLOAT,
  unit TEXT,
  raw_data JSONB,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, data_type)
);

CREATE INDEX IF NOT EXISTS idx_wearable_data ON wearable_data(user_id, date, data_type);

-- ==================== COMUNIDADE ====================

CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'public',
  category TEXT,
  image_url TEXT,
  rules TEXT[] DEFAULT '{}',
  member_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE NOT NULL,
  type post_type DEFAULT 'STORY',
  title TEXT,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts ON community_posts(group_id, created_at);

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
  mood mood_type NOT NULL,
  energy_level INT,
  anxiety_level INT,
  factors TEXT[] DEFAULT '{}',
  notes TEXT,
  ai_analysis JSONB,
  ai_suggestions TEXT[] DEFAULT '{}',
  risk_flag BOOLEAN DEFAULT false,
  risk_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user ON mood_logs(user_id, date);

-- ==================== DESENVOLVIMENTO DO BEBÊ ====================

CREATE TABLE IF NOT EXISTS baby_development (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week INT UNIQUE NOT NULL,
  size_comparison TEXT NOT NULL,
  size_cm FLOAT,
  weight_grams FLOAT,
  developments TEXT[] DEFAULT '{}',
  baby_movements TEXT,
  common_symptoms TEXT[] DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  nutrition_tips TEXT[] DEFAULT '{}',
  exercise_tips TEXT[] DEFAULT '{}',
  recommended_exams TEXT[] DEFAULT '{}',
  illustration_url TEXT,
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
  
  FOR v_achievement IN 
    SELECT a.* FROM achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua 
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    IF (v_achievement.requirement_type = 'streak' AND v_points.current_streak >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'meals' AND v_points.meals_logged >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'workouts' AND v_points.workouts_completed >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'points' AND v_points.total_points >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'level' AND v_points.level >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'days' AND v_points.days_active >= v_achievement.requirement_value)
    THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_achievement.requirement_value)
      ON CONFLICT DO NOTHING;
      
      UPDATE user_points 
      SET total_points = total_points + v_achievement.points,
          level = calculate_level(total_points + v_achievement.points)
      WHERE user_id = p_user_id;
      
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
  IF NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date THEN
    IF NEW.last_activity_date = OLD.last_activity_date + INTERVAL '1 day' THEN
      NEW.current_streak := OLD.current_streak + 1;
      NEW.days_active := OLD.days_active + 1;
      IF NEW.current_streak > OLD.longest_streak THEN
        NEW.longest_streak := NEW.current_streak;
      END IF;
    ELSIF NEW.last_activity_date > OLD.last_activity_date + INTERVAL '1 day' THEN
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

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE belly_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_development ENABLE ROW LEVEL SECURITY;

-- Políticas de usuário
DROP POLICY IF EXISTS "Users own achievements" ON user_achievements;
CREATE POLICY "Users own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own points" ON user_points;
CREATE POLICY "Users own points" ON user_points FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own points history" ON points_history;
CREATE POLICY "Users own points history" ON points_history FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own challenges" ON user_challenges;
CREATE POLICY "Users own challenges" ON user_challenges FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own push tokens" ON push_tokens;
CREATE POLICY "Users own push tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own scheduled notifications" ON scheduled_notifications;
CREATE POLICY "Users own scheduled notifications" ON scheduled_notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own notification history" ON notification_history;
CREATE POLICY "Users own notification history" ON notification_history FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own contractions" ON contractions;
CREATE POLICY "Users own contractions" ON contractions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own contraction sessions" ON contraction_sessions;
CREATE POLICY "Users own contraction sessions" ON contraction_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own medications" ON medications;
CREATE POLICY "Users own medications" ON medications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own medication logs" ON medication_logs;
CREATE POLICY "Users own medication logs" ON medication_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own belly photos" ON belly_photos;
CREATE POLICY "Users own belly photos" ON belly_photos FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own meditation sessions" ON meditation_sessions;
CREATE POLICY "Users own meditation sessions" ON meditation_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own sleep logs" ON sleep_logs;
CREATE POLICY "Users own sleep logs" ON sleep_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own wearable connections" ON wearable_connections;
CREATE POLICY "Users own wearable connections" ON wearable_connections FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own wearable data" ON wearable_data;
CREATE POLICY "Users own wearable data" ON wearable_data FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own community memberships" ON community_members;
CREATE POLICY "Users own community memberships" ON community_members FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own mood logs" ON mood_logs;
CREATE POLICY "Users own mood logs" ON mood_logs FOR ALL USING (auth.uid() = user_id);

-- Políticas públicas
DROP POLICY IF EXISTS "Anyone can read achievements" ON achievements;
CREATE POLICY "Anyone can read achievements" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read challenges" ON challenges;
CREATE POLICY "Anyone can read challenges" ON challenges FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read meditations" ON meditations;
CREATE POLICY "Anyone can read meditations" ON meditations FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read baby development" ON baby_development;
CREATE POLICY "Anyone can read baby development" ON baby_development FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read community groups" ON community_groups;
CREATE POLICY "Anyone can read community groups" ON community_groups FOR SELECT USING (is_active = true);

-- Políticas de comunidade
DROP POLICY IF EXISTS "Members can read posts" ON community_posts;
CREATE POLICY "Members can read posts" ON community_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND group_id = community_posts.group_id)
  OR is_approved = true
);

DROP POLICY IF EXISTS "Members can create posts" ON community_posts;
CREATE POLICY "Members can create posts" ON community_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND group_id = community_posts.group_id)
);

DROP POLICY IF EXISTS "Users own posts" ON community_posts;
CREATE POLICY "Users own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own posts delete" ON community_posts;
CREATE POLICY "Users own posts delete" ON community_posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read comments" ON community_comments;
CREATE POLICY "Anyone can read comments" ON community_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can comment" ON community_comments;
CREATE POLICY "Authenticated can comment" ON community_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users own comments" ON community_comments;
CREATE POLICY "Users own comments" ON community_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own comments delete" ON community_comments;
CREATE POLICY "Users own comments delete" ON community_comments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own likes" ON community_likes;
CREATE POLICY "Users own likes" ON community_likes FOR ALL USING (auth.uid() = user_id);

-- ==================== DADOS INICIAIS ====================

-- Conquistas/Badges
INSERT INTO achievements (code, name, description, type, icon, requirement_type, requirement_value, points, sort_order) VALUES
('streak_3', 'Começando Bem', 'Use o app por 3 dias seguidos', 'STREAK', '🔥', 'streak', 3, 10, 1),
('streak_7', 'Uma Semana!', 'Use o app por 7 dias seguidos', 'STREAK', '🔥', 'streak', 7, 25, 2),
('streak_14', 'Duas Semanas!', 'Use o app por 14 dias seguidos', 'STREAK', '🔥', 'streak', 14, 50, 3),
('streak_30', 'Um Mês Inteiro!', 'Use o app por 30 dias seguidos', 'STREAK', '🏆', 'streak', 30, 100, 4),
('streak_60', 'Dedicação Total', 'Use o app por 60 dias seguidos', 'STREAK', '💎', 'streak', 60, 200, 5),
('meals_10', 'Alimentação Consciente', 'Registre 10 refeições', 'MILESTONE', '🥗', 'meals', 10, 15, 10),
('meals_50', 'Diário Alimentar', 'Registre 50 refeições', 'MILESTONE', '🥗', 'meals', 50, 50, 11),
('meals_100', 'Nutricionista Pessoal', 'Registre 100 refeições', 'MILESTONE', '🥗', 'meals', 100, 100, 12),
('meals_500', 'Mestre da Nutrição', 'Registre 500 refeições', 'MILESTONE', '👑', 'meals', 500, 250, 13),
('workouts_5', 'Corpo em Movimento', 'Complete 5 treinos', 'MILESTONE', '💪', 'workouts', 5, 20, 20),
('workouts_20', 'Atleta em Formação', 'Complete 20 treinos', 'MILESTONE', '💪', 'workouts', 20, 50, 21),
('workouts_50', 'Guerreira Fitness', 'Complete 50 treinos', 'MILESTONE', '💪', 'workouts', 50, 100, 22),
('workouts_100', 'Lenda do Exercício', 'Complete 100 treinos', 'MILESTONE', '🏅', 'workouts', 100, 250, 23),
('level_5', 'Evoluindo!', 'Alcance o nível 5', 'MILESTONE', '⭐', 'level', 5, 30, 30),
('level_10', 'Experiente', 'Alcance o nível 10', 'MILESTONE', '⭐', 'level', 10, 75, 31),
('level_25', 'Veterana', 'Alcance o nível 25', 'MILESTONE', '🌟', 'level', 25, 150, 32),
('level_50', 'Lendária', 'Alcance o nível 50', 'MILESTONE', '✨', 'level', 50, 300, 33),
('first_scan', 'Primeira Análise', 'Escaneie sua primeira refeição', 'SPECIAL', '📸', 'meals', 1, 10, 40),
('first_workout', 'Primeiro Treino', 'Complete seu primeiro treino', 'SPECIAL', '🎯', 'workouts', 1, 10, 41),
('water_goal_7', 'Hidratada', 'Bata a meta de água por 7 dias', 'CHALLENGE', '💧', 'water_goals', 7, 30, 50)
ON CONFLICT (code) DO NOTHING;

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

-- Grupos da Comunidade
INSERT INTO community_groups (name, description, type, category, rules) VALUES
('Gestantes - 1º Trimestre', 'Grupo para futuras mamães no primeiro trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Gestantes - 2º Trimestre', 'Grupo para futuras mamães no segundo trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Gestantes - 3º Trimestre', 'Grupo para futuras mamães no terceiro trimestre', 'public', 'gestantes', ARRAY['Seja respeitosa', 'Não dê conselhos médicos', 'Apoie outras mães']),
('Pós-Parto', 'Apoio para mães no pós-parto', 'public', 'pos-parto', ARRAY['Seja respeitosa', 'Não julgue escolhas', 'Apoie outras mães']),
('Receitas Saudáveis', 'Compartilhe receitas nutritivas', 'public', 'receitas', ARRAY['Apenas receitas saudáveis', 'Indique se é seguro para gestantes']),
('Exercícios e Bem-estar', 'Dicas de atividades físicas', 'public', 'exercicios', ARRAY['Sempre indique o nível de intensidade', 'Lembre de consultar o médico']),
('Mães de Primeira Viagem', 'Grupo especial para mães de primeira viagem', 'public', 'geral', ARRAY['Seja acolhedora', 'Nenhuma pergunta é boba', 'Compartilhe experiências'])
ON CONFLICT DO NOTHING;

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
  ARRAY['Dedos das mãos e pés se formando', 'Pálpebras cobrindo os olhos', 'Movimentos começam'],
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
  ARRAY['Expressões faciais possíveis', 'Lanugo aparecendo', 'Fígado produzindo bile'],
  ARRAY['Barriga começando a aparecer', 'Menos enjoos', 'Cabelo mais brilhante'],
  ARRAY['Use protetor solar', 'Durma de lado quando possível', 'Faça exercícios de Kegel'],
  ARRAY['O bebê pode fazer caretas!']
),
(15, 'Maçã', 10.1, 70.0,
  ARRAY['Esqueleto endurecendo', 'Pernas mais longas que braços', 'Ouvidos na posição final'],
  ARRAY['Linha nigra pode aparecer', 'Nariz entupido', 'Gengivas sensíveis'],
  ARRAY['Mantenha boa higiene bucal', 'Use travesseiro entre as pernas', 'Hidrate a pele da barriga'],
  ARRAY['O bebê pode ouvir seu coração batendo!']
),
(16, 'Abacate', 11.6, 100.0,
  ARRAY['Olhos sensíveis à luz', 'Unhas dos pés crescendo', 'Cordão umbilical fortalecendo'],
  ARRAY['Primeiros movimentos sentidos', 'Mais disposição', 'Dor nas costas'],
  ARRAY['Comece a conversar com o bebê', 'Faça alongamentos', 'Considere yoga pré-natal'],
  ARRAY['O bebê já pode ouvir sua voz!']
),
(17, 'Pera', 13.0, 140.0,
  ARRAY['Gordura começando a se formar', 'Reflexo de sucção', 'Impressões digitais completas'],
  ARRAY['Movimentos mais fortes', 'Desejos alimentares', 'Mudanças na pele'],
  ARRAY['Mantenha dieta equilibrada', 'Hidrate-se bem', 'Observe os movimentos do bebê'],
  ARRAY['O bebê já consegue bocejar!']
),
(18, 'Batata doce', 14.2, 190.0,
  ARRAY['Sistema nervoso amadurecendo', 'Pode reagir a sons altos', 'Movimentos mais coordenados'],
  ARRAY['Ultrassom morfológico acontece', 'Possível saber o sexo', 'Barriga mais evidente'],
  ARRAY['Prepare-se para o ultrassom', 'Toque músicas para o bebê', 'Fotografe a barriga'],
  ARRAY['O bebê pode ouvir música e sua voz claramente!']
),
(19, 'Manga', 15.3, 240.0,
  ARRAY['Vernix começa a cobrir a pele', 'Audição desenvolvida', 'Cérebro definindo sentidos'],
  ARRAY['Dores ligamentares', 'Tontura ao levantar', 'Inchaço leve'],
  ARRAY['Levante devagar', 'Eleve as pernas', 'Continue exercícios leves'],
  ARRAY['O bebê já tem seus próprios padrões de sono!']
),
(20, 'Banana', 16.4, 300.0,
  ARRAY['Metade da gravidez!', 'Engolindo líquido amniótico', 'Unhas formadas'],
  ARRAY['Barriga bem visível', 'Mais fome', 'Desconforto para dormir'],
  ARRAY['Celebre a metade da jornada!', 'Durma de lado', 'Faça refeições menores'],
  ARRAY['O bebê pode saborear o que você come através do líquido amniótico!']
),
(21, 'Cenoura', 26.7, 360.0,
  ARRAY['Sobrancelhas e cabelo crescendo', 'Movimentos mais coordenados', 'Paladar desenvolvendo'],
  ARRAY['Contrações de Braxton Hicks', 'Azia frequente', 'Varizes podem surgir'],
  ARRAY['Use meias de compressão', 'Evite alimentos picantes', 'Continue atividades físicas'],
  ARRAY['O bebê se movimenta cerca de 50 vezes por hora!']
),
(22, 'Mamão', 27.8, 430.0,
  ARRAY['Olhos formados mas íris sem cor', 'Pâncreas desenvolvendo', 'Lábios mais definidos'],
  ARRAY['Estrias podem aparecer', 'Umbigo saltando', 'Dor nas costas'],
  ARRAY['Use óleos para estrias', 'Mantenha postura correta', 'Faça exercícios para costas'],
  ARRAY['O bebê pode sentir quando você acaricia a barriga!']
),
(23, 'Toranja', 28.9, 500.0,
  ARRAY['Pele menos transparente', 'Pulmões praticando respiração', 'Audição apurada'],
  ARRAY['Inchaço nos pés', 'Ronco', 'Sangramento gengival'],
  ARRAY['Eleve os pés frequentemente', 'Durma com travesseiro elevado', 'Use fio dental'],
  ARRAY['O bebê pode reconhecer sua voz e a do parceiro!']
),
(24, 'Espiga de milho', 30.0, 600.0,
  ARRAY['Viabilidade fora do útero começa', 'Pulmões produzindo surfactante', 'Face completamente formada'],
  ARRAY['Síndrome do túnel do carpo', 'Olhos secos', 'Câimbras'],
  ARRAY['Use talas para punho se necessário', 'Alongue-se frequentemente', 'Coma bananas para câimbras'],
  ARRAY['Se nascesse agora, teria chance de sobreviver com cuidados intensivos!']
),
(25, 'Couve-flor', 34.6, 660.0,
  ARRAY['Capilares se formando', 'Narinas se abrindo', 'Sistema auditivo completo'],
  ARRAY['Dificuldade para dormir', 'Hemorroidas', 'Azia intensa'],
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
  ARRAY['Cílios completos', 'Pode piscar', 'REM sleep'],
  ARRAY['Falta de ar', 'Vazamento de colostro', 'Dores pélvicas'],
  ARRAY['Use absorventes de seio se necessário', 'Faça exercícios para assoalho pélvico', 'Considere acupuntura'],
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
  ARRAY['Sistema imunológico desenvolvendo', 'Ossos endurecendo', 'Cérebro crescendo rápido'],
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
  ARRAY['Pode sentir o bebê mais baixo', 'Respiração mais fácil', 'Pressão na bexiga'],
  ARRAY['Consultas semanais começam', 'Descanse com pés elevados', 'Mantenha a calma'],
  ARRAY['O bebê está quase pronto para nascer!']
),
(37, 'Acelga', 48.6, 2900.0,
  ARRAY['A termo! Bebê considerado pronto', 'Coordenação melhorando', 'Gordura completando'],
  ARRAY['Alívio na respiração se bebê desceu', 'Ansiedade máxima', 'Possível perda do tampão'],
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

-- ==================== FIM DO SQL DOCUMENTO 4 ====================
