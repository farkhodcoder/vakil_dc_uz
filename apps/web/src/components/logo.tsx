/** vakil belgisi: buklangan burchakli hujjat + tasdiq belgisi */
export function LogoMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true" focusable="false">
      <path d="M8 0h26l14 14v34a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8Z" fill="#1B3B6F" />
      <path d="M34 0v10a4 4 0 0 0 4 4h10Z" fill="#4C6A9C" />
      <path
        d="M11.5 31.5 20 40l16.5-17"
        fill="none"
        stroke="#23B26D"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-auto" />
      <span className="text-[1.65rem] leading-none font-extrabold tracking-tight text-brand">vakil</span>
    </span>
  );
}
