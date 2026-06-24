import type { SVGProps } from 'react';

interface FcmoimLogoProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

export default function FcmoimLogo({ size = 120, className, ...props }: FcmoimLogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            width={size}
            height={size}
            className={className}
            {...props}
        >
            <defs>
                <linearGradient id="logo-grad-chzzk" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--logo-shield-border-from)" />
                    <stop offset="100%" stopColor="var(--logo-shield-border-to)" />
                </linearGradient>
                <linearGradient id="logo-shield-bg-chzzk" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--logo-shield-bg-from)" />
                    <stop offset="100%" stopColor="var(--logo-shield-bg-to)" />
                </linearGradient>
            </defs>
            
            {/* Shield Outline */}
            <path 
                d="M 60 10 L 105 25 C 105 75 85 105 60 115 C 35 105 15 75 15 25 Z" 
                fill="url(#logo-shield-bg-chzzk)" 
                stroke="url(#logo-grad-chzzk)" 
                strokeWidth="4.5" 
                strokeLinejoin="round"
            />
            
            {/* Soccer Field Pitch Lines (Decorative) */}
            <path 
                d="M 28 52 C 40 47 80 47 92 52 M 60 50 L 60 92" 
                stroke="url(#logo-grad-chzzk)" 
                strokeWidth="1.5" 
                opacity="0.25" 
                strokeLinecap="round" 
            />
            <circle 
                cx="60" 
                cy="70" 
                r="10" 
                stroke="url(#logo-grad-chzzk)" 
                strokeWidth="1.5" 
                opacity="0.25" 
                fill="none" 
            />
            
            {/* Dynamic F and C Letterforms */}
            {/* F Letter */}
            <path 
                d="M 42 38 L 68 38 M 42 38 L 42 82 M 42 56 L 62 56" 
                stroke="var(--logo-f-color)" 
                strokeWidth="6" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
            
            {/* C Letter wrapping around F */}
            <path 
                d="M 82 45 C 78 32 54 30 49 45 C 44 60 44 70 51 82 C 59 92 80 88 83 75" 
                stroke="url(#logo-grad-chzzk)" 
                strokeWidth="6.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
            
            {/* Accent dot */}
            <circle cx="60" cy="22" r="3.5" fill="var(--logo-dot-color)" className="animate-pulse" />
        </svg>
    );
}
