import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  rounded?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  ghost:
    'px-3 h-8 bg-transparent hover:bg-neutral-700 active:bg-neutral-600 text-zinc-400 hover:text-zinc-100',
  solid:
    'px-3 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-zinc-100',
  icon:
    'p-1.5 bg-transparent hover:bg-neutral-700 active:bg-neutral-600 text-zinc-400 hover:text-zinc-100'
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center ${rounded} transition-colors duration-75 text-sm select-none ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
