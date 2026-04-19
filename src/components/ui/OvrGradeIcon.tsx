import { Award, Gem } from 'lucide-react';

export default function OvrGradeIcon({ ovr, size = 16, className = '' }: { ovr: number, size?: number, className?: string }) {
  if (ovr >= 80) return <Gem size={size} className={`text-cyan-400 ${className}`} />;
  if (ovr >= 70) return <Award size={size} className={`text-yellow-500 ${className}`} />;
  if (ovr >= 65) return <Award size={size} className={`text-gray-400 ${className}`} />;
  return <Award size={size} className={`text-amber-700 ${className}`} />;
}
