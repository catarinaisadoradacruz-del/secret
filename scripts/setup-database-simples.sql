-- =====================================================
-- PCGO Sistema Investigativo - Setup SIMPLIFICADO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: investigations (Investigações)
-- =====================================================
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  numero_procedimento TEXT,
  tipo TEXT DEFAULT 'inquerito',
  status TEXT DEFAULT 'em_andamento',
  data_fato DATE,
  local_fato TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on investigations" ON investigations;
CREATE POLICY "Allow all for authenticated users on investigations" ON investigations FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvos (Perfis Investigativos)
-- =====================================================
CREATE TABLE IF NOT EXISTS alvos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  rg_orgao TEXT,
  rg_uf TEXT DEFAULT 'GO',
  data_nascimento DATE,
  sexo TEXT,
  naturalidade TEXT,
  nacionalidade TEXT DEFAULT 'Brasileira',
  mae TEXT,
  pai TEXT,
  estado_civil TEXT,
  conjuge TEXT,
  alcunha TEXT,
  profissao TEXT,
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alvos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on alvos" ON alvos;
CREATE POLICY "Allow all for authenticated users on alvos" ON alvos FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_telefones
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_telefones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  status TEXT DEFAULT 'ativo',
  whatsapp BOOLEAN DEFAULT false,
  operadora TEXT,
  classificacao TEXT DEFAULT 'C',
  confirmado BOOLEAN DEFAULT false,
  data_informacao DATE,
  fonte TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alvo_telefones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on alvo_telefones" ON alvo_telefones;
CREATE POLICY "Allow all for authenticated users on alvo_telefones" ON alvo_telefones FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_enderecos
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_enderecos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  logradouro TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  quadra TEXT,
  lote TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Goiânia',
  uf TEXT DEFAULT 'GO',
  cep TEXT,
  tipo TEXT DEFAULT 'residencial',
  status TEXT DEFAULT 'NAO_CONFIRMADO',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  data_informacao DATE,
  fonte TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alvo_enderecos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on alvo_enderecos" ON alvo_enderecos;
CREATE POLICY "Allow all for authenticated users on alvo_enderecos" ON alvo_enderecos FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_passagens
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_passagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  data_fato DATE,
  tipo_penal TEXT,
  artigo TEXT,
  delegacia TEXT,
  situacao TEXT,
  numero_processo TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alvo_passagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on alvo_passagens" ON alvo_passagens;
CREATE POLICY "Allow all for authenticated users on alvo_passagens" ON alvo_passagens FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_veiculos
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_veiculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  placa TEXT,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  cor TEXT,
  renavam TEXT,
  chassi TEXT,
  situacao TEXT,
  restricoes TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alvo_veiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on alvo_veiculos" ON alvo_veiculos;
CREATE POLICY "Allow all for authenticated users on alvo_veiculos" ON alvo_veiculos FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: documentos
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT,
  conteudo TEXT,
  unidade TEXT,
  status TEXT DEFAULT 'rascunho',
  alvos_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on documentos" ON documentos;
CREATE POLICY "Allow all for authenticated users on documentos" ON documentos FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: unidades
-- =====================================================
CREATE TABLE IF NOT EXISTS unidades (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cabecalho TEXT,
  rodape TEXT,
  comarca TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for all on unidades" ON unidades;
CREATE POLICY "Allow read for all on unidades" ON unidades FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users on unidades" ON unidades;
CREATE POLICY "Allow all for authenticated users on unidades" ON unidades FOR ALL USING (auth.uid() IS NOT NULL);

-- Inserir unidades padrão
INSERT INTO unidades (id, nome, cabecalho, rodape, comarca, endereco, telefone, email) VALUES
('ABADIA_DE_GOIAS', 'SUBDELEGACIA DE POLÍCIA DE ABADIA DE GOIÁS', 'SUBDELEGACIA DE POLÍCIA DE ABADIA DE GOIÁS', 'Avenida Comercial, Qd. A, LT.2 – Setor Central, Abadia de Goiás-GO, Fone/fax: (62)3503-2667', 'GUAPÓ-GO', 'Avenida Comercial, Qd. A, LT.2 – Setor Central', '(62) 3503-2667', 'abadia@policiacivil.go.gov.br'),
('DIH', 'DELEGACIA ESTADUAL DE INVESTIGAÇÃO DE HOMICÍDIOS - DIH', 'DELEGACIA ESTADUAL DE INVESTIGAÇÃO DE HOMICÍDIOS - DIH', 'Av. Atílio Correa Lima, nº 1.699, Setor Cidade Jardim, fone/fax 62-3201-1165', 'GOIÂNIA-GO', 'Av. Atílio Correa Lima, nº 1.699, Setor Cidade Jardim', '(62) 3201-1165', 'dih@policiacivil.go.gov.br'),
('4DP_GOIANIA', '04ª DELEGACIA DE POLÍCIA DE GOIÂNIA', '04ª DELEGACIA DE POLÍCIA DE GOIÂNIA', 'RUA T29, 527 - SETOR BUENO - GOIÂNIA - GOIÁS, Telefone: (62)3201-2603', 'GOIÂNIA-GO', 'RUA T29, 527 - SETOR BUENO', '(62) 3201-2603', '4dp-goiania@policiacivil.go.gov.br'),
('CENTRAL_FLAGRANTES', 'CENTRAL GERAL DE FLAGRANTES', 'CENTRAL GERAL DE FLAGRANTES E PRONTO ATENDIMENTO AO CIDADÃO DE GOIÂNIA', 'Avenida Engenheiro Atílio Correia Lima, nº 1683, Cidade Jardim, Goiânia-GO', 'GOIÂNIA-GO', 'Avenida Engenheiro Atílio Correia Lima, nº 1683, Cidade Jardim', '(62) 3201-1133', 'central@policiacivil.go.gov.br')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABELA: phone_records
-- =====================================================
CREATE TABLE IF NOT EXISTS phone_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  alvo_id UUID REFERENCES alvos(id) ON DELETE SET NULL,
  numero_origem TEXT,
  numero_destino TEXT,
  data_hora TIMESTAMP WITH TIME ZONE,
  duracao INTEGER,
  tipo TEXT,
  erb_id TEXT,
  erb_latitude DECIMAL(10, 8),
  erb_longitude DECIMAL(11, 8),
  erb_endereco TEXT,
  erb_azimute INTEGER,
  operadora TEXT,
  imei TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE phone_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on phone_records" ON phone_records;
CREATE POLICY "Allow all for authenticated users on phone_records" ON phone_records FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: operacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS operacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codinome TEXT,
  data_prevista DATE,
  hora_prevista TIME,
  data_execucao DATE,
  status TEXT DEFAULT 'planejamento',
  tipo TEXT,
  objetivos TEXT,
  local TEXT,
  endereco_alvo TEXT,
  equipe JSONB,
  recursos JSONB,
  resultados TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on operacoes" ON operacoes;
CREATE POLICY "Allow all for authenticated users on operacoes" ON operacoes FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: forensic_images
-- =====================================================
CREATE TABLE IF NOT EXISTS forensic_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT,
  tamanho INTEGER,
  mime_type TEXT,
  tipo TEXT,
  descricao TEXT,
  hash_md5 TEXT,
  hash_sha256 TEXT,
  metadados JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  data_captura TIMESTAMP WITH TIME ZONE,
  dispositivo TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE forensic_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on forensic_images" ON forensic_images;
CREATE POLICY "Allow all for authenticated users on forensic_images" ON forensic_images FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: rai_analises
-- =====================================================
CREATE TABLE IF NOT EXISTS rai_analises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  numero_rai TEXT,
  data_emissao DATE,
  codigo_validacao TEXT,
  unidade_pm TEXT,
  unidade_pc TEXT,
  data_fato TIMESTAMP WITH TIME ZONE,
  local_fato TEXT,
  tipificacao TEXT,
  narrativa_pc TEXT,
  dados_extraidos JSONB,
  arquivo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE rai_analises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on rai_analises" ON rai_analises;
CREATE POLICY "Allow all for authenticated users on rai_analises" ON rai_analises FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: relatos_pc
-- =====================================================
CREATE TABLE IF NOT EXISTS relatos_pc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  rai_id UUID REFERENCES rai_analises(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  tipificacao TEXT,
  acao_penal TEXT,
  exames TEXT,
  blocos_aplicados TEXT[],
  status TEXT DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE relatos_pc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on relatos_pc" ON relatos_pc;
CREATE POLICY "Allow all for authenticated users on relatos_pc" ON relatos_pc FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: chat_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova Conversa',
  tipo TEXT DEFAULT 'geral',
  documento_em_construcao JSONB,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on chat_sessions" ON chat_sessions;
CREATE POLICY "Allow all for authenticated users on chat_sessions" ON chat_sessions FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: chat_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tipo_acao TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users on chat_messages" ON chat_messages;
CREATE POLICY "Allow all for authenticated users on chat_messages" ON chat_messages FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_alvos_investigation ON alvos(investigation_id);
CREATE INDEX IF NOT EXISTS idx_alvos_nome ON alvos(nome);
CREATE INDEX IF NOT EXISTS idx_alvos_cpf ON alvos(cpf);
CREATE INDEX IF NOT EXISTS idx_alvo_telefones_alvo ON alvo_telefones(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_enderecos_alvo ON alvo_enderecos(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_passagens_alvo ON alvo_passagens(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_veiculos_alvo ON alvo_veiculos(alvo_id);
CREATE INDEX IF NOT EXISTS idx_documentos_investigation ON documentos(investigation_id);
CREATE INDEX IF NOT EXISTS idx_phone_records_investigation ON phone_records(investigation_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_investigation ON operacoes(investigation_id);
CREATE INDEX IF NOT EXISTS idx_forensic_images_investigation ON forensic_images(investigation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_investigation ON chat_sessions(investigation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
