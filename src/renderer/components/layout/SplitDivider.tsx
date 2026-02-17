import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

function SplitDividerInner(): React.JSX.Element {
  const splitRatio = useUIStore((s) => s.splitRatio)
  const setSplitRatio = useUIStore((s) => s.setSplitRatio)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent): void => {
      const ratio = e.clientX / window.innerWidth
      setSplitRatio(ratio)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, setSplitRatio])

  const active = isDragging || isHovered

  return (
    <>
      {/* Full-screen drag overlay — sits above webviews to prevent them stealing mouse events */}
      {isDragging && (
        <div className="fixed inset-0 z-[15]" style={{ cursor: 'col-resize' }} />
      )}
      <div
        ref={containerRef}
        className="absolute top-0 bottom-0 z-[16] flex items-center justify-center"
        style={{
          left: `${splitRatio * 100}%`,
          width: active ? '12px' : '6px',
          transform: 'translateX(-50%)',
          cursor: 'col-resize',
          transition: isDragging ? undefined : 'width 150ms ease'
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Visual line */}
      <div
        className="h-full transition-all duration-150"
        style={{
          width: active ? '3px' : '1px',
          borderRadius: '2px',
          backgroundColor: active
            ? 'rgb(99 102 241 / 0.6)'
            : 'rgb(156 163 175 / 0.3)'
        }}
      />
      {/* Grab dots */}
      {active && (
        <div className="absolute flex flex-col gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-indigo-400/80"
            />
          ))}
        </div>
      )}
    </div>
    </>
  )
}

export const SplitDivider = memo(SplitDividerInner)
