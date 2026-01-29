import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { category, profile, count = 5 } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar perfil do usuário se não fornecido
    let userProfile = profile
    if (!userProfile) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      userProfile = data
    }

    // Construir contexto baseado no perfil
    let context = ''
    if (userProfile) {
      if (userProfile.phase === 'PREGNANT') {
        context = 'para gestante, com foco em ácido fólico, ferro e cálcio. Evitar alimentos crus, cafeína em excesso e peixes com mercúrio.'
      } else if (userProfile.phase === 'POSTPARTUM') {
        context = 'para pós-parto, rica em proteínas e ferro para recuperação. Se amamentando, aumentar calorias e hidratação.'
      } else if (userProfile.phase === 'TRYING') {
        context = 'para quem está tentando engravidar, com foco em ácido fólico, zinco e antioxidantes.'
      }
      
      if (userProfile.dietary_restrictions?.length > 0) {
        context += ` Restrições alimentares: ${userProfile.dietary_restrictions.join(', ')}.`
      }
      if (userProfile.allergies?.length > 0) {
        context += ` Alergias: ${userProfile.allergies.join(', ')}.`
      }
    }

    // Gerar receitas baseadas na categoria e contexto
    const recipes = generateRecipesForCategory(category, context, count)

    return NextResponse.json({ recipes })

  } catch (error: any) {
    console.error('Generate recipes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateRecipesForCategory(category: string, context: string, count: number) {
  const recipeTemplates: Record<string, any[]> = {
    'Café da Manhã': [
      {
        name: 'Mingau de Aveia com Frutas Vermelhas',
        description: 'Mingau cremoso de aveia com frutas vermelhas frescas, rico em fibras e antioxidantes',
        category: 'Café da Manhã',
        prep_time: 15,
        servings: 1,
        calories: 320,
        protein: 12,
        carbs: 48,
        fat: 8,
        ingredients: [
          '1/2 xícara de aveia em flocos',
          '1 xícara de leite (ou leite vegetal)',
          '1/2 xícara de frutas vermelhas',
          '1 colher de sopa de mel ou melado',
          '1 colher de sopa de sementes de chia',
          'Canela a gosto'
        ],
        instructions: [
          'Em uma panela, coloque a aveia e o leite',
          'Cozinhe em fogo baixo mexendo sempre por 5-7 minutos',
          'Quando engrossar, retire do fogo',
          'Adicione a chia e misture bem',
          'Transfira para uma tigela e cubra com as frutas',
          'Finalize com mel e canela'
        ]
      },
      {
        name: 'Omelete de Espinafre com Queijo',
        description: 'Omelete proteico com espinafre e queijo branco, perfeito para começar o dia',
        category: 'Café da Manhã',
        prep_time: 10,
        servings: 1,
        calories: 280,
        protein: 22,
        carbs: 4,
        fat: 20,
        ingredients: [
          '2 ovos',
          '1 xícara de espinafre fresco',
          '30g de queijo branco',
          '1 colher de chá de azeite',
          'Sal e pimenta a gosto',
          'Ervas finas a gosto'
        ],
        instructions: [
          'Bata os ovos com sal, pimenta e ervas',
          'Aqueça o azeite em uma frigideira antiaderente',
          'Adicione o espinafre e refogue rapidamente',
          'Despeje os ovos batidos sobre o espinafre',
          'Adicione o queijo picado',
          'Quando firmar embaixo, dobre ao meio e sirva'
        ]
      },
      {
        name: 'Panqueca de Banana com Aveia',
        description: 'Panquecas saudáveis feitas com banana e aveia, sem farinha refinada',
        category: 'Café da Manhã',
        prep_time: 20,
        servings: 2,
        calories: 250,
        protein: 10,
        carbs: 35,
        fat: 8,
        ingredients: [
          '1 banana madura',
          '2 ovos',
          '1/2 xícara de aveia',
          '1/4 xícara de leite',
          '1 colher de chá de fermento',
          'Canela a gosto'
        ],
        instructions: [
          'Amasse a banana com um garfo',
          'Adicione os ovos e misture bem',
          'Acrescente a aveia, leite, fermento e canela',
          'Misture até ficar homogêneo',
          'Aqueça uma frigideira antiaderente',
          'Despeje pequenas porções e doure dos dois lados',
          'Sirva com frutas ou mel'
        ]
      },
      {
        name: 'Smoothie Bowl de Açaí',
        description: 'Bowl energético de açaí com granola e frutas, rico em antioxidantes',
        category: 'Café da Manhã',
        prep_time: 10,
        servings: 1,
        calories: 380,
        protein: 8,
        carbs: 55,
        fat: 12,
        ingredients: [
          '100g de polpa de açaí',
          '1 banana congelada',
          '1/2 xícara de leite',
          '2 colheres de granola',
          'Frutas frescas para decorar',
          '1 colher de mel'
        ],
        instructions: [
          'Bata o açaí, banana e leite no liquidificador',
          'A consistência deve ficar cremosa como sorvete',
          'Transfira para uma tigela',
          'Cubra com granola e frutas',
          'Finalize com fio de mel'
        ]
      },
      {
        name: 'Torrada Integral com Abacate',
        description: 'Torrada integral com abacate amassado e ovo pochê, nutritiva e saciante',
        category: 'Café da Manhã',
        prep_time: 15,
        servings: 1,
        calories: 340,
        protein: 14,
        carbs: 28,
        fat: 20,
        ingredients: [
          '2 fatias de pão integral',
          '1/2 abacate maduro',
          '1 ovo',
          'Suco de limão',
          'Sal, pimenta e páprica',
          'Sementes de gergelim'
        ],
        instructions: [
          'Torre o pão até ficar crocante',
          'Amasse o abacate com limão, sal e pimenta',
          'Espalhe o abacate nas torradas',
          'Faça um ovo pochê ou frito',
          'Coloque o ovo sobre o abacate',
          'Finalize com páprica e gergelim'
        ]
      }
    ],
    'Almoço': [
      {
        name: 'Frango Grelhado com Quinoa e Legumes',
        description: 'Peito de frango grelhado servido com quinoa colorida e legumes assados',
        category: 'Almoço',
        prep_time: 35,
        servings: 2,
        calories: 450,
        protein: 38,
        carbs: 35,
        fat: 16,
        ingredients: [
          '2 peitos de frango',
          '1 xícara de quinoa',
          '1 abobrinha',
          '1 cenoura',
          '1 pimentão',
          'Azeite, alho, sal e ervas'
        ],
        instructions: [
          'Tempere o frango com alho, sal e ervas',
          'Cozinhe a quinoa conforme a embalagem',
          'Corte os legumes em cubos',
          'Asse os legumes com azeite a 200°C por 20min',
          'Grelhe o frango em frigideira quente',
          'Monte o prato com quinoa, frango e legumes'
        ]
      },
      {
        name: 'Bowl de Salmão com Arroz Integral',
        description: 'Salmão grelhado com arroz integral, edamame e molho de gengibre',
        category: 'Almoço',
        prep_time: 30,
        servings: 1,
        calories: 520,
        protein: 35,
        carbs: 45,
        fat: 22,
        ingredients: [
          '150g de filé de salmão',
          '1 xícara de arroz integral cozido',
          '1/2 xícara de edamame',
          '1/2 pepino fatiado',
          'Molho de soja e gengibre',
          'Gergelim e cebolinha'
        ],
        instructions: [
          'Tempere o salmão com sal e pimenta',
          'Grelhe o salmão 4min de cada lado',
          'Monte a bowl com arroz na base',
          'Adicione o edamame e pepino',
          'Coloque o salmão por cima',
          'Regue com molho e finalize com gergelim'
        ]
      },
      {
        name: 'Salada Completa com Grão de Bico',
        description: 'Salada mediterrânea com grão de bico, tomate, pepino e molho tahine',
        category: 'Almoço',
        prep_time: 20,
        servings: 2,
        calories: 380,
        protein: 15,
        carbs: 42,
        fat: 18,
        ingredients: [
          '1 lata de grão de bico',
          '2 tomates picados',
          '1 pepino em cubos',
          '1/2 cebola roxa',
          'Folhas verdes',
          'Azeite, limão e tahine'
        ],
        instructions: [
          'Escorra e lave o grão de bico',
          'Corte todos os vegetais em cubos',
          'Misture tudo em uma tigela grande',
          'Prepare o molho com tahine, limão e azeite',
          'Regue a salada com o molho',
          'Tempere com sal e pimenta'
        ]
      },
      {
        name: 'Risoto de Cogumelos',
        description: 'Risoto cremoso de cogumelos variados com parmesão',
        category: 'Almoço',
        prep_time: 40,
        servings: 2,
        calories: 420,
        protein: 12,
        carbs: 58,
        fat: 16,
        ingredients: [
          '1 xícara de arroz arbóreo',
          '200g de cogumelos variados',
          '1/2 cebola picada',
          '2 dentes de alho',
          'Caldo de legumes',
          'Parmesão e salsinha'
        ],
        instructions: [
          'Refogue a cebola e alho no azeite',
          'Adicione os cogumelos fatiados',
          'Acrescente o arroz e mexa bem',
          'Adicione o caldo aos poucos, mexendo sempre',
          'Cozinhe por 18-20 minutos',
          'Finalize com parmesão e salsinha'
        ]
      },
      {
        name: 'Wrap de Peru com Homus',
        description: 'Wrap integral com peito de peru, homus e vegetais frescos',
        category: 'Almoço',
        prep_time: 15,
        servings: 1,
        calories: 380,
        protein: 28,
        carbs: 35,
        fat: 14,
        ingredients: [
          '1 wrap integral',
          '100g de peito de peru',
          '2 colheres de homus',
          'Alface e tomate',
          'Cenoura ralada',
          'Molho de iogurte'
        ],
        instructions: [
          'Espalhe o homus no wrap',
          'Adicione as folhas de alface',
          'Distribua o peru fatiado',
          'Acrescente tomate e cenoura',
          'Regue com molho de iogurte',
          'Enrole firmemente e sirva'
        ]
      }
    ],
    'Jantar': [
      {
        name: 'Peixe Assado com Batata Doce',
        description: 'Filé de peixe branco assado com batata doce e brócolis',
        category: 'Jantar',
        prep_time: 35,
        servings: 2,
        calories: 380,
        protein: 32,
        carbs: 35,
        fat: 12,
        ingredients: [
          '2 filés de tilápia',
          '2 batatas doces médias',
          '2 xícaras de brócolis',
          'Limão, alho e ervas',
          'Azeite',
          'Sal e pimenta'
        ],
        instructions: [
          'Corte as batatas em rodelas',
          'Asse as batatas a 200°C por 15min',
          'Tempere o peixe com limão, alho e ervas',
          'Adicione o peixe e brócolis na assadeira',
          'Asse por mais 15-20 minutos',
          'Sirva quente'
        ]
      },
      {
        name: 'Sopa de Legumes com Frango',
        description: 'Sopa nutritiva com frango desfiado e legumes variados',
        category: 'Jantar',
        prep_time: 40,
        servings: 4,
        calories: 280,
        protein: 25,
        carbs: 22,
        fat: 10,
        ingredients: [
          '300g de frango',
          '2 cenouras',
          '2 batatas',
          '1 abobrinha',
          'Cebola, alho, salsinha',
          '1,5L de água'
        ],
        instructions: [
          'Cozinhe o frango na água temperada',
          'Retire, desfie e reserve',
          'No caldo, adicione os legumes picados',
          'Cozinhe até ficarem macios',
          'Devolva o frango à panela',
          'Finalize com salsinha picada'
        ]
      },
      {
        name: 'Omelete de Forno com Vegetais',
        description: 'Omelete assada no forno com mix de vegetais e queijo',
        category: 'Jantar',
        prep_time: 30,
        servings: 2,
        calories: 320,
        protein: 22,
        carbs: 8,
        fat: 24,
        ingredients: [
          '4 ovos',
          '1 tomate',
          '1/2 cebola',
          'Espinafre',
          '50g de queijo',
          'Sal, pimenta e orégano'
        ],
        instructions: [
          'Pré-aqueça o forno a 180°C',
          'Bata os ovos com sal e pimenta',
          'Refogue os vegetais picados',
          'Coloque em forma untada',
          'Despeje os ovos e adicione o queijo',
          'Asse por 20-25 minutos'
        ]
      },
      {
        name: 'Stir-fry de Tofu com Vegetais',
        description: 'Tofu salteado com legumes e molho oriental, leve e saboroso',
        category: 'Jantar',
        prep_time: 25,
        servings: 2,
        calories: 290,
        protein: 18,
        carbs: 22,
        fat: 16,
        ingredients: [
          '200g de tofu firme',
          '1 pimentão',
          '1 cenoura',
          'Brócolis',
          'Molho de soja e gengibre',
          'Gergelim'
        ],
        instructions: [
          'Corte o tofu em cubos e frite até dourar',
          'Reserve o tofu',
          'Salteie os vegetais no wok',
          'Adicione molho de soja e gengibre',
          'Devolva o tofu à panela',
          'Finalize com gergelim'
        ]
      },
      {
        name: 'Salada Quente de Lentilha',
        description: 'Salada morna de lentilha com legumes assados e molho balsâmico',
        category: 'Jantar',
        prep_time: 35,
        servings: 2,
        calories: 340,
        protein: 16,
        carbs: 45,
        fat: 10,
        ingredients: [
          '1 xícara de lentilha',
          '1 beterraba',
          '1 cenoura',
          'Rúcula',
          'Vinagre balsâmico',
          'Azeite e nozes'
        ],
        instructions: [
          'Cozinhe a lentilha até ficar al dente',
          'Asse beterraba e cenoura em cubos',
          'Misture a lentilha com os vegetais assados',
          'Adicione a rúcula',
          'Tempere com azeite e balsâmico',
          'Decore com nozes'
        ]
      }
    ],
    'Lanches': [
      {
        name: 'Smoothie Verde Energizante',
        description: 'Smoothie nutritivo com espinafre, banana e pasta de amendoim',
        category: 'Lanches',
        prep_time: 5,
        servings: 1,
        calories: 280,
        protein: 10,
        carbs: 35,
        fat: 12,
        ingredients: ['1 banana', '1 xícara de espinafre', '1 colher de pasta de amendoim', '1 xícara de leite', 'Gelo'],
        instructions: ['Coloque todos os ingredientes no liquidificador', 'Bata até ficar cremoso', 'Sirva gelado']
      },
      {
        name: 'Torrada com Cottage e Tomate',
        description: 'Lanche proteico leve com queijo cottage e tomate cereja',
        category: 'Lanches',
        prep_time: 5,
        servings: 1,
        calories: 180,
        protein: 12,
        carbs: 18,
        fat: 6,
        ingredients: ['1 fatia de pão integral', '3 colheres de cottage', 'Tomates cereja', 'Manjericão', 'Azeite'],
        instructions: ['Torre o pão', 'Espalhe o cottage', 'Adicione tomates cortados', 'Finalize com manjericão e azeite']
      },
      {
        name: 'Mix de Nuts com Frutas Secas',
        description: 'Mix energético de castanhas e frutas secas',
        category: 'Lanches',
        prep_time: 2,
        servings: 1,
        calories: 220,
        protein: 6,
        carbs: 20,
        fat: 14,
        ingredients: ['Castanha de caju', 'Amêndoas', 'Nozes', 'Uva passa', 'Damasco seco'],
        instructions: ['Misture todos os ingredientes', 'Porção: 30g do mix']
      },
      {
        name: 'Iogurte Grego com Granola',
        description: 'Iogurte grego natural com granola sem açúcar e mel',
        category: 'Lanches',
        prep_time: 3,
        servings: 1,
        calories: 240,
        protein: 15,
        carbs: 28,
        fat: 8,
        ingredients: ['1 pote de iogurte grego natural', '2 colheres de granola', '1 colher de mel', 'Frutas frescas'],
        instructions: ['Coloque o iogurte em uma tigela', 'Adicione a granola e frutas', 'Finalize com mel']
      },
      {
        name: 'Palitos de Cenoura com Homus',
        description: 'Snack crocante de cenoura com homus caseiro',
        category: 'Lanches',
        prep_time: 10,
        servings: 2,
        calories: 150,
        protein: 5,
        carbs: 18,
        fat: 7,
        ingredients: ['2 cenouras grandes', '4 colheres de homus', 'Páprica', 'Salsinha'],
        instructions: ['Corte as cenouras em palitos', 'Sirva com homus', 'Polvilhe páprica por cima']
      }
    ],
    'Para Gestantes': [
      {
        name: 'Bowl Proteico para Gestante',
        description: 'Bowl nutritivo com quinoa, ovo, abacate e vegetais, rico em ácido fólico',
        category: 'Para Gestantes',
        prep_time: 25,
        servings: 1,
        calories: 480,
        protein: 22,
        carbs: 42,
        fat: 26,
        ingredients: ['1/2 xícara de quinoa', '1 ovo cozido', '1/2 abacate', 'Espinafre', 'Tomate cereja', 'Sementes de abóbora'],
        instructions: ['Cozinhe a quinoa', 'Cozinhe o ovo até ficar duro', 'Monte o bowl com todos os ingredientes', 'Tempere com azeite e limão']
      },
      {
        name: 'Salmão com Espinafre (Rica em Ômega-3)',
        description: 'Salmão grelhado com cama de espinafre, fonte de ômega-3 e ferro',
        category: 'Para Gestantes',
        prep_time: 20,
        servings: 1,
        calories: 420,
        protein: 35,
        carbs: 8,
        fat: 28,
        ingredients: ['150g de salmão', '2 xícaras de espinafre', 'Alho', 'Limão', 'Azeite'],
        instructions: ['Tempere o salmão com limão e ervas', 'Grelhe por 4-5 min de cada lado', 'Refogue o espinafre com alho', 'Sirva o salmão sobre o espinafre']
      },
      {
        name: 'Vitamina de Banana com Aveia',
        description: 'Vitamina cremosa rica em potássio e fibras, ideal para gestantes',
        category: 'Para Gestantes',
        prep_time: 5,
        servings: 1,
        calories: 320,
        protein: 12,
        carbs: 52,
        fat: 8,
        ingredients: ['1 banana', '1 copo de leite', '2 colheres de aveia', '1 colher de mel', 'Canela'],
        instructions: ['Bata todos os ingredientes no liquidificador', 'Sirva imediatamente']
      },
      {
        name: 'Lentilha com Legumes (Rica em Ferro)',
        description: 'Lentilha cozida com legumes, excelente fonte de ferro e proteína vegetal',
        category: 'Para Gestantes',
        prep_time: 40,
        servings: 3,
        calories: 280,
        protein: 14,
        carbs: 42,
        fat: 4,
        ingredients: ['1 xícara de lentilha', 'Cenoura', 'Abobrinha', 'Tomate', 'Cebola e alho', 'Salsinha'],
        instructions: ['Cozinhe a lentilha', 'Refogue os vegetais', 'Misture com a lentilha', 'Tempere a gosto']
      },
      {
        name: 'Salada de Grão de Bico (Ácido Fólico)',
        description: 'Salada refrescante de grão de bico, rica em ácido fólico e fibras',
        category: 'Para Gestantes',
        prep_time: 15,
        servings: 2,
        calories: 320,
        protein: 12,
        carbs: 38,
        fat: 14,
        ingredients: ['1 lata de grão de bico', 'Pepino', 'Tomate', 'Cebola roxa', 'Salsinha', 'Azeite e limão'],
        instructions: ['Escorra o grão de bico', 'Pique todos os vegetais', 'Misture com temperos', 'Deixe gelar antes de servir']
      }
    ]
  }

  const categoryRecipes = recipeTemplates[category] || recipeTemplates['Almoço']
  
  // Retornar receitas aleatórias da categoria
  const shuffled = categoryRecipes.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
