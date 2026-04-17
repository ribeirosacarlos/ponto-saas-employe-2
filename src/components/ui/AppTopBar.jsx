export function AppTopBar({ icon, eyebrow, meta, title, subtitle, actions, filters, rightMeta, dataTour }) {
  const hasRightContent = Boolean(actions) || Boolean(rightMeta)

  return (
    <header
      data-tour={dataTour}
      className="flex flex-col gap-2.5 rounded-[22px] border border-border/80 bg-card/95 px-4 py-3 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.45)] backdrop-blur-xl sm:px-5 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <span className="flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-[12px] bg-primary/15 text-primary shadow-inner shadow-primary/20 sm:h-6 sm:w-6">
            {icon}
          </span>
          <div className="min-w-0 space-y-0">
            {eyebrow ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[8px]">
                  {eyebrow}
                </span>
              </div>
            ) : null}
            {meta ? (
              <p className="text-[10px] font-medium text-muted-foreground break-words text-balance sm:text-[11px]">
                {meta}
              </p>
            ) : null}
            <h1 className="text-[1.05rem] font-semibold leading-tight break-words text-balance sm:text-[1.15rem] md:text-[1.25rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[11px] text-muted-foreground break-words text-balance sm:text-xs">{subtitle}</p>
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
            pt-0.5
            flex flex-wrap items-center gap-2
            min-w-0
            sm:pt-0
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
