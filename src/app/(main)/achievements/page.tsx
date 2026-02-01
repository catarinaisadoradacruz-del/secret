'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, Star, Flame, Target, Dumbbell, Apple, Droplets, ArrowLeft, Lock, Check, 
  TrendingUp, Crown, Zap, Medal, ChevronRight, Gift, Users, BookOpen, Camera,
  Heart, MessageCircle, Sparkles, Timer, Award, Shield, Swords
} from 'lucide-react'
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

interface Challenge {
  id: string
  title: string
  description: string
  challenge_type: string
  target_value: number
  reward_points: number
  start_date: string
  end_date: string
  is_active: boolean
  joined?: boolean
  progress?: number
  status?: string
}

interface HistoryItem {
  id: string
  points: number
  reason: string
  category: string
  created_at: string
}

type Tab = 'conquistas' | 'desafios' | 'ranking' | 'historico'

const iconMap: Record<string, any> = {
  Trophy, Star, Flame, Target, Dumbbell, Apple, Droplets, Crown, Zap, Medal,
  Gift, Users, BookOpen, Camera, Heart, MessageCircle, Sparkles, Timer, Award, Shield, Check
}

const colorMap: Record<string, string> = {
  yellow: 'from-yellow-400 to-amber-500',
  orange: 'from-orange-400 to-red-500',
  green: 'from-green-400 to-emerald-500',
  blue: 'from-blue-400 to-cyan-500',
  purple: 'from-purple-400 to-violet-500',
  pink: 'from-pink-400 to-rose-500',
  indigo: 'from-indigo-400 to-blue-500',
  red: 'from-red-400 to-rose-500',
  gold: 'from-yellow-300 to-amber-400',
  teal: 'from-teal-400 to-cyan-500',
}

const challengeIcons: Record<string, any> = {
  water: Droplets,
  workout: Dumbbell,
  nutrition: Apple,
  chat: MessageCircle,
  content: BookOpen,
  streak: Flame,
  recipes: Star,
  maternity: Gift,
}

export default function AchievementsPage() {
  const [tab, setTab] = useState<Tab>('conquistas')
  const [points, setPoints] = useState<PointsData>({ total: 0, level: 1, streak: 0, longestStreak: 0, nextLevel: 100, progress: 0 })
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showUnlocked, setShowUnlocked] = useState<Achievement | null>(null)
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      await Promise.all([loadStats(user.id), loadChallenges(user.id)])
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

  const loadChallenges = async (uid: string) => {
    try {
      const supabase = createClient()
      const { data: allChallenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('reward_points', { ascending: false })

      const { data: userChallenges } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', uid)

      const merged = (allChallenges || []).map(c => {
        const uc = (userChallenges || []).find((u: any) => u.challenge_id === c.id)
        return {
          ...c,
          joined: !!uc,
          progress: uc?.progress || 0,
          status: uc?.status || 'available'
        }
      })
      setChallenges(merged)
    } catch (e) { console.error(e) }
  }

  const joinChallenge = async (challengeId: string) => {
    if (!userId) return
    setJoiningChallenge(challengeId)
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'joinChallenge', challengeId })
      })
      if (res.ok) {
        setChallenges(prev => prev.map(c => 
          c.id === challengeId ? { ...c, joined: true, status: 'active', progress: 0 } : c
        ))
      }
    } catch (e) { console.error(e) }
    setJoiningChallenge(null)
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

  const getIcon = (name: string) => iconMap[name] || Trophy

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="p-2 rounded-full bg-white/20 hover:bg-white/30">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Conquistas & Desafios</h1>
        </div>

        {/* Points Card */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Crown className="w-7 h-7 text-yellow-200" />
              </div>
              <div>
                <p className="text-sm opacity-80">Nível {points.level}</p>
                <p className="text-2xl font-bold">{points.total} <span className="text-sm font-normal">XP</span></p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-200" />
                <span className="text-lg font-bold">{points.streak}</span>
              </div>
              <p className="text-xs opacity-70">dias seguidos</p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div 
              className="bg-yellow-300 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${points.progress}%` }}
            />
          </div>
          <p className="text-xs mt-1 opacity-70">{points.progress}% para nível {points.level + 1}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 overflow-x-auto">
        {(['conquistas', 'desafios', 'ranking', 'historico'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 min-w-fit py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === t ? 'text-amber-600 border-amber-500 bg-amber-50/50' : 'text-gray-500 border-transparent'
            }`}
          >
            {t === 'conquistas' && `🏆 Conquistas (${unlockedCount}/${achievements.length})`}
            {t === 'desafios' && `⚔️ Desafios (${challenges.filter(c => c.joined).length})`}
            {t === 'ranking' && '🏅 Ranking'}
            {t === 'historico' && '📊 Histórico'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* === CONQUISTAS TAB === */}
        {tab === 'conquistas' && (
          <>
            {achievements.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma conquista disponível</p>
                <p className="text-sm mt-1">Continue usando o app para desbloquear!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {achievements.map(a => {
                  const Icon = getIcon(a.icon)
                  const gradient = colorMap[a.color] || colorMap.yellow
                  return (
                    <div
                      key={a.id}
                      className={`relative rounded-xl border p-4 transition-all ${
                        a.unlocked 
                          ? 'bg-white border-amber-200 shadow-sm' 
                          : a.is_secret && !a.unlocked
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => a.unlocked && setShowUnlocked(a)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          a.unlocked ? `bg-gradient-to-br ${gradient} shadow-lg` : 'bg-gray-200'
                        }`}>
                          {a.is_secret && !a.unlocked ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Icon className={`w-6 h-6 ${a.unlocked ? 'text-white' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${a.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                            {a.is_secret && !a.unlocked ? '???' : a.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {a.is_secret && !a.unlocked ? 'Conquista secreta' : a.description}
                          </p>
                          {a.unlocked && a.unlocked_at && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              ✨ Desbloqueada em {new Date(a.unlocked_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${a.unlocked ? 'text-amber-600' : 'text-gray-400'}`}>
                            +{a.points} XP
                          </div>
                          {a.unlocked && <Check className="w-4 h-4 text-green-500 ml-auto mt-1" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* === DESAFIOS TAB === */}
        {tab === 'desafios' && (
          <>
            {challenges.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Swords className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum desafio disponível</p>
                <p className="text-sm mt-1">Novos desafios em breve!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active challenges first */}
                {challenges.filter(c => c.joined).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">🔥 Seus Desafios Ativos</h3>
                    {challenges.filter(c => c.joined).map(c => {
                      const Icon = challengeIcons[c.challenge_type] || Target
                      const progressPct = Math.min(100, ((c.progress || 0) / c.target_value) * 100)
                      return (
                        <div key={c.id} className="bg-white rounded-xl border border-amber-200 p-4 mb-3 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{c.title}</p>
                              <p className="text-xs text-gray-500">{c.description}</p>
                            </div>
                            <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-lg">
                              +{c.reward_points} XP
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{c.progress || 0}/{c.target_value} • {progressPct.toFixed(0)}% concluído</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Available challenges */}
                {challenges.filter(c => !c.joined).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Desafios Disponíveis</h3>
                    {challenges.filter(c => !c.joined).map(c => {
                      const Icon = challengeIcons[c.challenge_type] || Target
                      return (
                        <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{c.title}</p>
                              <p className="text-xs text-gray-500">{c.description}</p>
                            </div>
                            <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-lg">
                              +{c.reward_points} XP
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Meta: {c.target_value}x</p>
                            <button
                              onClick={() => joinChallenge(c.id)}
                              disabled={joiningChallenge === c.id}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                              {joiningChallenge === c.id ? 'Entrando...' : 'Participar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* === RANKING TAB === */}
        {tab === 'ranking' && (
          <>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Medal className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Ranking em construção</p>
                <p className="text-sm mt-1">Continue acumulando pontos!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((user, i) => {
                  const isMe = user.userId === userId
                  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-gray-100'}`}>
                      <div className="w-8 text-center">
                        {i < 3 ? (
                          <Medal className={`w-6 h-6 ${medalColors[i]} mx-auto`} />
                        ) : (
                          <span className="text-sm font-bold text-gray-400">#{user.rank}</span>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isMe ? 'text-amber-700' : 'text-gray-800'}`}>
                          {user.name} {isMe && '(Você)'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{user.streak}d</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-600">{user.points}</p>
                        <p className="text-xs text-gray-500">XP</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* === HISTORICO TAB === */}
        {tab === 'historico' && (
          <>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sem histórico ainda</p>
                <p className="text-sm mt-1">Use o app para ganhar pontos!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.points > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <span className="text-sm">{h.points > 0 ? '⬆️' : '⬇️'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h.reason}</p>
                      <p className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className={`font-bold text-sm ${h.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {h.points > 0 ? '+' : ''}{h.points} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Achievement unlocked modal */}
      {showUnlocked && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUnlocked(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
              {(() => { const Icon = getIcon(showUnlocked.icon); return <Icon className="w-10 h-10 text-white" /> })()}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{showUnlocked.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{showUnlocked.description}</p>
            <p className="text-amber-600 font-bold mt-2">+{showUnlocked.points} XP</p>
            {showUnlocked.unlocked_at && (
              <p className="text-xs text-gray-400 mt-2">Desbloqueada em {new Date(showUnlocked.unlocked_at).toLocaleDateString('pt-BR')}</p>
            )}
            <button onClick={() => setShowUnlocked(null)} className="mt-4 w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
