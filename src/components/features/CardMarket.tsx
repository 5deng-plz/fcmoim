import { ShoppingBag } from 'lucide-react';

export default function CardMarket() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
          <ShoppingBag size={18} className="text-pink-500" /> 라커룸 상점
        </h3>
      </div>
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">사용 가능한 아이템이 없어요</p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              라커룸 보상 정책이 확정되면 아이템이 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
