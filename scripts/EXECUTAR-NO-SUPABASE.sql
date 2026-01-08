-- =====================================================
-- PCGO Sistema - SQL SIMPLIFICADO PARA EXECUTAR
-- Cole este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new
-- =====================================================

-- 1. ALVO_TELEFONES
CREATE TABLE IF NOT EXISTS alvo_telefones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alvo_telefones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on alvo_telefones" ON alvo_telefones FOR ALL USING (true);

-- 2. ALVO_ENDERECOS
CREATE TABLE IF NOT EXISTS alvo_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  logradouro TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  quadra TEXT,
  lote TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Goiania',
  uf TEXT DEFAULT 'GO',
  cep TEXT,
  tipo TEXT DEFAULT 'residencial',
  status TEXT DEFAULT 'NAO_CONFIRMADO',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  data_informacao DATE,
  fonte TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alvo_enderecos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on alvo_enderecos" ON alvo_enderecos FOR ALL USING (true);

-- 3. ALVO_PASSAGENS
CREATE TABLE IF NOT EXISTS alvo_passagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alvo_id UUID REFERENCES alvos(id) ON DELETE CASCADE,
  data_fato DATE,
  tipo_penal TEXT,
  artigo TEXT,
  delegacia TEXT,
  situacao TEXT,
  numero_processo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alvo_passagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on alvo_passagens" ON alvo_passagens FOR ALL USING (true);

-- 4. ALVO_VEICULOS
CREATE TABLE IF NOT EXISTS alvo_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alvo_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on alvo_veiculos" ON alvo_veiculos FOR ALL USING (true);

-- 5. DOCUMENTOS
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT,
  conteudo TEXT,
  unidade TEXT,
  status TEXT DEFAULT 'rascunho',
  alvos_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on documentos" ON documentos FOR ALL USING (true);

-- 6. UNIDADES
CREATE TABLE IF NOT EXISTS unidades (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cabecalho TEXT,
  rodape TEXT,
  comarca TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on unidades" ON unidades FOR ALL USING (true);

INSERT INTO unidades (id, nome, cabecalho, rodape, comarca, endereco, telefone, email) VALUES
('DIH', 'DELEGACIA ESTADUAL DE INVESTIGACAO DE HOMICIDIOS', 'DELEGACIA ESTADUAL DE INVESTIGACAO DE HOMICIDIOS - DIH', 'Av. Atilio Correa Lima, 1699, Cidade Jardim', 'GOIANIA-GO', 'Av. Atilio Correa Lima, 1699', '(62) 3201-1165', 'dih@policiacivil.go.gov.br'),
('4DP', '04a DELEGACIA DE POLICIA DE GOIANIA', '04a DELEGACIA DE POLICIA DE GOIANIA', 'Rua T29, 527 - Setor Bueno', 'GOIANIA-GO', 'Rua T29, 527', '(62) 3201-2603', '4dp@policiacivil.go.gov.br')
ON CONFLICT (id) DO NOTHING;

-- 7. OPERACOES
CREATE TABLE IF NOT EXISTS operacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on operacoes" ON operacoes FOR ALL USING (true);

-- 8. FORENSIC_IMAGES
CREATE TABLE IF NOT EXISTS forensic_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  data_captura TIMESTAMPTZ,
  dispositivo TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE forensic_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on forensic_images" ON forensic_images FOR ALL USING (true);

-- 9. RAI_ANALISES
CREATE TABLE IF NOT EXISTS rai_analises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  numero_rai TEXT,
  data_emissao DATE,
  codigo_validacao TEXT,
  unidade_pm TEXT,
  unidade_pc TEXT,
  data_fato TIMESTAMPTZ,
  local_fato TEXT,
  tipificacao TEXT,
  narrativa_pc TEXT,
  dados_extraidos JSONB,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rai_analises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on rai_analises" ON rai_analises FOR ALL USING (true);

-- 10. RELATOS_PC
CREATE TABLE IF NOT EXISTS relatos_pc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  tipificacao TEXT,
  acao_penal TEXT,
  exames TEXT,
  blocos_aplicados TEXT[],
  status TEXT DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE relatos_pc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on relatos_pc" ON relatos_pc FOR ALL USING (true);

-- 11. CHAT_SESSIONS
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID REFERENCES investigations(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova Conversa',
  tipo TEXT DEFAULT 'geral',
  documento_em_construcao JSONB,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on chat_sessions" ON chat_sessions FOR ALL USING (true);

-- 12. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tipo_acao TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated on chat_messages" ON chat_messages FOR ALL USING (true);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_alvo_telefones_alvo ON alvo_telefones(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_enderecos_alvo ON alvo_enderecos(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_passagens_alvo ON alvo_passagens(alvo_id);
CREATE INDEX IF NOT EXISTS idx_alvo_veiculos_alvo ON alvo_veiculos(alvo_id);
CREATE INDEX IF NOT EXISTS idx_documentos_inv ON documentos(investigation_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_inv ON operacoes(investigation_id);
CREATE INDEX IF NOT EXISTS idx_forensic_images_inv ON forensic_images(investigation_id);
CREATE INDEX IF NOT EXISTS idx_rai_analises_inv ON rai_analises(investigation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_inv ON chat_sessions(investigation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- FUNCAO EXEC_SQL (para futuros scripts)
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- FIM DO SCRIPT
SELECT 'Todas as 12 tabelas foram criadas com sucesso!' as resultado;
