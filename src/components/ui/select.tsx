'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione...',
  label,
  error,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            'flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all',
            'text-left bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            error
              ? 'border-red-500'
              : 'border-gray-200 hover:border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer',
                    'text-sm text-gray-700 outline-none',
                    'hover:bg-primary/10 focus:bg-primary/10',
                    'data-[state=checked]:text-primary data-[state=checked]:font-medium'
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="w-4 h-4 text-primary" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
