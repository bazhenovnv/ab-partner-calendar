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
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE2BE]/50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]',
        variant === 'primary' && 'bg-[#8BE2BE] text-[#152117] shadow-[0_4px_16px_rgba(139,226,190,0.35)] hover:bg-[#7fdcb7]',
        variant === 'secondary' && 'border border-[#d9dde4] bg-white text-[#20242c] hover:bg-[#f8fafc]',
        variant === 'ghost' && 'bg-transparent text-[#20242c] hover:bg-black/[0.04]',
        variant === 'dark' && 'bg-black text-white hover:bg-[#131418]',
        className,
      )}
      {...props}
    />
  );
}
