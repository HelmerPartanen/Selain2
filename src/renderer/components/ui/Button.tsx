import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  rounded?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost: `
    px-3 h-8
    text-gray-700
    bg-transparent
    hover:bg-gray-100 hover:text-gray-900
    active:bg-gray-200
  `,
  solid: `
    px-3 h-8
    text-gray-900
    bg-white
    border border-gray-200
    hover:bg-gray-50
    active:bg-gray-100
  `,
  icon: `
    w-8 h-8
    text-gray-700
    bg-transparent
    hover:bg-gray-100 hover:text-gray-900
    active:bg-gray-200
  `
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center
        ${rounded}
        text-sm select-none
        transition-all duration-100 ease-out
        hover:scale-105 active:scale-90
        focus:outline-none
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
