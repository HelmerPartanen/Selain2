import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  ghost:
    'px-3 h-8 bg-transparent hover:bg-glass-hover active:bg-glass-active text-text-muted hover:text-text',
  solid:
    'px-3 h-8 bg-glass-hover hover:bg-glass-active active:bg-white/20 text-text',
  icon:
    'p-1.5 bg-transparent hover:bg-glass-hover active:bg-glass-active text-text-muted hover:text-text'
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md transition-colors duration-75 text-sm select-none ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
