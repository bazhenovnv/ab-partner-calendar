import { cn } from '@/lib/utils';

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'mint' | 'red' | 'blue' | 'amber'; }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        tone === 'default' && 'bg-slate-100 text-slate-700',
        tone === 'mint' && 'bg-emerald-50 text-emerald-700',
        tone === 'red' && 'bg-rose-50 text-rose-700',
        tone === 'blue' && 'bg-sky-50 text-sky-700',
        tone === 'amber' && 'bg-amber-50 text-amber-700',
      )}
    >
      {children}
    </span>
  );
}
