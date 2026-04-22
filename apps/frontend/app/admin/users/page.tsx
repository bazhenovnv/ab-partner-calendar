'use client';

import { useEffect, useState } from 'react';
import { mockUsers } from '@/components/admin/admin-data';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { AdminUser } from '@/lib/types';

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>(mockUsers);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    api.users(token).then(setItems).catch(() => undefined);
  }, []);

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Access control'
        title='Пользователи и администраторы'
        description='Список операторов панели, роли доступа и базовая информация для аудита действий в административном контуре.'
      />

      <div className='grid gap-4'>
        {items.map((item) => (
          <div key={item.id} className='rounded-[28px] bg-white p-5 shadow-panel'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <div className='text-lg font-semibold text-slate-950'>{item.name}</div>
                <div className='mt-1 text-sm text-slate-500'>{item.email}</div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge tone={item.role === 'SUPERADMIN' ? 'mint' : 'blue'}>{item.role}</Badge>
                <Badge tone='default'>С {new Date(item.createdAt).toLocaleDateString('ru-RU')}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
