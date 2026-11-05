export default function BoudoirOrnament({ variant = 'divider', className = '' }) {
  if (variant === 'corner') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`w-6 h-6 text-border/60 ${className}`.trim()}
      >
        <path
          d="M2 22V6C2 3.79086 3.79086 2 6 2H22"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M6 14V8C6 6.89543 6.89543 6 8 6H14"
          stroke="currentColor"
          strokeWidth="0.75"
        />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`text-border ${className}`.trim()}
    >
      <line x1="4" y1="12" x2="94" y2="12" stroke="currentColor" strokeWidth="0.8" />
      <line x1="146" y1="12" x2="236" y2="12" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="98" cy="12" r="1.5" fill="currentColor" />
      <circle cx="142" cy="12" r="1.5" fill="currentColor" />
      <path
        d="M120 3L127 12L120 21L113 12L120 3Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M120 7L123.5 12L120 17L116.5 12L120 7Z"
        fill="currentColor"
      />
      <path
        d="M104 12C107 8 110 8 113 12C110 16 107 16 104 12Z"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <path
        d="M136 12C133 8 130 8 127 12C130 16 133 16 136 12Z"
        stroke="currentColor"
        strokeWidth="0.8"
      />
    </svg>
  );
}
