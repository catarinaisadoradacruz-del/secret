'use client'

import { useState, useEffect } from 'react'
import { 
  Users, ArrowLeft, Plus, Heart, MessageCircle, Send, X, 
  ChevronRight, Search, Globe, Lock, Crown, Trash2,
  ThumbsUp, Clock, Filter, TrendingUp, Star, UserPlus,
  Camera, Smile, ArrowUp, MoreHorizontal, Share2
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

    await supabase.from('community_groups')
      .update({ member_count: (groups.find(g => g.id === groupId)?.member_count || 0) + 1 })
      .eq('id', groupId)

    setJoinedGroupIds(prev => [...prev, groupId])
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: g.member_count + 1 } : g))

    // Award points for joining
    await fetch('/api/gamification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'addPoints', points: 5, reason: 'Entrou em um grupo', category: 'community' })
    })
  }

  const leaveGroup = async (groupId: string) => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('community_members').delete().eq('group_id', groupId).eq('user_id', userId)
    await supabase.from('community_groups')
      .update({ member_count: Math.max(0, (groups.find(g => g.id === groupId)?.member_count || 1) - 1) })
      .eq('id', groupId)
    setJoinedGroupIds(prev => prev.filter(id => id !== groupId))
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g))
  }

  const openGroup = async (group: Group) => {
    setSelectedGroup(group)
    setView('group-detail')
    await loadPosts(group.id)
  }

  const loadPosts = async (groupId: string) => {
    const supabase = createClient()
    const { data: postsData } = await supabase
      .from('community_posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (postsData && postsData.length > 0) {
      // Get user names and like status
      const userIds = [...new Set(postsData.map(p => p.user_id))]
      const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)

      let likedPostIds: string[] = []
      if (userId) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postsData.map(p => p.id))
        likedPostIds = (likes || []).map(l => l.post_id)
      }

      setPosts(postsData.map(p => ({
        ...p,
        user_name: users?.find(u => u.id === p.user_id)?.name || 'Usuária',
        liked: likedPostIds.includes(p.id)
      })))
    } else {
      setPosts([])
    }
  }

  const createPost = async () => {
    if (!userId || !selectedGroup || !newPostContent.trim()) return
    setPosting(true)

    try {
      const supabase = createClient()
      const { data: post } = await supabase
        .from('community_posts')
        .insert({
          group_id: selectedGroup.id,
          user_id: userId,
          content: newPostContent.trim(),
          like_count: 0,
          comment_count: 0
        })
        .select()
        .single()

      if (post) {
        await supabase.from('community_groups')
          .update({ post_count: selectedGroup.post_count + 1 })
          .eq('id', selectedGroup.id)

        setPosts(prev => [{ ...post, user_name: userName, liked: false }, ...prev])
        setNewPostContent('')
        setView('group-detail')

        // Award points
        await fetch('/api/gamification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, action: 'addPoints', points: 10, reason: 'Publicou no fórum', category: 'community' })
        })
      }
    } catch (e) { console.error(e) }
    setPosting(false)
  }

  const likePost = async (postId: string) => {
    if (!userId) return
    const supabase = createClient()
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (post.liked) {
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('community_posts').update({ like_count: Math.max(0, post.like_count - 1) }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: false, like_count: Math.max(0, p.like_count - 1) } : p))
    } else {
      await supabase.from('community_likes').insert({ post_id: postId, user_id: userId })
      await supabase.from('community_posts').update({ like_count: post.like_count + 1 }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: true, like_count: p.like_count + 1 } : p))
    }
  }

  const openPost = async (post: Post) => {
    setSelectedPost(post)
    setView('post-detail')
    const supabase = createClient()
    const { data: commentsData } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))]
      const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
      setComments(commentsData.map(c => ({
        ...c,
        user_name: users?.find(u => u.id === c.user_id)?.name || 'Usuária'
      })))
    } else {
      setComments([])
    }
  }

  const addComment = async () => {
    if (!userId || !selectedPost || !newComment.trim()) return
    const supabase = createClient()

    const { data: comment } = await supabase
      .from('community_comments')
      .insert({
        post_id: selectedPost.id,
        user_id: userId,
        content: newComment.trim()
      })
      .select()
      .single()

    if (comment) {
      await supabase.from('community_posts')
        .update({ comment_count: selectedPost.comment_count + 1 })
        .eq('id', selectedPost.id)

      setComments(prev => [...prev, { ...comment, user_name: userName }])
      setSelectedPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null)
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p))
      setNewComment('')
    }
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Agora'
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const getAvatar = (name: string) => {
    const colors = ['bg-pink-400', 'bg-purple-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-red-400']
    const idx = name.charCodeAt(0) % colors.length
    return { bg: colors[idx], initial: name.charAt(0).toUpperCase() }
  }

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'gestantes': return '🤰'
      case 'pos-parto': return '👶'
      case 'receitas': return '🥗'
      case 'exercicios': return '🏋️'
      case 'geral': return '💬'
      default: return '💜'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Post Detail View
  if (view === 'post-detail' && selectedPost) {
    const avatar = getAvatar(selectedPost.user_name || '')
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('group-detail')} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold">Publicação</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {/* Post */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${avatar.bg} flex items-center justify-center text-white font-bold`}>
                {avatar.initial}
              </div>
              <div>
                <p className="font-semibold text-sm">{selectedPost.user_name}</p>
                <p className="text-xs text-gray-400">{timeAgo(selectedPost.created_at)}</p>
              </div>
            </div>
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{selectedPost.content}</p>
            <div className="flex items-center gap-4 pt-3 border-t">
              <button onClick={() => likePost(selectedPost.id)} className={`flex items-center gap-1 text-sm ${selectedPost.liked ? 'text-red-500' : 'text-gray-500'}`}>
                <Heart className={`w-5 h-5 ${selectedPost.liked ? 'fill-red-500' : ''}`} /> {selectedPost.like_count}
              </button>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <MessageCircle className="w-5 h-5" /> {comments.length}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            {comments.map(comment => {
              const cAvatar = getAvatar(comment.user_name || '')
              return (
                <div key={comment.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full ${cAvatar.bg} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {cAvatar.initial}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs">{comment.user_name}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Comment Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 safe-bottom">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="input flex-1 py-2.5"
              onKeyDown={e => e.key === 'Enter' && addComment()}
            />
            <button onClick={addComment} disabled={!newComment.trim()} className="btn-primary px-4">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // New Post View
  if (view === 'new-post' && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('group-detail')} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
              <h1 className="font-bold">Nova Publicação</h1>
            </div>
            <button onClick={createPost} disabled={!newPostContent.trim() || posting} className="btn-primary px-4 py-2 text-sm">
              {posting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </header>
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${getAvatar(userName).bg} flex items-center justify-center text-white font-bold`}>
                {getAvatar(userName).initial}
              </div>
              <div>
                <p className="font-semibold text-sm">{userName}</p>
                <p className="text-xs text-gray-400">em {selectedGroup.name}</p>
              </div>
            </div>
            <textarea
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder="O que você gostaria de compartilhar?"
              className="w-full min-h-[200px] border-0 outline-none resize-none text-gray-800 placeholder:text-gray-400"
              autoFocus
            />
          </div>
        </div>
      </div>
    )
  }

  // Group Detail View
  if (view === 'group-detail' && selectedGroup) {
    const isJoined = joinedGroupIds.includes(selectedGroup.id)
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('groups'); setSelectedGroup(null); setPosts([]) }} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-bold">{getCategoryEmoji(selectedGroup.category)} {selectedGroup.name}</h1>
              <p className="text-xs text-gray-500">{selectedGroup.member_count} membros • {selectedGroup.post_count} posts</p>
            </div>
            {isJoined ? (
              <button onClick={() => leaveGroup(selectedGroup.id)} className="text-xs text-red-500 font-medium px-3 py-1.5 border border-red-200 rounded-full">
                Sair
              </button>
            ) : (
              <button onClick={() => joinGroup(selectedGroup.id)} className="text-xs text-white font-medium px-3 py-1.5 bg-primary-500 rounded-full">
                Entrar
              </button>
            )}
          </div>
        </header>

        <div className="p-4 space-y-3">
          {/* New Post Button */}
          {isJoined && (
            <button
              onClick={() => setView('new-post')}
              className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm"
            >
              <div className={`w-10 h-10 rounded-full ${getAvatar(userName).bg} flex items-center justify-center text-white font-bold`}>
                {getAvatar(userName).initial}
              </div>
              <span className="text-gray-400 text-sm">O que você gostaria de compartilhar?</span>
            </button>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 mb-1">Nenhuma publicação ainda</p>
              {isJoined && <p className="text-sm text-gray-400">Seja a primeira a compartilhar!</p>}
            </div>
          ) : (
            posts.map(post => {
              const avatar = getAvatar(post.user_name || '')
              return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full ${avatar.bg} flex items-center justify-center text-white font-bold text-sm`}>
                      {avatar.initial}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{post.user_name}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap line-clamp-4">{post.content}</p>
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <button onClick={() => likePost(post.id)} className={`flex items-center gap-1 text-sm transition-all ${post.liked ? 'text-red-500' : 'text-gray-500'}`}>
                      <Heart className={`w-4 h-4 ${post.liked ? 'fill-red-500' : ''}`} /> {post.like_count}
                    </button>
                    <button onClick={() => openPost(post)} className="flex items-center gap-1 text-sm text-gray-500">
                      <MessageCircle className="w-4 h-4" /> {post.comment_count}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Groups List View
  const filteredGroups = groups.filter(g => {
    if (searchQuery) return g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.category.includes(searchQuery.toLowerCase())
    if (showTab === 'meus') return joinedGroupIds.includes(g.id)
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Comunidade</h1>
            <p className="text-sm text-gray-500">{groups.length} grupos disponíveis</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar grupos..."
            className="input pl-10 py-2.5"
          />
        </div>

        <div className="flex gap-1">
          <button onClick={() => setShowTab('todos')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${showTab === 'todos' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`}>
            <Globe className="w-4 h-4 inline mr-1" /> Todos
          </button>
          <button onClick={() => setShowTab('meus')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${showTab === 'meus' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`}>
            <Star className="w-4 h-4 inline mr-1" /> Meus Grupos
          </button>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500">
              {showTab === 'meus' ? 'Você ainda não entrou em nenhum grupo' : 'Nenhum grupo encontrado'}
            </p>
          </div>
        ) : (
          filteredGroups.map(group => {
            const isJoined = joinedGroupIds.includes(group.id)
            return (
              <div key={group.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => openGroup(group)} className="w-full p-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl">
                      {getCategoryEmoji(group.category)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm">{group.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{group.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> {group.member_count}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <MessageCircle className="w-3 h-3" /> {group.post_count}
                        </span>
                      </div>
                    </div>
                    <div>
                      {isJoined ? (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Membro</span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); joinGroup(group.id) }}
                          className="text-xs text-white font-medium bg-primary-500 px-3 py-1.5 rounded-full"
                        >
                          Entrar
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
