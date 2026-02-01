'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Camera, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Início' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/nutrition/scan', icon: Camera, label: 'Scan' },
  { href: '/progress', icon: TrendingUp, label: 'Progresso' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

// Páginas que gerenciam seu próprio layout (fullscreen)
const fullscreenPages = ['/chat']

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isFullscreen = fullscreenPages.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <div className={cn('min-h-screen bg-background', !isFullscreen && 'pb-20')}>
      {children}

      {/* Bottom Navigation - hidden on fullscreen pages */}
      {!isFullscreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-30">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-text-secondary hover:text-primary-600'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
