// Versão: 05-02-2026 - Geração de Receitas com IA (Groq + Fallback) - Colunas corrigidas
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { category, profile, count = 5 } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar perfil do usuário
    let userProfile = profile
    if (!userProfile) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      userProfile = data
    }

    const phase = userProfile?.phase || 'ACTIVE'
    const restrictions = userProfile?.dietary_restrictions || []
    const allergies = userProfile?.allergies || []

    let recipes: any[] = []

    // ===== 1. GROQ AI =====
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const prompt = buildRecipePrompt(category, phase, restrictions, allergies, count)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Você é uma chef e nutricionista especialista em culinária brasileira saudável para gestantes e mães. Responda APENAS com JSON válido, sem markdown.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 6000,
            response_format: { type: 'json_object' }
          })
        })
        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            try {
              const parsed = JSON.parse(text)
              recipes = parsed.recipes || (Array.isArray(parsed) ? parsed : [])
            } catch {
              const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
              const match = cleaned.match(/[\[\{][\s\S]*[\]\}]/)
              if (match) {
                const parsed = JSON.parse(match[0])
                recipes = parsed.recipes || (Array.isArray(parsed) ? parsed : [])
              }
            }
          }
        }
      } catch (e) { console.warn('Groq recipes failed:', e) }
    }

    // ===== 2. GEMINI =====
    if (recipes.length === 0) {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (geminiKey) {
        try {
          const prompt = buildRecipePrompt(category, phase, restrictions, allergies, count)
          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 6000, responseMimeType: 'application/json' },
            }),
          })
          if (response.ok) {
            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              try {
                const parsed = JSON.parse(text)
                recipes = parsed.recipes || (Array.isArray(parsed) ? parsed : [])
              } catch {}
            }
          }
        } catch (e) { console.warn('Gemini recipes failed:', e) }
      }
    }

    // ===== 3. FALLBACK =====
    if (recipes.length === 0) {
      recipes = generateFallbackRecipes(category, count)
    }

    // Normalizar e salvar no banco com colunas corretas
    const recipesToSave = recipes.slice(0, count).map((r: any) => ({
      user_id: user.id,
      name: r.name || 'Receita',
      description: r.description || '',
      category: r.category || category,
      difficulty: r.difficulty || 'Fácil',
      prep_time: Number(r.prep_time) || 15,
      cook_time: Number(r.cook_time) || 20,
      total_time: Number(r.total_time) || Number(r.prep_time || 15) + Number(r.cook_time || 20),
      servings: Number(r.servings) || 2,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      calories_per_serving: Number(r.calories_per_serving || r.calories) || 300,
      protein_per_serving: Number(r.protein_per_serving || r.protein) || 15,
      carbs_per_serving: Number(r.carbs_per_serving || r.carbs) || 30,
      fat_per_serving: Number(r.fat_per_serving || r.fat) || 10,
      is_ai_generated: true,
      suitable_for_pregnancy: phase === 'PREGNANT' || phase === 'TRYING',
      suitable_for_postpartum: phase === 'POSTPARTUM',
      tags: r.tags || [category],
      dietary_tags: restrictions,
    }))

    const { data: saved, error: saveError } = await supabase
      .from('recipes')
      .insert(recipesToSave)
      .select()

    if (saveError) {
      console.error('Error saving recipes:', saveError)
      // Return recipes even if save fails
      return NextResponse.json({ recipes: recipesToSave, saved: false })
    }

    return NextResponse.json({ recipes: saved, saved: true })

  } catch (error: any) {
    console.error('Generate recipes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildRecipePrompt(category: string, phase: string, restrictions: string[], allergies: string[], count: number): string {
  const phaseContext: Record<string, string> = {
    'PREGNANT': 'Gestante - evitar alimentos crus/mal cozidos, excesso de cafeína, peixes com mercúrio. Priorizar: ferro, ácido fólico, cálcio, ômega-3, fibras.',
    'POSTPARTUM': 'Pós-parto - foco em recuperação e lactação. Priorizar: proteínas, ferro, alimentos galactogênicos (aveia, linhaça), hidratação.',
    'TRYING': 'Tentando engravidar - foco em fertilidade. Priorizar: ácido fólico, zinco, selênio, antioxidantes, ômega-3.',
    'ACTIVE': 'Bem-estar geral - alimentação equilibrada e nutritiva.',
  }

  return `Crie ${count} receitas BRASILEIRAS deliciosas e saudáveis para a categoria "${category}".

CONTEXTO: ${phaseContext[phase] || phaseContext['ACTIVE']}
${restrictions.length ? `RESTRIÇÕES: ${restrictions.join(', ')}` : ''}
${allergies.length ? `ALERGIAS: ${allergies.join(', ')}` : ''}

REGRAS:
- Receitas DIFERENTES entre si, com nomes criativos
- Ingredientes brasileiros comuns (encontrados em qualquer mercado)
- Quantidades EXATAS nos ingredientes (ex: "200g de peito de frango", "2 colheres de sopa de azeite")
- Instruções detalhadas passo a passo (mínimo 5 passos)
- Valores nutricionais REALISTAS por porção
- Tempo de preparo realista
- Incluir dica especial em cada receita

Responda SOMENTE com JSON:
{
  "recipes": [
    {
      "name": "Nome Criativo da Receita",
      "description": "Descrição apetitosa em 1-2 frases",
      "category": "${category}",
      "difficulty": "Fácil|Médio|Difícil",
      "prep_time": 15,
      "cook_time": 20,
      "total_time": 35,
      "servings": 2,
      "calories_per_serving": 350,
      "protein_per_serving": 25,
      "carbs_per_serving": 30,
      "fat_per_serving": 12,
      "ingredients": [
        "200g de peito de frango",
        "2 colheres de sopa de azeite",
        "..."
      ],
      "instructions": [
        "Passo detalhado 1",
        "Passo detalhado 2",
        "..."
      ],
      "tags": ["${category}", "saudável"]
    }
  ]
}`
}

function generateFallbackRecipes(category: string, count: number): any[] {
  const allRecipes: Record<string, any[]> = {
    'Café da Manhã': [
      { name: 'Mingau de Aveia com Frutas Vermelhas', description: 'Mingau cremoso rico em fibras e antioxidantes, perfeito para começar o dia com energia', category: 'Café da Manhã', difficulty: 'Fácil', prep_time: 5, cook_time: 10, total_time: 15, servings: 1, calories_per_serving: 320, protein_per_serving: 12, carbs_per_serving: 48, fat_per_serving: 8, ingredients: ['1/2 xícara de aveia em flocos', '1 xícara (200ml) de leite', '1/2 xícara de morangos picados', '1/4 xícara de mirtilos', '1 colher de sopa de mel', '1 colher de sopa de sementes de chia', 'Canela em pó a gosto'], instructions: ['Coloque a aveia e o leite em uma panela pequena', 'Cozinhe em fogo baixo mexendo sempre por 5-7 minutos até engrossar', 'Retire do fogo e adicione a chia, mexendo bem', 'Transfira para uma tigela bonita', 'Cubra com os morangos e mirtilos', 'Regue com mel e polvilhe canela', 'Dica: se preparar na noite anterior (overnight), economiza tempo pela manhã!'], tags: ['Café da Manhã', 'fibras', 'rápido'] },
      { name: 'Omelete de Espinafre com Queijo Branco', description: 'Omelete proteico e nutritivo, rico em ferro e cálcio, pronto em 10 minutos', category: 'Café da Manhã', difficulty: 'Fácil', prep_time: 5, cook_time: 5, total_time: 10, servings: 1, calories_per_serving: 280, protein_per_serving: 22, carbs_per_serving: 4, fat_per_serving: 20, ingredients: ['2 ovos caipiras', '1 xícara de espinafre fresco picado', '30g de queijo branco (minas frescal)', '1 colher de chá de azeite extra-virgem', 'Sal e pimenta-do-reino a gosto', 'Ervas finas (opcional)'], instructions: ['Bata os ovos em uma tigela com sal, pimenta e ervas', 'Aqueça o azeite em frigideira antiaderente em fogo médio', 'Adicione o espinafre e refogue por 30 segundos', 'Despeje os ovos batidos por cima do espinafre', 'Espalhe o queijo picado em cubinhos', 'Quando a base firmar (2 min), dobre ao meio com espátula', 'Espere mais 1 minuto e sirva com torrada integral'], tags: ['Café da Manhã', 'proteína', 'ferro'] },
      { name: 'Panqueca de Banana e Aveia', description: 'Panquecas saudáveis sem farinha branca, naturalmente doces e saciantes', category: 'Café da Manhã', difficulty: 'Fácil', prep_time: 10, cook_time: 10, total_time: 20, servings: 2, calories_per_serving: 250, protein_per_serving: 10, carbs_per_serving: 35, fat_per_serving: 8, ingredients: ['1 banana madura grande', '2 ovos', '1/2 xícara de aveia em flocos', '1/4 xícara de leite', '1 colher de chá de fermento em pó', 'Canela a gosto', 'Óleo de coco para untar'], instructions: ['Amasse a banana com um garfo até virar purê', 'Adicione os ovos e misture bem', 'Acrescente a aveia, leite, fermento e canela e misture', 'Deixe a massa descansar 5 minutos', 'Aqueça a frigideira com um pouco de óleo de coco', 'Despeje uma concha pequena e espalhe em formato redondo', 'Doure 2 minutos de cada lado em fogo baixo', 'Sirva com frutas frescas, mel ou pasta de amendoim'], tags: ['Café da Manhã', 'sem farinha', 'saudável'] },
      { name: 'Smoothie Bowl de Açaí Energético', description: 'Bowl colorido e refrescante, repleto de antioxidantes e energia natural', category: 'Café da Manhã', difficulty: 'Fácil', prep_time: 8, cook_time: 0, total_time: 8, servings: 1, calories_per_serving: 380, protein_per_serving: 8, carbs_per_serving: 55, fat_per_serving: 12, ingredients: ['100g de polpa de açaí congelada', '1 banana congelada', '1/2 xícara (100ml) de leite', '2 colheres de sopa de granola sem açúcar', '5 morangos fatiados', '1 colher de sopa de mel', '1 colher de sopa de coco ralado'], instructions: ['Bata o açaí, banana congelada e leite no liquidificador', 'A consistência deve ficar cremosa e grossa, como sorvete', 'Se necessário, adicione mais um pouco de leite', 'Transfira para uma tigela funda', 'Decore com granola de um lado, morangos do outro', 'Polvilhe o coco ralado por cima', 'Regue com mel e sirva imediatamente'], tags: ['Café da Manhã', 'antioxidantes', 'energia'] },
      { name: 'Torrada de Abacate com Ovo Pochê', description: 'Clássico nutritivo: gorduras boas + proteína + carboidrato integral em cada mordida', category: 'Café da Manhã', difficulty: 'Médio', prep_time: 10, cook_time: 5, total_time: 15, servings: 1, calories_per_serving: 340, protein_per_serving: 14, carbs_per_serving: 28, fat_per_serving: 20, ingredients: ['2 fatias de pão integral', '1/2 abacate maduro', '1 ovo fresco', '1 colher de chá de suco de limão', 'Sal rosa e pimenta-do-reino', 'Páprica defumada', 'Sementes de gergelim'], instructions: ['Torre o pão até ficar crocante e dourado', 'Amasse o abacate com limão, sal e pimenta', 'Espalhe generosamente nas torradas', 'Para o ovo pochê: ferva água com vinagre, crie um redemoinho e quebre o ovo', 'Cozinhe 3-4 minutos e retire com escumadeira', 'Coloque o ovo sobre o abacate', 'Finalize com páprica defumada e gergelim', 'Dica: se não quiser pochê, ovo frito com gema mole fica ótimo!'], tags: ['Café da Manhã', 'proteína', 'gorduras boas'] },
    ],
    'Almoço': [
      { name: 'Frango Grelhado com Quinoa Colorida', description: 'Prato completo e equilibrado com proteína magra, grãos e vegetais coloridos', category: 'Almoço', difficulty: 'Médio', prep_time: 15, cook_time: 20, total_time: 35, servings: 2, calories_per_serving: 450, protein_per_serving: 38, carbs_per_serving: 35, fat_per_serving: 16, ingredients: ['2 peitos de frango (150g cada)', '1 xícara de quinoa', '1 abobrinha pequena em cubos', '1 cenoura em cubos', '1 pimentão vermelho em cubos', '2 colheres de sopa de azeite', '2 dentes de alho picados', 'Sal, pimenta e ervas de Provence'], instructions: ['Tempere o frango com alho, sal, pimenta e ervas', 'Cozinhe a quinoa: 1 xíc. de quinoa para 2 xíc. de água por 15 min', 'Enquanto isso, corte todos os legumes em cubos pequenos', 'Asse os legumes com 1 col. de azeite a 200°C por 20 min', 'Em paralelo, grelhe o frango em frigideira bem quente (5 min cada lado)', 'Deixe o frango descansar 3 min antes de fatiar', 'Monte: quinoa na base, legumes ao lado, frango fatiado por cima', 'Regue com azeite e sirva'], tags: ['Almoço', 'proteína', 'completo'] },
      { name: 'Bowl de Salmão com Arroz Integral', description: 'Inspiração japonesa com salmão rico em ômega-3, perfeito para gestantes', category: 'Almoço', difficulty: 'Médio', prep_time: 15, cook_time: 15, total_time: 30, servings: 1, calories_per_serving: 520, protein_per_serving: 35, carbs_per_serving: 45, fat_per_serving: 22, ingredients: ['150g de filé de salmão', '1 xícara de arroz integral cozido', '1/2 xícara de edamame', '1/2 pepino em fatias finas', '1 cenoura ralada', '1 colher de sopa de molho de soja (shoyu)', 'Gengibre ralado (1 col. chá)', 'Gergelim e cebolinha'], instructions: ['Tempere o salmão com sal e pimenta', 'Grelhe em frigideira quente: 4 min de cada lado (rosa por dentro)', 'Aqueça o arroz integral', 'Monte a bowl: arroz na base formando um ninho', 'Distribua edamame, pepino e cenoura ao redor', 'Coloque o salmão no centro', 'Misture shoyu com gengibre e regue por cima', 'Finalize com gergelim torrado e cebolinha picada'], tags: ['Almoço', 'ômega-3', 'gestante'] },
      { name: 'Feijoada Light com Arroz Integral', description: 'Versão saudável do clássico brasileiro, com carnes magras e muito sabor', category: 'Almoço', difficulty: 'Médio', prep_time: 20, cook_time: 40, total_time: 60, servings: 4, calories_per_serving: 480, protein_per_serving: 32, carbs_per_serving: 50, fat_per_serving: 16, ingredients: ['2 xícaras de feijão preto cozido', '200g de peito de peru em cubos', '2 linguiças de frango', '1 cebola picada', '4 dentes de alho', 'Folhas de louro', '1 maço de couve', '2 laranjas', 'Arroz integral'], instructions: ['Refogue cebola e alho em azeite até dourar', 'Adicione o peito de peru e a linguiça fatiada, doure bem', 'Acrescente o feijão preto com caldo e as folhas de louro', 'Cozinhe em fogo baixo por 30 minutos', 'Enquanto isso, refogue a couve em alho e azeite', 'Cozinhe o arroz integral', 'Monte o prato: arroz, feijoada, couve refogada', 'Sirva com fatias de laranja (ajuda absorção de ferro!)'], tags: ['Almoço', 'brasileiro', 'ferro'] },
      { name: 'Escondidinho de Frango com Batata Doce', description: 'Comfort food saudável: frango desfiado coberto com purê cremoso de batata doce', category: 'Almoço', difficulty: 'Médio', prep_time: 20, cook_time: 25, total_time: 45, servings: 4, calories_per_serving: 420, protein_per_serving: 30, carbs_per_serving: 40, fat_per_serving: 14, ingredients: ['400g de peito de frango', '2 batatas doces grandes', '1 cebola picada', '2 tomates picados', '1/2 xícara de leite', '2 colheres de sopa de requeijão light', 'Sal, pimenta, cheiro-verde', 'Queijo parmesão para gratinar'], instructions: ['Cozinhe o frango em água com sal, desfie e reserve', 'Cozinhe as batatas doces até ficarem macias', 'Amasse as batatas com leite e requeijão até ficar cremoso', 'Refogue cebola, adicione tomate e o frango desfiado', 'Tempere com sal, pimenta e cheiro-verde', 'Em refratário untado, coloque o frango na base', 'Cubra com o purê de batata doce', 'Polvilhe parmesão e leve ao forno a 200°C por 15 min'], tags: ['Almoço', 'comfort food', 'prático'] },
      { name: 'Salada Completa Mediterrânea', description: 'Salada substanciosa com grão-de-bico, vegetais e molho tahine caseiro', category: 'Almoço', difficulty: 'Fácil', prep_time: 15, cook_time: 0, total_time: 15, servings: 2, calories_per_serving: 380, protein_per_serving: 15, carbs_per_serving: 42, fat_per_serving: 18, ingredients: ['1 lata de grão-de-bico escorrido', '2 tomates maduros em cubos', '1 pepino em cubos', '1/2 cebola roxa fatiada', 'Mix de folhas (rúcula + alface)', '2 col. sopa de azeite extra-virgem', '1 col. sopa de tahine', 'Suco de 1 limão'], instructions: ['Escorra e lave bem o grão-de-bico', 'Corte todos os vegetais em cubos médios', 'Disponha as folhas como base em prato grande', 'Distribua grão-de-bico e vegetais por cima', 'Prepare o molho: misture tahine + limão + azeite + pitada de sal', 'Regue a salada generosamente com o molho', 'Finalize com pimenta-do-reino moída na hora', 'Dica: adicione fatias de abacate para mais saciedade!'], tags: ['Almoço', 'salada', 'mediterrâneo'] },
    ],
    'Jantar': [
      { name: 'Sopa Cremosa de Abóbora com Gengibre', description: 'Sopa reconfortante e anti-inflamatória, perfeita para noites frias', category: 'Jantar', difficulty: 'Fácil', prep_time: 10, cook_time: 25, total_time: 35, servings: 4, calories_per_serving: 180, protein_per_serving: 5, carbs_per_serving: 28, fat_per_serving: 6, ingredients: ['500g de abóbora cabotiá em cubos', '1 cebola picada', '2 dentes de alho', '1 pedaço de gengibre fresco (2cm) ralado', '500ml de caldo de legumes', '1/2 xícara de leite de coco', 'Sal, pimenta e noz-moscada', 'Sementes de abóbora torradas'], instructions: ['Refogue cebola e alho em azeite até dourar', 'Adicione o gengibre ralado e mexa por 30 segundos', 'Acrescente a abóbora em cubos e o caldo', 'Cozinhe até a abóbora ficar bem macia (20 min)', 'Bata tudo no liquidificador até ficar cremoso', 'Volte à panela e adicione o leite de coco', 'Tempere com sal, pimenta e noz-moscada', 'Sirva com sementes de abóbora torradas por cima'], tags: ['Jantar', 'sopa', 'leve'] },
      { name: 'Tilápia Assada com Legumes', description: 'Peixe branco leve e nutritivo com legumes coloridos assados no forno', category: 'Jantar', difficulty: 'Fácil', prep_time: 10, cook_time: 25, total_time: 35, servings: 2, calories_per_serving: 380, protein_per_serving: 32, carbs_per_serving: 30, fat_per_serving: 14, ingredients: ['2 filés de tilápia (150g cada)', '1 batata doce média em rodelas', '1 abobrinha em rodelas', '1 xícara de brócolis', 'Suco de 1 limão', '2 dentes de alho picados', 'Ervas finas, sal e azeite'], instructions: ['Pré-aqueça o forno a 200°C', 'Corte a batata doce em rodelas finas e coloque na assadeira', 'Asse por 10 minutos sozinha', 'Tempere os filés com limão, alho, sal e ervas', 'Adicione abobrinha e brócolis na assadeira', 'Coloque os filés por cima dos legumes', 'Regue com azeite e asse por mais 15-20 minutos', 'O peixe está pronto quando desmanchar facilmente'], tags: ['Jantar', 'peixe', 'leve'] },
      { name: 'Omelete de Forno com Vegetais', description: 'Omelete assada no forno, prática e cheia de nutrientes', category: 'Jantar', difficulty: 'Fácil', prep_time: 10, cook_time: 25, total_time: 35, servings: 2, calories_per_serving: 320, protein_per_serving: 22, carbs_per_serving: 8, fat_per_serving: 24, ingredients: ['4 ovos caipiras', '1 tomate sem sementes em cubos', '1/2 cebola picada', '1 xícara de espinafre fresco', '50g de queijo minas ralado', 'Sal, pimenta e orégano', '1 colher de chá de azeite'], instructions: ['Pré-aqueça o forno a 180°C', 'Bata os ovos com sal, pimenta e orégano', 'Refogue cebola e espinafre rapidamente', 'Coloque os vegetais refogados em forma redonda untada', 'Distribua o tomate em cubos', 'Despeje os ovos batidos por cima', 'Polvilhe o queijo ralado', 'Asse por 20-25 minutos até dourar', 'Sirva com salada verde'], tags: ['Jantar', 'ovos', 'prático'] },
      { name: 'Caldo Verde Nutritivo', description: 'Versão leve do clássico português, reconfortante e rico em ferro', category: 'Jantar', difficulty: 'Fácil', prep_time: 10, cook_time: 30, total_time: 40, servings: 4, calories_per_serving: 280, protein_per_serving: 16, carbs_per_serving: 32, fat_per_serving: 10, ingredients: ['3 batatas médias', '1 maço de couve manteiga', '1 linguiça de frango', '1 cebola', '3 dentes de alho', '1 litro de água ou caldo', 'Azeite, sal e pimenta'], instructions: ['Cozinhe as batatas descascadas em cubos até ficarem macias', 'Refogue cebola e alho em azeite', 'Bata as batatas cozidas com parte do caldo no liquidificador', 'Volte à panela e acerte o caldo', 'Corte a couve em tiras bem finas', 'Grelhe a linguiça e corte em rodelas', 'Adicione a couve ao caldo e cozinhe 5 minutos', 'Sirva com as rodelas de linguiça e um fio de azeite'], tags: ['Jantar', 'sopa', 'brasileiro'] },
      { name: 'Macarrão Integral ao Pesto de Rúcula', description: 'Massa integral com pesto fresco e nutritivo, pronta em 20 minutos', category: 'Jantar', difficulty: 'Fácil', prep_time: 5, cook_time: 15, total_time: 20, servings: 2, calories_per_serving: 420, protein_per_serving: 16, carbs_per_serving: 52, fat_per_serving: 18, ingredients: ['200g de macarrão integral (penne ou fusilli)', '2 xícaras de rúcula', '3 colheres de sopa de castanha de caju', '2 dentes de alho', '3 colheres de sopa de azeite', 'Parmesão ralado', 'Sal e pimenta'], instructions: ['Cozinhe o macarrão conforme embalagem (al dente)', 'Enquanto isso, faça o pesto: bata rúcula + castanha + alho + azeite no processador', 'Adicione parmesão ao pesto e misture', 'Escorra o macarrão reservando 1/2 xícara da água', 'Misture o pesto com o macarrão quente', 'Se necessário, adicione um pouco da água do cozimento', 'Sirva com mais parmesão por cima', 'Dica: tomates cereja cortados ao meio dão cor e sabor!'], tags: ['Jantar', 'massa', 'rápido'] },
    ],
    'Lanches': [
      { name: 'Smoothie Verde Energizante', description: 'Shake nutritivo e refrescante, cheio de vitaminas e minerais', category: 'Lanches', difficulty: 'Fácil', prep_time: 5, cook_time: 0, total_time: 5, servings: 1, calories_per_serving: 280, protein_per_serving: 10, carbs_per_serving: 35, fat_per_serving: 12, ingredients: ['1 banana madura', '1 xícara de espinafre fresco', '1 colher de sopa de pasta de amendoim', '1 xícara (200ml) de leite', 'Gelo a gosto', '1 colher de sopa de mel (opcional)'], instructions: ['Coloque todos os ingredientes no liquidificador', 'Bata por 1-2 minutos até ficar bem cremoso', 'Prove e ajuste doçura se necessário', 'Sirva gelado imediatamente', 'Dica: congele bananas maduras para smoothies mais cremosos!'], tags: ['Lanches', 'smoothie', 'energia'] },
      { name: 'Torrada com Cottage e Tomate', description: 'Lanche proteico, leve e saciante, ideal para qualquer hora do dia', category: 'Lanches', difficulty: 'Fácil', prep_time: 5, cook_time: 2, total_time: 7, servings: 1, calories_per_serving: 180, protein_per_serving: 12, carbs_per_serving: 18, fat_per_serving: 6, ingredients: ['1 fatia de pão integral', '3 colheres de sopa de queijo cottage', '5 tomates cereja cortados ao meio', 'Folhas de manjericão fresco', '1 fio de azeite', 'Sal e pimenta'], instructions: ['Torre o pão até ficar crocante', 'Espalhe o cottage generosamente', 'Distribua os tomates cereja por cima', 'Adicione as folhinhas de manjericão', 'Finalize com azeite, sal e pimenta moída', 'Sirva imediatamente'], tags: ['Lanches', 'proteína', 'rápido'] },
      { name: 'Mix de Nuts com Frutas Secas', description: 'Snack energético e prático, perfeito para levar na bolsa', category: 'Lanches', difficulty: 'Fácil', prep_time: 2, cook_time: 0, total_time: 2, servings: 1, calories_per_serving: 220, protein_per_serving: 6, carbs_per_serving: 20, fat_per_serving: 14, ingredients: ['10g de castanha de caju', '10g de amêndoas', '5g de nozes', '1 colher de sopa de uva passa', '2 damascos secos picados', 'Pitada de canela (opcional)'], instructions: ['Misture todas as castanhas e frutas secas', 'Polvilhe canela se desejar', 'Porção ideal: cabe na palma da mão fechada (~30g)', 'Guarde em potinho hermético', 'Dica: prepare porções para a semana toda!'], tags: ['Lanches', 'nuts', 'prático'] },
      { name: 'Iogurte Grego com Granola Caseira', description: 'Cremoso e crocante, rico em probióticos e fibras', category: 'Lanches', difficulty: 'Fácil', prep_time: 3, cook_time: 0, total_time: 3, servings: 1, calories_per_serving: 240, protein_per_serving: 15, carbs_per_serving: 28, fat_per_serving: 8, ingredients: ['1 pote (170g) de iogurte grego natural', '2 colheres de sopa de granola sem açúcar', '5 morangos fatiados', '1 colher de sopa de mel', '1 colher de chá de sementes de linhaça'], instructions: ['Coloque o iogurte em uma tigela', 'Adicione a granola de um lado', 'Distribua os morangos do outro lado', 'Polvilhe as sementes de linhaça', 'Regue com mel', 'Coma alternando colheradas cremosas e crocantes'], tags: ['Lanches', 'probiótico', 'proteína'] },
      { name: 'Palitos de Legumes com Homus', description: 'Snack crocante e nutritivo com mergulho cremoso de grão-de-bico', category: 'Lanches', difficulty: 'Fácil', prep_time: 10, cook_time: 0, total_time: 10, servings: 2, calories_per_serving: 150, protein_per_serving: 5, carbs_per_serving: 18, fat_per_serving: 7, ingredients: ['2 cenouras grandes em palitos', '1 pepino em palitos', '4 colheres de sopa de homus', 'Páprica defumada para decorar', 'Salsinha picada'], instructions: ['Lave e corte as cenouras em palitos compridos', 'Corte o pepino em palitos similares', 'Coloque o homus em um potinho no centro do prato', 'Disponha os palitos ao redor', 'Polvilhe páprica defumada sobre o homus', 'Decore com salsinha', 'Dica: aipo e pimentão também ficam ótimos!'], tags: ['Lanches', 'vegetariano', 'fibras'] },
    ],
    'Para Gestantes': [
      { name: 'Bowl Proteico da Gestante', description: 'Bowl completo com quinoa, ovo e abacate - rico em ácido fólico e gorduras boas', category: 'Para Gestantes', difficulty: 'Médio', prep_time: 15, cook_time: 15, total_time: 30, servings: 1, calories_per_serving: 480, protein_per_serving: 22, carbs_per_serving: 42, fat_per_serving: 26, ingredients: ['1/2 xícara de quinoa', '1 ovo cozido', '1/2 abacate maduro', '1 xícara de espinafre fresco', '5 tomates cereja', '1 colher de sopa de sementes de abóbora', 'Azeite, limão, sal'], instructions: ['Cozinhe a quinoa: 1 parte de quinoa para 2 de água, 15 min', 'Cozinhe o ovo por 10 minutos (cozido duro para gestantes)', 'Corte o abacate em fatias', 'Lave o espinafre e os tomates cereja', 'Monte o bowl: quinoa na base', 'Distribua espinafre, tomate, abacate', 'Coloque o ovo cortado ao meio no centro', 'Polvilhe sementes de abóbora e regue com azeite e limão', 'Rico em ácido fólico, ferro e ômega-3!'], tags: ['Para Gestantes', 'ácido fólico', 'proteína'] },
      { name: 'Salmão Grelhado com Espinafre', description: 'Fonte excepcional de ômega-3 e ferro, dois nutrientes essenciais na gravidez', category: 'Para Gestantes', difficulty: 'Médio', prep_time: 10, cook_time: 15, total_time: 25, servings: 1, calories_per_serving: 420, protein_per_serving: 35, carbs_per_serving: 8, fat_per_serving: 28, ingredients: ['150g de filé de salmão fresco', '2 xícaras de espinafre fresco', '2 dentes de alho fatiados', 'Suco de 1/2 limão', '1 colher de sopa de azeite', 'Sal, pimenta e dill (endro)'], instructions: ['Tempere o salmão com limão, sal, pimenta e dill', 'Deixe marinar por 10 minutos', 'Aqueça azeite em frigideira em fogo médio-alto', 'Grelhe o salmão 4-5 min de cada lado (bem cozido para gestantes)', 'Na mesma frigideira, refogue alho e espinafre', 'Sirva o salmão sobre a cama de espinafre', 'Acompanhe com arroz integral ou batata assada', 'DHA do salmão é essencial para o cérebro do bebê!'], tags: ['Para Gestantes', 'ômega-3', 'ferro'] },
      { name: 'Vitamina Rica em Ferro', description: 'Vitamina especial que combina ferro vegetal com vitamina C para máxima absorção', category: 'Para Gestantes', difficulty: 'Fácil', prep_time: 5, cook_time: 0, total_time: 5, servings: 1, calories_per_serving: 320, protein_per_serving: 12, carbs_per_serving: 48, fat_per_serving: 8, ingredients: ['1 banana', '1 copo (200ml) de leite', '2 colheres de sopa de aveia', '1 colher de sopa de mel', '1 colher de sopa de melaço de cana (rico em ferro)', 'Suco de 1/2 laranja', 'Canela a gosto'], instructions: ['Coloque todos os ingredientes no liquidificador', 'Bata por 1-2 minutos até ficar cremoso', 'O suco de laranja (vit. C) ajuda a absorver o ferro do melaço', 'Sirva imediatamente', 'Ideal para tomar pela manhã junto com suplemento de ferro', 'Dica: beterraba cozida pode ser adicionada para mais ferro!'], tags: ['Para Gestantes', 'ferro', 'vitamina C'] },
      { name: 'Lentilha com Legumes (Rica em Ferro)', description: 'Prato reconfortante e supernutritivo, excelente fonte de ferro vegetal e proteínas', category: 'Para Gestantes', difficulty: 'Fácil', prep_time: 10, cook_time: 30, total_time: 40, servings: 3, calories_per_serving: 280, protein_per_serving: 14, carbs_per_serving: 42, fat_per_serving: 4, ingredients: ['1 xícara de lentilha', '1 cenoura em cubos', '1 abobrinha em cubos', '1 tomate picado', '1 cebola picada', '2 dentes de alho', 'Salsinha, cominho, cúrcuma', 'Suco de limão para servir'], instructions: ['Lave a lentilha e cozinhe por 20 min (não precisa demolhar)', 'Refogue cebola e alho em azeite', 'Adicione cenoura, abobrinha e tomate', 'Tempere com cominho e cúrcuma', 'Junte a lentilha cozida com um pouco do caldo', 'Cozinhe mais 10 min até os sabores se misturarem', 'Finalize com salsinha fresca', 'Sirva com gotas de limão (vitamina C potencializa o ferro!)'], tags: ['Para Gestantes', 'ferro', 'proteína vegetal'] },
      { name: 'Overnight Oats para Gestante', description: 'Café da manhã pronto na geladeira: prático, nutritivo e delicioso', category: 'Para Gestantes', difficulty: 'Fácil', prep_time: 5, cook_time: 0, total_time: 5, servings: 1, calories_per_serving: 380, protein_per_serving: 14, carbs_per_serving: 52, fat_per_serving: 12, ingredients: ['1/2 xícara de aveia em flocos', '1/2 xícara de iogurte natural', '1/2 xícara de leite', '1 colher de sopa de chia', '1 banana fatiada', '1 colher de sopa de mel', 'Frutas vermelhas para decorar'], instructions: ['Na noite anterior, misture aveia + iogurte + leite + chia em um pote', 'Tampe e leve à geladeira', 'Pela manhã, a aveia terá absorvido os líquidos', 'Adicione a banana fatiada por cima', 'Decore com frutas vermelhas', 'Regue com mel', 'Pronto para comer! Zero preparo pela manhã', 'Rico em fibras, cálcio e ácido fólico!'], tags: ['Para Gestantes', 'prático', 'overnight'] },
    ],
  }

  const categoryRecipes = allRecipes[category] || allRecipes['Almoço']
  const shuffled = [...categoryRecipes].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
