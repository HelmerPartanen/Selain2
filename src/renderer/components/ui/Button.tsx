import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  rounded?: string
}

const variantStyles: Record<ButtonVariant, { base: string; vars: React.CSSProperties }> = {
  ghost: {
    base: 'px-3 h-8 transition-colors duration-75',
    vars: { background: 'transparent', color: 'var(--text-secondary)' }
  },
  solid: {
    base: 'px-3 h-8 transition-colors duration-75',
    vars: { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border-glass)' }
  },
  icon: {
    base: 'p-1.5 transition-colors duration-75',
    vars: { background: 'transparent', color: 'var(--text-secondary)' }
  }
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', style, children, ...props }, ref) => {
    const v = variantStyles[variant]
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center ${rounded} text-sm select-none ${v.base} ${className}`}
        style={{ ...v.vars, ...style }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = (v.vars.background as string) ?? 'transparent'
          e.currentTarget.style.color = (v.vars.color as string) ?? 'var(--text-secondary)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-active)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-hover)'
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
