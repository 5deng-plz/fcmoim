interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
}

export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <p className="text-sm text-gray-400 font-medium">{message}</p>
    </div>
  );
}
