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
        d="M12 7.5 15.9 10.3 14.4 14.9H9.6L8.1 10.3 12 7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 7.5V3.4M15.9 10.3 20 9M14.4 14.9 16.9 18.6M9.6 14.9 7.1 18.6M8.1 10.3 4 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
