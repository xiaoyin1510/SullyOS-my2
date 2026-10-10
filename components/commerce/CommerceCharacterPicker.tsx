import React from 'react';
import { ChatCircle, X } from '@phosphor-icons/react';
import type { CharacterProfile } from '../../types';

export interface CommerceCharacterPickerProps {
  characters: CharacterProfile[];
  title: string;
  description?: string;
  onChoose: (character: CharacterProfile) => void;
  onClose: () => void;
}

const CommerceCharacterPicker: React.FC<CommerceCharacterPickerProps> = ({ characters, title, description, onChoose, onClose }) => (
  <div className="absolute inset-0 z-[80] flex items-end justify-center bg-stone-950/55 p-3 backdrop-blur-sm" onClick={onClose}>
    <section className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-[#fffdfa] shadow-2xl" onClick={event => event.stopPropagation()}>
      <header className="flex items-start gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ChatCircle size={21} weight="fill" /></div>
        <div className="min-w-0 flex-1"><h3 className="text-[15px] font-black text-stone-800">{title}</h3><p className="mt-1 text-[11px] leading-5 text-stone-500">{description || '选择一位角色，把这件事带进你们的聊天。'}</p></div>
        <button onClick={onClose} aria-label="关闭" className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500"><X size={16}/></button>
      </header>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto p-4">
        {characters.length ? characters.map(character => (
          <button key={character.id} onClick={() => onChoose(character)} className="flex w-full items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 text-left transition hover:border-rose-200 hover:bg-rose-50/40 active:scale-[.99]">
            {character.avatar ? <img src={character.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full bg-stone-100 object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg">💌</span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-stone-800">{character.name}</span><span className="mt-1 block text-[10px] text-stone-400">发送到与 TA 的聊天</span></span>
            <span className="text-[10px] font-bold text-rose-500">选择</span>
          </button>
        )) : <p className="py-7 text-center text-[12px] text-stone-400">还没有可选角色，请先创建一位角色。</p>}
      </div>
    </section>
  </div>
);

export default CommerceCharacterPicker;
