import { Megaphone, Pin } from 'lucide-react';

const announcements = [
  { id: 1, title: '25/26 새 시즌 OVR 초기화 안내', author: '운영진', date: '2시간 전', pinned: true },
  { id: 2, title: '3월 회식 장소 투표 안내', author: '운영진', date: '1일 전', pinned: false },
  { id: 3, title: '3월 워크샵 참석 여부 확인', author: '운영진', date: '3일 전', pinned: false },
  { id: 4, title: '풋살장 예약 관련 안내', author: '관리자', date: '5일 전', pinned: false },
  { id: 5, title: '시즌 시작 일정 공유', author: '관리자', date: '1주 전', pinned: false },
];

export default function CommunityPage() {
  return (
    <div className="space-y-4 animate-fadeIn pb-20 -mx-4 -mt-4">
      <div className="px-4 py-2 flex gap-1 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button className="px-4 py-2 text-sm font-bold text-green-600 border-b-2 border-green-600">
          공지사항
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
          게시판
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
          갤러리
        </button>
      </div>

      <main className="px-4 space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
                <Megaphone size={18} className={a.pinned ? 'text-red-400' : 'text-gray-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin size={12} className="text-red-500 shrink-0" />}
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {a.title}
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {a.author} · {a.date}
                </p>
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}
