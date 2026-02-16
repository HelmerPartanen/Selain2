import { type InputHTMLAttributes, forwardRef, memo } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'url'
}

const variantClasses: Record<string, string> = {
  default:
    'bg-neutral-800 border border-neutral-800 rounded-lg px-3 h-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/25 focus:bg-neutral-700 transition-all duration-75',
  url:
    'bg-neutral-800 border border-neutral-800 rounded-xl px-4 h-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:bg-neutral-700 focus:border-neutral-700 backdrop-blur-xl transition-all duration-75 w-full'
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
