import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
};

const MINT_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#4FAF8C] bg-[#7CD8B3] px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_32px_rgba(0,0,0,0.22)] transition-all duration-150 hover:bg-[#86e1bd] hover:shadow-[0_18px_40px_rgba(0,0,0,0.25)] active:translate-y-[2px] active:scale-[0.985] active:shadow-[0_6px_16px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CD8B3]/60 disabled:cursor-not-allowed disabled:opacity-50';

export function Button({ asChild, className, variant = 'primary', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return <Comp className={cn(MINT_BUTTON_CLASS, className)} {...props} />;
}
