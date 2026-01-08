"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  UsersRound,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  Brain,
  Target
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface SidebarProps {
  isAdmin: boolean
}

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/investigations', label: 'Investigacoes', icon: FolderOpen },
    { href: '/dashboard/alvos', label: 'Alvos', icon: Target },
    { href: '/dashboard/assistente', label: 'Assistente IA', icon: Brain },
    { href: '/dashboard/phone-records', label: 'Registros Tel.', icon: Phone },
    { href: '/dashboard/forensic', label: 'Analise Forense', icon: Image },
    { href: '/dashboard/map', label: 'Mapa', icon: Map },
    { href: '/dashboard/operations', label: 'Operacoes', icon: Clipboard },
    { href: '/dashboard/documents', label: 'Documentos', icon: FileText },
  ]

  const adminItems = [
    { href: '/dashboard/admin/users', label: 'Usuarios', icon: UserPlus },
    { href: '/dashboard/admin/teams', label: 'Equipes', icon: UsersRound },
  ]

  const NavContent = () => (
    <>
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base lg:text-lg font-bold text-foreground truncate">PCGO</h1>
            <p className="text-xs text-muted-foreground truncate">Sistema Investigativo</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-1 scrollbar-hide">
        <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 lg:py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:text-primary'}`} />
              <span className="font-medium text-sm truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-border" />
            <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Administracao
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 lg:py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:text-primary'}`} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-3 lg:p-4 border-t border-border safe-bottom">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 lg:py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">PCGO</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0 mobile-menu-enter' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-safe-top">
          <NavContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col h-full bg-card border-r border-border">
        <NavContent />
      </div>
    </>
  )
}
