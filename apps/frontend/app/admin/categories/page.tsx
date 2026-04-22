import { mockCategories } from '@/components/admin/admin-data';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';

export default function AdminCategoriesPage() {
  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Taxonomy'
        title='Категории'
        description='Категории управляют сегментацией мероприятий на витрине и в административной панели. Цвета можно использовать для визуальной группировки и фильтрации.'
      />

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {mockCategories.map((category) => (
          <article key={category.id} className='rounded-[28px] bg-white p-5 shadow-panel'>
            <div className='h-2 rounded-full' style={{ background: category.color }} />
            <h2 className='mt-4 text-lg font-semibold text-slate-950'>{category.title}</h2>
            <div className='mt-2 text-sm text-slate-500'>slug: {category.slug}</div>
            <div className='mt-4'>
              <Badge tone='default'>{category._count?.events || 0} событий</Badge>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
