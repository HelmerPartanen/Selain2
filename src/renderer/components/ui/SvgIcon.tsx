import { memo, useMemo } from 'react'

interface SvgIconProps {
  svg: string
  size?: number
  className?: string
}

function processSvg(raw: string, size: number): string {
  let svg = raw
    // Remove background rect elements (some SVGs have white backgrounds)
    .replace(/<rect[^>]*fill="white"[^>]*\/?>/g, '')
    // Remove style blocks so icon colors are not hard-coded
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove class attributes from SVG elements produced by icon files
    .replace(/ class="[^"]*"/g, '')
    // Replace all non-"none" fills with currentColor
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
    // Remove fill-opacity (currentColor inherits text opacity)
    .replace(/ ?fill-opacity="[^"]*"/g, '')
    // Set dimensions
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)

  if (!/\bfill=/.test(svg.match(/<svg[^>]*>/)?.[0] ?? '')) {
    svg = svg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">')
  }

  return svg
}

function SvgIconInner({ svg, size = 24, className }: SvgIconProps): React.JSX.Element {
  const html = useMemo(() => processSvg(svg, size), [svg, size])
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export const SvgIcon = memo(SvgIconInner)

// ── Inline fallback icons (no custom SVG in the icon pack) ──

export const SPINNER_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="42 14"/></svg>`

export const PAUSE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>`

export const PIP_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor"/></svg>`

export const SQUARE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`

export const CARDS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-width="2"/></svg>`
