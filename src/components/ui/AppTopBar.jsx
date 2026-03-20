export function AppTopBar({ icon, eyebrow, meta, title, subtitle, actions, filters, rightMeta, dataTour }) {
  const hasRightContent = Boolean(actions) || Boolean(rightMeta)

  return (
    <header
      data-tour={dataTour}
      className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card/95 px-4 py-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.45)] backdrop-blur-xl sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/20">
            {icon}
          </span>
          <div className="min-w-0 space-y-1">
            {eyebrow ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {eyebrow}
                </span>
              </div>
            ) : null}
            {meta ? (
              <p className="text-[11px] font-medium text-muted-foreground sm:text-[12px] break-words text-balance">
                {meta}
              </p>
            ) : null}
            <h1 className="text-xl font-semibold leading-tight sm:text-2xl md:text-3xl break-words text-balance">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground break-words text-balance">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {filters ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>
        ) : null}
      </div>
      {hasRightContent ? (
        <div
          className="
            p-5
            -mx-4 px-4
            flex flex-wrap items-center gap-2
            min-w-0
            sm:mx-0 sm:px-0
            sm:flex-nowrap sm:justify-end
            sm:overflow-x-auto
            sm:whitespace-nowrap
            scrollbar-hide
          "
        >
          {rightMeta}
          {actions}
        </div>
      ) : null}
    </header>
  )
}
