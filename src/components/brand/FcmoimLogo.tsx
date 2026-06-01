import type { SVGProps } from 'react';

interface FcmoimLogoProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

export default function FcmoimLogo({ size = 120, ...props }: FcmoimLogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            width={size}
            height={size}
            {...props}
        >
            <image href="/brand/fcmoimLogo.svg" width="120" height="120" />
        </svg>
    );
}
