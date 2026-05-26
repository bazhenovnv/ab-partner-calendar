'use client';

import { useEffect, useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Paintbrush,
  RemoveFormatting,
  Type,
  Underline,
} from 'lucide-react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  label = 'Описание',
  placeholder = 'Введите описание мероприятия...',
  minHeight = 260,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if ((value || '') !== editor.innerHTML) editor.innerHTML = value || '';
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML || '');

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    exec(command, commandValue);
    sync();
  };

  const insertLink = () => {
    const url = window.prompt('Вставьте ссылку');
    if (!url) return;
    const safeUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    run('createLink', safeUrl);
  };

  return (
    <div className='space-y-2'>
      <div className='text-sm font-semibold text-black'>{label}</div>

      <div className='overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white'>
        <div className='flex flex-wrap items-center gap-2 border-b border-[#d8f3e7] bg-[#f7fffb] p-3'>
          <button type='button' className='admin-editor-btn' title='Жирный' onClick={() => run('bold')}>
            <Bold className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Курсив' onClick={() => run('italic')}>
            <Italic className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Подчеркнуть' onClick={() => run('underline')}>
            <Underline className='h-4 w-4' />
          </button>

          <span className='mx-1 h-7 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' title='Заголовок 1' onClick={() => run('formatBlock', 'h1')}>
            <Heading1 className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Заголовок 2' onClick={() => run('formatBlock', 'h2')}>
            <Heading2 className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Обычный текст' onClick={() => run('formatBlock', 'p')}>
            <Type className='h-4 w-4' />
          </button>

          <select
            className='h-9 rounded-xl border border-[#7CD8B3] bg-white px-3 text-sm text-black outline-none'
            defaultValue=''
            title='Шрифт'
            onChange={(event) => {
              if (!event.target.value) return;
              run('fontName', event.target.value);
              event.target.value = '';
            }}
          >
            <option value='' disabled>Шрифт</option>
            <option value='Arial'>Arial</option>
            <option value='Times New Roman'>Times New Roman</option>
            <option value='Verdana'>Verdana</option>
            <option value='Georgia'>Georgia</option>
            <option value='Courier New'>Courier New</option>
          </select>

          <select
            className='h-9 rounded-xl border border-[#7CD8B3] bg-white px-3 text-sm text-black outline-none'
            defaultValue=''
            title='Размер текста'
            onChange={(event) => {
              if (!event.target.value) return;
              run('fontSize', event.target.value);
              event.target.value = '';
            }}
          >
            <option value='' disabled>Размер</option>
            <option value='2'>Мелкий</option>
            <option value='3'>Обычный</option>
            <option value='4'>Крупный</option>
            <option value='5'>Очень крупный</option>
            <option value='6'>Максимальный</option>
          </select>

          <label className='admin-editor-btn cursor-pointer' title='Цвет текста'>
            <Paintbrush className='h-4 w-4' />
            <input type='color' className='sr-only' onChange={(event) => run('foreColor', event.target.value)} />
          </label>

          <span className='mx-1 h-7 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' title='Маркированный список' onClick={() => run('insertUnorderedList')}>
            <List className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Нумерованный список' onClick={() => run('insertOrderedList')}>
            <ListOrdered className='h-4 w-4' />
          </button>

          <span className='mx-1 h-7 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' title='По левому краю' onClick={() => run('justifyLeft')}>
            <AlignLeft className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='По центру' onClick={() => run('justifyCenter')}>
            <AlignCenter className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='По правому краю' onClick={() => run('justifyRight')}>
            <AlignRight className='h-4 w-4' />
          </button>

          <span className='mx-1 h-7 w-px bg-[#d8f3e7]' />

          <button type='button' className='admin-editor-btn' title='Ссылка' onClick={insertLink}>
            <LinkIcon className='h-4 w-4' />
          </button>
          <button type='button' className='admin-editor-btn' title='Очистить форматирование' onClick={() => run('removeFormat')}>
            <RemoveFormatting className='h-4 w-4' />
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className='rich-text-editor-content px-4 py-4 text-[15px] leading-7 text-black outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]'
          style={{ minHeight }}
          onInput={sync}
          onBlur={sync}
        />
      </div>
    </div>
  );
}
