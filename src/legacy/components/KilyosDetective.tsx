'use client';

import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '@/lib/sound';
import { ArrowLeft, CheckCircle2, FileSearch, Search, ShieldAlert, XCircle } from 'lucide-react';

interface KilyosDetectiveProps {
  onScoreGain: (netDelta: number, lpDelta: number) => void;
  onBackToRoom: () => void;
}

interface CaseFile {
  id: string;
  suspectName: string;
  suspectRole: string;
  avatar: string;
  docTitle: string;
  ruleReference: string;
  clauses: { text: string; isFlaw?: boolean }[];
  isValidDocument: boolean;
  explanation: string;
}

const DETECTIVE_CASES: CaseFile[] = [
  {
    id: 'case-1',
    suspectName: 'Dr. Selim Arslan',
    suspectRole: 'BUEPT Akademik Makale Başvurusu',
    avatar: '🕵️‍♂️',
    docTitle: 'KİLYOS ENSTİTÜSÜ ARAŞTIRMA RAPORU #402',
    ruleReference:
      '📘 BUEPT Kural 1: "Mitigate" = Hafifletmek/Azaltmak. "Exacerbate" = Kötüleştirmek/Ağırlaştırmak. Rapor içindeki sebep-sonuç bağlamı birbiriyle çelişmemelidir.',
    clauses: [
      { text: '1. Yeni filtreleme sistemi fabrika emisyonlarını %60 oranında düşürmüştür.' },
      {
        text: '2. Dolayısıyla bu çevreci filtre hava kirliliğini başarıyla EXACERBATE etmiştir (azaltmıştır).',
        isFlaw: true,
      },
      { text: '3. Kilyos rüzgar türbinleri kesintisiz enerji sağlamaya devam etmektedir.' },
    ],
    isValidDocument: false,
    explanation:
      '🚨 ÇELİŞKİ YAKALANDI! 2. maddede "exacerbate" (kötüleştirmek) kelimesi "azaltmak/hafifletmek" (mitigate) anlamında yanlış kullanılmış! Sahte belge reddedildi!',
  },
  {
    id: 'case-2',
    suspectName: 'Zeynep Kaya',
    suspectRole: 'Güney Kampüs Geçiş Vizesi',
    avatar: '👩‍🎓',
    docTitle: 'BUEPT PROFICIENCY GEÇİŞ BELGESİ #819',
    ruleReference:
      '📘 BUEPT Kural 2: "Albeit" (Her ne kadar ... olsa da) ve "Corroborate" (Kanıtlarla doğrulamak) akademik metinlerde doğru bağlamda kullanıldığında belge GEÇERLİDİR.',
    clauses: [
      {
        text: '1. The candidate passed the reading section, ALBEIT with a narrow margin of two points.',
      },
      {
        text: '2. Independent exam proctors CORROBORATED the authenticity of her listening essay.',
      },
      { text: '3. Güney Kampüs Albert Long Hall giriş izni talep edilmektedir.' },
    ],
    isValidDocument: true,
    explanation:
      '✅ DOĞRU ONAY! Hem "albeit" (her ne kadar ... olsa da) hem de "corroborate" (doğrulamak) kurallara %100 uygun kullanılmış!',
  },
  {
    id: 'case-3',
    suspectName: 'Prof. Тarik Demir',
    suspectRole: 'TYT/AYT Fizik Laboratuvarı Girişi',
    avatar: '👨‍🔬',
    docTitle: 'TERMODİNAMİK & MEKANİK DENEY TUTANAĞI #105',
    ruleReference:
      '📘 YKS Fizik Kuralı: Deniz seviyesinde erimekte olan saf buza ısı verildiğinde hal değişimi bitene kadar sıcaklık SABİT (0°C) kalır; net kuvvet sıfırsa hız sabittir.',
    clauses: [
      { text: '1. Sürtünmesiz yatay düzlemde F_net = 0 olan cisim sabit hızla ilerlemiştir.' },
      {
        text: '2. 0°C sıcaklıkta erimekte olan saf buz kalıbına ısı verildiğinde sıcaklığı anında 15°C seviyesine yükselmiştir.',
        isFlaw: true,
      },
      { text: '3. Deney verileri Boğaziçi Kuzey Kampüs laboratuvarında kaydedilmiştir.' },
    ],
    isValidDocument: false,
    explanation:
      '🚨 FİZİK ÇELİŞKİSİ YAKALANDI! Hal değiştiren (eriyen) saf maddenin sıcaklığı erime tamamlanana kadar 0°C\'de sabit kalır, anında yükselmez!',
  },
];

export const KilyosDetective: React.FC<KilyosDetectiveProps> = ({
  onScoreGain,
  onBackToRoom,
}) => {
  const boothCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [caseIdx, setCaseIdx] = useState<number>(0);
  const [uvMode, setUvMode] = useState<boolean>(true);
  const [stampResult, setStampResult] = useState<'approved' | 'rejected' | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [solvedCount, setSolvedCount] = useState<number>(0);

  const currentCase = DETECTIVE_CASES[caseIdx % DETECTIVE_CASES.length];

  // 60 FPS Kilyos Checkpoint Booth Canvas
  useEffect(() => {
    const canvas = boothCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const rain = Array.from({ length: 36 }, () => ({
      x: Math.random() * 440,
      y: Math.random() * 190,
      spd: 4 + Math.random() * 3,
    }));

    const render = (time: number) => {
      ctx.fillStyle = '#07111a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stormy Kilyos Sky outside Guard Window
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
      ctx.lineWidth = 1.5;
      rain.forEach((r) => {
        r.y += r.spd;
        r.x -= 1.2;
        if (r.y > 190) {
          r.y = 0;
          r.x = Math.random() * 440;
        }
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 4, r.y + 10);
        ctx.stroke();
      });

      // Kilyos Campus Gate Silhouette
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 30, 40, 160);
      ctx.fillRect(380, 30, 40, 160);
      ctx.fillRect(10, 15, 420, 22);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🛂 BOĞAZİÇİ KİLYOS (SARITEPE) AKADEMİK KONTROL NOKTASI', 58, 30);

      // Suspect Silhouette & Avatar at Window
      const bob = Math.sin(time * 0.005) * 3;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(220, 115 + bob, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = uvMode ? '#a855f7' : '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = '42px sans-serif';
      ctx.fillText(currentCase.avatar, 198, 130 + bob);

      // Window Security Bars
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 3;
      for (let bx = 80; bx <= 360; bx += 70) {
        ctx.beginPath();
        ctx.moveTo(bx, 37);
        ctx.lineTo(bx, 190);
        ctx.stroke();
      }

      // Desk Lamp Cone
      if (uvMode) {
        const grad = ctx.createRadialGradient(220, 115, 10, 220, 115, 130);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentCase, uvMode]);

  const handleVerdict = (approved: boolean) => {
    setStampResult(approved ? 'approved' : 'rejected');
    const isCorrectDecision = approved === currentCase.isValidDocument;

    if (isCorrectDecision) {
      soundEngine.playShieldBreak();
      setSolvedCount((c) => c + 1);
      onScoreGain(4.5, 50);
      setFeedback({
        ok: true,
        text: `${currentCase.explanation} (+4.5 Net & +50 LP Kazandın!)`,
      });
    } else {
      soundEngine.playWrongBuzz();
      setFeedback({
        ok: false,
        text: `❌ Hatalı Mühür! ${currentCase.explanation}`,
      });
    }
  };

  const handleClauseClick = (isFlaw?: boolean) => {
    if (isFlaw) {
      handleVerdict(false);
    } else if (currentCase.isValidDocument) {
      handleVerdict(true);
    } else {
      soundEngine.playWrongBuzz();
      setFeedback({
        ok: false,
        text: '🔍 Bu maddede bir sorun yok! Diğer maddelerdeki gizli kelime/kavram çelişkisine dikkatli bak!',
      });
    }
  };

  const nextCase = () => {
    setStampResult(null);
    setFeedback(null);
    setCaseIdx((i) => i + 1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoom}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Odaya Dön
          </button>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-amber-400" />
              Mod 4: Project Kilyos — &quot;Papers, Please&quot; Tarzı BUEPT & YKS Belge Dedektifi
            </h2>
            <p className="text-xs text-slate-400">
              Sol taraftaki Kural Kitabını oku, sağdaki evrakta çelişkili kelime/kavram varsa üzerine tıkla veya <strong>ONAYLA / REDDET</strong> mührünü bas!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUvMode((u) => !u)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition ${
              uvMode
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            UV Büyüteç: {uvMode ? 'AÇIK' : 'KAPALI'}
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">
            🕵️ Çözülen Vaka: {solvedCount}
          </span>
        </div>
      </div>

      {/* Main Inspection Desk Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Guard Window Canvas + Official Rulebook */}
        <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <canvas
              ref={boothCanvasRef}
              width={440}
              height={190}
              className="w-full h-[185px] block bg-slate-950"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Şüpheli / Başvuru Sahibi:</div>
            <div className="text-sm font-extrabold text-white">
              {currentCase.suspectName} — <span className="text-indigo-400">{currentCase.suspectRole}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 space-y-1.5">
            <div className="text-xs font-extrabold text-amber-300 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> RESMİ DENETİM KILAVUZU (KURAL KİTABI)
            </div>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-medium">
              {currentCase.ruleReference}
            </p>
          </div>
        </div>

        {/* Right 7 Cols: Official Document Paper on Desk + Heavy Stamp Buttons */}
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          {/* Paper Document Surface */}
          <div className="relative rounded-2xl bg-[#f8f5e6] text-slate-900 p-5 border-4 border-amber-900/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-400 pb-3">
              <div>
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">
                  BOĞAZİÇİ UNIVERSITY • OFFICIAL RECORD
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{currentCase.docTitle}</h3>
              </div>
              <div className="px-2.5 py-1 rounded bg-slate-900 text-amber-300 text-xs font-mono font-bold">
                DOSYA #{caseIdx + 1}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-600">
              👇 Belgedeki maddeleri incele (Hatalı/Çelişkili bir ifade görürsen doğrudan üzerine tıklayabilirsin):
            </div>

            <div className="space-y-2.5">
              {currentCase.clauses.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => handleClauseClick(c.isFlaw)}
                  className={`w-full p-3 rounded-xl border-2 text-left text-xs sm:text-sm font-bold transition ${
                    uvMode
                      ? 'border-purple-400/70 bg-purple-100/60 hover:bg-purple-200/80 text-slate-900'
                      : 'border-slate-300 bg-white hover:border-slate-500 text-slate-900'
                  }`}
                >
                  {c.text}
                </button>
              ))}
            </div>

            {/* Physical Stamp Overlay */}
            {stampResult && (
              <div
                className={`absolute top-12 right-8 px-5 py-2 border-4 rounded-xl font-black text-xl uppercase tracking-widest rotate-[-14deg] shadow-xl ${
                  stampResult === 'approved'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-100/90'
                    : 'border-rose-600 text-rose-700 bg-rose-100/90'
                }`}
              >
                {stampResult === 'approved' ? '✓ ONAYLANDI (GEÇERLİ)' : '✕ REDDEDİLDİ (ÇELİŞKİ)'}
              </div>
            )}
          </div>

          {/* Feedback & Next Case Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                feedback.ok
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              <p className="text-xs sm:text-sm font-bold flex-1">{feedback.text}</p>
              <button
                onClick={nextCase}
                className="px-4 py-2 rounded-xl bg-white text-slate-950 font-extrabold text-xs hover:bg-slate-200 transition"
              >
                Sıradaki Şüpheliyi Çağır →
              </button>
            </div>
          )}

          {/* Stamp Controls */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVerdict(true)}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              YEŞİL DAMGA: BELGE GEÇERLİ (ONAYLA)
            </button>
            <button
              onClick={() => handleVerdict(false)}
              className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition"
            >
              <XCircle className="w-5 h-5" />
              KIRMIZI DAMGA: ÇELİŞKİ VAR (REDDET)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
