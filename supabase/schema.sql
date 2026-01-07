-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Investigations table
CREATE TABLE IF NOT EXISTS public.investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  numero_procedimento TEXT,
  tipo TEXT, -- 'Inquérito Policial', 'Procedimento Investigatório', etc.
  status TEXT DEFAULT 'Em Andamento', -- 'Em Andamento', 'Concluído', 'Arquivado'
  data_inicio DATE,
  data_conclusao DATE,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alvos (Targets) table
CREATE TABLE IF NOT EXISTS public.alvos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  data_nascimento DATE,
  mae TEXT,
  pai TEXT,
  endereco TEXT,
  telefones TEXT[], -- Array de telefones
  veiculos TEXT[], -- Array de veículos
  foto_url TEXT,
  status TEXT DEFAULT 'Investigação', -- 'Investigação', 'Indiciado', 'Preso', 'Foragido'
  observacoes TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAI Analysis table
CREATE TABLE IF NOT EXISTS public.rai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  rai_numero TEXT,
  file_url TEXT,
  dados_extraidos JSONB, -- Gemini extracted data
  analise_completa TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phone records table
CREATE TABLE IF NOT EXISTS public.phone_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  alvo_id UUID REFERENCES public.alvos(id) ON DELETE CASCADE,
  numero_origem TEXT,
  numero_destino TEXT,
  data_hora TIMESTAMP WITH TIME ZONE,
  duracao INTEGER, -- segundos
  tipo TEXT, -- 'Chamada', 'SMS', 'WhatsApp'
  erb_origem TEXT,
  erb_destino TEXT,
  latitude_origem DECIMAL(10, 8),
  longitude_origem DECIMAL(11, 8),
  latitude_destino DECIMAL(10, 8),
  longitude_destino DECIMAL(11, 8),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ERB (Cell Tower) locations
CREATE TABLE IF NOT EXISTS public.erb_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  operadora TEXT,
  endereco TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forensic analysis table
CREATE TABLE IF NOT EXISTS public.forensic_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  tipo TEXT, -- 'Imagem', 'Vídeo', 'Documento'
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  analise_gemini JSONB, -- Gemini Vision analysis result
  observacoes TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operations table
CREATE TABLE IF NOT EXISTS public.operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  nome_operacao TEXT NOT NULL,
  data_planejada DATE,
  hora_planejada TIME,
  local TEXT,
  objetivo TEXT,
  equipes JSONB, -- Array de equipes com membros e funções
  recursos JSONB, -- Recursos necessários
  ordem_missao TEXT, -- Ordem de missão gerada
  status TEXT DEFAULT 'Planejada', -- 'Planejada', 'Em Execução', 'Concluída', 'Cancelada'
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'RELINT', 'Representação Prisão', 'Representação Busca', etc.
  titulo TEXT NOT NULL,
  conteudo JSONB, -- Document data structure
  file_url TEXT, -- Generated PDF URL
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table for sharing
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type TEXT NOT NULL, -- 'investigation', 'alvo', 'document', etc.
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL, -- 'view', 'edit', 'delete'
  granted_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_type, resource_id, user_id, permission_level)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erb_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for teams
CREATE POLICY "Team members can view their teams" ON public.teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for investigations
CREATE POLICY "Users can view own investigations" ON public.investigations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE resource_type = 'investigation'
        AND resource_id = id
        AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Users can create investigations" ON public.investigations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own investigations" ON public.investigations
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE resource_type = 'investigation'
        AND resource_id = id
        AND user_id = auth.uid()
        AND permission_level IN ('edit', 'delete')
    )
  );

CREATE POLICY "Users can delete own investigations" ON public.investigations
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.permissions
      WHERE resource_type = 'investigation'
        AND resource_id = id
        AND user_id = auth.uid()
        AND permission_level = 'delete'
    )
  );

-- RLS Policies for alvos (similar to investigations)
CREATE POLICY "Users can view accessible alvos" ON public.alvos
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Users can create alvos" ON public.alvos
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own alvos" ON public.alvos
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own alvos" ON public.alvos
  FOR DELETE USING (owner_id = auth.uid());

-- Similar RLS policies for other tables
CREATE POLICY "Users can view accessible RAI analysis" ON public.rai_analysis
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create RAI analysis" ON public.rai_analysis
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Phone records policies
CREATE POLICY "Users can view accessible phone records" ON public.phone_records
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create phone records" ON public.phone_records
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ERB locations (public read)
CREATE POLICY "Anyone can view ERB locations" ON public.erb_locations
  FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create ERB locations" ON public.erb_locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Forensic analysis policies
CREATE POLICY "Users can view accessible forensic analysis" ON public.forensic_analysis
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create forensic analysis" ON public.forensic_analysis
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Operations policies
CREATE POLICY "Users can view accessible operations" ON public.operations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create operations" ON public.operations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own operations" ON public.operations
  FOR UPDATE USING (owner_id = auth.uid());

-- Documents policies
CREATE POLICY "Users can view accessible documents" ON public.documents
  FOR SELECT USING (
    owner_id = auth.uid() OR
    investigation_id IN (
      SELECT id FROM public.investigations
      WHERE owner_id = auth.uid() OR
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Permissions policies
CREATE POLICY "Users can view permissions granted to them" ON public.permissions
  FOR SELECT USING (user_id = auth.uid() OR granted_by = auth.uid());

CREATE POLICY "Resource owners can grant permissions" ON public.permissions
  FOR INSERT WITH CHECK (granted_by = auth.uid());

CREATE POLICY "Granters can revoke permissions" ON public.permissions
  FOR DELETE USING (granted_by = auth.uid());

-- Audit log policies (admin only)
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "System can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (TRUE);

-- Indexes for performance
CREATE INDEX idx_investigations_owner ON public.investigations(owner_id);
CREATE INDEX idx_investigations_team ON public.investigations(team_id);
CREATE INDEX idx_alvos_investigation ON public.alvos(investigation_id);
CREATE INDEX idx_phone_records_investigation ON public.phone_records(investigation_id);
CREATE INDEX idx_phone_records_alvo ON public.phone_records(alvo_id);
CREATE INDEX idx_phone_records_datetime ON public.phone_records(data_hora);
CREATE INDEX idx_permissions_resource ON public.permissions(resource_type, resource_id);
CREATE INDEX idx_permissions_user ON public.permissions(user_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alvos_updated_at BEFORE UPDATE ON public.alvos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
