'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'h-5 w-5 shrink-0 rounded border-2 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          checked
            ? 'bg-primary border-primary'
            : 'border-gray-300 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              className={cn(
                'text-sm font-medium text-gray-900',
                checked && 'line-through text-gray-400'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}
