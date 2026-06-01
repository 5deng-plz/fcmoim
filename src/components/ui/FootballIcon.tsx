type FootballIconProps = {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
};

export default function FootballIcon({
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
}: FootballIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M 12 8.7 L 15.14 11 L 13.94 14.67 L 10.06 14.67 L 8.86 11 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M 12 8.7 V 3 M 15.14 11 L 20.56 9.22 M 13.94 14.67 L 17.29 19.28 M 10.06 14.67 L 6.71 19.28 M 8.86 11 L 3.44 9.22"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
