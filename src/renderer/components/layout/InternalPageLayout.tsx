import { memo, type ReactNode } from 'react'

interface InternalPageLayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

function InternalPageLayoutInner({ title, actions, children }: InternalPageLayoutProps): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-y-auto select-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
      <div className="w-full max-w-2xl px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

export const InternalPageLayout = memo(InternalPageLayoutInner)
