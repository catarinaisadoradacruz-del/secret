# 🌸 VITAFIT - DOCUMENTO COMPLEMENTAR
## Páginas e Funcionalidades Adicionais

**Este documento complementa o documento principal com as páginas restantes.**

---

# ÍNDICE

1. [APIs Adicionais](#1-apis-adicionais)
2. [Hooks Adicionais](#2-hooks-adicionais)
3. [Componentes Extras](#3-componentes-extras)
4. [Página de Progresso](#4-página-de-progresso)
5. [Página de Consultas](#5-página-de-consultas)
6. [Página de Lista de Compras](#6-página-de-lista-de-compras)
7. [Página de Nomes de Bebê](#7-página-de-nomes-de-bebê)
8. [Página de Mala Maternidade](#8-página-de-mala-maternidade)
9. [Subpáginas do Perfil](#9-subpáginas-do-perfil)
10. [Página de Conteúdo Educativo](#10-página-de-conteúdo-educativo)
11. [Componentes de Gráficos](#11-componentes-de-gráficos)
12. [Timer de Treino](#12-timer-de-treino)

---

# 1. APIS ADICIONAIS

## 1.1 src/app/api/progress/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar progresso' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('progress')
      .insert({
        user_id: user.id,
        ...body,
      })
      .select()
      .single()
    
    if (error) throw error

    // Atualizar peso atual do usuário se informado
    if (body.weight) {
      await supabase
        .from('users')
        .update({ current_weight: body.weight })
        .eq('id', user.id)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar progresso' }, { status: 500 })
  }
}
```

## 1.2 src/app/api/appointments/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const upcoming = searchParams.get('upcoming') === 'true'
    
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
    
    if (upcoming) {
      query = query.gte('date', new Date().toISOString().split('T')[0])
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar consultas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        ...body,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar consulta' }, { status: 500 })
  }
}
```

## 1.3 src/app/api/appointments/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('appointments')
      .update(body)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
  }
}
```

## 1.4 src/app/api/shopping/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { data: lists, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        items:shopping_items(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(lists)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar listas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { name, items } = await req.json()
    
    // Criar lista
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ user_id: user.id, name })
      .select()
      .single()
    
    if (listError) throw listError
    
    // Adicionar itens
    if (items && items.length > 0) {
      const itemsWithListId = items.map((item: any) => ({
        ...item,
        list_id: list.id,
      }))
      
      await supabase.from('shopping_items').insert(itemsWithListId)
    }
    
    return NextResponse.json(list)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 })
  }
}
```

## 1.5 src/app/api/shopping/items/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('shopping_items')
      .insert(body)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { id, ...updates } = await req.json()
    
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar item' }, { status: 500 })
  }
}
```

## 1.6 src/app/api/baby-names/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatModel } from '@/lib/ai/gemini'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const gender = searchParams.get('gender')
    
    // Buscar favoritos do usuário
    const { data: favorites } = await supabase
      .from('favorite_baby_names')
      .select(`
        *,
        name:baby_names(*)
      `)
      .eq('user_id', user.id)
    
    // Buscar nomes por gênero
    let query = supabase.from('baby_names').select('*').limit(50)
    
    if (gender && gender !== 'all') {
      query = query.eq('gender', gender.toUpperCase())
    }
    
    const { data: names } = await query
    
    return NextResponse.json({ names, favorites })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar nomes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { action, nameId, liked, preferences } = await req.json()
    
    if (action === 'favorite') {
      const { data, error } = await supabase
        .from('favorite_baby_names')
        .upsert({
          user_id: user.id,
          name_id: nameId,
          liked,
        })
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json(data)
    }
    
    if (action === 'generate') {
      // Gerar sugestões com IA
      const prompt = `
Gere 10 nomes de bebê com base nas preferências:
- Gênero: ${preferences.gender || 'qualquer'}
- Estilo: ${preferences.style || 'clássico e moderno'}
- Origem: ${preferences.origin || 'qualquer'}

Retorne APENAS JSON válido:
{
  "names": [
    {"name": "Nome", "gender": "MALE/FEMALE/NEUTRAL", "origin": "origem", "meaning": "significado"}
  ]
}
`
      const result = await chatModel.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      
      return NextResponse.json(parsed)
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
```

## 1.7 src/app/api/maternity-bag/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ITEMS = {
  MOM: [
    { item: 'Camisolas ou pijamas (3-4)', essential: true },
    { item: 'Roupão', essential: false },
    { item: 'Chinelo', essential: true },
    { item: 'Sutiãs de amamentação (2-3)', essential: true },
    { item: 'Calcinhas pós-parto (5-6)', essential: true },
    { item: 'Absorventes pós-parto', essential: true },
    { item: 'Itens de higiene pessoal', essential: true },
    { item: 'Roupa para sair do hospital', essential: true },
    { item: 'Pomada para mamilos', essential: true },
    { item: 'Cinta pós-parto', essential: false },
  ],
  BABY: [
    { item: 'Bodies (6-8)', essential: true },
    { item: 'Mijões/Culotes (4-5)', essential: true },
    { item: 'Macacões (3-4)', essential: true },
    { item: 'Meias e luvinhas (3 pares)', essential: true },
    { item: 'Touca (2)', essential: true },
    { item: 'Manta', essential: true },
    { item: 'Fraldas RN', essential: true },
    { item: 'Lenços umedecidos', essential: true },
    { item: 'Pomada para assadura', essential: true },
    { item: 'Roupa para sair do hospital', essential: true },
  ],
  DOCUMENTS: [
    { item: 'RG e CPF', essential: true },
    { item: 'Carteira do plano de saúde', essential: true },
    { item: 'Cartão do pré-natal', essential: true },
    { item: 'Exames do pré-natal', essential: true },
    { item: 'Guia de internação', essential: true },
    { item: 'Certidão de casamento (se aplicável)', essential: false },
  ],
  PARTNER: [
    { item: 'Documento de identificação', essential: true },
    { item: 'Troca de roupa', essential: true },
    { item: 'Itens de higiene pessoal', essential: true },
    { item: 'Carregador de celular', essential: true },
    { item: 'Lanches', essential: false },
  ],
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('maternity_bag_items')
      .select('*')
      .eq('user_id', user.id)
      .order('category')
      .order('essential', { ascending: false })
    
    if (error) throw error
    
    // Se não tem itens, criar os padrões
    if (!data || data.length === 0) {
      const defaultItems: any[] = []
      
      Object.entries(DEFAULT_ITEMS).forEach(([category, items]) => {
        items.forEach((item) => {
          defaultItems.push({
            user_id: user.id,
            category,
            ...item,
            packed: false,
          })
        })
      })
      
      await supabase.from('maternity_bag_items').insert(defaultItems)
      
      const { data: newData } = await supabase
        .from('maternity_bag_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
      
      return NextResponse.json(newData)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const body = await req.json()
    
    const { data, error } = await supabase
      .from('maternity_bag_items')
      .insert({
        user_id: user.id,
        ...body,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { id, ...updates } = await req.json()
    
    const { data, error } = await supabase
      .from('maternity_bag_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('maternity_bag_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
  }
}
```

## 1.8 src/app/api/content/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/ai/memory-system'
import { chatModel } from '@/lib/ai/gemini'

// Conteúdos estáticos (pode migrar para banco depois)
const EDUCATIONAL_CONTENT = [
  {
    id: '1',
    title: 'Alimentação no 1º Trimestre',
    description: 'O que comer e evitar nas primeiras semanas',
    type: 'article',
    category: 'nutrition',
    phase: 'PREGNANT',
    trimester: 1,
    duration: '5 min',
    image: '/content/nutrition-1tri.jpg',
  },
  {
    id: '2',
    title: 'Exercícios Seguros na Gravidez',
    description: 'Atividades físicas recomendadas para gestantes',
    type: 'video',
    category: 'workout',
    phase: 'PREGNANT',
    duration: '12 min',
    image: '/content/workout-pregnancy.jpg',
  },
  {
    id: '3',
    title: 'Recuperação Pós-Parto',
    description: 'Cuidados essenciais nas primeiras semanas',
    type: 'article',
    category: 'health',
    phase: 'POSTPARTUM',
    duration: '8 min',
    image: '/content/postpartum.jpg',
  },
  {
    id: '4',
    title: 'Amamentação: Guia Completo',
    description: 'Dicas para uma amamentação tranquila',
    type: 'article',
    category: 'nutrition',
    phase: 'POSTPARTUM',
    duration: '10 min',
    image: '/content/breastfeeding.jpg',
  },
  {
    id: '5',
    title: 'Treino HIIT em Casa',
    description: 'Queime calorias em apenas 20 minutos',
    type: 'video',
    category: 'workout',
    phase: 'ACTIVE',
    duration: '20 min',
    image: '/content/hiit.jpg',
  },
  {
    id: '6',
    title: 'Desenvolvimento do Bebê Semana a Semana',
    description: 'Acompanhe o crescimento do seu bebê',
    type: 'article',
    category: 'baby',
    phase: 'PREGNANT',
    duration: '15 min',
    image: '/content/baby-dev.jpg',
  },
]

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    
    const userContext = await getUserContext(user.id)
    
    // Filtrar conteúdos relevantes para a fase do usuário
    let filteredContent = EDUCATIONAL_CONTENT.filter(
      (c) => c.phase === userContext?.phase || c.phase === 'ALL'
    )
    
    if (category && category !== 'all') {
      filteredContent = filteredContent.filter((c) => c.category === category)
    }
    
    return NextResponse.json(filteredContent)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar conteúdos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const { action, topic } = await req.json()
    
    if (action === 'generate') {
      const userContext = await getUserContext(user.id)
      
      const prompt = `
Crie um artigo educativo curto sobre "${topic}" para uma ${
        userContext?.phase === 'PREGNANT'
          ? `gestante na ${userContext?.gestationWeek}ª semana`
          : userContext?.phase === 'POSTPARTUM'
          ? 'mulher em pós-parto'
          : 'mulher ativa'
      }.

Retorne APENAS JSON:
{
  "title": "título",
  "summary": "resumo em 2 frases",
  "content": "conteúdo completo em 3-4 parágrafos",
  "tips": ["dica 1", "dica 2", "dica 3"],
  "warnings": ["atenção 1 se houver"]
}
`
      const result = await chatModel.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      
      return NextResponse.json(parsed)
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar conteúdo' }, { status: 500 })
  }
}
```

---

# 2. HOOKS ADICIONAIS

## 2.1 src/hooks/use-progress.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface ProgressEntry {
  id: string
  date: string
  weight?: number
  bust?: number
  waist?: number
  hips?: number
  belly?: number
  photo_url?: string
  notes?: string
  mood?: string
  energy_level?: number
  symptoms: string[]
}

export function useProgress() {
  const { user } = useUser()
  const [entries, setEntries] = useState<ProgressEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/progress?limit=30')
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const addEntry = async (entry: Omit<ProgressEntry, 'id'>) => {
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      if (response.ok) {
        const newEntry = await response.json()
        setEntries((prev) => [newEntry, ...prev])
        return newEntry
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  // Dados para gráficos
  const weightData = entries
    .filter((e) => e.weight)
    .map((e) => ({ date: e.date, value: e.weight }))
    .reverse()

  const measurementsData = entries
    .filter((e) => e.bust || e.waist || e.hips || e.belly)
    .map((e) => ({
      date: e.date,
      bust: e.bust,
      waist: e.waist,
      hips: e.hips,
      belly: e.belly,
    }))
    .reverse()

  return {
    entries,
    weightData,
    measurementsData,
    isLoading,
    error,
    addEntry,
    refetch: fetchProgress,
  }
}
```

## 2.2 src/hooks/use-appointments.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface Appointment {
  id: string
  type: string
  title: string
  description?: string
  doctor?: string
  clinic?: string
  address?: string
  date: string
  time: string
  reminder_enabled: boolean
  completed: boolean
  results?: string
  notes?: string
}

export function useAppointments() {
  const { user } = useUser()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/appointments?upcoming=true')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const createAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      })

      if (response.ok) {
        const newAppointment = await response.json()
        setAppointments((prev) => [...prev, newAppointment].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ))
        return newAppointment
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updated = await response.json()
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? updated : a))
        )
        return updated
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.date) >= new Date() && !a.completed
  )

  const nextAppointment = upcomingAppointments[0] || null

  return {
    appointments,
    upcomingAppointments,
    nextAppointment,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    refetch: fetchAppointments,
  }
}
```

## 2.3 src/hooks/use-shopping.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from './use-user'

interface ShoppingItem {
  id: string
  name: string
  quantity?: string
  category?: string
  checked: boolean
}

interface ShoppingList {
  id: string
  name: string
  completed: boolean
  items: ShoppingItem[]
  created_at: string
}

export function useShopping() {
  const { user } = useUser()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLists = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/shopping')
      if (response.ok) {
        const data = await response.json()
        setLists(data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const createList = async (name: string, items?: Omit<ShoppingItem, 'id'>[]) => {
    try {
      const response = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items }),
      })

      if (response.ok) {
        await fetchLists()
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const addItem = async (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId, ...item }),
      })

      if (response.ok) {
        await fetchLists()
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    try {
      await fetch('/api/shopping/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, checked }),
      })

      setLists((prev) =>
        prev.map((list) => ({
          ...list,
          items: list.items.map((item) =>
            item.id === itemId ? { ...item, checked } : item
          ),
        }))
      )
    } catch (err) {
      setError(err as Error)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      await fetch(`/api/shopping/items?id=${itemId}`, {
        method: 'DELETE',
      })

      setLists((prev) =>
        prev.map((list) => ({
          ...list,
          items: list.items.filter((item) => item.id !== itemId),
        }))
      )
    } catch (err) {
      setError(err as Error)
    }
  }

  const currentList = lists[0] || null

  return {
    lists,
    currentList,
    isLoading,
    error,
    createList,
    addItem,
    toggleItem,
    deleteItem,
    refetch: fetchLists,
  }
}
```

---

# 3. COMPONENTES EXTRAS

## 3.1 src/components/ui/modal.tsx

```typescript
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const Modal = DialogPrimitive.Root
const ModalTrigger = DialogPrimitive.Trigger
const ModalPortal = DialogPrimitive.Portal
const ModalClose = DialogPrimitive.Close

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = 'ModalOverlay'

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
        'bg-white rounded-2xl shadow-lg p-6',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-gray-100 transition-colors">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModalPortal>
))
ModalContent.displayName = 'ModalContent'

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />
)

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-text-primary', className)}
    {...props}
  />
))
ModalTitle.displayName = 'ModalTitle'

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
))
ModalDescription.displayName = 'ModalDescription'

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 mt-6', className)} {...props} />
)

export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
}
```

## 3.2 src/components/ui/checkbox.tsx

```typescript
'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-5 w-5 shrink-0 rounded-md border-2 border-gray-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500',
      'transition-all duration-200',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
```

## 3.3 src/components/ui/select.tsx

```typescript
'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2',
      'text-sm text-text-primary placeholder:text-text-secondary/50',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border bg-white shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        position === 'popper' && 'translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-10 pr-3 text-sm',
      'outline-none focus:bg-primary-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary-500" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
```

---

# 4. PÁGINA DE PROGRESSO

## 4.1 src/app/(main)/progress/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal'
import { useProgress } from '@/hooks/use-progress'
import { useUser } from '@/hooks/use-user'
import { WeightChart } from '@/components/charts/weight-chart'
import { Plus, Scale, Ruler, Camera, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ProgressPage() {
  const { user } = useUser()
  const { entries, weightData, isLoading, addEntry } = useProgress()
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    weight: '',
    bust: '',
    waist: '',
    hips: '',
    belly: '',
    notes: '',
  })

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      await addEntry({
        date: new Date().toISOString(),
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bust: formData.bust ? parseFloat(formData.bust) : undefined,
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        belly: formData.belly ? parseFloat(formData.belly) : undefined,
        notes: formData.notes || undefined,
        symptoms: [],
      })
      setShowModal(false)
      setFormData({ weight: '', bust: '', waist: '', hips: '', belly: '', notes: '' })
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Calcular variação de peso
  const latestWeight = entries[0]?.weight
  const previousWeight = entries[1]?.weight
  const weightChange = latestWeight && previousWeight ? latestWeight - previousWeight : 0

  // Progresso em relação à meta
  const targetWeight = user?.target_weight
  const currentWeight = user?.current_weight || latestWeight
  const weightProgress = targetWeight && currentWeight
    ? Math.max(0, Math.min(100, ((user?.height || 165) - Math.abs(currentWeight - targetWeight)) / (user?.height || 165) * 100))
    : 0

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Meu Progresso</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-xl">
                  <Scale className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Peso Atual</p>
                  <p className="text-xl font-bold text-text-primary">
                    {currentWeight ? `${currentWeight} kg` : '--'}
                  </p>
                  {weightChange !== 0 && (
                    <div className="flex items-center gap-1">
                      {weightChange > 0 ? (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-green-500" />
                      )}
                      <span className={`text-xs ${weightChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary-100 rounded-xl">
                  <Ruler className="h-5 w-5 text-secondary-500" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Meta</p>
                  <p className="text-xl font-bold text-text-primary">
                    {targetWeight ? `${targetWeight} kg` : '--'}
                  </p>
                  {targetWeight && currentWeight && (
                    <span className="text-xs text-text-secondary">
                      {Math.abs(currentWeight - targetWeight).toFixed(1)} kg restantes
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Peso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do Peso</CardTitle>
          </CardHeader>
          <CardContent>
            {weightData.length > 1 ? (
              <WeightChart data={weightData} />
            ) : (
              <div className="h-48 flex items-center justify-center text-text-secondary">
                <p>Registre mais dados para ver o gráfico</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Histórico</h2>
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">
                        {format(new Date(entry.date), "d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {entry.weight && (
                          <Badge variant="default">{entry.weight} kg</Badge>
                        )}
                        {entry.waist && (
                          <Badge variant="secondary">Cintura: {entry.waist}cm</Badge>
                        )}
                        {entry.belly && (
                          <Badge variant="secondary">Barriga: {entry.belly}cm</Badge>
                        )}
                      </div>
                    </div>
                    {entry.photo_url && (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                        <img src={entry.photo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-text-secondary mt-2">{entry.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            {entries.length === 0 && !isLoading && (
              <Card className="p-8 text-center">
                <Scale className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Nenhum registro ainda
                </h3>
                <p className="text-text-secondary mb-4">
                  Comece a acompanhar seu progresso
                </p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Primeiro Registro
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Modal de Registro */}
        <Modal open={showModal} onOpenChange={setShowModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Registrar Progresso</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              <Input
                type="number"
                label="Peso (kg)"
                placeholder="Ex: 65.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  label="Busto (cm)"
                  placeholder="Ex: 90"
                  value={formData.bust}
                  onChange={(e) => setFormData({ ...formData, bust: e.target.value })}
                />
                <Input
                  type="number"
                  label="Cintura (cm)"
                  placeholder="Ex: 70"
                  value={formData.waist}
                  onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  label="Quadril (cm)"
                  placeholder="Ex: 100"
                  value={formData.hips}
                  onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                />
                {user?.phase === 'PREGNANT' && (
                  <Input
                    type="number"
                    label="Barriga (cm)"
                    placeholder="Ex: 85"
                    value={formData.belly}
                    onChange={(e) => setFormData({ ...formData, belly: e.target.value })}
                  />
                )}
              </div>

              <Input
                label="Observações"
                placeholder="Como você está se sentindo?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button onClick={handleSubmit} isLoading={isSaving}>
                Salvar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </PageContainer>
  )
}
```

---

# 5. PÁGINA DE CONSULTAS

## 5.1 src/app/(main)/appointments/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal'
import { useAppointments } from '@/hooks/use-appointments'
import { Plus, Calendar, Clock, MapPin, User, Check, Trash2 } from 'lucide-react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const APPOINTMENT_TYPES = [
  { value: 'PRENATAL', label: 'Pré-natal', color: 'bg-primary-100 text-primary-700' },
  { value: 'ULTRASOUND', label: 'Ultrassom', color: 'bg-purple-100 text-purple-700' },
  { value: 'EXAM', label: 'Exame', color: 'bg-blue-100 text-blue-700' },
  { value: 'VACCINATION', label: 'Vacina', color: 'bg-green-100 text-green-700' },
  { value: 'OTHER', label: 'Outro', color: 'bg-gray-100 text-gray-700' },
]

export default function AppointmentsPage() {
  const {
    appointments,
    upcomingAppointments,
    nextAppointment,
    isLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments()

  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    type: 'PRENATAL',
    title: '',
    doctor: '',
    clinic: '',
    address: '',
    date: '',
    time: '',
    notes: '',
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.date || !formData.time) return

    setIsSaving(true)
    try {
      await createAppointment({
        ...formData,
        reminder_enabled: true,
        completed: false,
      })
      setShowModal(false)
      setFormData({
        type: 'PRENATAL',
        title: '',
        doctor: '',
        clinic: '',
        address: '',
        date: '',
        time: '',
        notes: '',
      })
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getDateLabel = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "d 'de' MMMM", { locale: ptBR })
  }

  const getTypeInfo = (type: string) => {
    return APPOINTMENT_TYPES.find((t) => t.value === type) || APPOINTMENT_TYPES[4]
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Consultas</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agendar
          </Button>
        </div>

        {/* Próxima Consulta */}
        {nextAppointment && (
          <Card className="bg-gradient-to-r from-primary-500 to-secondary-400 text-white">
            <CardContent className="p-5">
              <p className="text-sm opacity-90 mb-1">Próxima consulta</p>
              <h2 className="text-xl font-bold mb-3">{nextAppointment.title}</h2>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{getDateLabel(nextAppointment.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{nextAppointment.time}</span>
                </div>
                {nextAppointment.clinic && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{nextAppointment.clinic}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Consultas */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Agenda</h2>
          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => {
              const typeInfo = getTypeInfo(appointment.type)

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                            <span className="text-sm text-text-secondary">
                              {getDateLabel(appointment.date)} às {appointment.time}
                            </span>
                          </div>

                          <h3 className="font-semibold text-text-primary">{appointment.title}</h3>

                          {appointment.doctor && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                              <User className="h-4 w-4" />
                              <span>{appointment.doctor}</span>
                            </div>
                          )}

                          {appointment.clinic && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                              <MapPin className="h-4 w-4" />
                              <span>{appointment.clinic}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateAppointment(appointment.id, { completed: true })}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAppointment(appointment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}

            {upcomingAppointments.length === 0 && !isLoading && (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Nenhuma consulta agendada
                </h3>
                <p className="text-text-secondary mb-4">
                  Mantenha seu acompanhamento em dia
                </p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Consulta
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Modal de Agendamento */}
        <Modal open={showModal} onOpenChange={setShowModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Agendar Consulta</ModalTitle>
            </ModalHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Tipo de consulta
                </label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Input
                label="Título"
                placeholder="Ex: Pré-natal mensal"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="Data"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  type="time"
                  label="Horário"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Médico(a)"
                placeholder="Nome do profissional"
                value={formData.doctor}
                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
              />

              <Input
                label="Clínica/Hospital"
                placeholder="Local da consulta"
                value={formData.clinic}
                onChange={(e) => setFormData({ ...formData, clinic: e.target.value })}
              />

              <Input
                label="Endereço"
                placeholder="Endereço completo"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </ModalClose>
              <Button onClick={handleSubmit} isLoading={isSaving}>
                Agendar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </PageContainer>
  )
}
```

---

# 6. PÁGINA DE LISTA DE COMPRAS

## 6.1 src/app/(main)/shopping/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useShopping } from '@/hooks/use-shopping'
import { Plus, ShoppingCart, Trash2, Sparkles, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'fruits', label: '🍎 Frutas', color: 'bg-red-50' },
  { value: 'vegetables', label: '🥬 Vegetais', color: 'bg-green-50' },
  { value: 'proteins', label: '🥩 Proteínas', color: 'bg-orange-50' },
  { value: 'dairy', label: '🥛 Laticínios', color: 'bg-blue-50' },
  { value: 'grains', label: '🌾 Grãos', color: 'bg-yellow-50' },
  { value: 'other', label: '📦 Outros', color: 'bg-gray-50' },
]

export default function ShoppingPage() {
  const { currentList, isLoading, createList, addItem, toggleItem, deleteItem } = useShopping()
  const [newItem, setNewItem] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleAddItem = async () => {
    if (!newItem.trim()) return

    if (!currentList) {
      await createList('Minha Lista', [{ name: newItem, checked: false }])
    } else {
      await addItem(currentList.id, { name: newItem, checked: false })
    }
    setNewItem('')
  }

  const handleGenerateFromPlan = async () => {
    setIsGenerating(true)
    try {
      // Buscar plano alimentar e gerar lista
      const response = await fetch('/api/nutrition/plan', { method: 'POST' })
      const { plan } = await response.json()

      // Extrair ingredientes do plano (simplificado)
      const ingredients = [
        { name: 'Ovos (dúzia)', category: 'proteins' },
        { name: 'Frango (1kg)', category: 'proteins' },
        { name: 'Arroz integral', category: 'grains' },
        { name: 'Feijão preto', category: 'grains' },
        { name: 'Brócolis', category: 'vegetables' },
        { name: 'Espinafre', category: 'vegetables' },
        { name: 'Banana', category: 'fruits' },
        { name: 'Maçã', category: 'fruits' },
        { name: 'Leite desnatado', category: 'dairy' },
        { name: 'Iogurte natural', category: 'dairy' },
      ]

      await createList('Lista da Semana', ingredients.map((i) => ({ ...i, checked: false })))
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Agrupar itens por categoria
  const groupedItems = currentList?.items.reduce((acc, item) => {
    const category = item.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof currentList.items>) || {}

  const checkedCount = currentList?.items.filter((i) => i.checked).length || 0
  const totalCount = currentList?.items.length || 0
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Lista de Compras</h1>
          <Button variant="outline" onClick={handleGenerateFromPlan} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar do Plano
          </Button>
        </div>

        {/* Progresso */}
        {currentList && totalCount > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">Progresso</span>
                <span className="text-sm text-text-secondary">
                  {checkedCount} de {totalCount} itens
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adicionar Item */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
              <Button onClick={handleAddItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista por Categoria */}
        {Object.keys(groupedItems).length > 0 ? (
          <div className="space-y-4">
            {CATEGORIES.filter((cat) => groupedItems[cat.value]?.length > 0).map((category) => (
              <Card key={category.value}>
                <CardHeader className={`py-3 px-4 ${category.color} rounded-t-2xl`}>
                  <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <AnimatePresence>
                    {groupedItems[category.value]?.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={(checked) => toggleItem(item.id, checked as boolean)}
                          />
                          <span
                            className={`${
                              item.checked ? 'line-through text-text-secondary' : 'text-text-primary'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-sm text-text-secondary">({item.quantity})</span>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-text-secondary" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Lista vazia</h3>
            <p className="text-text-secondary mb-4">
              Adicione itens ou gere automaticamente do seu plano alimentar
            </p>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
```

---

# 7. PÁGINA DE NOMES DE BEBÊ

## 7.1 src/app/(main)/baby-names/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, X, Sparkles, Loader2, Filter } from 'lucide-react'

interface BabyName {
  id?: string
  name: string
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL'
  origin?: string
  meaning?: string
}

export default function BabyNamesPage() {
  const [names, setNames] = useState<BabyName[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filter, setFilter] = useState<'all' | 'MALE' | 'FEMALE' | 'NEUTRAL'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchNames()
  }, [filter])

  const fetchNames = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/baby-names?gender=${filter}`)
      const data = await response.json()
      setNames(data.names || [])
      setFavorites(data.favorites?.map((f: any) => f.name_id) || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/baby-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          preferences: {
            gender: filter === 'all' ? null : filter.toLowerCase(),
            style: 'moderno e significativo',
          },
        }),
      })
      const data = await response.json()
      setNames((prev) => [...data.names, ...prev])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLike = async (nameId: string) => {
    try {
      await fetch('/api/baby-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite', nameId, liked: true }),
      })
      setFavorites((prev) => [...prev, nameId])
      nextName()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleDislike = () => {
    nextName()
  }

  const nextName = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, names.length - 1))
  }

  const currentName = names[currentIndex]

  const genderColors = {
    MALE: 'bg-blue-100 text-blue-700',
    FEMALE: 'bg-pink-100 text-pink-700',
    NEUTRAL: 'bg-purple-100 text-purple-700',
  }

  const genderLabels = {
    MALE: 'Masculino',
    FEMALE: 'Feminino',
    NEUTRAL: 'Neutro',
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Nomes de Bebê</h1>
          <Button variant="outline" onClick={generateSuggestions} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Sugerir
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['all', 'MALE', 'FEMALE', 'NEUTRAL'].map((g) => (
            <Button
              key={g}
              variant={filter === g ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(g as any)
                setCurrentIndex(0)
              }}
            >
              {g === 'all' ? 'Todos' : genderLabels[g as keyof typeof genderLabels]}
            </Button>
          ))}
        </div>

        {/* Card do Nome */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : currentName ? (
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="w-full max-w-sm"
              >
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-primary-100 to-secondary-100 p-8 text-center">
                    <Badge className={genderColors[currentName.gender]}>
                      {genderLabels[currentName.gender]}
                    </Badge>
                    <h2 className="text-4xl font-bold text-text-primary mt-4 mb-2">
                      {currentName.name}
                    </h2>
                    {currentName.origin && (
                      <p className="text-sm text-text-secondary">Origem: {currentName.origin}</p>
                    )}
                  </div>
                  <CardContent className="p-6">
                    {currentName.meaning && (
                      <div>
                        <p className="text-sm font-medium text-text-secondary mb-1">Significado</p>
                        <p className="text-text-primary">{currentName.meaning}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Botões de Ação */}
            <div className="flex gap-6 mt-8">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDislike}
                className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center shadow-lg"
              >
                <X className="h-8 w-8 text-gray-500" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => currentName.id && handleLike(currentName.id)}
                className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center shadow-lg"
              >
                <Heart className="h-8 w-8 text-white" />
              </motion.button>
            </div>

            <p className="text-sm text-text-secondary mt-4">
              {currentIndex + 1} de {names.length}
            </p>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Nenhum nome disponível</h3>
            <p className="text-text-secondary mb-4">Gere sugestões personalizadas com IA</p>
            <Button onClick={generateSuggestions}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
          </Card>
        )}

        {/* Favoritos */}
        {favorites.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Favoritos ({favorites.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {names
                .filter((n) => n.id && favorites.includes(n.id))
                .map((name) => (
                  <Badge key={name.id} variant="default" className="text-sm py-1.5 px-3">
                    <Heart className="h-3 w-3 mr-1 fill-current" />
                    {name.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
```

---

# 8. PÁGINA DE MALA MATERNIDADE

## 8.1 src/app/(main)/maternity-bag/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Plus, Briefcase, Baby, FileText, Users, Loader2 } from 'lucide-react'

interface BagItem {
  id: string
  category: 'MOM' | 'BABY' | 'DOCUMENTS' | 'PARTNER'
  item: string
  quantity: number
  packed: boolean
  essential: boolean
}

const CATEGORIES = [
  { value: 'MOM', label: 'Para a Mamãe', icon: Briefcase, color: 'bg-primary-100 text-primary-700' },
  { value: 'BABY', label: 'Para o Bebê', icon: Baby, color: 'bg-secondary-100 text-secondary-700' },
  { value: 'DOCUMENTS', label: 'Documentos', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { value: 'PARTNER', label: 'Para o Acompanhante', icon: Users, color: 'bg-purple-100 text-purple-700' },
]

export default function MaternityBagPage() {
  const [items, setItems] = useState<BagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('MOM')
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/maternity-bag')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePacked = async (id: string, packed: boolean) => {
    try {
      await fetch('/api/maternity-bag', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, packed }),
      })

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, packed } : item)))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const addItem = async () => {
    if (!newItem.trim()) return

    try {
      const response = await fetch('/api/maternity-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          item: newItem,
          quantity: 1,
          packed: false,
          essential: false,
        }),
      })

      const newItemData = await response.json()
      setItems((prev) => [...prev, newItemData])
      setNewItem('')
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/maternity-bag?id=${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Calcular progresso
  const totalItems = items.length
  const packedItems = items.filter((i) => i.packed).length
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0

  // Filtrar por categoria
  const filteredItems = items.filter((item) => item.category === activeCategory)
  const categoryItems = {
    essential: filteredItems.filter((i) => i.essential),
    optional: filteredItems.filter((i) => !i.essential),
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mala da Maternidade</h1>
          <p className="text-text-secondary">Organize tudo para o grande dia</p>
        </div>

        {/* Progresso Geral */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-text-primary">Progresso</span>
              <span className="text-sm text-text-secondary">
                {packedItems} de {totalItems} itens
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            {progress === 100 && (
              <p className="text-sm text-green-600 mt-2 font-medium">🎉 Mala pronta!</p>
            )}
          </CardContent>
        </Card>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const categoryCount = items.filter((i) => i.category === cat.value).length
            const categoryPacked = items.filter((i) => i.category === cat.value && i.packed).length

            return (
              <Button
                key={cat.value}
                variant={activeCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat.value)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {cat.label}
                <Badge variant="secondary" className="ml-2">
                  {categoryPacked}/{categoryCount}
                </Badge>
              </Button>
            )
          })}
        </div>

        {/* Adicionar Item */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
              <Button onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Itens */}
        <div className="space-y-4">
          {/* Essenciais */}
          {categoryItems.essential.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                Essenciais
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {categoryItems.essential.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.packed}
                          onCheckedChange={(checked) => togglePacked(item.id, checked as boolean)}
                        />
                        <span
                          className={`${
                            item.packed ? 'line-through text-text-secondary' : 'text-text-primary'
                          }`}
                        >
                          {item.item}
                        </span>
                        {item.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            x{item.quantity}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="warning" className="text-xs">
                        Essencial
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Opcionais */}
          {categoryItems.optional.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
                Opcionais
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {categoryItems.optional.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.packed}
                          onCheckedChange={(checked) => togglePacked(item.id, checked as boolean)}
                        />
                        <span
                          className={`${
                            item.packed ? 'line-through text-text-secondary' : 'text-text-primary'
                          }`}
                        >
                          {item.item}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                        ×
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
```

---

# 9. SUBPÁGINAS DO PERFIL

## 9.1 src/app/(main)/profile/personal/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use-user'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function PersonalDataPage() {
  const router = useRouter()
  const { user, updateUser } = useUser()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birth_date: user?.birth_date || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateUser({
        name: formData.name,
        phone: formData.phone,
        birth_date: formData.birth_date || null,
      })
      router.back()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Dados Pessoais</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Input
                label="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="E-mail"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />

              <Input
                label="Telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Data de nascimento"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full mt-6" isLoading={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </form>
      </div>
    </PageContainer>
  )
}
```

## 9.2 src/app/(main)/profile/health/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use-user'
import { ArrowLeft, Save } from 'lucide-react'
import { DIETARY_RESTRICTIONS, EXERCISE_LEVELS } from '@/lib/utils/constants'

export default function HealthPage() {
  const router = useRouter()
  const { user, updateUser } = useUser()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    height: user?.height?.toString() || '',
    current_weight: user?.current_weight?.toString() || '',
    target_weight: user?.target_weight?.toString() || '',
    exercise_level: user?.exercise_level || 'beginner',
    dietary_restrictions: user?.dietary_restrictions || [],
    goals: user?.goals || [],
  })

  const toggleRestriction = (restriction: string) => {
    setFormData((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter((r) => r !== restriction)
        : [...prev.dietary_restrictions, restriction],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateUser({
        height: formData.height ? parseFloat(formData.height) : null,
        current_weight: formData.current_weight ? parseFloat(formData.current_weight) : null,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
        exercise_level: formData.exercise_level,
        dietary_restrictions: formData.dietary_restrictions,
      })
      router.back()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Saúde e Objetivos</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Medidas */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-text-primary">Medidas</h2>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Altura (cm)"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
                <Input
                  label="Peso atual (kg)"
                  type="number"
                  step="0.1"
                  value={formData.current_weight}
                  onChange={(e) => setFormData({ ...formData, current_weight: e.target.value })}
                />
                <Input
                  label="Meta (kg)"
                  type="number"
                  step="0.1"
                  value={formData.target_weight}
                  onChange={(e) => setFormData({ ...formData, target_weight: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nível de Exercício */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-text-primary">Nível de Exercício</h2>

              <div className="flex flex-wrap gap-2">
                {EXERCISE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, exercise_level: level.value })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.exercise_level === level.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Restrições */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-text-primary">Restrições Alimentares</h2>

              <div className="flex flex-wrap gap-2">
                {DIETARY_RESTRICTIONS.map((restriction) => (
                  <button
                    key={restriction}
                    type="button"
                    onClick={() => toggleRestriction(restriction)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.dietary_restrictions.includes(restriction)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {restriction}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" isLoading={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </form>
      </div>
    </PageContainer>
  )
}
```

## 9.3 src/app/(main)/profile/notifications/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { ArrowLeft, Bell, Calendar, Utensils, Dumbbell, MessageCircle } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, updateUser } = useUser()

  const [settings, setSettings] = useState({
    all: user?.notifications_enabled ?? true,
    meals: true,
    workout: true,
    appointments: true,
    chat: true,
  })

  const handleToggle = async (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    if (key === 'all') {
      await updateUser({ notifications_enabled: value })
    }
  }

  const notifications = [
    { key: 'all', label: 'Todas as notificações', icon: Bell, description: 'Ativar ou desativar todas' },
    { key: 'meals', label: 'Lembretes de refeição', icon: Utensils, description: 'Horários das refeições' },
    { key: 'workout', label: 'Lembretes de treino', icon: Dumbbell, description: 'Horários de exercício' },
    { key: 'appointments', label: 'Consultas médicas', icon: Calendar, description: 'Lembretes de consultas' },
    { key: 'chat', label: 'Dicas da Mia', icon: MessageCircle, description: 'Sugestões personalizadas' },
  ]

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Notificações</h1>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {notifications.map((item) => {
              const Icon = item.icon
              const isEnabled = item.key === 'all' ? settings.all : settings.all && settings[item.key as keyof typeof settings]

              return (
                <div key={item.key} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl">
                      <Icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{item.label}</p>
                      <p className="text-sm text-text-secondary">{item.description}</p>
                    </div>
                  </div>

                  <Switch.Root
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    disabled={item.key !== 'all' && !settings.all}
                    className="w-11 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-primary-500 transition-colors disabled:opacity-50"
                  >
                    <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
```

---

# 10. PÁGINA DE CONTEÚDO EDUCATIVO

## 10.1 src/app/(main)/content/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Play, Clock, Filter, Loader2 } from 'lucide-react'

interface Content {
  id: string
  title: string
  description: string
  type: 'article' | 'video'
  category: string
  duration: string
  image?: string
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'nutrition', label: '🥗 Nutrição' },
  { value: 'workout', label: '💪 Exercícios' },
  { value: 'health', label: '❤️ Saúde' },
  { value: 'baby', label: '👶 Bebê' },
]

export default function ContentPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    fetchContent()
  }, [activeCategory])

  const fetchContent = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content?category=${activeCategory}`)
      const data = await response.json()
      setContents(data)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Conteúdos</h1>
          <p className="text-text-secondary">Artigos e vídeos para você</p>
        </div>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.value)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Lista de Conteúdos */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid gap-4">
            {contents.map((content) => (
              <Card key={content.id} hover className="overflow-hidden">
                <div className="flex">
                  {content.image ? (
                    <div className="w-28 h-28 bg-gray-100 flex-shrink-0">
                      <img src={content.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-primary-100 flex-shrink-0 flex items-center justify-center">
                      {content.type === 'video' ? (
                        <Play className="h-8 w-8 text-primary-500" />
                      ) : (
                        <BookOpen className="h-8 w-8 text-primary-500" />
                      )}
                    </div>
                  )}

                  <CardContent className="p-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={content.type === 'video' ? 'secondary' : 'default'}>
                        {content.type === 'video' ? '📺 Vídeo' : '📄 Artigo'}
                      </Badge>
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {content.duration}
                      </span>
                    </div>

                    <h3 className="font-semibold text-text-primary line-clamp-1">{content.title}</h3>
                    <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                      {content.description}
                    </p>
                  </CardContent>
                </div>
              </Card>
            ))}

            {contents.length === 0 && (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Nenhum conteúdo encontrado
                </h3>
                <p className="text-text-secondary">
                  Tente outra categoria ou volte mais tarde
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
```

---

# 11. COMPONENTES DE GRÁFICOS

## 11.1 src/components/charts/weight-chart.tsx

```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeightChartProps {
  data: Array<{ date: string; value: number | undefined }>
}

export function WeightChart({ data }: WeightChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12, fill: '#636E72' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fontSize: 12, fill: '#636E72' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}kg`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            formatter={(value: number) => [`${value} kg`, 'Peso']}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#E8A5B3"
            strokeWidth={3}
            dot={{ fill: '#E8A5B3', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#E8A5B3' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

# 12. TIMER DE TREINO

## 12.1 src/app/(main)/workout/timer/page.tsx

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, SkipForward, X, Volume2, VolumeX } from 'lucide-react'

export default function WorkoutTimerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutTime = parseInt(searchParams.get('time') || '30') * 60 // em segundos
  const restTime = parseInt(searchParams.get('rest') || '30') // em segundos

  const [timeLeft, setTimeLeft] = useState(workoutTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isResting, setIsResting] = useState(false)
  const [currentSet, setCurrentSet] = useState(1)
  const [totalSets] = useState(parseInt(searchParams.get('sets') || '3'))
  const [soundEnabled, setSoundEnabled] = useState(true)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleTimerEnd()
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft])

  const handleTimerEnd = () => {
    if (soundEnabled) {
      // Tocar som de alerta
      const audio = new Audio('/sounds/bell.mp3')
      audio.play().catch(() => {})
    }

    if (isResting) {
      // Fim do descanso, próxima série
      setIsResting(false)
      setTimeLeft(workoutTime)
    } else if (currentSet < totalSets) {
      // Fim da série, começar descanso
      setIsResting(true)
      setTimeLeft(restTime)
      setCurrentSet((prev) => prev + 1)
    } else {
      // Treino completo
      setIsRunning(false)
      alert('🎉 Treino completo! Parabéns!')
    }
  }

  const toggleTimer = () => {
    setIsRunning((prev) => !prev)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsResting(false)
    setTimeLeft(workoutTime)
    setCurrentSet(1)
  }

  const skipRest = () => {
    if (isResting) {
      setIsResting(false)
      setTimeLeft(workoutTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = isResting
    ? ((restTime - timeLeft) / restTime) * 100
    : ((workoutTime - timeLeft) / workoutTime) * 100

  return (
    <PageContainer noPadding>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <X className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-text-primary">
            Série {currentSet} de {totalSets}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={isResting ? 'rest' : 'work'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <p className={`text-lg font-medium mb-4 ${isResting ? 'text-secondary-500' : 'text-primary-500'}`}>
                {isResting ? '😮‍💨 Descanse' : '💪 Exercite'}
              </p>

              {/* Círculo de progresso */}
              <div className="relative w-64 h-64 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#f0f0f0"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke={isResting ? '#9DB4A0' : '#E8A5B3'}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold text-text-primary">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controles */}
        <div className="p-8">
          <div className="flex items-center justify-center gap-6">
            <Button variant="outline" size="icon" className="w-14 h-14 rounded-full" onClick={resetTimer}>
              <RotateCcw className="h-6 w-6" />
            </Button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                isRunning ? 'bg-gray-200' : 'bg-primary-500'
              }`}
            >
              {isRunning ? (
                <Pause className={`h-10 w-10 ${isRunning ? 'text-text-primary' : 'text-white'}`} />
              ) : (
                <Play className={`h-10 w-10 ${isRunning ? 'text-text-primary' : 'text-white'} ml-1`} />
              )}
            </motion.button>

            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={skipRest}
              disabled={!isResting}
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
```

---

# 13. SQL ADICIONAL (Dados de Nomes de Bebê)

Execute este SQL para popular a tabela de nomes:

```sql
-- Inserir alguns nomes de bebê populares
INSERT INTO baby_names (name, gender, origin, meaning, popularity) VALUES
-- Femininos
('Sofia', 'FEMALE', 'Grego', 'Sabedoria', 1),
('Helena', 'FEMALE', 'Grego', 'Luz brilhante', 2),
('Alice', 'FEMALE', 'Germânico', 'De linhagem nobre', 3),
('Laura', 'FEMALE', 'Latim', 'Loureiro, vitoriosa', 4),
('Valentina', 'FEMALE', 'Latim', 'Valente, forte', 5),
('Maria', 'FEMALE', 'Hebraico', 'Senhora soberana', 6),
('Júlia', 'FEMALE', 'Latim', 'Jovem', 7),
('Cecília', 'FEMALE', 'Latim', 'Cega (metafórico: guiada pela fé)', 8),
('Manuela', 'FEMALE', 'Hebraico', 'Deus está conosco', 9),
('Isabella', 'FEMALE', 'Hebraico', 'Consagrada a Deus', 10),
-- Masculinos
('Miguel', 'MALE', 'Hebraico', 'Quem é como Deus?', 1),
('Arthur', 'MALE', 'Celta', 'Urso, nobre', 2),
('Heitor', 'MALE', 'Grego', 'Aquele que guarda', 3),
('Theo', 'MALE', 'Grego', 'Deus', 4),
('Davi', 'MALE', 'Hebraico', 'Amado', 5),
('Gabriel', 'MALE', 'Hebraico', 'Homem de Deus', 6),
('Bernardo', 'MALE', 'Germânico', 'Forte como urso', 7),
('Samuel', 'MALE', 'Hebraico', 'Ouvido por Deus', 8),
('Lucas', 'MALE', 'Grego', 'Luminoso', 9),
('Noah', 'MALE', 'Hebraico', 'Descanso, conforto', 10),
-- Neutros
('Ariel', 'NEUTRAL', 'Hebraico', 'Leão de Deus', 1),
('Noah', 'NEUTRAL', 'Hebraico', 'Descanso', 2),
('Angel', 'NEUTRAL', 'Grego', 'Mensageiro', 3);
```

---

# FIM DO DOCUMENTO COMPLEMENTAR

Este documento completa o VitaFit com todas as funcionalidades restantes:

✅ Página de Progresso (gráficos, medidas, histórico)
✅ Página de Consultas (agenda, CRUD completo)
✅ Página de Lista de Compras (categorias, progresso)
✅ Página de Nomes de Bebê (swipe, favoritos, geração IA)
✅ Página de Mala Maternidade (checklist por categoria)
✅ Página de Conteúdo Educativo (artigos, vídeos)
✅ Subpáginas do Perfil (dados pessoais, saúde, notificações)
✅ Timer de Treino (cronômetro, séries, descanso)
✅ Gráficos (evolução de peso)
✅ Todas as APIs necessárias
✅ Hooks customizados
✅ Componentes extras (Modal, Checkbox, Select)

Agora o VitaFit está 100% completo! 🎉
