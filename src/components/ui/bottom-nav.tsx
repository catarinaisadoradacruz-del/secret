'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Home, MessageCircle, Camera, BarChart3, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/nutrition/scan', label: 'Scan', icon: Camera },
  { href: '/progress', label: 'Progresso', icon: BarChart3 },
  { href: '/profile', label: 'Perfil', icon: User }
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-40">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full transition-colors',
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'fill-primary/20')} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
