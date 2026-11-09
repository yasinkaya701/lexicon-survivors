'use client';

import React, { useState } from 'react';
import { MistakeEntry, TelemetryStats } from '@/types/game';
import { soundEngine } from '@/lib/sound';
import { ArrowLeft, BrainCircuit, CheckCircle2, Flame, Sparkles, Swords, Trophy } from 'lucide-react';

interface TelemetryModalProps {
  stats: TelemetryStats;
  mistakes: MistakeEntry[];
  onResolveMistake: (id: string) => void;
  onBackToRoom: () => void;
  onStartRevengeBattle: () => void;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({
  stats,
  mistakes,
  onResolveMistake,
  onBackToRoom,
  onStartRevengeBattle,
}) => {
  const [customTopic, setCustomTopic] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<{
    title: string;
    advice: string;
    sampleQ: string;
    sampleAns: string;
  }>({
    title: '🎓 Boğaziçili Üst Dönem AI Koçu Raporu',
    advice:
      'Savaş telemetrine göre kombo yakaladığında odak seviyen çok yüksek; ancak uzun paragraf ve öncül sorularında nabzın 110 BPM üzerine çıktığında "Turlama" butonunu 3 saniye daha erken kullanmalısın. BUEPT Reading\'de ise "albeit / notwithstanding" zıtlık kırılmaları senin en güçlü silahın!',
    sampleQ: 'AI Örnek Soru: "The committee endorsed the proposal, _______ reservations about its long-term fiscal feasibility."',
    sampleAns: 'Cevap: notwithstanding (-e rağmen). İsim öbeğinden önce tam zıtlık kurar!',
  });

  const generateCoachInsight = (topic: string) => {
    soundEngine.playComboUp(2);
    const t = topic.toLowerCase();
    if (t.includes('buept') || t.includes('kelime') || t.includes('reading')) {
      setAiResponse({
        title: '🇬🇧 BUEPT Kilyos Reading & Vocab Sentezi',
        advice:
          'Boğaziçi Hazırlık (BUEPT) sınavında uzun paragrafın tamamını çevirmek zaman tuzağıdır! İlk cümleyi oku, ardından "however, albeit, yet, paradoxically" gibi geçiş kelimelerinin olduğu cümleyi büyüteçle vur.',
        sampleQ: 'Yeni Sentez Soru: "Empirical findings _______ the claim that sleep deprivation impairs working memory."',
        sampleAns: 'Cevap: corroborate (kanıtlarla doğrulamak / desteklemek).',
      });
    } else if (t.includes('turla') || t.includes('stres') || t.includes('süre')) {
      setAiResponse({
        title: '⏱️ YKS 165 Dakika Turlama & Nabız Algoritması',
        advice:
          'İlk 10 saniyede çözüm yolunu göremediğin soruda inat etmek nabzını +25 BPM artırır ve sonraki 3 kolay soruyu kaybettirir. "TURLA" butonuna basmak pes etmek değil, beynin arka plan işlemcisini çalıştırmaktır!',
        sampleQ: 'Taktik Simülasyon: Zor bir olasılık sorusunda 2 şık arasında kaldığında ne yapmalısın?',
        sampleAns: 'Cevap: 50/50 ile şıkları daraltıp Turla; 2. turda taze odakla 8 saniyede vur!',
      });
    } else {
      setAiResponse({
        title: `🧠 "${topic || 'TYT/AYT Sayısal'}" İçin Özel AI Taktik Kancası`,
        advice:
          'ÖSYM ve BUEPT sorularında şıkların simetrisi ve uç değerler ("her zaman, yalnızca, entirely, obsolete") ilk elenecek hedeflerdir. Şimdi bu konudan senin için özel bir antrenman kartı ürettim:',
        sampleQ: `AI Özel Soru (${topic || 'Genel Muhakeme'}): Bir grafikte eğimin işareti değişiyorsa hangi kritik nokta aranır?`,
        sampleAns: 'Cevap: Birinci türevin sıfır olduğu yerel ekstremum (tepe/çukur) noktası!',
      });
    }
  };

  // Compute 5-axis radar polygon coordinates (center 130,130, radius 90)
  const axes = [
    { label: 'Hız & Refleks', val: stats.skills.speed },
    { label: 'Turlama Taktiği', val: stats.skills.turlama },
    { label: 'Stres Kontrolü', val: stats.skills.stressControl },
    { label: 'YKS Muhakeme', val: stats.skills.yksMastery },
    { label: 'BUEPT Akademik', val: stats.skills.bueptMastery },
  ];

  const cx = 130;
  const cy = 130;
  const maxR = 85;

  const points = axes
    .map((ax, i) => {
      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
      const r = (Math.max(25, Math.min(100, ax.val)) / 100) * maxR;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoom}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Odaya Dön
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Boğaziçili Üst Dönem AI Koçu & Biyometrik Telemetri Raporu
            </h2>
            <p className="text-xs text-slate-400">
              Sınav anı nabız, turlama verimliliği, 5 eksenli yetenek radarı ve yanlışlarından üretilen İntikam Destesi
            </p>
          </div>
        </div>

        <button
          onClick={onStartRevengeBattle}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg transition"
        >
          <Swords className="w-4 h-4" />
          İntikam Savaşına Gir
        </button>
      </div>

      {/* Main Grid: Left Radar & Biometrics (5 cols) + Right AI Mentor & Revenge Deck (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: 5-Axis SVG Radar Chart + KPI Cards */}
        <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
            📊 5 Eksenli Sınav & Zihin Telemetri Radarı
          </div>

          <div className="flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-2">
            <svg width="260" height="260" className="overflow-visible">
              {/* Radar Web Rings */}
              {[0.33, 0.66, 1].map((scale, idx) => (
                <polygon
                  key={idx}
                  points={axes
                    .map((_, i) => {
                      const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
                      return `${cx + Math.cos(angle) * maxR * scale},${cy + Math.sin(angle) * maxR * scale}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.2)"
                  strokeWidth="1"
                />
              ))}

              {/* Axis Spokes & Labels */}
              {axes.map((ax, i) => {
                const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
                const x2 = cx + Math.cos(angle) * maxR;
                const y2 = cy + Math.sin(angle) * maxR;
                const lx = cx + Math.cos(angle) * (maxR + 26);
                const ly = cy + Math.sin(angle) * (maxR + 20);
                return (
                  <g key={i}>
                    <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(148,163,184,0.25)" />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {ax.label} ({ax.val}%)
                    </text>
                  </g>
                );
              })}

              {/* Player Skill Polygon */}
              <polygon
                points={points}
                fill="rgba(99, 102, 241, 0.35)"
                stroke="#818cf8"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* Summary Stat Pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Maksimum Kombo</div>
              <div className="text-base font-extrabold text-amber-400 flex items-center gap-1 mt-0.5">
                <Flame className="w-4 h-4" /> {stats.maxCombo}x Seri
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Kırılan Boss Kalkanı</div>
              <div className="text-base font-extrabold text-cyan-400 flex items-center gap-1 mt-0.5">
                <Trophy className="w-4 h-4" /> {stats.shieldBreaks} Kanıt Avı
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Turlama Hamlesi</div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                🔄 {stats.turlaCount} Stratejik Pas
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Zirve Nabız (Stres)</div>
              <div className="text-base font-extrabold text-rose-400 mt-0.5">
                ❤️ {stats.peakBpm} BPM
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Interactive AI Mentor + Revenge Mistake Deck */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          {/* AI Coach Generator Box */}
          <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> CANLI AI MENTOR & SORU SENTEZLEYİCİ
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => generateCoachInsight('BUEPT Reading & Kelime')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs font-bold text-slate-200 transition"
                >
                  🇬🇧 BUEPT Taktikleri
                </button>
                <button
                  onClick={() => generateCoachInsight('Turlama ve Süre Stresi')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs font-bold text-slate-200 transition"
                >
                  ⏱️ Turlama Analizi
                </button>
                <button
                  onClick={() => generateCoachInsight('AYT Türev & Fen Tuzakları')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-xs font-bold text-slate-200 transition"
                >
                  📐 YKS Tuzakları
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-sm font-extrabold text-indigo-300">{aiResponse.title}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{aiResponse.advice}</p>
              <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-xs space-y-1">
                <div className="font-bold text-white">{aiResponse.sampleQ}</div>
                <div className="text-emerald-400 font-semibold">{aiResponse.sampleAns}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Boğaziçili AI Koça zorlandığın konuyu yaz (Örn: BUEPT bağlaçlar, TYT Optik, Stres)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => generateCoachInsight(customTopic)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition"
              >
                Analiz Üret
              </button>
            </div>
          </div>

          {/* İntikam Destesi (Mistake & Turla Review Cards) */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-300 uppercase tracking-wider">
                🔥 İntikam Destesi (Yanlış Veya Turlanan Soruların Hafıza Kancaları)
              </span>
              <span className="text-xs text-slate-400">
                Çözülen her intikam kartı <strong className="text-emerald-400">+3.5 Net & +35 LP</strong> kazandırır!
              </span>
            </div>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {mistakes.map((item) => (
                <div
                  key={item.question.id}
                  className={`p-3 rounded-xl border transition ${
                    item.resolved
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                      : 'bg-slate-950 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-indigo-300">
                      {item.question.category} • {item.status === 'wrong' ? '❌ Yanlış' : '🔄 Turlandı'}
                    </span>
                    {item.resolved ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> İntikam Alındı (+3.5 Net)
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          soundEngine.playComboUp(3);
                          onResolveMistake(item.question.id);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition"
                      >
                        ⚡ Şimdi Çöz & İntikam Al
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white mb-1">{item.question.prompt}</div>
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                    {item.question.mnemonic}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
