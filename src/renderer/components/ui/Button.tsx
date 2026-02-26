import { type ButtonHTMLAttributes, type MouseEventHandler, forwardRef, memo } from 'react'
import { motion } from 'motion/react'
import { SPRING_SNAPPY } from '@/utils/springs'

type ButtonVariant = 'ghost' | 'solid' | 'icon'

interface ButtonProps {
  variant?: ButtonVariant
  rounded?: string
  className?: string
  children?: React.ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  onMouseDown?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  'aria-current'?: string | boolean
  title?: string
  tabIndex?: number
  id?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost: `
    p-3 h-8
    text-gray-700 dark:text-neutral-300
    bg-transparent
    hover:bg-black/[0.04] hover:text-gray-900
    dark:hover:bg-white/[0.06] dark:hover:text-white
  `,
  solid: `
    p-3 h-8
    text-gray-900 dark:text-neutral-100
    glass
  `,
  icon: `
    w-7 h-7
    text-gray-700 dark:text-neutral-300
    bg-transparent
    hover:bg-black/[0.04] hover:text-gray-900
    dark:hover:bg-white/[0.06] dark:hover:text-white
  `
}

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', className = '', rounded = 'rounded-full', children, onClick, onMouseDown, disabled, type, title, tabIndex, id, ...ariaProps }, ref) => (
    <motion.button
      ref={ref}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      type={type}
      title={title}
      tabIndex={tabIndex}
      id={id}
      aria-label={ariaProps['aria-label']}
      className={`
        inline-flex items-center justify-center
        ${rounded}
        text-sm select-none
        transition-colors duration-100 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
)

ButtonInner.displayName = 'Button'

export const Button = memo(ButtonInner)
