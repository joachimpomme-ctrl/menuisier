type LogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export default function Logo({ size = 32, className, title = 'Menuisier' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M50 6 L94 42 Q96 44 96 47 L96 84 Q96 94 86 94 L14 94 Q4 94 4 84 L4 47 Q4 44 6 42 Z"
        fill="#3B5FFF"
      />
      <path
        d="M18 90 L18 54 Q18 46 26 46 Q32 46 35 51 L50 80 L65 51 Q68 46 74 46 Q82 46 82 54 L82 90"
        stroke="#FFFCF7"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
