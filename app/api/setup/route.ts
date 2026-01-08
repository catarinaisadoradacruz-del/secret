import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST() {
  try {
    // Criar tabela investigations
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS investigations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          titulo TEXT NOT NULL,
          descricao TEXT,
          numero_procedimento TEXT,
          tipo TEXT DEFAULT 'inquerito',
          status TEXT DEFAULT 'em_andamento',
          data_fato DATE,
          local_fato TEXT,
          team_id UUID REFERENCES teams(id),
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).catch(() => {})

    // Criar tabela alvos
    const { error: alvosError } = await supabaseAdmin.from('alvos').select('id').limit(1)
    if (alvosError?.code === '42P01') {
      // Tabela não existe, criar via query direta
      console.log('Criando tabelas via Supabase Dashboard...')
    }

    return NextResponse.json({
      success: true,
      message: 'Execute o script SQL no Supabase Dashboard: scripts/setup-database.sql'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
