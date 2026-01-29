'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Apple, Droplets, Flame, Target, Plus, Utensils, ChefHat, Loader2, Save, Sparkles, Heart, X, Clock, Users, Check, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Meal {
  id?: string
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time?: string
  type: string
}

interface DayPlan {
  day: number
  meals: {
    breakfast: Meal
    morning_snack: Meal
    lunch: Meal
    afternoon_snack: Meal
    dinner: Meal
  }
  tips: string[]
}

interface Recipe {
  id?: string
  name: string
  description: string
  category: string
  prep_time: number
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  instructions: string[]
  is_favorite?: boolean
}

export default function NutritionPage() {
  const [tab, setTab] = useState<'hoje' | 'plano' | 'receitas'>('hoje')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [stats, setStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, waterGoal: 2000, caloriesGoal: 2000 })
  const [plan, setPlan] = useState<DayPlan[] | null>(null)
  const [planSaved, setPlanSaved] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeCategory, setRecipeCategory] = useState('all')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showPlanOptions, setShowPlanOptions] = useState(false)
  const [planDays, setPlanDays] = useState(7)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [mealsRes, waterRes, userRes, planRes, recipesRes] = await Promise.all([
        supabase.from('meals').select('*').eq('user_id', user.id).gte('created_at', today).order('created_at', { ascending: true }),
        supabase.from('water_intake').select('amount').eq('user_id', user.id).gte('created_at', today),
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('nutrition_plans').select('*').eq('user_id', user.id).eq('is_active', true).single(),
        supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      const meals = mealsRes.data || []
      const water = (waterRes.data || []).reduce((sum: number, w: any) => sum + w.amount, 0)

      setTodayMeals(meals)
      setUserProfile(userRes.data)
      setRecipes(recipesRes.data || [])

      setStats({
        calories: meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
        protein: meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0),
        carbs: meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0),
        fat: meals.reduce((sum: number, m: any) => sum + (m.fat || 0), 0),
        water,
        waterGoal: userRes.data?.daily_water_goal || 2000,
        caloriesGoal: userRes.data?.daily_calories_goal || 2000
      })

      if (planRes.data?.plan_data) {
        setPlan(planRes.data.plan_data)
        setPlanSaved(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const addWater = async (amount: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('water_intake').insert({ user_id: user.id, amount })
      setStats(prev => ({ ...prev, water: prev.water + amount }))
    } catch (e) { console.error(e) }
  }

  const generatePlan = async () => {
    setGenerating(true)
    setShowPlanOptions(false)
    setPlanSaved(false)
    
    try {
      const response = await fetch('/api/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          days: planDays,
          profile: userProfile,
          restrictions: userProfile?.dietary_restrictions || [],
          phase: userProfile?.phase || 'TRYING'
        })
      })
      
      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
      }
    } catch (e) { 
      console.error(e)
      // Gerar plano local como fallback
      const localPlan = generateLocalPlan(planDays)
      setPlan(localPlan)
    }
    finally { setGenerating(false) }
  }

  const generateLocalPlan = (days: number): DayPlan[] => {
    const meals = {
      breakfast: [
        { name: 'Vitamina de Frutas com Aveia', description: 'Banana, mamão, aveia e leite', calories: 320, protein: 12, carbs: 48, fat: 8 },
        { name: 'Ovos Mexidos com Torrada', description: '2 ovos, 2 torradas integrais, tomate', calories: 350, protein: 18, carbs: 30, fat: 16 },
        { name: 'Iogurte com Granola', description: 'Iogurte natural, granola, mel, frutas', calories: 280, protein: 14, carbs: 42, fat: 6 },
        { name: 'Tapioca com Queijo', description: 'Tapioca, queijo branco, tomate', calories: 290, protein: 15, carbs: 38, fat: 9 },
        { name: 'Mingau de Aveia', description: 'Aveia, leite, canela, banana', calories: 310, protein: 11, carbs: 52, fat: 7 },
      ],
      morning_snack: [
        { name: 'Frutas Variadas', description: 'Maçã, banana ou pera', calories: 120, protein: 1, carbs: 28, fat: 0 },
        { name: 'Mix de Castanhas', description: 'Castanhas, nozes, amêndoas', calories: 180, protein: 5, carbs: 8, fat: 16 },
        { name: 'Iogurte Natural', description: 'Iogurte com mel', calories: 140, protein: 8, carbs: 18, fat: 4 },
      ],
      lunch: [
        { name: 'Frango Grelhado com Legumes', description: 'Peito de frango, arroz integral, brócolis', calories: 450, protein: 35, carbs: 42, fat: 12 },
        { name: 'Peixe Assado com Batata', description: 'Filé de tilápia, batata doce, salada', calories: 420, protein: 32, carbs: 38, fat: 14 },
        { name: 'Carne com Legumes', description: 'Patinho, arroz, feijão, salada', calories: 480, protein: 38, carbs: 45, fat: 15 },
      ],
      afternoon_snack: [
        { name: 'Sanduíche Natural', description: 'Pão integral, frango desfiado, alface', calories: 220, protein: 15, carbs: 25, fat: 6 },
        { name: 'Smoothie Verde', description: 'Couve, maçã, gengibre, água de coco', calories: 150, protein: 3, carbs: 32, fat: 1 },
        { name: 'Torrada com Pasta de Amendoim', description: 'Torrada integral, pasta de amendoim', calories: 190, protein: 8, carbs: 20, fat: 10 },
      ],
      dinner: [
        { name: 'Sopa de Legumes', description: 'Legumes variados, frango desfiado', calories: 280, protein: 22, carbs: 28, fat: 8 },
        { name: 'Omelete com Salada', description: '3 ovos, queijo, espinafre, salada', calories: 320, protein: 24, carbs: 12, fat: 20 },
        { name: 'Wrap de Frango', description: 'Wrap integral, frango, vegetais', calories: 350, protein: 28, carbs: 32, fat: 12 },
      ]
    }

    const tips = [
      'Beba pelo menos 2L de água por dia',
      'Prefira alimentos integrais',
      'Evite açúcar refinado',
      'Mastigue bem os alimentos',
      'Faça pequenas refeições a cada 3 horas',
      'Inclua proteínas em todas as refeições',
      'Consuma frutas e vegetais variados'
    ]

    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      meals: {
        breakfast: { ...meals.breakfast[i % meals.breakfast.length], type: 'breakfast' },
        morning_snack: { ...meals.morning_snack[i % meals.morning_snack.length], type: 'morning_snack' },
        lunch: { ...meals.lunch[i % meals.lunch.length], type: 'lunch' },
        afternoon_snack: { ...meals.afternoon_snack[i % meals.afternoon_snack.length], type: 'afternoon_snack' },
        dinner: { ...meals.dinner[i % meals.dinner.length], type: 'dinner' }
      },
      tips: [tips[i % tips.length], tips[(i + 1) % tips.length]]
    }))
  }

  const savePlan = async () => {
    if (!plan) return
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Desativar planos anteriores
      await supabase.from('nutrition_plans').update({ is_active: false }).eq('user_id', user.id)

      // Salvar novo plano
      await supabase.from('nutrition_plans').insert({
        user_id: user.id,
        plan_data: plan,
        duration_days: plan.length,
        is_active: true,
        start_date: new Date().toISOString()
      })

      setPlanSaved(true)
      alert('Plano salvo com sucesso!')
    } catch (e) { 
      console.error(e)
      alert('Erro ao salvar plano')
    }
  }

  const generateRecipes = async (category: string) => {
    setGenerating(true)
    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category,
          count: 5,
          profile: userProfile,
          restrictions: userProfile?.dietary_restrictions || []
        })
      })
      
      const data = await response.json()
      if (data.recipes) {
        // Salvar receitas automaticamente
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const recipesToSave = data.recipes.map((r: Recipe) => ({
            ...r,
            user_id: user.id,
            is_favorite: false
          }))
          
          const { data: saved } = await supabase.from('recipes').insert(recipesToSave).select()
          if (saved) {
            setRecipes(prev => [...saved, ...prev])
          }
        }
      }
    } catch (e) { 
      console.error(e)
      // Gerar receitas locais como fallback
      const localRecipes = generateLocalRecipes(category)
      await saveLocalRecipes(localRecipes)
    }
    finally { setGenerating(false) }
  }

  const generateLocalRecipes = (category: string): Recipe[] => {
    const allRecipes: Record<string, Recipe[]> = {
      'Café da Manhã': [
        { name: 'Panqueca de Banana', description: 'Panqueca saudável sem açúcar', category: 'Café da Manhã', prep_time: 15, servings: 2, calories: 280, protein: 12, carbs: 38, fat: 8, ingredients: ['2 bananas maduras', '2 ovos', '1/2 xícara de aveia', '1 colher de canela', 'Óleo de coco para untar'], instructions: ['Amasse as bananas', 'Misture com ovos e aveia', 'Adicione canela', 'Despeje na frigideira quente', 'Doure dos dois lados'] },
        { name: 'Bowl de Açaí', description: 'Açaí com frutas e granola', category: 'Café da Manhã', prep_time: 10, servings: 1, calories: 350, protein: 8, carbs: 52, fat: 12, ingredients: ['200g de polpa de açaí', '1 banana', 'Granola', 'Mel', 'Frutas variadas'], instructions: ['Bata o açaí com banana', 'Despeje na tigela', 'Adicione granola por cima', 'Decore com frutas', 'Regue com mel'] },
        { name: 'Crepioca de Queijo', description: 'Crepioca leve e proteica', category: 'Café da Manhã', prep_time: 10, servings: 1, calories: 240, protein: 18, carbs: 22, fat: 8, ingredients: ['2 colheres de goma de tapioca', '1 ovo', '30g de queijo branco', 'Orégano'], instructions: ['Misture a goma com o ovo', 'Despeje na frigideira antiaderente', 'Adicione o queijo', 'Dobre ao meio', 'Polvilhe orégano'] }
      ],
      'Almoço': [
        { name: 'Frango ao Curry', description: 'Frango cremoso com especiarias', category: 'Almoço', prep_time: 30, servings: 4, calories: 380, protein: 35, carbs: 18, fat: 18, ingredients: ['500g peito de frango', '1 lata leite de coco', '2 colheres curry', 'Cebola', 'Alho'], instructions: ['Corte o frango em cubos', 'Refogue cebola e alho', 'Adicione o frango', 'Junte curry e leite de coco', 'Cozinhe por 20 minutos'] },
        { name: 'Salmão com Legumes', description: 'Salmão assado nutritivo', category: 'Almoço', prep_time: 35, servings: 2, calories: 420, protein: 38, carbs: 22, fat: 20, ingredients: ['2 filés de salmão', 'Brócolis', 'Cenoura', 'Azeite', 'Limão'], instructions: ['Tempere o salmão', 'Corte os legumes', 'Disponha em assadeira', 'Regue com azeite', 'Asse por 25 minutos'] },
        { name: 'Risoto de Cogumelos', description: 'Risoto cremoso vegetariano', category: 'Almoço', prep_time: 40, servings: 4, calories: 350, protein: 12, carbs: 52, fat: 10, ingredients: ['1 xícara arroz arbóreo', '200g cogumelos', 'Caldo de legumes', 'Parmesão', 'Vinho branco'], instructions: ['Refogue cogumelos', 'Adicione arroz', 'Vá adicionando caldo aos poucos', 'Mexa sempre', 'Finalize com parmesão'] }
      ],
      'Jantar': [
        { name: 'Sopa de Abóbora', description: 'Sopa cremosa reconfortante', category: 'Jantar', prep_time: 25, servings: 4, calories: 180, protein: 5, carbs: 28, fat: 6, ingredients: ['500g abóbora', 'Cebola', 'Gengibre', 'Caldo de legumes', 'Creme de leite light'], instructions: ['Cozinhe a abóbora', 'Refogue cebola e gengibre', 'Bata tudo no liquidificador', 'Adicione creme de leite', 'Sirva quente'] },
        { name: 'Wrap de Atum', description: 'Wrap leve e prático', category: 'Jantar', prep_time: 15, servings: 2, calories: 290, protein: 24, carbs: 28, fat: 10, ingredients: ['2 wraps integrais', '1 lata de atum', 'Alface', 'Tomate', 'Maionese light'], instructions: ['Escorra o atum', 'Misture com maionese', 'Monte o wrap', 'Adicione vegetais', 'Enrole e sirva'] }
      ],
      'Lanches': [
        { name: 'Bolinho de Banana', description: 'Bolinho fit sem açúcar', category: 'Lanches', prep_time: 30, servings: 12, calories: 85, protein: 3, carbs: 14, fat: 2, ingredients: ['3 bananas', '2 xícaras aveia', '1/4 xícara mel', 'Canela', 'Passas'], instructions: ['Amasse as bananas', 'Misture todos ingredientes', 'Forme bolinhos', 'Disponha em forma', 'Asse por 20 minutos'] },
        { name: 'Hummus com Palitos', description: 'Hummus caseiro com vegetais', category: 'Lanches', prep_time: 15, servings: 4, calories: 150, protein: 7, carbs: 18, fat: 6, ingredients: ['1 lata grão-de-bico', 'Tahine', 'Limão', 'Alho', 'Azeite'], instructions: ['Escorra o grão-de-bico', 'Bata com tahine', 'Adicione limão e alho', 'Regue com azeite', 'Sirva com palitos de cenoura'] }
      ],
      'Para Gestantes': [
        { name: 'Smoothie de Espinafre', description: 'Rico em ácido fólico', category: 'Para Gestantes', prep_time: 5, servings: 1, calories: 180, protein: 6, carbs: 32, fat: 3, ingredients: ['1 xícara espinafre', '1 banana', '1/2 xícara morangos', 'Água de coco', 'Semente de chia'], instructions: ['Coloque tudo no liquidificador', 'Bata até ficar homogêneo', 'Adicione chia', 'Sirva gelado'] },
        { name: 'Omelete de Espinafre', description: 'Café da manhã nutritivo', category: 'Para Gestantes', prep_time: 10, servings: 1, calories: 250, protein: 18, carbs: 4, fat: 18, ingredients: ['3 ovos', '1 xícara espinafre', 'Queijo branco', 'Azeite', 'Sal'], instructions: ['Bata os ovos', 'Refogue o espinafre', 'Adicione os ovos', 'Coloque o queijo', 'Dobre e sirva'] }
      ]
    }

    return allRecipes[category] || allRecipes['Almoço']
  }

  const saveLocalRecipes = async (recipesToSave: Recipe[]) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const recipesWithUser = recipesToSave.map(r => ({
        ...r,
        user_id: user.id,
        is_favorite: false
      }))

      const { data: saved } = await supabase.from('recipes').insert(recipesWithUser).select()
      if (saved) {
        setRecipes(prev => [...saved, ...prev])
      }
    } catch (e) { console.error(e) }
  }

  const toggleFavorite = async (recipe: Recipe) => {
    if (!recipe.id) return
    
    try {
      const supabase = createClient()
      await supabase.from('recipes').update({ is_favorite: !recipe.is_favorite }).eq('id', recipe.id)
      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r))
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe({ ...selectedRecipe, is_favorite: !selectedRecipe.is_favorite })
      }
    } catch (e) { console.error(e) }
  }

  const categories = ['Café da Manhã', 'Almoço', 'Jantar', 'Lanches', 'Para Gestantes']
  
  const filteredRecipes = recipeCategory === 'all' 
    ? recipes 
    : recipes.filter(r => r.category === recipeCategory)

  const mealTypes = [
    { key: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
    { key: 'morning_snack', label: 'Lanche da Manhã', icon: '🍎' },
    { key: 'lunch', label: 'Almoço', icon: '🍽️' },
    { key: 'afternoon_snack', label: 'Lanche da Tarde', icon: '🥤' },
    { key: 'dinner', label: 'Jantar', icon: '🌙' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Nutrição</h1>
            <p className="text-sm text-gray-500">Seu plano alimentar</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex gap-2">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'plano', label: 'Plano' },
            { id: 'receitas', label: 'Receitas' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                tab === t.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* TAB HOJE */}
        {tab === 'hoje' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-500">Calorias</span>
                </div>
                <p className="text-2xl font-bold">{stats.calories}</p>
                <p className="text-xs text-gray-400">Meta: {stats.caloriesGoal} kcal</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.calories / stats.caloriesGoal) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-500">Água</span>
                </div>
                <p className="text-2xl font-bold">{stats.water}ml</p>
                <p className="text-xs text-gray-400">Meta: {stats.waterGoal}ml</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.water / stats.waterGoal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Water Buttons */}
            <div className="bg-white rounded-xl p-4 border">
              <h3 className="font-medium mb-3">Adicionar Água</h3>
              <div className="flex gap-2">
                {[150, 200, 250, 300].map(amount => (
                  <button
                    key={amount}
                    onClick={() => addWater(amount)}
                    className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    +{amount}ml
                  </button>
                ))}
              </div>
            </div>

            {/* Macros */}
            <div className="bg-white rounded-xl p-4 border">
              <h3 className="font-medium mb-3">Macronutrientes</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-2">
                    <span className="text-lg">🥩</span>
                  </div>
                  <p className="text-lg font-bold">{stats.protein}g</p>
                  <p className="text-xs text-gray-500">Proteína</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                    <span className="text-lg">🍞</span>
                  </div>
                  <p className="text-lg font-bold">{stats.carbs}g</p>
                  <p className="text-xs text-gray-500">Carboidratos</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <span className="text-lg">🥑</span>
                  </div>
                  <p className="text-lg font-bold">{stats.fat}g</p>
                  <p className="text-xs text-gray-500">Gorduras</p>
                </div>
              </div>
            </div>

            {/* Today Meals */}
            <div className="bg-white rounded-xl p-4 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Refeições de Hoje</h3>
                <Link href="/scanner" className="text-primary-600 text-sm font-medium">+ Adicionar</Link>
              </div>
              
              {todayMeals.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma refeição registrada</p>
                  <Link href="/scanner" className="text-primary-600 text-sm font-medium mt-2 inline-block">Registrar primeira refeição</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayMeals.map((meal, i) => (
                    <div key={meal.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Utensils className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{meal.name}</p>
                        <p className="text-xs text-gray-500">{meal.calories} kcal • {meal.protein}g prot</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB PLANO */}
        {tab === 'plano' && (
          <div className="space-y-4">
            {!plan ? (
              <div className="bg-white rounded-xl p-6 border text-center">
                <ChefHat className="w-12 h-12 mx-auto mb-4 text-primary-500" />
                <h3 className="text-lg font-semibold mb-2">Crie seu Plano Alimentar</h3>
                <p className="text-gray-500 mb-4">Um plano personalizado com base no seu perfil e objetivos</p>
                
                {showPlanOptions ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Quantos dias de plano?</p>
                    <div className="flex gap-2 justify-center">
                      {[7, 14, 30].map(d => (
                        <button
                          key={d}
                          onClick={() => setPlanDays(d)}
                          className={`px-4 py-2 rounded-lg font-medium ${planDays === d ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}
                        >
                          {d} dias
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={generatePlan}
                      disabled={generating}
                      className="w-full mt-4 py-3 bg-primary-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {generating ? 'Gerando...' : 'Gerar Plano'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPlanOptions(true)}
                    className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" /> Criar Plano com IA
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Plan Actions */}
                <div className="flex gap-2">
                  {!planSaved && (
                    <button
                      onClick={savePlan}
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar Plano
                    </button>
                  )}
                  <button
                    onClick={() => { setPlan(null); setShowPlanOptions(true); }}
                    className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Novo Plano
                  </button>
                </div>

                {planSaved && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 text-sm font-medium">Plano salvo com sucesso!</span>
                  </div>
                )}

                {/* Day Selector */}
                <div className="bg-white rounded-xl p-4 border">
                  <h3 className="font-medium mb-3">Selecione o dia</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {plan.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-xl font-medium ${
                          selectedDay === i ? 'bg-primary-500 text-white' : 'bg-gray-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Meals */}
                <div className="space-y-3">
                  {plan[selectedDay] && mealTypes.map(({ key, label, icon }) => {
                    const meal = plan[selectedDay].meals[key as keyof typeof plan[0]['meals']]
                    if (!meal) return null
                    
                    return (
                      <div key={key} className="bg-white rounded-xl p-4 border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{icon}</span>
                          <span className="font-medium">{label}</span>
                        </div>
                        <h4 className="font-semibold">{meal.name}</h4>
                        <p className="text-sm text-gray-500">{meal.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>{meal.calories} kcal</span>
                          <span>{meal.protein}g prot</span>
                          <span>{meal.carbs}g carbs</span>
                          <span>{meal.fat}g fat</span>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Tips */}
                  {plan[selectedDay]?.tips && plan[selectedDay].tips.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">💡 Dicas do dia</h4>
                      <ul className="space-y-1">
                        {plan[selectedDay].tips.map((tip, i) => (
                          <li key={i} className="text-sm text-yellow-700">• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB RECEITAS */}
        {tab === 'receitas' && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setRecipeCategory('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${
                  recipeCategory === 'all' ? 'bg-primary-500 text-white' : 'bg-white border'
                }`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setRecipeCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${
                    recipeCategory === cat ? 'bg-primary-500 text-white' : 'bg-white border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Generate Recipes */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Gerar Receitas com IA</h3>
                  <p className="text-sm text-white/80">Receitas personalizadas para você</p>
                </div>
                <button
                  onClick={() => generateRecipes(recipeCategory === 'all' ? 'Almoço' : recipeCategory)}
                  disabled={generating}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar'}
                </button>
              </div>
            </div>

            {/* Recipe List */}
            {filteredRecipes.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border text-center">
                <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma receita salva</p>
                <p className="text-sm text-gray-400 mt-1">Gere receitas com IA para começar</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className="bg-white rounded-xl p-4 border cursor-pointer hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{recipe.name}</h4>
                        <p className="text-sm text-gray-500">{recipe.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.prep_time}min</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} porções</span>
                          <span>{recipe.calories} kcal</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}
                        className={`p-2 rounded-lg ${recipe.is_favorite ? 'text-red-500' : 'text-gray-300'}`}
                      >
                        <Heart className={`w-5 h-5 ${recipe.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">{selectedRecipe.name}</h2>
              <button onClick={() => setSelectedRecipe(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-gray-600">{selectedRecipe.description}</p>
              
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" />{selectedRecipe.prep_time} min</div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4 text-gray-400" />{selectedRecipe.servings} porções</div>
                <div>{selectedRecipe.calories} kcal</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-red-600">{selectedRecipe.protein}g</p>
                  <p className="text-xs text-red-600">Proteína</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-yellow-600">{selectedRecipe.carbs}g</p>
                  <p className="text-xs text-yellow-600">Carbs</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{selectedRecipe.fat}g</p>
                  <p className="text-xs text-green-600">Gordura</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Ingredientes</h3>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients?.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Modo de Preparo</h3>
                <ol className="space-y-2">
                  {selectedRecipe.instructions?.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => toggleFavorite(selectedRecipe)}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  selectedRecipe.is_favorite 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-primary-500 text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedRecipe.is_favorite ? 'fill-current' : ''}`} />
                {selectedRecipe.is_favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
