export function SectionHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode; }) {
  return (
    <section className='flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-panel md:flex-row md:items-end md:justify-between'>
      <div>
        <div className='text-xs uppercase tracking-[0.24em] text-slate-400'>{eyebrow}</div>
        <h1 className='mt-2 text-3xl font-semibold text-slate-950'>{title}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600'>{description}</p>
      </div>
      {actions ? <div className='flex flex-wrap gap-3'>{actions}</div> : null}
    </section>
  );
}
