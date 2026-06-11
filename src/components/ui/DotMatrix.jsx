/**
 * Poolsuite "DYNAMIC STEREO" flourish: a centered mono label flanked by
 * two dot-matrix grids. Purely decorative chrome.
 */
function DotGrid({ cols = 6, rows = 4, flip = false }) {
  const r = 0.9
  const gap = 3.2
  const w = (cols - 1) * gap + r * 2
  const h = (rows - 1) * gap + r * 2
  const dots = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Fade the grid out toward the label for a "fanning" look
      const edge = flip ? x : cols - 1 - x
      const opacity = 0.22 + (edge / (cols - 1)) * 0.55
      dots.push(
        <circle key={`${x}-${y}`} cx={r + x * gap} cy={r + y * gap} r={r}
          fill="currentColor" opacity={opacity} />,
      )
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-3.5 w-auto" shapeRendering="geometricPrecision">
      {dots}
    </svg>
  )
}

export function DynamicStereo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-ink-faint ${className}`} aria-hidden>
      <DotGrid flip />
      <span className="text-pixel text-[0.5rem] font-bold uppercase tracking-[0.22em] text-ink-soft">
        Dynamic Stereo
      </span>
      <DotGrid />
    </div>
  )
}
