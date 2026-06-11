/**
 * Retro CRT power-on shown while the store rehydrates. A dark LCD tube
 * snaps open horizontally, blooms to full height, then the pixel wordmark
 * and a blocky loading bar fade in. Honors prefers-reduced-motion.
 */
export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-6">
      <div
        className="animate-crt-on lcd-panel lcd-scan relative w-full max-w-sm overflow-hidden
          rounded-card border-[1.5px] border-ink shadow-card"
        style={{ transformOrigin: 'center' }}
      >
        {/* sweeping scanline */}
        <div className="animate-boot-sweep pointer-events-none absolute inset-x-0 top-0 h-6
          bg-[linear-gradient(to_bottom,transparent,rgba(116,211,163,0.18),transparent)]" />

        <div className="animate-boot-content px-6 py-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[0.22em] lcd-glow">
            FINCH
          </p>
          <p className="text-pixel mt-2 text-[0.5rem] uppercase tracking-[0.35em] lcd-dim">
            Poolsuite Sound System
          </p>

          {/* blocky loading bar */}
          <div className="mx-auto mt-7 flex h-3 w-44 gap-[3px]">
            {Array.from({ length: 11 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 rounded-[1px] bg-[#74d3a3]"
                style={{ animation: `blink 1.1s steps(1) ${i * 0.09}s infinite` }}
              />
            ))}
          </div>

          <p className="text-pixel mt-4 text-[0.5rem] uppercase tracking-[0.3em] lcd-dim">
            Loading ledger<span className="animate-blink">_</span>
          </p>
        </div>
      </div>
    </div>
  )
}
