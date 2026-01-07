import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FolderOpen, Users, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('nome, is_admin')
    .eq('id', session.user.id)
    .single()

  // Get statistics
  const [investigationsResult, alvosResult, documentsResult, raiResult] = await Promise.all([
    supabase
      .from('investigations')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('alvos')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('rai_analysis')
      .select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    {
      title: 'Investigações',
      value: investigationsResult.count || 0,
      icon: FolderOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Alvos',
      value: alvosResult.count || 0,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Documentos',
      value: documentsResult.count || 0,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'RAIs Analisados',
      value: raiResult.count || 0,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  // Get recent investigations
  const { data: recentInvestigations } = await supabase
    .from('investigations')
    .select('id, titulo, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Bem-vindo, {userData?.nome || 'Usuário'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {userData?.is_admin ? 'Administrador do Sistema' : 'Investigador'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Investigations */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Investigações Recentes</h2>
        </div>
        <div className="p-6">
          {recentInvestigations && recentInvestigations.length > 0 ? (
            <div className="space-y-4">
              {recentInvestigations.map((investigation) => (
                <div
                  key={investigation.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{investigation.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(investigation.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      investigation.status === 'Em Andamento'
                        ? 'bg-blue-500/10 text-blue-500'
                        : investigation.status === 'Concluído'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}
                  >
                    {investigation.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma investigação encontrada. Crie sua primeira investigação!
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/investigations"
          className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors text-center"
        >
          <FolderOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <h3 className="font-medium">Nova Investigação</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Criar nova investigação
          </p>
        </a>
        <a
          href="/dashboard/rai"
          className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors text-center"
        >
          <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <h3 className="font-medium">Analisar RAI</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload e análise de RAI
          </p>
        </a>
        <a
          href="/dashboard/alvos"
          className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors text-center"
        >
          <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <h3 className="font-medium">Cadastrar Alvo</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicionar novo alvo
          </p>
        </a>
      </div>
    </div>
  )
}
