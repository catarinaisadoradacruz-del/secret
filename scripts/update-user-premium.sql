-- =====================================================
-- Script para atualizar usuário para PREMIUM
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Primeiro, verificar se a coluna premium existe na tabela users
-- Se não existir, adicione-a
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'premium'
    ) THEN
        ALTER TABLE users ADD COLUMN premium BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Atualizar o usuário brunodivinoa@gmail.com para premium
UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"premium": true}'::jsonb
WHERE email = 'brunodivinoa@gmail.com';

-- Se existir tabela users separada (profiles), atualizar também
UPDATE users
SET premium = true
WHERE email = 'brunodivinoa@gmail.com'
OR id = (SELECT id FROM auth.users WHERE email = 'brunodivinoa@gmail.com');

-- Verificar resultado
SELECT
  id,
  email,
  raw_user_meta_data->>'premium' as premium_meta,
  created_at
FROM auth.users
WHERE email = 'brunodivinoa@gmail.com';

-- Se houver tabela users/profiles, verificar também
SELECT
  id,
  email,
  premium,
  name,
  phase,
  created_at
FROM users
WHERE email = 'brunodivinoa@gmail.com'
LIMIT 1;
