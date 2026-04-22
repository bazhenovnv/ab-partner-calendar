import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const formatLabelMap = { ONLINE: 'Онлайн', OFFLINE: 'Офлайн', HYBRID: 'Гибрид' } as const;
export const statusLabelMap = { SCHEDULED: 'Запланировано', LIVE: 'Идет сейчас', COMPLETED: 'Завершено' } as const;
