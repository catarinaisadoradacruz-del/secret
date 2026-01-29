import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const recipeTemplates: Record<string, any[]> = {
  'Café da Manhã': [
    { name: 'Panqueca de Banana e Aveia', description: 'Panqueca saudável e nutritiva', prep_time: 15, servings: 2, calories: 280, protein: 12, carbs: 38, fat: 8, ingredients: ['2 bananas maduras', '2 ovos', '1/2 xícara de aveia', '1 colher de canela', 'Óleo de coco'], instructions: ['Amasse as bananas em uma tigela', 'Adicione os ovos e misture bem', 'Acrescente a aveia e a canela', 'Unte a frigideira com óleo de coco', 'Despeje pequenas porções e doure dos dois lados'] },
    { name: 'Bowl de Açaí com Frutas', description: 'Açaí energético com granola', prep_time: 10, servings: 1, calories: 350, protein: 8, carbs: 52, fat: 12, ingredients: ['200g polpa de açaí', '1 banana congelada', '50g granola', '2 colheres de mel', 'Frutas variadas para decorar'], instructions: ['Bata o açaí com a banana no liquidificador', 'Despeje em uma tigela', 'Adicione a granola por cima', 'Decore com frutas frescas', 'Regue com mel e sirva'] },
    { name: 'Crepioca de Queijo e Tomate', description: 'Crepioca leve e proteica', prep_time: 10, servings: 1, calories: 240, protein: 18, carbs: 22, fat: 8, ingredients: ['2 colheres de goma de tapioca', '1 ovo', '30g queijo branco', 'Tomate em rodelas', 'Orégano a gosto'], instructions: ['Misture a goma com o ovo', 'Despeje em frigideira antiaderente quente', 'Quando firmar, adicione o queijo', 'Coloque as rodelas de tomate', 'Dobre ao meio e polvilhe orégano'] },
    { name: 'Vitamina de Frutas com Aveia', description: 'Bebida nutritiva para começar o dia', prep_time: 5, servings: 1, calories: 320, protein: 10, carbs: 48, fat: 8, ingredients: ['1 banana', '1/2 mamão', '2 colheres de aveia', '200ml leite', '1 colher de mel'], instructions: ['Coloque todas as frutas no liquidificador', 'Adicione o leite e a aveia', 'Bata até ficar homogêneo', 'Adoce com mel', 'Sirva gelado'] },
    { name: 'Omelete de Espinafre', description: 'Café da manhã rico em ferro', prep_time: 12, servings: 1, calories: 250, protein: 18, carbs: 4, fat: 18, ingredients: ['3 ovos', '1 xícara de espinafre', '30g queijo branco', 'Azeite', 'Sal e pimenta'], instructions: ['Bata os ovos com sal e pimenta', 'Refogue o espinafre no azeite', 'Adicione os ovos batidos', 'Quando começar a firmar, adicione o queijo', 'Dobre ao meio e sirva'] }
  ],
  'Almoço': [
    { name: 'Frango Grelhado com Legumes', description: 'Proteína magra com vegetais coloridos', prep_time: 30, servings: 2, calories: 380, protein: 35, carbs: 22, fat: 16, ingredients: ['300g peito de frango', 'Brócolis', 'Cenoura', 'Abobrinha', 'Azeite e temperos'], instructions: ['Tempere o frango com sal, pimenta e limão', 'Grelhe em frigideira com azeite', 'Corte os legumes em pedaços', 'Cozinhe no vapor ou refogue', 'Monte o prato e sirva'] },
    { name: 'Salmão com Batata Doce', description: 'Peixe rico em ômega-3', prep_time: 35, servings: 2, calories: 420, protein: 32, carbs: 35, fat: 18, ingredients: ['2 filés de salmão', '2 batatas doces médias', 'Aspargos', 'Limão', 'Azeite e ervas'], instructions: ['Tempere o salmão com limão e ervas', 'Corte as batatas em rodelas', 'Disponha tudo em assadeira', 'Regue com azeite', 'Asse a 200°C por 25 minutos'] },
    { name: 'Risoto de Cogumelos', description: 'Risoto cremoso e saboroso', prep_time: 40, servings: 4, calories: 350, protein: 12, carbs: 52, fat: 10, ingredients: ['1 xícara arroz arbóreo', '200g cogumelos variados', '1L caldo de legumes', 'Parmesão ralado', 'Vinho branco'], instructions: ['Refogue os cogumelos com alho', 'Adicione o arroz e toste', 'Vá adicionando o caldo aos poucos', 'Mexa constantemente por 20 minutos', 'Finalize com parmesão'] },
    { name: 'Frango ao Curry com Arroz', description: 'Prato aromático e reconfortante', prep_time: 30, servings: 4, calories: 400, protein: 28, carbs: 42, fat: 14, ingredients: ['500g peito de frango', '1 lata leite de coco', '2 colheres curry', 'Cebola e alho', 'Arroz basmati'], instructions: ['Corte o frango em cubos', 'Refogue cebola e alho', 'Adicione o frango e doure', 'Junte curry e leite de coco', 'Cozinhe por 15 minutos e sirva com arroz'] },
    { name: 'Carne com Legumes', description: 'Refeição completa e nutritiva', prep_time: 35, servings: 4, calories: 450, protein: 35, carbs: 40, fat: 18, ingredients: ['400g patinho', 'Arroz integral', 'Feijão', 'Salada verde', 'Temperos naturais'], instructions: ['Tempere a carne e grelhe', 'Cozinhe o arroz integral', 'Prepare o feijão temperado', 'Monte o prato com salada', 'Sirva tudo junto'] }
  ],
  'Jantar': [
    { name: 'Sopa de Abóbora com Gengibre', description: 'Sopa cremosa e reconfortante', prep_time: 25, servings: 4, calories: 180, protein: 5, carbs: 28, fat: 6, ingredients: ['500g abóbora', '1 pedaço gengibre', 'Cebola', 'Caldo de legumes', 'Creme de leite light'], instructions: ['Corte a abóbora em cubos', 'Refogue cebola e gengibre', 'Adicione a abóbora e o caldo', 'Cozinhe até amolecer', 'Bata no liquidificador e finalize com creme'] },
    { name: 'Wrap de Frango com Vegetais', description: 'Wrap leve e prático', prep_time: 15, servings: 2, calories: 320, protein: 28, carbs: 30, fat: 10, ingredients: ['2 wraps integrais', '200g frango desfiado', 'Alface', 'Tomate', 'Cream cheese light'], instructions: ['Espalhe cream cheese no wrap', 'Adicione o frango desfiado', 'Coloque alface e tomate', 'Enrole bem fechado', 'Corte ao meio e sirva'] },
    { name: 'Omelete Recheada', description: 'Jantar leve e proteico', prep_time: 12, servings: 1, calories: 280, protein: 22, carbs: 8, fat: 18, ingredients: ['3 ovos', 'Queijo', 'Tomate', 'Espinafre', 'Temperos'], instructions: ['Bata os ovos', 'Despeje na frigideira quente', 'Adicione os recheios', 'Dobre ao meio', 'Sirva com salada'] },
    { name: 'Salada Caesar com Frango', description: 'Salada clássica e satisfatória', prep_time: 20, servings: 2, calories: 350, protein: 30, carbs: 15, fat: 20, ingredients: ['Alface romana', '200g frango grelhado', 'Croutons', 'Parmesão', 'Molho caesar light'], instructions: ['Lave e rasgue a alface', 'Grelhe e corte o frango', 'Monte a salada', 'Adicione croutons e queijo', 'Regue com molho'] },
    { name: 'Peixe Assado com Ervas', description: 'Peixe leve e aromático', prep_time: 30, servings: 2, calories: 280, protein: 35, carbs: 5, fat: 14, ingredients: ['2 filés de peixe branco', 'Ervas frescas', 'Limão', 'Azeite', 'Alho'], instructions: ['Tempere o peixe com limão e alho', 'Adicione as ervas por cima', 'Regue com azeite', 'Embrulhe em papel alumínio', 'Asse a 180°C por 20 minutos'] }
  ],
  'Lanches': [
    { name: 'Bolinho de Banana Fit', description: 'Bolinho saudável sem açúcar', prep_time: 30, servings: 12, calories: 85, protein: 3, carbs: 14, fat: 2, ingredients: ['3 bananas maduras', '2 xícaras aveia', '1/4 xícara mel', 'Canela', 'Passas (opcional)'], instructions: ['Amasse as bananas', 'Misture com aveia e mel', 'Adicione canela e passas', 'Forme bolinhos', 'Asse a 180°C por 20 minutos'] },
    { name: 'Hummus com Palitos de Vegetais', description: 'Pasta de grão-de-bico nutritiva', prep_time: 15, servings: 4, calories: 150, protein: 7, carbs: 18, fat: 6, ingredients: ['1 lata grão-de-bico', '2 colheres tahine', 'Limão', 'Alho', 'Azeite'], instructions: ['Escorra o grão-de-bico', 'Bata com tahine e limão', 'Adicione alho amassado', 'Regue com azeite', 'Sirva com palitos de cenoura e pepino'] },
    { name: 'Smoothie de Morango', description: 'Bebida refrescante e nutritiva', prep_time: 5, servings: 1, calories: 180, protein: 8, carbs: 28, fat: 4, ingredients: ['1 xícara morangos', '1/2 banana', '200ml leite', '1 colher mel', 'Gelo'], instructions: ['Coloque tudo no liquidificador', 'Bata até ficar cremoso', 'Sirva imediatamente'] },
    { name: 'Mix de Castanhas e Frutas Secas', description: 'Snack energético', prep_time: 5, servings: 4, calories: 200, protein: 6, carbs: 18, fat: 14, ingredients: ['Castanhas de caju', 'Amêndoas', 'Nozes', 'Damasco seco', 'Uva passa'], instructions: ['Misture todas as castanhas', 'Adicione as frutas secas', 'Divida em porções', 'Armazene em potes fechados'] },
    { name: 'Iogurte com Granola Caseira', description: 'Lanche cremoso e crocante', prep_time: 5, servings: 1, calories: 220, protein: 12, carbs: 30, fat: 6, ingredients: ['200g iogurte natural', '3 colheres granola', 'Frutas frescas', 'Mel'], instructions: ['Coloque iogurte na tigela', 'Adicione granola', 'Decore com frutas', 'Regue com mel'] }
  ],
  'Para Gestantes': [
    { name: 'Smoothie Verde Energético', description: 'Rico em ácido fólico e ferro', prep_time: 5, servings: 1, calories: 180, protein: 6, carbs: 32, fat: 3, ingredients: ['1 xícara espinafre', '1 banana', '1/2 xícara morangos', '200ml água de coco', '1 colher semente de chia'], instructions: ['Coloque espinafre e água de coco no liquidificador', 'Adicione banana e morangos', 'Bata até ficar homogêneo', 'Adicione chia', 'Sirva gelado'] },
    { name: 'Salada de Lentilha com Vegetais', description: 'Rica em ferro e proteína vegetal', prep_time: 25, servings: 4, calories: 220, protein: 12, carbs: 32, fat: 5, ingredients: ['1 xícara lentilha cozida', 'Tomate', 'Pepino', 'Cebola roxa', 'Azeite e limão'], instructions: ['Cozinhe a lentilha', 'Corte os vegetais em cubos', 'Misture tudo', 'Tempere com azeite e limão', 'Sirva fresco'] },
    { name: 'Mingau de Aveia com Frutas', description: 'Café da manhã reconfortante', prep_time: 10, servings: 1, calories: 300, protein: 10, carbs: 48, fat: 8, ingredients: ['1/2 xícara aveia', '1 xícara leite', 'Banana', 'Canela', 'Mel'], instructions: ['Cozinhe a aveia no leite', 'Mexa até engrossar', 'Adicione banana fatiada', 'Polvilhe canela', 'Adoce com mel'] },
    { name: 'Frango com Quinoa', description: 'Proteína completa e nutritiva', prep_time: 35, servings: 2, calories: 380, protein: 32, carbs: 35, fat: 12, ingredients: ['200g frango', '1 xícara quinoa', 'Brócolis', 'Cenoura', 'Temperos naturais'], instructions: ['Cozinhe a quinoa', 'Grelhe o frango temperado', 'Cozinhe os vegetais no vapor', 'Monte o prato', 'Sirva quente'] },
    { name: 'Sopa de Feijão Branco', description: 'Rica em proteínas e fibras', prep_time: 40, servings: 6, calories: 200, protein: 12, carbs: 30, fat: 4, ingredients: ['2 xícaras feijão branco', 'Cenoura', 'Aipo', 'Alho-poró', 'Caldo de legumes'], instructions: ['Cozinhe o feijão', 'Refogue os vegetais', 'Adicione o caldo', 'Cozinhe até os sabores se misturarem', 'Sirva quente'] }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { category, count = 3, profile, restrictions } = body

    // Usar receitas do template
    const templates = recipeTemplates[category] || recipeTemplates['Almoço']
    
    // Embaralhar e pegar a quantidade solicitada
    const shuffled = [...templates].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, templates.length))

    // Adaptar receitas baseado no perfil
    const recipes = selected.map(r => ({
      ...r,
      category,
      user_id: user.id,
      is_favorite: false
    }))

    return NextResponse.json({ recipes, success: true })
  } catch (error: any) {
    console.error('Error generating recipes:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
