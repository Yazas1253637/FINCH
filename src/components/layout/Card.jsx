/**
 * Poolsuite surface: white card, hard black border, tight radius, and a
 * beveled offset shadow. Everything sits on these.
 */
export function Card({ children, className = '', span = '' }) {
  return (
    <section
      className={`crt rounded-card bg-paper-raised shadow-card border-[1.5px] border-ink
        p-5 sm:p-6 ${span} ${className}`}
    >
      {children}
    </section>
  )
}

/**
 * Card title rendered as a black sticker bar with cream pixel text —
 * the signature Poolsuite section header.
 */
export function CardLabel({ children, className = '' }) {
  return (
    <h2 className={`mb-4 inline-block rounded-[3px] bg-ink px-2.5 py-1 text-[0.6875rem]
      font-bold uppercase tracking-[0.12em] text-paper-raised ${className}`}>
      {children}
    </h2>
  )
}
