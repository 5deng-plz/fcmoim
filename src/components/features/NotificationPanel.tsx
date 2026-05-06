'use client';

import { Bell as BellIcon } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

export default function NotificationPanel() {
  const { showNotifications, setShowNotifications } = useAppStore();

  if (!showNotifications) return null;

  return (
    <Modal
      title="알림"
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
    >
      <div className="py-10">
        <EmptyState
          icon={<BellIcon size={28} />}
          message="새로운 알림이 없어요"
        />
      </div>
    </Modal>
  );
}
