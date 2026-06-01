import type { SVGProps } from 'react';

type StadiumIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export default function StadiumIcon({
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
  ...props
}: StadiumIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
      {...props}
    >
      {/* Stadium outer oval ring */}
      <ellipse cx="12" cy="11" rx="10" ry="6" />
      {/* Inner pitch oval */}
      <ellipse cx="12" cy="11" rx="6" ry="3" />
      {/* Stadium structure/pillars/roof lines */}
      <path d="M2 11v4c0 3.3 4.5 5 10 5s10-1.7 10-5v-4" />
      <path d="M6 14v3M12 14v4M18 14v3" />
    </svg>
  );
}
