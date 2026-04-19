'use client';

import { CalendarDays, Megaphone, CreditCard, BarChart2, Users, Bell as BellIcon } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

const mockNotifications = [
  { id: 1, type: 'match', title: '새로운 경기가 등록됐어요!', body: 'R8 정규 리그 · 3월 21일', time: '1시간 전', read: false },
  { id: 2, type: 'announce', title: '새 공지가 올라왔어요', body: '25/26 시즌 OVR 초기화 안내', time: '2시간 전', read: false },
  { id: 3, type: 'settle', title: '구장비 정산 해주세요~', body: '인당 15,000원', time: '1일 전', read: true },
  { id: 4, type: 'stat', title: '경기 기록이 업데이트됐어요!', body: '골 1 · 어시스트 1', time: '2일 전', read: true },
];

const iconMap: Record<string, React.ReactNode> = {
  match: <CalendarDays size={16} className="text-orange-500" />,
  announce: <Megaphone size={16} className="text-blue-500" />,
  settle: <CreditCard size={16} className="text-yellow-600" />,
  stat: <BarChart2 size={16} className="text-green-500" />,
  draft: <Users size={16} className="text-purple-500" />,
};

export default function NotificationPanel() {
  const { showNotifications, setShowNotifications } = useAppStore();

  if (!showNotifications) return null;

  return (
    <Modal
      title="알림"
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
    >
      {mockNotifications.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon={<BellIcon size={28} />}
            message="새로운 알림이 없어요 📭"
          />
        </div>
      ) : (
        <div className="divide-y divide-gray-50 -mx-5 -mb-5">
          <div className="px-5 py-2 flex justify-end">
            <button className="text-[11px] font-bold text-green-600 hover:text-green-700 active:scale-95 transition-all">
              모두 읽음
            </button>
          </div>
          {mockNotifications.map((n) => (
            <div
              key={n.id}
              className={`px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                !n.read ? 'bg-green-50/30' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                {iconMap[n.type] || <BellIcon size={16} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-tight ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                  {n.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{n.time}</p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
