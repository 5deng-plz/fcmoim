import { Store } from 'lucide-react';

export default function CardMarket() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-primary flex items-center gap-1.5">
          <Store size={18} className="text-award-motm" /> 라커룸 상점
        </h3>
      </div>
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-award-motm/10 text-award-motm">
            <Store size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">영업 준비중입니다</p>
          </div>
        </div>
      </div>
    </section>
  );
}
