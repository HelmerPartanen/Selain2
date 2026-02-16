import { type InputHTMLAttributes, forwardRef, memo } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'url'
}

const variantClasses: Record<string, string> = {
  default:
    'bg-surface-raised border border-border rounded-lg px-3 h-8 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent/25 focus:bg-surface-hover transition-all duration-75',
  url:
    'bg-surface-raised border border-border rounded-xl px-4 h-9 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent/30 focus:bg-surface-hover focus:border-border-hover backdrop-blur-xl transition-all duration-75 w-full'
}

const InputInner = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${variantClasses[variant]} ${className}`}
        {...props}
      />
    )
  }
)

InputInner.displayName = 'Input'

export const Input = memo(InputInner)
