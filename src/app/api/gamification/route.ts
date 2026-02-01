import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const action = req.nextUrl.searchParams.get('action') || 'stats'

    if (action === 'stats') {
      const [pointsRes, achievementsRes, allAchievementsRes, challengesRes] = await Promise.all([
        supabase.from('user_points').select('*').eq('user_id', userId).single(),
        supabase.from('user_achievements').select('*, achievements(*)').eq('user_id', userId),
        supabase.from('achievements').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_challenges').select('*, challenges(*)').eq('user_id', userId).eq('status', 'active')
      ])

      const points = pointsRes.data || { total_points: 0, current_streak: 0, longest_streak: 0, level: 1 }
      const unlockedIds = (achievementsRes.data || []).map((ua: any) => ua.achievement_id)
      const allAchievements = (allAchievementsRes.data || []).map((a: any) => ({
        ...a,
        unlocked: unlockedIds.includes(a.id),
        unlocked_at: achievementsRes.data?.find((ua: any) => ua.achievement_id === a.id)?.unlocked_at
      }))

      return NextResponse.json({
        points: {
          total: points.total_points || 0,
          level: Math.floor((points.total_points || 0) / 100) + 1,
          streak: points.current_streak || 0,
          longestStreak: points.longest_streak || 0,
          nextLevel: (Math.floor((points.total_points || 0) / 100) + 1) * 100,
          progress: ((points.total_points || 0) % 100)
        },
        achievements: allAchievements,
        unlockedCount: unlockedIds.length,
        totalCount: allAchievements.length,
        challenges: challengesRes.data || []
      })
    }

    if (action === 'leaderboard') {
      const { data } = await supabase
        .from('user_points')
        .select('user_id, total_points, current_streak, longest_streak')
        .order('total_points', { ascending: false })
        .limit(20)

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id)
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds)

        const leaderboard = data.map((d, i) => ({
          rank: i + 1,
          userId: d.user_id,
          name: users?.find(u => u.id === d.user_id)?.name || 'Usuária',
          points: d.total_points,
          streak: d.current_streak
        }))

        return NextResponse.json({ leaderboard })
      }

      return NextResponse.json({ leaderboard: [] })
    }

    if (action === 'history') {
      const { data } = await supabase
        .from('points_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ history: data || [] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
    }

    if (action === 'addPoints') {
      const { points, reason, category } = body
      
      // Get or create user_points
      let { data: existing } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!existing) {
        const { data: created } = await supabase
          .from('user_points')
          .insert({ user_id: userId, total_points: 0, current_streak: 0, longest_streak: 0 })
          .select()
          .single()
        existing = created
      }

      const newTotal = (existing?.total_points || 0) + points
      const newLevel = Math.floor(newTotal / 100) + 1
      const oldLevel = Math.floor((existing?.total_points || 0) / 100) + 1

      await supabase
        .from('user_points')
        .update({ total_points: newTotal })
        .eq('user_id', userId)

      // Log history
      await supabase.from('points_history').insert({
        user_id: userId,
        points,
        reason: reason || 'Ação no app',
        category: category || 'general'
      })

      // Check for level-up achievements
      if (newLevel > oldLevel) {
        await checkAndUnlockAchievement(userId, 'level', newLevel)
      }

      return NextResponse.json({ 
        success: true, 
        newTotal, 
        newLevel,
        leveledUp: newLevel > oldLevel 
      })
    }

    if (action === 'updateStreak') {
      let { data: existing } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!existing) {
        await supabase.from('user_points').insert({ 
          user_id: userId, total_points: 0, current_streak: 1, longest_streak: 1 
        })
        await checkAndUnlockAchievement(userId, 'streak', 1)
        return NextResponse.json({ success: true, streak: 1 })
      }

      const newStreak = (existing.current_streak || 0) + 1
      const longestStreak = Math.max(newStreak, existing.longest_streak || 0)

      await supabase
        .from('user_points')
        .update({ current_streak: newStreak, longest_streak: longestStreak })
        .eq('user_id', userId)

      await checkAndUnlockAchievement(userId, 'streak', newStreak)

      // Bonus points for streaks
      let bonusPoints = 5
      if (newStreak >= 7) bonusPoints = 10
      if (newStreak >= 30) bonusPoints = 25

      await supabase.from('user_points')
        .update({ total_points: (existing.total_points || 0) + bonusPoints })
        .eq('user_id', userId)

      await supabase.from('points_history').insert({
        user_id: userId,
        points: bonusPoints,
        reason: `Sequência de ${newStreak} dias`,
        category: 'streak'
      })

      return NextResponse.json({ success: true, streak: newStreak, bonusPoints })
    }

    if (action === 'checkAchievements') {
      const { type, value } = body
      const result = await checkAndUnlockAchievement(userId, type, value)
      return NextResponse.json(result)
    }

    if (action === 'joinChallenge') {
      const { challengeId } = body
      const { data } = await supabase
        .from('user_challenges')
        .insert({ user_id: userId, challenge_id: challengeId, status: 'active', progress: 0 })
        .select()
        .single()
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function checkAndUnlockAchievement(userId: string, type: string, value: number) {
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('requirement_type', type)
    .lte('requirement_value', value)
    .eq('is_active', true)

  if (!achievements || achievements.length === 0) return { unlocked: [] }

  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const existingIds = (existing || []).map(e => e.achievement_id)
  const newAchievements = achievements.filter(a => !existingIds.includes(a.id))

  if (newAchievements.length === 0) return { unlocked: [] }

  const inserts = newAchievements.map(a => ({
    user_id: userId,
    achievement_id: a.id,
    unlocked_at: new Date().toISOString()
  }))

  await supabase.from('user_achievements').insert(inserts)

  // Add points for each unlocked
  const totalNewPoints = newAchievements.reduce((sum, a) => sum + a.points, 0)
  if (totalNewPoints > 0) {
    const { data: pts } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', userId)
      .single()

    await supabase
      .from('user_points')
      .update({ total_points: (pts?.total_points || 0) + totalNewPoints })
      .eq('user_id', userId)

    for (const a of newAchievements) {
      await supabase.from('points_history').insert({
        user_id: userId,
        points: a.points,
        reason: `Conquista: ${a.name}`,
        category: 'achievement'
      })
    }
  }

  return { unlocked: newAchievements }
}
