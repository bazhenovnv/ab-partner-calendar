import Image from 'next/image';

export default function Page() {
  return (
    <main className='flex min-h-screen items-center justify-center overflow-hidden bg-black'>
      <Image
        src='/maintenance.png'
        alt='Технические работы'
        width={1920}
        height={1080}
        priority
        className='h-auto w-full max-w-[1920px] object-contain'
      />
    </main>
  );
}
