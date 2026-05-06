import { useId, type SVGProps } from 'react';

interface FcmoimLogoProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

export default function FcmoimLogo({ size = 120, ...props }: FcmoimLogoProps) {
    const clipPathId = `${useId().replace(/:/g, '')}-app-icon-clip`;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            width={size}
            height={size}
            {...props}
        >
            <defs>
                <clipPath id={clipPathId}>
                    <rect x="10" y="10" width="100" height="100" rx="20" />
                </clipPath>
            </defs>

            {/* Base Background */}
            <rect x="10" y="10" width="100" height="100" rx="20" fill="#ffffff" />

            {/* Grass Background */}
            <rect x="10" y="75" width="100" height="35" fill="#66a152" clipPath={`url(#${clipPathId})`} />

            {/* Goal Post: Rear depth lines */}
            <path d="M 32 38 L 38 46 V 78" fill="none" stroke="#1b2a36" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M 88 38 L 82 46 V 78" fill="none" stroke="#1b2a36" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Goal Post: Front arch */}
            <path d="M 22 78 V 38 A 10 10 0 0 1 32 28 H 88 A 10 10 0 0 1 98 38 V 78 H 88 V 38 A 2 2 0 0 0 86 36 H 34 A 2 2 0 0 0 32 38 V 78 Z" fill="#497897" stroke="#1b2a36" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Text with Outline */}
            <text x="60" y="60" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="25" textAnchor="middle" dominantBaseline="middle" fill="#1b252b" stroke="#ffffff" strokeWidth="4.5" strokeLinejoin="round" paintOrder="stroke fill" letterSpacing="-0.5">
                fcmoim
            </text>

            {/* Outer Border */}
            <rect x="10" y="10" width="100" height="100" rx="20" fill="none" stroke="#1b2a36" strokeWidth="2.5" />
        </svg>
    );
}
