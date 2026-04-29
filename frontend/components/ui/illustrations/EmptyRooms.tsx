export function EmptyRoomsIllustration({ className }: { className?: string }) {
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
      {/* Room outline — 3D isometric box */}
      <path
        d="M30 75V45L60 30L90 45V75L60 90L30 75Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line x1="60" y1="30" x2="60" y2="90" stroke="currentColor" strokeWidth="2" />
      <line x1="30" y1="45" x2="60" y2="60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      <line x1="90" y1="45" x2="60" y2="60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      {/* Plus */}
      <line x1="60" y1="52" x2="60" y2="68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="60" x2="68" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
