import { type ButtonHTMLAttributes, forwardRef, memo } from 'react'
import { motion } from 'motion/react'

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

const tap = { scale: 0.92, transition: { type: 'spring' as const, stiffness: 500, damping: 20 } }
const hover = { scale: 1.06, transition: { type: 'spring' as const, stiffness: 400, damping: 18 } }

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={tap}
      whileHover={hover}
      className={`
        inline-flex items-center justify-center
        ${rounded}
        text-sm select-none
        transition-colors duration-100 ease-out
        focus:outline-none
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  )
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
