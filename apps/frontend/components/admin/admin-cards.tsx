import { ArrowUpRight } from 'lucide-react';

export function StatCard({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div className='rounded-[28px] bg-white p-5 shadow-panel'>
      <div className='flex items-start justify-between'>
        <div>
          <div className='text-sm text-slate-500'>{label}</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{value}</div>
        </div>
        <div className='rounded-2xl bg-emerald-50 p-2 text-emerald-700'>
          <ArrowUpRight className='h-4 w-4' />
        </div>
      </div>
      <p className='mt-4 text-sm text-slate-500'>{caption || 'Актуальное состояние раздела и быстрый ориентир по загрузке системы.'}</p>
    </div>
  );
}
