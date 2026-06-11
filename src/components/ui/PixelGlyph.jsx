/**
 * Chunky 10×10 pixel-art glyphs for the default category icons. Rendered in
 * the category's own color so the donut legend reads color + symbol at once.
 */
const GLYPHS = {
  basket: (
    <>
      <rect x="3" y="1" width="4" height="1" />
      <rect x="3" y="1" width="1" height="2" />
      <rect x="6" y="1" width="1" height="2" />
      <rect x="1" y="3" width="8" height="1" />
      <rect x="2" y="4" width="6" height="4" />
    </>
  ),
  utensils: (
    <>
      <rect x="2" y="1" width="1" height="3" />
      <rect x="4" y="1" width="1" height="3" />
      <rect x="2" y="4" width="3" height="1" />
      <rect x="3" y="4" width="1" height="5" />
      <rect x="7" y="1" width="1" height="8" />
      <rect x="6" y="1" width="2" height="3" />
    </>
  ),
  train: (
    <>
      <rect x="1" y="2" width="8" height="5" />
      <rect x="2" y="7" width="2" height="2" />
      <rect x="6" y="7" width="2" height="2" />
    </>
  ),
  home: (
    <>
      <rect x="4" y="1" width="2" height="1" />
      <rect x="3" y="2" width="4" height="1" />
      <rect x="2" y="3" width="6" height="1" />
      <rect x="1" y="4" width="8" height="5" />
    </>
  ),
  bag: (
    <>
      <rect x="3" y="1" width="4" height="1" />
      <rect x="3" y="1" width="1" height="2" />
      <rect x="6" y="1" width="1" height="2" />
      <rect x="2" y="3" width="6" height="6" />
    </>
  ),
  heart: (
    <>
      <rect x="1" y="2" width="3" height="1" />
      <rect x="6" y="2" width="3" height="1" />
      <rect x="1" y="3" width="8" height="2" />
      <rect x="2" y="5" width="6" height="1" />
      <rect x="3" y="6" width="4" height="1" />
      <rect x="4" y="7" width="2" height="1" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="2" width="1" height="6" />
      <rect x="3" y="2" width="5" height="1" />
      <polygon points="3,2 3,8 8,5" />
    </>
  ),
  repeat: (
    <>
      <rect x="1" y="1" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="4" y="4" width="5" height="5" />
    </>
  ),
  dots: (
    <>
      <rect x="1" y="4" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="7" y="4" width="2" height="2" />
    </>
  ),
}

export function PixelGlyph({ name, color, className = 'h-3.5 w-3.5' }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={`${className} shrink-0`}
      fill={color ?? 'currentColor'}
      style={color ? { color } : undefined}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {GLYPHS[name] ?? GLYPHS.dots}
    </svg>
  )
}
