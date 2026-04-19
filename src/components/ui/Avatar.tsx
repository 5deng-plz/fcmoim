import Image from 'next/image';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

export default function Avatar({
  src,
  alt = 'Profile',
  size = 36,
  className = '',
}: AvatarProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full bg-gray-200 object-cover ${className}`}
      unoptimized
    />
  );
}
