import { type InputHTMLAttributes, forwardRef, memo } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'url'
}

const variantClasses: Record<string, string> = {
  default:
    'bg-white/5 border border-border rounded-lg px-3 h-8 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/10 transition-all duration-75',
  url:
    'bg-white/5 border border-border rounded-xl px-4 h-9 text-sm text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent/30 focus:bg-white/8 focus:border-white/10 backdrop-blur-xl transition-all duration-75 w-full'
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
