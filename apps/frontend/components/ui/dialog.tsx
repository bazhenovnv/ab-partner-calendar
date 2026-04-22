'use client';

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className='fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm' />
      <RadixDialog.Content className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-white/10 bg-white p-6 shadow-premium focus:outline-none ${className}`}>
        <RadixDialog.Close className='absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100'>
          <X className='h-5 w-5' />
        </RadixDialog.Close>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <RadixDialog.Title className='mb-5 text-xl font-semibold'>{title}</RadixDialog.Title>
        {children}
      </DialogContent>
    </Dialog>
  );
}
