import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
};

export function Button({ asChild, className, variant = 'primary', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE2BE]/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.985] hover:-translate-y-[1px]',
        variant === 'primary' && 'border-black bg-[#8BE2BE] text-[#152117] shadow-[0_12px_28px_rgba(15,23,42,0.18)] hover:bg-[#7fdcb7]',
        variant === 'secondary' && 'border-black bg-white text-[#20242c] shadow-[0_12px_28px_rgba(15,23,42,0.12)] hover:bg-[#f8fafc]',
        variant === 'ghost' && 'border-black/70 bg-transparent text-[#20242c] shadow-[0_10px_22px_rgba(15,23,42,0.10)] hover:bg-black/[0.04]',
        variant === 'dark' && 'border-black bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)] hover:bg-[#131418]',
        className,
      )}
      {...props}
    />
  );
}
