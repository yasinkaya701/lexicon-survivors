'use client';

import React, { useState } from 'react';

export interface SubjectMasteryData {
  turkce: number;    // 0 to 100%
  matematik: number; // 0 to 100%
  fen: number;       // 0 to 100%
  sosyal: number;    // 0 to 100%
  buept: number;     // 0 to 100%
}

export interface SubjectAttemptCounts {
  turkce?: number;
  matematik?: number;
  fen?: number;
  sosyal?: number;
  buept?: number;
}

export interface MasteryRadarChartProps {
  scores: SubjectMasteryData;
  counts?: SubjectAttemptCounts;
  size?: number; // Default: 320
  className?: string;
}

interface AxisConfig {
  key: keyof SubjectMasteryData;
  label: string;
  icon: string;
  color: string;
  badge: string;
}

const RADAR_AXES: AxisConfig[] = [
  { key: 'turkce', label: 'Türkçe', icon: '📖', color: '#38bdf8', badge: 'Anlam & Paragraf' },
  { key: 'matematik', label: 'Matematik', icon: '📐', color: '#f59e0b', badge: 'Sayısal Muhakeme' },
  { key: 'fen', label: 'Fen Bilimleri', icon: '⚡', color: '#10b981', badge: 'Fizik / Kimya / Biyo' },
  { key: 'sosyal', label: 'Sosyal Bilimler', icon: '🏛️', color: '#f43f5e', badge: 'Tarih & Felsefe' },
  { key: 'buept', label: 'BUEPT English', icon: '🎓', color: '#a855f7', badge: 'Akademik İngilizce' },
];

export const MasteryRadarChart: React.FC<MasteryRadarChartProps> = ({
  scores,
  counts = {},
  size = 320,
  className = '',
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<AxisConfig | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;

  // Compute 5-axis polygon points
  const points = RADAR_AXES.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
    const val = scores[axis.key] ?? 50;
    const r = (Math.max(15, Math.min(100, val)) / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      val,
      axis,
    };
  });

  const polygonString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Web Rings at 25%, 50%, 75%, 100% */}
        {[0.25, 0.5, 0.75, 1.0].map((scale) => {
          const ringPoints = RADAR_AXES.map((_, i) => {
            const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
            const r = maxR * scale;
            return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
          }).join(' ');

          return (
            <polygon
              key={scale}
              points={ringPoints}
              fill="none"
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth={scale === 1.0 ? '1.5' : '1'}
              strokeDasharray={scale === 1.0 ? undefined : '3 3'}
            />
          );
        })}

        {/* Axis Spokes & Labels */}
        {RADAR_AXES.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
          const x2 = cx + Math.cos(angle) * maxR;
          const y2 = cy + Math.sin(angle) * maxR;
          const labelDist = maxR + 26;
          const lx = cx + Math.cos(angle) * labelDist;
          const ly = cy + Math.sin(angle) * labelDist;
          const score = scores[axis.key] ?? 50;

          return (
            <g key={axis.key} className="transition-opacity">
              {/* Spoke Line */}
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="rgba(148, 163, 184, 0.25)"
                strokeWidth="1"
              />

              {/* Text Label */}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] sm:text-[11px] font-black tracking-tight"
                fill={axis.color}
                cursor="pointer"
                onMouseEnter={() => setHoveredAxis(axis)}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                {axis.icon} {axis.label} ({score}%)
              </text>
            </g>
          );
        })}

        {/* Player Data Polygon */}
        <polygon
          points={polygonString}
          fill="url(#radarRadial)"
          stroke="#818cf8"
          strokeWidth="2.5"
          filter="url(#radarGlow)"
          className="transition-all duration-300"
        />

        {/* Vertex Markers */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredAxis?.key === p.axis.key ? '6' : '4'}
            fill={p.axis.color}
            stroke="#0f172a"
            strokeWidth="2"
            cursor="pointer"
            className="transition-all duration-200"
            onMouseEnter={() => setHoveredAxis(p.axis)}
            onMouseLeave={() => setHoveredAxis(null)}
          />
        ))}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoveredAxis && (
        <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-center space-y-0.5 text-xs animate-in fade-in duration-150">
          <div className="font-black text-white flex items-center justify-center gap-1">
            <span>{hoveredAxis.icon}</span>
            <span>{hoveredAxis.label}</span>
            <span className="text-slate-400">({scores[hoveredAxis.key]}%)</span>
          </div>
          <div className="text-[10px] text-indigo-300 font-semibold">{hoveredAxis.badge}</div>
          <div className="text-[10px] text-slate-400">
            {counts[hoveredAxis.key] !== undefined
              ? `Çözülen: ${counts[hoveredAxis.key]} Soru`
              : 'Kayıtlı Sınav Verisi'}
          </div>
        </div>
      )}
    </div>
  );
};
