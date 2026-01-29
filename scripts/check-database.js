const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://qlxabxhszpvetblvnfxl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo',
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function checkDatabase() {
  console.log('🔍 Verificando banco de dados VitaFit...\n')

  // 1. Verificar usuários
  console.log('👥 USUÁRIOS:')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, name, phase, premium, created_at')

  if (usersError) {
    console.error('❌ Erro ao buscar usuários:', usersError.message)
  } else {
    console.log(`✅ ${users.length} usuários encontrados:`)
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name}) ${u.premium ? '👑 PREMIUM' : ''} - Fase: ${u.phase}`)
    })
  }

  console.log('\n📊 TABELAS CRIADAS:')

  // Lista de tabelas esperadas
  const tables = [
    'users', 'meals', 'nutrition_plans', 'recipes', 'workout_plans',
    'workouts', 'exercises', 'progress', 'appointments', 'chat_sessions',
    'memories', 'shopping_lists', 'shopping_items', 'baby_names',
    'maternity_bag_items', 'partners', 'educational_content',
    'water_intake', 'daily_goals'
  ]

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ ${table}: ERRO - ${error.message}`)
    } else {
      console.log(`   ✅ ${table}: ${count} registros`)
    }
  }

  // 3. Verificar nomes de bebê
  console.log('\n👶 NOMES DE BEBÊ:')
  const { count: babyNamesCount } = await supabase
    .from('baby_names')
    .select('*', { count: 'exact', head: true })
  console.log(`   ${babyNamesCount} nomes cadastrados`)

  // 4. Verificar exercícios
  console.log('\n💪 EXERCÍCIOS:')
  const { count: exercisesCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
  console.log(`   ${exercisesCount} exercícios cadastrados`)

  // 5. Verificar buckets de storage
  console.log('\n📦 STORAGE BUCKETS:')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('❌ Erro ao listar buckets:', bucketsError.message)
  } else {
    buckets.forEach(bucket => {
      console.log(`   ✅ ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
    })
  }

  console.log('\n✅ Verificação concluída!')
}

checkDatabase().catch(console.error)
