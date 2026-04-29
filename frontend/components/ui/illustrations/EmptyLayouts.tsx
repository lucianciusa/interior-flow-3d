export function EmptyLayoutsIllustration({ className }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Layout cards stacked */}
      <rect x="30" y="32" width="60" height="42" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
      <rect x="26" y="38" width="60" height="42" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
      <rect x="22" y="44" width="60" height="42" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Furniture silhouettes inside the front card */}
      <rect x="30" y="58" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      <rect x="52" y="54" width="8" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="68" cy="62" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Plus */}
      <line x1="52" y1="88" x2="52" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="94" x2="58" y2="94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
