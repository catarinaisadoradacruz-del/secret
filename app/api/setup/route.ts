import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST() {
  try {
    // Verificar se as tabelas existem
    const { error: alvosError } = await supabaseAdmin.from('alvos').select('id').limit(1)
    const { error: invError } = await supabaseAdmin.from('investigations').select('id').limit(1)

    const tabelasFaltando: string[] = []

    if (alvosError?.code === '42P01') {
      tabelasFaltando.push('alvos')
    }
    if (invError?.code === '42P01') {
      tabelasFaltando.push('investigations')
    }

    if (tabelasFaltando.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Tabelas não encontradas: ${tabelasFaltando.join(', ')}. Execute o script SQL no Supabase Dashboard: scripts/setup-database.sql`
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Todas as tabelas estão configuradas corretamente!'
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
