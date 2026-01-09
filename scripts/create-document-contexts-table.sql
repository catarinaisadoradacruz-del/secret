-- Tabela para armazenar contextos de documentos grandes processados
-- Permite que a IA mantenha contexto entre mensagens

CREATE TABLE IF NOT EXISTS document_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informacoes do arquivo
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  total_chunks INTEGER NOT NULL DEFAULT 1,

  -- Dados processados (sem resumo - texto original mantido intacto)
  entities JSONB DEFAULT '[]'::jsonb,
  chunks_data JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Indices
  CONSTRAINT valid_chunks CHECK (total_chunks > 0),
  CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_document_contexts_session
  ON document_contexts(session_id);

CREATE INDEX IF NOT EXISTS idx_document_contexts_user
  ON document_contexts(user_id);

CREATE INDEX IF NOT EXISTS idx_document_contexts_expires
  ON document_contexts(expires_at);

-- RLS (Row Level Security)
ALTER TABLE document_contexts ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios so veem seus proprios contextos
CREATE POLICY "Users can view own document contexts"
  ON document_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document contexts"
  ON document_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document contexts"
  ON document_contexts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own document contexts"
  ON document_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Tabela para armazenar imagens extraidas/enviadas
-- Permite reutilizar imagens em novos documentos
-- ============================================

CREATE TABLE IF NOT EXISTS document_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  document_id UUID REFERENCES document_contexts(id) ON DELETE SET NULL,

  -- Informacoes do arquivo
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER,

  -- Dados extraidos
  caption TEXT, -- Legenda/descricao da imagem
  ocr_text TEXT, -- Texto extraido via OCR

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_document_images_user
  ON document_images(user_id);

CREATE INDEX IF NOT EXISTS idx_document_images_session
  ON document_images(session_id);

CREATE INDEX IF NOT EXISTS idx_document_images_document
  ON document_images(document_id);

-- RLS
ALTER TABLE document_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images"
  ON document_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
  ON document_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
  ON document_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON document_images FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Funcoes auxiliares
-- ============================================

-- Funcao para limpar contextos expirados (pode ser executada via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_document_contexts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM document_contexts
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at nas imagens
CREATE OR REPLACE FUNCTION update_document_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_images_updated_at
  BEFORE UPDATE ON document_images
  FOR EACH ROW
  EXECUTE FUNCTION update_document_images_updated_at();

-- ============================================
-- Storage bucket para imagens (executar no Supabase Dashboard)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('document-images', 'document-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Comentarios
COMMENT ON TABLE document_contexts IS 'Armazena contextos de documentos grandes processados - texto ORIGINAL dividido em partes';
COMMENT ON COLUMN document_contexts.chunks_data IS 'Array JSON com os chunks do documento - texto original sem resumir';
COMMENT ON COLUMN document_contexts.entities IS 'Entidades extraidas automaticamente (CPF, telefones, nomes, etc)';
COMMENT ON COLUMN document_contexts.expires_at IS 'Contextos expiram automaticamente apos 48h';

COMMENT ON TABLE document_images IS 'Armazena imagens de documentos para OCR e reutilizacao';
COMMENT ON COLUMN document_images.ocr_text IS 'Texto extraido da imagem via OCR (Gemini Vision)';
COMMENT ON COLUMN document_images.caption IS 'Legenda ou descricao da imagem';
