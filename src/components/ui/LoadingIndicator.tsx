import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

export default function LoadingIndicator({
  message = '불러오는 중입니다...',
  className = '',
}: LoadingIndicatorProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-6 px-4 text-center ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin text-green-600 mb-2" />
      <p className="text-xs font-bold text-gray-500">{message}</p>
    </div>
  );
}
