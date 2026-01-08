import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  const isAdmin = userData?.is_admin || false

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar isAdmin={isAdmin} />
      </aside>

      {/* Mobile Sidebar (rendered inside Sidebar component) */}
      <div className="lg:hidden">
        <Sidebar isAdmin={isAdmin} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top padding for fixed header */}
        <div className="lg:hidden h-16" />

        <div className="p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
          {children}
        </div>

        {/* Mobile bottom padding */}
        <div className="lg:hidden h-6 safe-bottom" />
      </main>
    </div>
  )
}
