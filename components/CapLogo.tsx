type Props = { size?: number; className?: string };

export default function CapLogo({ size = 36, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 576 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CAP Consultor logo"
    >
      <rect width="576" height="600" fill="#1E4DD8" />
      <rect x="32" y="32" width="512" height="536" fill="#ffffff" />
      <g fill="#1E4DD8">
        <path d="M 288 300 Q 96 92 64 64 Q 280 96 288 300 Z" />
        <path d="M 288 300 Q 480 92 512 64 Q 296 96 288 300 Z" />
        <path d="M 288 300 Q 96 508 64 536 Q 280 504 288 300 Z" />
        <path d="M 288 300 Q 480 508 512 536 Q 296 504 288 300 Z" />
      </g>
    </svg>
  );
}
