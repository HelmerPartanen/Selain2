import { type InputHTMLAttributes, forwardRef, memo } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'url'
}

const variantClasses: Record<string, string> = {
  default:
    'rounded-lg px-3 h-8 text-sm focus:outline-none focus:ring-1 transition-all duration-75',
  url:
    'rounded-xl px-4 h-9 text-sm focus:outline-none focus:ring-1 transition-all duration-75 w-full'
}

const sharedStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border-glass)',
  color: 'var(--text-primary)',
  backdropFilter: 'var(--blur-standard)',
  WebkitBackdropFilter: 'var(--blur-standard)'
}

const InputInner = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', className = '', style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${variantClasses[variant]} ${className}`}
        style={{ ...sharedStyle, ...style }}
        {...props}
      />
    )
  }
)

InputInner.displayName = 'Input'

export const Input = memo(InputInner)
