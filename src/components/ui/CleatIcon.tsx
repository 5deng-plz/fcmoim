import type { SVGProps } from 'react';

type CleatIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export default function CleatIcon({
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
  ...props
}: CleatIconProps) {
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
      {/* Soccer shoe boot shape */}
      <path d="M4 14.5c2-2.5 4-3 7-1.5s5-.5 7.5-3.5 3-1 3.5 0c.5 1-.5 3-2.5 5.5s-5.5 3.5-9 3.5-5.5-1-6.5-4z" />
      {/* Laces */}
      <path d="M12 11l2-2.5M14.5 12l2-2.5" />
      {/* Studs/Cleats at the bottom */}
      <path d="M7 19.5v1.5M10 20.5v1.5M13 20.5v1.5M16 19.5v1.5" />
    </svg>
  );
}
