import { ShoppingBag, Shield } from 'lucide-react';

export default function CardMarket() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
          <ShoppingBag size={18} className="text-pink-500" /> 라커룸 상점
        </h3>
      </div>
      <div className="card p-4 flex gap-4 items-center mb-3">
        <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md shrink-0">
          <Shield className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm text-gray-900">
            철벽 방어{' '}
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded ml-1 font-normal">
              비기너
            </span>
          </h4>
          <p className="text-[10px] text-gray-500 mt-0.5">
            마이페이지 뱃지 표시
          </p>
        </div>
        <button className="bg-blue-50 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-100">
          800 P
        </button>
      </div>
    </section>
  );
}
