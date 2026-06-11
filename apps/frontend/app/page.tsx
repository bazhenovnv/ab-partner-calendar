export default function Page() {
  return (
    <main className='min-h-screen bg-black px-4 py-6 lg:px-6 lg:py-8'>
      <section className='mx-auto flex min-h-[calc(100vh-64px)] max-w-[960px] items-center justify-center'>
        <div className='w-full rounded-[28px] border border-[#f2b789] bg-[#f6f6f6] px-6 py-14 text-center shadow-[0_18px_40px_rgba(0,0,0,0.35)] md:px-12 md:py-20'>
          <div className='mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-black/70 bg-[#ffd8bd] text-3xl shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(0,0,0,0.22)]'>
            !
          </div>
          <h1 className='text-3xl font-black tracking-tight text-[#111616] md:text-5xl'>
            На сайте идут технические работы!
          </h1>
          <p className='mt-6 text-xl font-semibold text-[#111616] md:text-2xl'>
            Сайт возобновит работу 12 июня
          </p>
          <p className='mt-8 text-sm font-medium text-slate-600 md:text-base'>
            Мы обновляем интерфейс и скоро вернёмся.
          </p>
        </div>
      </section>
    </main>
  );
}
