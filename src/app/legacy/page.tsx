'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import LegacyApp from '@/legacy/LegacyApp';

export default function LegacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060913]">
      {/* Top Banner: Juror Notice & Navigation to New Brotato Roguelite */}
      <header className="bg-slate-950/95 border-b border-indigo-900/50 px-4 py-2.5 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Legacy Prototype Archive
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              5 Hackathon Game Modes (Mezuna Kalma, Kampüs Royale, Exam Survivors, Project Kilyos, Spike Defuse)
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Brotato Roguelite</span>
          </Link>
        </div>
      </header>

      {/* Embedded Legacy Coordinator */}
      <div className="flex-1">
        <LegacyApp />
      </div>
    </div>
  );
}
