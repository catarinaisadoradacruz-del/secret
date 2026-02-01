'use client'

import { useState, useEffect } from 'react'
import { 
  Users, ArrowLeft, Plus, Heart, MessageCircle, Send, X, 
  ChevronRight, Search, Globe, Lock, Crown, Trash2,
  ThumbsUp, Clock, Filter, TrendingUp, Star, UserPlus,
  Camera, Smile, ArrowUp, MoreHorizontal, Share2, BookOpen,
  Baby, Dumbbell, Apple, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Group {
  id: string
  name: string
  description: string
  type: string
  category: string
  image_url: string | null
  rules: string[]
  member_count: number
  post_count: number
  is_active: boolean
}

interface Post {
  id: string
  group_id: string
  user_id: string
  content: string
  image_url: string | null
  like_count: number
  comment_count: number
  created_at: string
  user_name?: string
  liked?: boolean
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  user_name?: string
}

type View = 'groups' | 'group-detail' | 'new-post' | 'post-detail'

const groupIcons: Record<string, any> = {
  '1-trimestre': Baby,
  '2-trimestre': Baby,
  '3-trimestre': Baby,
  'pos-parto': Heart,
  'tentantes': Star,
  'exercicios': Dumbbell,
  'nutricao': Apple,
  'default': Users,
}

const groupColors: Record<string, string> = {
  '1-trimestre': 'from-pink-400 to-rose-500',
  '2-trimestre': 'from-purple-400 to-violet-500',
  '3-trimestre': 'from-indigo-400 to-blue-500',
  'pos-parto': 'from-green-400 to-emerald-500',
  'tentantes': 'from-yellow-400 to-orange-500',
  'exercicios': 'from-blue-400 to-cyan-500',
  'nutricao': 'from-teal-400 to-green-500',
}

export default function CommunityPage() {
  const [view, setView] = useState<View>('groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTab, setShowTab] = useState<'todos' | 'meus'>('todos')
  const [posting, setPosting] = useState(false)
  const [commenting, setCommenting] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: userData } = await supabase.from('users').select('name').eq('id', user.id).single()
      setUserName(userData?.name || 'Usuária')

      await loadGroups(user.id)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadGroups = async (uid: string) => {
    const supabase = createClient()
    const { data: groupsData } = await supabase
      .from('community_groups')
      .select('*')
      .eq('is_active', true)
      .order('member_count', { ascending: false })

    setGroups(groupsData || [])

    const { data: memberships } = await supabase
      .from('community_members')
      .select('group_id')
      .eq('user_id', uid)

    setJoinedGroupIds((memberships || []).map(m => m.group_id))
  }

  const joinGroup = async (groupId: string) => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('community_members').insert({
      group_id: groupId,
      user_id: userId,
      role: 'member'
    })
    
    // Increment member count
    const group = groups.find(g => g.id === groupId)
    if (group) {
      await supabase.from('community_groups')
        .update({ member_count: (group.member_count || 0) + 1 })
        .eq('id', groupId)
    }

    setJoinedGroupIds(prev => [...prev, groupId])
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: (g.member_count || 0) + 1 } : g))

    // Award points
    await fetch('/api/gamification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'addPoints', points: 5, reason: `Entrou no grupo: ${group?.name}`, category: 'community' })
    })
  }

  const leaveGroup = async (groupId: string) => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('community_members').delete().eq('group_id', groupId).eq('user_id', userId)
    
    const group = groups.find(g => g.id === groupId)
    if (group) {
      await supabase.from('community_groups')
        .update({ member_count: Math.max(0, (group.member_count || 1) - 1) })
        .eq('id', groupId)
    }

    setJoinedGroupIds(prev => prev.filter(id => id !== groupId))
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: Math.max(0, (g.member_count || 1) - 1) } : g))
  }

  const openGroup = async (group: Group) => {
    setSelectedGroup(group)
    setView('group-detail')
    await loadPosts(group.id)
  }

  const loadPosts = async (groupId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id))]
      const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
      
      let likedPostIds: string[] = []
      if (userId) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', data.map(p => p.id))
        likedPostIds = (likes || []).map(l => l.post_id)
      }

      const enriched = data.map(p => ({
        ...p,
        user_name: users?.find(u => u.id === p.user_id)?.name || 'Usuária',
        liked: likedPostIds.includes(p.id)
      }))
      setPosts(enriched)
    } else {
      setPosts([])
    }
  }

  const createPost = async () => {
    if (!userId || !selectedGroup || !newPostContent.trim()) return
    setPosting(true)
    const supabase = createClient()
    
    await supabase.from('community_posts').insert({
      group_id: selectedGroup.id,
      user_id: userId,
      content: newPostContent.trim(),
      like_count: 0,
      comment_count: 0
    })

    // Update post count
    await supabase.from('community_groups')
      .update({ post_count: (selectedGroup.post_count || 0) + 1 })
      .eq('id', selectedGroup.id)

    // Award points
    await fetch('/api/gamification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'addPoints', points: 10, reason: 'Publicação na comunidade', category: 'community' })
    })

    setNewPostContent('')
    setView('group-detail')
    await loadPosts(selectedGroup.id)
    setPosting(false)
  }

  const toggleLike = async (post: Post) => {
    if (!userId) return
    const supabase = createClient()
    
    if (post.liked) {
      await supabase.from('community_likes').delete().eq('post_id', post.id).eq('user_id', userId)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: false, like_count: Math.max(0, p.like_count - 1) } : p))
    } else {
      await supabase.from('community_likes').insert({ post_id: post.id, user_id: userId })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: true, like_count: p.like_count + 1 } : p))
    }
  }

  const openPost = async (post: Post) => {
    setSelectedPost(post)
    setView('post-detail')
    const supabase = createClient()
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))]
      const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
      setComments(data.map(c => ({
        ...c,
        user_name: users?.find(u => u.id === c.user_id)?.name || 'Usuária'
      })))
    } else {
      setComments([])
    }
  }

  const addComment = async () => {
    if (!userId || !selectedPost || !newComment.trim()) return
    setCommenting(true)
    const supabase = createClient()

    const { data } = await supabase.from('community_comments').insert({
      post_id: selectedPost.id,
      user_id: userId,
      content: newComment.trim()
    }).select().single()

    if (data) {
      setComments(prev => [...prev, { ...data, user_name: userName }])
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p))
      setSelectedPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null)
    }

    // Update comment count
    await supabase.from('community_posts')
      .update({ comment_count: (selectedPost.comment_count || 0) + 1 })
      .eq('id', selectedPost.id)

    setNewComment('')
    setCommenting(false)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'Agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('pt-BR')
  }

  const getGroupGradient = (name: string) => {
    const key = Object.keys(groupColors).find(k => name.toLowerCase().includes(k.replace('-', ' ').replace('trimestre', 'trim'))) || ''
    return groupColors[key] || 'from-pink-400 to-purple-500'
  }

  const filteredGroups = groups.filter(g => {
    const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = showTab === 'todos' || joinedGroupIds.includes(g.id)
    return matchesSearch && matchesTab
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-pink-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* === GROUPS LIST VIEW === */}
      {view === 'groups' && (
        <>
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 pt-12 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/dashboard" className="p-2 rounded-full bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">Comunidade</h1>
            </div>
            <p className="text-sm opacity-80">Conecte-se com outras mamães e compartilhe experiências</p>
            
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar grupos..."
                className="w-full bg-white/15 text-white placeholder-pink-200 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:bg-white/25 outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-white sticky top-0 z-10">
            <button
              onClick={() => setShowTab('todos')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 ${showTab === 'todos' ? 'text-pink-600 border-pink-500' : 'text-gray-500 border-transparent'}`}
            >
              🌍 Todos ({groups.length})
            </button>
            <button
              onClick={() => setShowTab('meus')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 ${showTab === 'meus' ? 'text-pink-600 border-pink-500' : 'text-gray-500 border-transparent'}`}
            >
              ⭐ Meus Grupos ({joinedGroupIds.length})
            </button>
          </div>

          <div className="p-4 space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{showTab === 'meus' ? 'Você ainda não entrou em nenhum grupo' : 'Nenhum grupo encontrado'}</p>
                {showTab === 'meus' && (
                  <button onClick={() => setShowTab('todos')} className="text-pink-500 text-sm mt-2">Ver todos os grupos</button>
                )}
              </div>
            ) : (
              filteredGroups.map(group => {
                const isJoined = joinedGroupIds.includes(group.id)
                const gradient = getGroupGradient(group.name)
                return (
                  <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-base">{group.name}</h3>
                          <p className="text-sm opacity-80 mt-1 line-clamp-2">{group.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {group.member_count || 0} membros</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {group.post_count || 0} posts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isJoined ? (
                          <>
                            <button
                              onClick={() => openGroup(group)}
                              className="bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              Abrir
                            </button>
                            <button
                              onClick={() => leaveGroup(group.id)}
                              className="text-gray-400 text-xs px-2 py-1.5"
                            >
                              Sair
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => joinGroup(group.id)}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Entrar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* === GROUP DETAIL VIEW === */}
      {view === 'group-detail' && selectedGroup && (
        <>
          <div className={`bg-gradient-to-r ${getGroupGradient(selectedGroup.name)} text-white px-4 pt-12 pb-6`}>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setView('groups')} className="p-2 rounded-full bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">{selectedGroup.name}</h1>
                <p className="text-xs opacity-80">{selectedGroup.member_count} membros • {selectedGroup.post_count} posts</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* New post button */}
            <button
              onClick={() => { setNewPostContent(''); setView('new-post') }}
              className="w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:bg-gray-50"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                {userName.charAt(0)}
              </div>
              <span className="text-sm text-gray-400">O que você gostaria de compartilhar?</span>
            </button>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sem publicações ainda</p>
                <p className="text-sm mt-1">Seja a primeira a compartilhar!</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                        {post.user_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{post.user_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  </div>
                  <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1.5 text-xs font-medium ${post.liked ? 'text-pink-600' : 'text-gray-500'}`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked ? 'fill-pink-600' : ''}`} />
                      {post.like_count || 0}
                    </button>
                    <button
                      onClick={() => openPost(post)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.comment_count || 0} comentários
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* === NEW POST VIEW === */}
      {view === 'new-post' && selectedGroup && (
        <>
          <div className="bg-white border-b px-4 pt-12 pb-4 flex items-center justify-between">
            <button onClick={() => setView('group-detail')} className="text-gray-600 font-medium text-sm">Cancelar</button>
            <h2 className="font-semibold">Nova Publicação</h2>
            <button
              onClick={createPost}
              disabled={!newPostContent.trim() || posting}
              className="bg-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              {posting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold">
                {userName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">em {selectedGroup.name}</p>
              </div>
            </div>
            <textarea
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder="O que você gostaria de compartilhar com o grupo?"
              className="w-full mt-4 text-base text-gray-800 placeholder-gray-400 resize-none focus:outline-none min-h-[200px]"
              autoFocus
            />
          </div>
        </>
      )}

      {/* === POST DETAIL VIEW === */}
      {view === 'post-detail' && selectedPost && (
        <>
          <div className="bg-white border-b px-4 pt-12 pb-4 flex items-center gap-3">
            <button onClick={() => setView('group-detail')} className="p-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="font-semibold">Publicação</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Original post */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white font-bold">
                  {selectedPost.user_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedPost.user_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(selectedPost.created_at)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedPost.content}</p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                <button
                  onClick={() => toggleLike(selectedPost)}
                  className={`flex items-center gap-1.5 text-xs font-medium ${selectedPost.liked ? 'text-pink-600' : 'text-gray-500'}`}
                >
                  <Heart className={`w-4 h-4 ${selectedPost.liked ? 'fill-pink-600' : ''}`} />
                  {selectedPost.like_count} curtidas
                </button>
                <span className="text-xs text-gray-500">{selectedPost.comment_count} comentários</span>
              </div>
            </div>

            {/* Comments */}
            <div className="p-4 space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                    {c.user_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-800">{c.user_name}</p>
                    <p className="text-sm text-gray-700">{c.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment input */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex items-center gap-2 safe-bottom">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-300 outline-none"
              onKeyDown={e => e.key === 'Enter' && addComment()}
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim() || commenting}
              className="w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
