'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Flame, Target, Dumbbell, Apple, Droplets, ArrowLeft, Lock, Check, TrendingUp, Crown, Zap, Medal, ChevronRight, Gift, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  type: string
  icon: string
  color: string
  requirement_type: string
  requirement_value: number
  points: number
  sort_order: number
  is_secret: boolean
  unlocked: boolean
  unlocked_at?: string
}

interface PointsData {
  total: number
  level: number
  streak: number
  longestStreak: number
  nextLevel: number
  progress: number
}

interface HistoryItem {
  id: string
  points: number
  reason: string
  category: string
  created_at: string
}

type Tab = 'conquistas' | 'ranking' | 'historico'

export default function AchievementsPage() {
  const [tab, setTab] = useState<Tab>('conquistas')
  const [points, setPoints] = useState<PointsData>({ total: 0, level: 1, streak: 0, longestStreak: 0, nextLevel: 100, progress: 0 })
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showUnlocked, setShowUnlocked] = useState<Achievement | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      await loadStats(user.id)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadStats = async (uid: string) => {
    try {
      const res = await fetch(`/api/gamification?userId=${uid}&action=stats`)
      const data = await res.json()
      if (data.points) setPoints(data.points)
      if (data.achievements) setAchievements(data.achievements)
      setUnlockedCount(data.unlockedCount || 0)
    } catch (e) { console.error(e) }
  }

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`/api/gamification?userId=${userId}&action=leaderboard`)
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (e) { console.error(e) }
  }

  const loadHistory = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/gamification?userId=${userId}&action=history`)
      const data = await res.json()
      setHistory(data.history || [])
    } catch (e) { console.error(e) }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    if (t === 'ranking' && leaderboard.length === 0) loadLeaderboard()
    if (t === 'historico' && history.length === 0) loadHistory()
  }

  const groupedAchievements = achievements.reduce((acc, a) => {
    const group = a.requirement_type === 'streak' ? 'Sequência' :
                  a.requirement_type === 'meals' ? 'Nutrição' :
                  a.requirement_type === 'workouts' ? 'Treinos' :
                  a.requirement_type === 'level' ? 'Níveis' :
                  a.requirement_type === 'water_goals' ? 'Hidratação' : 'Especiais'
    if (!acc[group]) acc[group] = []
    acc[group].push(a)
    return acc
  }, {} as Record<string, Achievement[]>)

  const groupIcons: Record<string, any> = {
    'Sequência': Flame, 'Nutrição': Apple, 'Treinos': Dumbbell,
    'Níveis': Star, 'Hidratação': Droplets, 'Especiais': Gift
  }

  const groupColors: Record<string, string> = {
    'Sequência': 'text-orange-500', 'Nutrição': 'text-green-500', 'Treinos': 'text-blue-500',
    'Níveis': 'text-yellow-500', 'Hidratação': 'text-cyan-500', 'Especiais': 'text-purple-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Carregando conquistas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="p-2 bg-white/20 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Conquistas & Gamificação</h1>
        </div>

        {/* Level Card */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">
                {points.level >= 50 ? '👑' : points.level >= 25 ? '💎' : points.level >= 10 ? '⭐' : '🌟'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">Nível {points.level}</h2>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{points.total} pts</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${points.progress}%` }} />
              </div>
              <p className="text-white/70 text-xs">{points.progress}/100 para o nível {points.level + 1}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <Flame className="w-4 h-4 mx-auto mb-0.5" />
              <p className="text-sm font-bold">{points.streak}</p>
              <p className="text-[10px] text-white/60">Dias seguidos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-0.5" />
              <p className="text-sm font-bold">{unlockedCount}/{achievements.length}</p>
              <p className="text-[10px] text-white/60">Conquistas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-0.5" />
              <p className="text-sm font-bold">{points.longestStreak}</p>
              <p className="text-[10px] text-white/60">Recorde</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex gap-1">
        {([
          { key: 'conquistas' as Tab, label: 'Conquistas', icon: Trophy },
          { key: 'ranking' as Tab, label: 'Ranking', icon: Crown },
          { key: 'historico' as Tab, label: 'Histórico', icon: Zap },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-yellow-50 text-yellow-700' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Conquistas Tab */}
        {tab === 'conquistas' && (
          <div className="space-y-6">
            {Object.entries(groupedAchievements).map(([group, items]) => {
              const Icon = groupIcons[group] || Star
              const color = groupColors[group] || 'text-gray-500'
              const unlockedInGroup = items.filter(a => a.unlocked).length

              return (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <h3 className="font-bold text-gray-800">{group}</h3>
                    <span className="text-xs text-gray-400 ml-auto">{unlockedInGroup}/{items.length}</span>
                  </div>

                  <div className="grid gap-2">
                    {items.map(achievement => (
                      <div
                        key={achievement.id}
                        onClick={() => achievement.unlocked && setShowUnlocked(achievement)}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          achievement.unlocked
                            ? 'bg-white shadow-sm cursor-pointer active:scale-[0.98]'
                            : 'bg-gray-100/50 opacity-60'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                          achievement.unlocked ? 'bg-yellow-50' : 'bg-gray-200'
                        }`}>
                          {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-sm ${achievement.unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                              {achievement.is_secret && !achievement.unlocked ? '???' : achievement.name}
                            </h4>
                            {achievement.unlocked && <Check className="w-4 h-4 text-green-500" />}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {achievement.is_secret && !achievement.unlocked ? 'Conquista secreta' : achievement.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold ${achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                            +{achievement.points}
                          </span>
                          <p className="text-[10px] text-gray-400">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {achievements.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Nenhuma conquista disponível ainda</p>
              </div>
            )}
          </div>
        )}

        {/* Ranking Tab */}
        {tab === 'ranking' && (
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">Nenhum ranking disponível</p>
                <p className="text-sm text-gray-400">Continue usando o app para aparecer aqui!</p>
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    entry.userId === userId ? 'bg-yellow-50 ring-2 ring-yellow-200' : 'bg-white shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${entry.rank}`}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {entry.name}
                      {entry.userId === userId && <span className="text-yellow-600 text-xs ml-1">(Você)</span>}
                    </p>
                    <p className="text-xs text-gray-500">🔥 {entry.streak} dias</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-yellow-600">{entry.points}</p>
                    <p className="text-[10px] text-gray-400">pontos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Histórico Tab */}
        {tab === 'historico' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">Nenhum histórico ainda</p>
                <p className="text-sm text-gray-400">Seus pontos vão aparecer aqui!</p>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    item.category === 'achievement' ? 'bg-yellow-100' :
                    item.category === 'streak' ? 'bg-orange-100' :
                    item.category === 'workout' ? 'bg-blue-100' :
                    item.category === 'nutrition' ? 'bg-green-100' :
                    'bg-gray-100'
                  }`}>
                    {item.category === 'achievement' ? <Trophy className="w-4 h-4 text-yellow-600" /> :
                     item.category === 'streak' ? <Flame className="w-4 h-4 text-orange-600" /> :
                     item.category === 'workout' ? <Dumbbell className="w-4 h-4 text-blue-600" /> :
                     item.category === 'nutrition' ? <Apple className="w-4 h-4 text-green-600" /> :
                     <Star className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.reason}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">+{item.points}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Achievement Unlocked Modal */}
      {showUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUnlocked(null)}>
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">{showUnlocked.icon}</div>
            <h3 className="text-lg font-bold mb-1">{showUnlocked.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{showUnlocked.description}</p>
            <div className="bg-yellow-50 rounded-xl px-4 py-2 mb-4">
              <span className="text-yellow-700 font-bold">+{showUnlocked.points} pontos</span>
            </div>
            {showUnlocked.unlocked_at && (
              <p className="text-xs text-gray-400">
                Desbloqueada em {new Date(showUnlocked.unlocked_at).toLocaleDateString('pt-BR')}
              </p>
            )}
            <button onClick={() => setShowUnlocked(null)} className="mt-4 w-full py-3 bg-yellow-500 text-white rounded-xl font-semibold">
              Legal! 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
