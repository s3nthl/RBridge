import { FAQ_GROUPS } from './faqs'

/** Native details/summary accordion: keyboard and screen-reader accessible with no script. */
export default function FaqList() {
  return (
    <div className="space-y-14">
      {FAQ_GROUPS.map((group, g) => (
        <section key={group.title} aria-labelledby={`faq-group-${g}`}>
          <h2 id={`faq-group-${g}`}className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">
            {group.title}
          </h2>
          <div className="mt-4 border-t border-line">
            {group.items.map(item => (
              <details key={item.id} id={item.id} data-testid={`faq-${item.id}`} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-lg font-medium tracking-tight text-ink">{item.question}</span>
                  <span
                    aria-hidden="true"
                    className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong text-ink-2 transition-transform group-open:rotate-45 group-open:border-accent group-open:text-accent"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M6 1v10M1 6h10" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="max-w-2xl space-y-3 pb-6 pr-10 text-[15px] leading-relaxed text-ink-2">
                  {item.answer.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
