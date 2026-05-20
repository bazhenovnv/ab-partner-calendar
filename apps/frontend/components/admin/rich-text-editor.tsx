'use client';

import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  LinkIcon,
  Type,
  Heading1,
  Heading2,
  RemoveFormatting,
} from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
};

function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  label = 'Описание',
  placeholder = 'Введите описание мероприятия...',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const sync = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const setLink = () => {
    const url = window.prompt('Вставьте ссылку');
    if (!url) return;
    run('createLink', url);
    sync();
  };

  const setFontSize = (size: string) => {
    run('fontSize', size);
    sync();
  };

  const setBlock = (tag: string) => {
    run('formatBlock', tag);
    sync();
  };

  return (
    <div className='space-y-2'>
      <div className='text-sm font-semibold text-slate-700'>{label}</div>

      <div className='overflow-hidden rounded-2xl border border-[#7CD8B3] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.10)]'>
        <div className='flex flex-wrap items-center gap-1 border-b border-[#d8f3e7] bg-[#f7fffb] p-2'>
          <button type='button' className='admin-editor-btn' onClick={() => { run('bold'); sync(); }} title='Жирный'>
            <Bold className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('italic'); sync(); }} title='Курсив'>
            <Italic className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('underline'); sync(); }} title='Подчеркнутый'>
            <Underline className='h-4 w-4' />
          </button>

          <span className='mx-1 h-6 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' onClick={() => { setBlock('h1'); }} title='Заголовок 1'>
            <Heading1 className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { setBlock('h2'); }} title='Заголовок 2'>
            <Heading2 className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { setBlock('p'); }} title='Обычный текст'>
            <Type className='h-4 w-4' />
          </button>

          <select
            className='h-9 rounded-xl border border-[#7CD8B3] bg-white px-2 text-sm text-black'
            defaultValue=''
            onChange={(event) => {
              if (!event.target.value) return;
              setFontSize(event.target.value);
              event.target.value = '';
            }}
          >
            <option value='' disabled>Размер</option>
            <option value='2'>Мелкий</option>
            <option value='3'>Обычный</option>
            <option value='4'>Крупный</option>
            <option value='5'>Очень крупный</option>
          </select>

          <input
            type='color'
            className='h-9 w-10 rounded-xl border border-[#7CD8B3] bg-white p-1'
            title='Цвет текста'
            onChange={(event) => {
              run('foreColor', event.target.value);
              sync();
            }}
          />

          <span className='mx-1 h-6 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' onClick={() => { run('insertUnorderedList'); sync(); }} title='Список'>
            <List className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('insertOrderedList'); sync(); }} title='Нумерованный список'>
            <ListOrdered className='h-4 w-4' />
          </button>

          <span className='mx-1 h-6 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' onClick={() => { run('justifyLeft'); sync(); }} title='По левому краю'>
            <AlignLeft className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('justifyCenter'); sync(); }} title='По центру'>
            <AlignCenter className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('justifyRight'); sync(); }} title='По правому краю'>
            <AlignRight className='h-4 w-4' />
          </button>

          <span className='mx-1 h-6 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' onClick={setLink} title='Ссылка'>
            <LinkIcon className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' onClick={() => { run('removeFormat'); sync(); }} title='Очистить форматирование'>
            <RemoveFormatting className='h-4 w-4' />
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className='min-h-[240px] px-4 py-3 text-[15px] leading-7 text-black outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]'
          data-placeholder={placeholder}
          onInput={sync}
          onBlur={sync}
        />
      </div>
    </div>
  );
}
