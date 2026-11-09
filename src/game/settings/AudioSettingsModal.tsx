'use client';

import React, { useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import { AudioSettingsControl } from './AudioSettingsControl';

export interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      data-testid="audio-settings-modal"
    >
      <div className="max-w-md w-full rounded-3xl border border-indigo-500/40 bg-slate-950 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-black text-white">SES VE MÜZİK AYARLARI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title="Kapat"
            data-testid="audio-settings-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AudioSettingsControl />

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
