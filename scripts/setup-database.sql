-- =====================================================
-- PCGO Sistema Investigativo - Setup Completo do Banco
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
  tipo TEXT DEFAULT 'inquerito', -- inquerito, flagrante, rai, outros
  status TEXT DEFAULT 'em_andamento', -- em_andamento, concluido, arquivado
  data_fato DATE,
  local_fato TEXT,
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para investigations
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investigations from their teams" ON investigations
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create investigations" ON investigations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their investigations" ON investigations
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete investigations" ON investigations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para alvos
ALTER TABLE alvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alvos" ON alvos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create alvos" ON alvos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update alvos" ON alvos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete alvos" ON alvos
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- TABELA: alvo_telefones (Telefones dos Alvos)
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_telefones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  status TEXT DEFAULT 'ativo', -- ativo, inativo
  whatsapp BOOLEAN DEFAULT false,
  operadora TEXT,
  classificacao TEXT DEFAULT 'C', -- A+, A, B, C, D
  confirmado BOOLEAN DEFAULT false,
  data_informacao DATE,
  fonte TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para alvo_telefones
ALTER TABLE alvo_telefones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alvo_telefones" ON alvo_telefones
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_enderecos (Endereços dos Alvos)
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
  tipo TEXT DEFAULT 'residencial', -- residencial, comercial, eventual
  status TEXT DEFAULT 'NAO_CONFIRMADO', -- CONFIRMADO, FALTA_CONFIRMAR, NAO_CONFIRMADO, INCERTO, PRESO
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  data_informacao DATE,
  fonte TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para alvo_enderecos
ALTER TABLE alvo_enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alvo_enderecos" ON alvo_enderecos
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_passagens (Histórico Criminal)
-- =====================================================
CREATE TABLE IF NOT EXISTS alvo_passagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  data_fato DATE,
  tipo_penal TEXT,
  artigo TEXT,
  delegacia TEXT,
  situacao TEXT, -- em_andamento, arquivado, condenado, absolvido
  numero_processo TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para alvo_passagens
ALTER TABLE alvo_passagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alvo_passagens" ON alvo_passagens
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: alvo_veiculos (Veículos dos Alvos)
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

-- RLS para alvo_veiculos
ALTER TABLE alvo_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alvo_veiculos" ON alvo_veiculos
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: rai_analises (Análises de RAI)
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para rai_analises
ALTER TABLE rai_analises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rai_analises" ON rai_analises
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: documentos (Documentos Gerados)
-- =====================================================
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- RELINT, LEVANTAMENTO, REP_INTERCEPTACAO, REP_BA, REP_PREVENTIVA, RELATORIO, OFICIO
  titulo TEXT,
  conteudo TEXT,
  unidade TEXT,
  status TEXT DEFAULT 'rascunho', -- rascunho, finalizado
  alvos_ids UUID[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para documentos
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documentos" ON documentos
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: unidades (Unidades PCGO)
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

-- RLS para unidades
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unidades" ON unidades
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage unidades" ON unidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Inserir unidades padrão
INSERT INTO unidades (id, nome, cabecalho, rodape, comarca, endereco, telefone, email) VALUES
('ABADIA_DE_GOIAS', 'SUBDELEGACIA DE POLÍCIA DE ABADIA DE GOIÁS', 'SUBDELEGACIA DE POLÍCIA DE ABADIA DE GOIÁS', 'Avenida Comercial, Qd. A, LT.2 – Setor Central, Abadia de Goiás-GO, Fone/fax: (62)3503-2667 - www.policiacivil.go.gov.br', 'GUAPÓ-GO', 'Avenida Comercial, Qd. A, LT.2 – Setor Central', '(62) 3503-2667', 'abadia@policiacivil.go.gov.br'),
('DIH', 'DELEGACIA ESTADUAL DE INVESTIGAÇÃO DE HOMICÍDIOS - DIH', 'DELEGACIA ESTADUAL DE INVESTIGAÇÃO DE HOMICÍDIOS - DIH', 'Av. Atílio Correa Lima, nº 1.699, Setor Cidade Jardim, fone/fax 62-3201-1165, CEP 74.425-030 - Goiânia – GO', 'GOIÂNIA-GO', 'Av. Atílio Correa Lima, nº 1.699, Setor Cidade Jardim', '(62) 3201-1165', 'dih@policiacivil.go.gov.br'),
('4DP_GOIANIA', '04ª DELEGACIA DE POLÍCIA DE GOIÂNIA', '04ª DELEGACIA DE POLÍCIA DE GOIÂNIA', 'RUA T29, 527 - SETOR BUENO - GOIÂNIA - GOIÁS, Telefone: (62)3201-2603 - www.policiacivil.go.gov.br', 'GOIÂNIA-GO', 'RUA T29, 527 - SETOR BUENO', '(62) 3201-2603', '4dp-goiania@policiacivil.go.gov.br'),
('CENTRAL_FLAGRANTES', 'CENTRAL GERAL DE FLAGRANTES E PRONTO ATENDIMENTO', 'CENTRAL GERAL DE FLAGRANTES E PRONTO ATENDIMENTO AO CIDADÃO DE GOIÂNIA', 'Avenida Engenheiro Atílio Correia Lima, nº 1683, Cidade Jardim, Goiânia-GO, CEP 74.425-030, Telefone: (62) 3201-1133 - www.policiacivil.go.gov.br', 'GOIÂNIA-GO', 'Avenida Engenheiro Atílio Correia Lima, nº 1683, Cidade Jardim', '(62) 3201-1133', 'central@policiacivil.go.gov.br')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABELA: phone_records (Registros Telefônicos/ERB)
-- =====================================================
CREATE TABLE IF NOT EXISTS phone_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  numero_origem TEXT,
  numero_destino TEXT,
  data_hora TIMESTAMP WITH TIME ZONE,
  duracao INTEGER, -- segundos
  tipo TEXT, -- chamada_enviada, chamada_recebida, sms_enviado, sms_recebido
  erb_id TEXT,
  erb_latitude DECIMAL(10, 8),
  erb_longitude DECIMAL(11, 8),
  erb_endereco TEXT,
  erb_azimute INTEGER,
  operadora TEXT,
  imei TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para phone_records
ALTER TABLE phone_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage phone_records" ON phone_records
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: operacoes (Operações Policiais)
-- =====================================================
CREATE TABLE IF NOT EXISTS operacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codinome TEXT,
  data_prevista DATE,
  hora_prevista TIME,
  data_execucao DATE,
  status TEXT DEFAULT 'planejamento', -- planejamento, aprovada, em_andamento, concluida, cancelada
  tipo TEXT, -- busca_apreensao, prisao, conducao, outros
  objetivos TEXT,
  local TEXT,
  endereco_alvo TEXT,
  equipe JSONB, -- [{user_id, nome, funcao}]
  recursos JSONB, -- [{tipo, quantidade, descricao}]
  resultados TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para operacoes
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage operacoes" ON operacoes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: forensic_images (Imagens Forenses)
-- =====================================================
CREATE TABLE IF NOT EXISTS forensic_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT,
  tamanho INTEGER,
  mime_type TEXT,
  tipo TEXT, -- foto, print, documento, video
  descricao TEXT,
  hash_md5 TEXT,
  hash_sha256 TEXT,
  metadados JSONB, -- EXIF e outros metadados
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  data_captura TIMESTAMP WITH TIME ZONE,
  dispositivo TEXT,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para forensic_images
ALTER TABLE forensic_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage forensic_images" ON forensic_images
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: relatos_pc (Relatos PC gerados)
-- =====================================================
CREATE TABLE IF NOT EXISTS relatos_pc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  rai_id UUID REFERENCES rai_analises(id),
  conteudo TEXT NOT NULL,
  tipificacao TEXT,
  acao_penal TEXT,
  exames TEXT,
  blocos_aplicados TEXT[],
  status TEXT DEFAULT 'rascunho', -- rascunho, finalizado
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para relatos_pc
ALTER TABLE relatos_pc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage relatos_pc" ON relatos_pc
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- ÍNDICES para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_alvos_investigation ON alvos(investigation_id);
CREATE INDEX IF NOT EXISTS idx_alvos_nome ON alvos(nome);
CREATE INDEX IF NOT EXISTS idx_alvos_cpf ON alvos(cpf);
CREATE INDEX IF NOT EXISTS idx_alvo_telefones_alvo ON alvo_telefones(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_enderecos_alvo ON alvo_enderecos(alvo_id);
CREATE INDEX IF NOT EXISTS idx_documentos_investigation ON documentos(investigation_id);
CREATE INDEX IF NOT EXISTS idx_phone_records_investigation ON phone_records(investigation_id);
CREATE INDEX IF NOT EXISTS idx_phone_records_data ON phone_records(data_hora);
CREATE INDEX IF NOT EXISTS idx_operacoes_investigation ON operacoes(investigation_id);
CREATE INDEX IF NOT EXISTS idx_forensic_images_investigation ON forensic_images(investigation_id);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
