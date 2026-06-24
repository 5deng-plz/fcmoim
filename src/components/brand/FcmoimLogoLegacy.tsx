import type { SVGProps } from 'react';

interface FcmoimLogoLegacyProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

export default function FcmoimLogoLegacy({ size = 120, className, ...props }: FcmoimLogoLegacyProps) {
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
                <clipPath id="app-icon-clip">
                    <rect x="10" y="10" width="100" height="100" rx="22" />
                </clipPath>
                {/* 그라데이션 및 다크모드 대응 (CSS 변수를 통한 통합 그라데이션 제어) */}
                <linearGradient id="logo-net-field" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--logo-field-from)" stopOpacity="var(--logo-field-from-opacity, 1)" />
                    <stop offset="100%" stopColor="var(--logo-field-to)" stopOpacity="var(--logo-field-to-opacity, 1)" />
                </linearGradient>
                <linearGradient id="logo-net-post" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--logo-post-from)" />
                    <stop offset="100%" stopColor="var(--logo-post-to)" />
                </linearGradient>
            </defs>

            {/* 카드 배경: 라이트모드는 백색, 다크모드는 딥블랙 */}
            <rect 
                x="10" y="10" width="100" height="100" rx="22" 
                fill="var(--logo-bg)" 
            />

            {/* 하단 잔디밭 그물 영역 */}
            <rect 
                x="10" y="75" width="100" height="35" 
                clipPath="url(#app-icon-clip)" 
                fill="var(--logo-field)" 
            />

            {/* 골 그물 격자 무늬 (더 정교한 골네트 감성 추가) */}
            <g clipPath="url(#app-icon-clip)" opacity="0.15" stroke="var(--logo-text)" strokeWidth="1.5">
                <path d="M 10 80 L 110 80 M 10 90 L 110 90 M 10 100 L 110 100" />
                <path d="M 30 75 L 30 110 M 50 75 L 50 110 M 70 75 L 70 110 M 90 75 L 90 110" />
            </g>

            {/* 골대 지지대 프레임 */}
            <path 
                d="M 32 38 L 38 46 V 78" 
                fill="none" 
                stroke="var(--logo-support)" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
            />
            <path 
                d="M 88 38 L 82 46 V 78" 
                fill="none" 
                stroke="var(--logo-support)" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
            />

            {/* 골대 본체 크로스바 (입체감 보정) */}
            <path 
                d="M 22 78 V 38 A 10 10 0 0 1 32 28 H 88 A 10 10 0 0 1 98 38 V 78 H 88 V 38 A 2 2 0 0 0 86 36 H 34 A 2 2 0 0 0 32 38 V 78 Z" 
                fill="var(--logo-post)" 
                stroke="var(--logo-text)" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
            />

            {/* fcmoim 브랜드 텍스트 */}
            <text 
                x="60" 
                y="63" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fontWeight="900" 
                fontSize="17" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill="var(--logo-text)"
                letterSpacing="-0.3"
            >
                fcmoim
            </text>

            {/* 전체 테두리 프레임 */}
            <rect 
                x="10" y="10" width="100" height="100" rx="22" 
                fill="none" 
                stroke="var(--logo-border)" 
                strokeWidth="2.5" 
            />
        </svg>
    );
}
