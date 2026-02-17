import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  rounded?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost: `
    p-3 h-8
    text-gray-700 dark:text-neutral-300
    bg-transparent
    hover:bg-gray-100 hover:text-gray-900
    dark:hover:bg-neutral-800 dark:hover:text-white
    active:bg-gray-200 dark:active:bg-neutral-700
  `,
  solid: `
    p-3 h-8
    text-gray-900 dark:text-neutral-100
    bg-white dark:bg-neutral-800
    border border-gray-200 dark:border-neutral-700
    hover:bg-gray-50 dark:hover:bg-neutral-700
    active:bg-gray-100 dark:active:bg-neutral-600
  `,
  icon: `
    w-7 h-7
    text-gray-700 dark:text-neutral-300
    bg-transparent
    hover:bg-gray-100 hover:text-gray-900
    dark:hover:bg-neutral-800 dark:hover:text-white
    active:bg-gray-200 dark:active:bg-neutral-700
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
        active:scale-90
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
