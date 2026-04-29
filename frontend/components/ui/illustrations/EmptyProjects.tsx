export function EmptyProjectsIllustration({ className }: { className?: string }) {
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
      {/* Folder shape */}
      <rect x="20" y="40" width="80" height="55" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 46C20 42.6863 22.6863 40 26 40H48L54 30H94C97.3137 30 100 32.6863 100 36V40" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Plus icon */}
      <line x1="60" y1="58" x2="60" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="49" y1="69" x2="71" y2="69" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Decorative dots */}
      <circle cx="35" cy="50" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="43" cy="50" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="51" cy="50" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
