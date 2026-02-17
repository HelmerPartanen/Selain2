import { type ButtonHTMLAttributes, forwardRef, memo, useState } from 'react'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  rounded?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost: `
    px-3 h-8
    text-gray-600
    bg-transparent
    hover:bg-gray-200/60 hover:text-gray-900
    active:bg-gray-300/60
  `,
  solid: `
    px-3 h-8
    text-gray-900
    bg-white
    border border-gray-200
    hover:bg-gray-100
    active:bg-gray-200
  `,
  icon: `
    w-8 h-8
    text-gray-600
    bg-transparent
    hover:bg-gray-200/60 hover:text-gray-900
    active:bg-gray-300/60
  `
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', children, ...props }, ref) => {
    const [pressed, setPressed] = useState(false)
    const scale = pressed ? 0.92 : 1

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          ${rounded}
          text-sm select-none
          transition-all duration-100 ease-out
          focus:outline-none
          disabled:opacity-40 disabled:pointer-events-none
          ${variantStyles[variant]}
          ${className}
        `}
        style={{ transform: `scale(${scale})`, willChange: 'transform' }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
