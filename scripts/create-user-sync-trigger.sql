-- ============================================================
-- TRIGGER PARA SINCRONIZAR AUTH.USERS COM USERS TABLE
-- Este trigger cria automaticamente um registro na tabela users
-- quando um novo usuário se registra (via email ou OAuth)
-- ============================================================

-- Função para criar usuário na tabela users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phase, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'ACTIVE',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SYNC USUÁRIOS EXISTENTES
-- Cria registros para usuários que já existem no auth.users
-- mas não têm registro na tabela users
-- ============================================================

INSERT INTO public.users (id, email, name, phase, onboarding_completed, premium)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ) as name,
  'ACTIVE' as phase,
  false as onboarding_completed,
  COALESCE((au.raw_user_meta_data->>'premium')::boolean, false) as premium
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;
