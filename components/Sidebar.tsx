"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Map,
  Phone,
  Image,
  Clipboard,
  UserPlus,
  LogOut,
  Shield
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface SidebarProps {
  isAdmin: boolean
}

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/investigations', label: 'Investigações', icon: FolderOpen },
    { href: '/dashboard/alvos', label: 'Alvos', icon: Users },
    { href: '/dashboard/rai', label: 'Análise RAI', icon: FileText },
    { href: '/dashboard/phone-records', label: 'Registros Telefônicos', icon: Phone },
    { href: '/dashboard/forensic', label: 'Análise Forense', icon: Image },
    { href: '/dashboard/map', label: 'Mapa Interativo', icon: Map },
    { href: '/dashboard/operations', label: 'Operações', icon: Clipboard },
    { href: '/dashboard/documents', label: 'Documentos', icon: FileText },
  ]

  const adminItems = [
    { href: '/dashboard/admin/users', label: 'Gerenciar Usuários', icon: UserPlus },
  ]

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Sistema Investigativo
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administração
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  )
}
