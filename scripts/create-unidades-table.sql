-- =============================================================
-- TABELA DE UNIDADES POLICIAIS
-- Armazena informacoes de cada delegacia/unidade
-- =============================================================

-- Criar tabela de unidades
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao
  codigo VARCHAR(50) NOT NULL UNIQUE, -- Ex: 'DIH', '4DP', 'DEIC'
  nome VARCHAR(200) NOT NULL, -- Nome completo
  nome_curto VARCHAR(100), -- Nome abreviado para uso em documentos
  tipo VARCHAR(50) NOT NULL DEFAULT 'delegacia', -- delegacia, departamento, nucleo

  -- Hierarquia
  departamento VARCHAR(200), -- Ex: 'Departamento de Policia Judiciaria'
  subordinacao VARCHAR(200), -- Ex: 'Secretaria da Seguranca Publica'

  -- Contato
  endereco TEXT,
  cidade VARCHAR(100) DEFAULT 'Goiania',
  uf VARCHAR(2) DEFAULT 'GO',
  cep VARCHAR(10),
  telefone VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(200),

  -- Brasoes e imagens (URLs do storage)
  brasao_url TEXT, -- URL do brasao da unidade
  brasao_pcgo_url TEXT, -- URL do brasao PCGO (pode ser diferente por unidade)
  logo_url TEXT, -- Logo alternativo se houver

  -- Cabecalho e Rodape do documento
  cabecalho_linha1 VARCHAR(200) DEFAULT 'Estado de Goias',
  cabecalho_linha2 VARCHAR(200) DEFAULT 'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  cabecalho_linha3 VARCHAR(200) DEFAULT 'Policia Civil',
  cabecalho_linha4 VARCHAR(200), -- Ex: 'Departamento de Policia Judiciaria'
  cabecalho_linha5 VARCHAR(200), -- Ex: 'Delegacia Estadual de Investigacao de Homicidios - DIH'

  rodape_linha1 TEXT, -- Endereco completo
  rodape_linha2 VARCHAR(200), -- Cidade - UF

  -- Configuracoes de documentos
  modelo_relatorio TEXT, -- Template personalizado se houver
  assinatura_padrao VARCHAR(200), -- Ex: 'Escrivao de Policia'

  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar indice para busca
CREATE INDEX IF NOT EXISTS idx_unidades_codigo ON unidades(codigo);
CREATE INDEX IF NOT EXISTS idx_unidades_ativo ON unidades(ativo);

-- RLS
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

-- Todos os usuarios autenticados podem ler unidades
CREATE POLICY "Usuarios podem ler unidades" ON unidades
  FOR SELECT TO authenticated USING (true);

-- Apenas admins podem modificar (vamos simplificar por ora)
CREATE POLICY "Admins podem modificar unidades" ON unidades
  FOR ALL TO authenticated USING (true);

-- =============================================================
-- TABELA DE USUARIO-UNIDADE
-- Vincula usuarios as suas unidades
-- =============================================================

CREATE TABLE IF NOT EXISTS user_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,

  -- Permissoes
  is_primary BOOLEAN DEFAULT false, -- Unidade principal do usuario
  can_edit_documents BOOLEAN DEFAULT true,
  can_generate_reports BOOLEAN DEFAULT true,

  -- Cargo/funcao nesta unidade
  cargo VARCHAR(100), -- Ex: 'Escrivao', 'Agente', 'Delegado'
  matricula VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, unidade_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_unidades_user ON user_unidades(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unidades_unidade ON user_unidades(unidade_id);

-- RLS
ALTER TABLE user_unidades ENABLE ROW LEVEL SECURITY;

-- Usuarios veem suas proprias unidades
CREATE POLICY "Usuarios veem suas unidades" ON user_unidades
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Usuarios podem modificar suas proprias vinculacoes
CREATE POLICY "Usuarios modificam suas unidades" ON user_unidades
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================
-- INSERIR UNIDADES INICIAIS
-- =============================================================

-- DIH - Delegacia de Homicidios
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  endereco, cidade, uf, cep, telefone,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha1, rodape_linha2
) VALUES (
  'DIH',
  'Delegacia Estadual de Investigacao de Homicidios',
  'DIH',
  'delegacia',
  'Departamento de Policia Judiciaria',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Av. Atilio Correa Lima, n 1.699, Setor Cidade Jardim',
  'Goiania',
  'GO',
  '74.425-030',
  '(62) 3201-1165',
  'Departamento de Policia Judiciaria',
  'Delegacia Estadual de Investigacao de Homicidios - DIH',
  'Av. Atilio Correa Lima, n 1.699, Setor Cidade Jardim, fone/fax 62-3201-1165, CEP.74.425-030',
  'Goiania - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- 4a DP de Goiania (exemplo)
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  cidade, uf,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha2
) VALUES (
  '4DP',
  '4a Delegacia de Policia de Goiania',
  '4a DP',
  'delegacia',
  'Delegacia Geral de Policia',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Goiania',
  'GO',
  'Delegacia Geral de Policia',
  '4a Delegacia de Policia de Goiania',
  'Goiania - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- Central de Flagrantes
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  cidade, uf,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha2
) VALUES (
  'CENTRAL_FLAGRANTES',
  'Central de Flagrantes de Goiania',
  'Central de Flagrantes',
  'delegacia',
  'Delegacia Geral de Policia',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Goiania',
  'GO',
  'Delegacia Geral de Policia',
  'Central de Flagrantes de Goiania',
  'Goiania - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- Subdelegacia de Abadia de Goias
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  cidade, uf,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha2
) VALUES (
  'ABADIA_DE_GOIAS',
  'Subdelegacia de Policia de Abadia de Goias',
  'Subdelegacia Abadia',
  'delegacia',
  'Delegacia Regional de Policia',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Abadia de Goias',
  'GO',
  'Delegacia Regional de Policia',
  'Subdelegacia de Policia de Abadia de Goias',
  'Abadia de Goias - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- DEIC - Crimes Contra o Patrimonio
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  cidade, uf,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha2
) VALUES (
  'DEIC',
  'Delegacia Estadual de Investigacao Criminal',
  'DEIC',
  'delegacia',
  'Departamento de Policia Judiciaria',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Goiania',
  'GO',
  'Departamento de Policia Judiciaria',
  'Delegacia Estadual de Investigacao Criminal - DEIC',
  'Goiania - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- DENARC - Narcoticos
INSERT INTO unidades (
  codigo, nome, nome_curto, tipo,
  departamento, subordinacao,
  cidade, uf,
  cabecalho_linha4, cabecalho_linha5,
  rodape_linha2
) VALUES (
  'DENARC',
  'Delegacia Estadual de Repressao a Narcoticos',
  'DENARC',
  'delegacia',
  'Departamento de Policia Judiciaria',
  'Secretaria da Seguranca Publica e Administracao Penitenciaria',
  'Goiania',
  'GO',
  'Departamento de Policia Judiciaria',
  'Delegacia Estadual de Repressao a Narcoticos - DENARC',
  'Goiania - GO'
) ON CONFLICT (codigo) DO NOTHING;

-- =============================================================
-- FUNCAO PARA PEGAR UNIDADE PRINCIPAL DO USUARIO
-- =============================================================

CREATE OR REPLACE FUNCTION get_user_primary_unidade(p_user_id UUID)
RETURNS TABLE (
  unidade_id UUID,
  codigo VARCHAR,
  nome VARCHAR,
  nome_curto VARCHAR,
  brasao_url TEXT,
  cabecalho_linha1 VARCHAR,
  cabecalho_linha2 VARCHAR,
  cabecalho_linha3 VARCHAR,
  cabecalho_linha4 VARCHAR,
  cabecalho_linha5 VARCHAR,
  rodape_linha1 TEXT,
  rodape_linha2 VARCHAR,
  cargo VARCHAR,
  matricula VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as unidade_id,
    u.codigo,
    u.nome,
    u.nome_curto,
    u.brasao_url,
    u.cabecalho_linha1,
    u.cabecalho_linha2,
    u.cabecalho_linha3,
    u.cabecalho_linha4,
    u.cabecalho_linha5,
    u.rodape_linha1,
    u.rodape_linha2,
    uu.cargo,
    uu.matricula
  FROM user_unidades uu
  JOIN unidades u ON u.id = uu.unidade_id
  WHERE uu.user_id = p_user_id
    AND uu.is_primary = true
    AND u.ativo = true
  LIMIT 1;
END;
$$;
