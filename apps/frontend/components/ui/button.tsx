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
        'inline-flex h-[44px] items-center justify-center gap-3 whitespace-nowrap rounded-[14px] border border-black bg-[#7CD8B3] px-5 py-2 text-sm font-medium text-black transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]',
        variant === 'ghost' && 'bg-[#7CD8B3] text-black hover:bg-[#7CD8B3]',
        variant === 'dark' && 'bg-[#7CD8B3] text-black hover:bg-[#7CD8B3]',
        variant === 'secondary' && 'bg-[#7CD8B3] text-black hover:bg-[#7CD8B3]',
        variant === 'primary' && 'bg-[#7CD8B3] text-black hover:bg-[#7CD8B3]',
        className,
      )}
      {...props}
    />
  );
}
