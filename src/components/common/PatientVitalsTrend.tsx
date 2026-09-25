import React, { useState } from 'react';

interface VitalsDataPoint {
  time: string;
  spo2: number;
  heartRate: number;
  bpSystolic: number;
  bpDiastolic: number;
  temp: number;
}

interface PatientVitalsTrendProps {
  patientName?: string;
  bedId?: string;
  uhid?: string;
  className?: string;
  initialTimeRange?: '24h' | '12h' | '6h';
  customData?: VitalsDataPoint[];
}

// 24-hour hourly mock telemetry trend data
const DEFAULT_24H_DATA: VitalsDataPoint[] = [
  { time: '02:00', spo2: 97, heartRate: 72, bpSystolic: 118, bpDiastolic: 78, temp: 98.4 },
  { time: '04:00', spo2: 98, heartRate: 70, bpSystolic: 116, bpDiastolic: 76, temp: 98.2 },
  { time: '06:00', spo2: 97, heartRate: 74, bpSystolic: 120, bpDiastolic: 80, temp: 98.6 },
  { time: '08:00', spo2: 98, heartRate: 78, bpSystolic: 122, bpDiastolic: 82, temp: 98.7 },
  { time: '10:00', spo2: 99, heartRate: 80, bpSystolic: 124, bpDiastolic: 82, temp: 98.6 },
  { time: '12:00', spo2: 98, heartRate: 76, bpSystolic: 121, bpDiastolic: 80, temp: 98.5 },
  { time: '14:00', spo2: 97, heartRate: 82, bpSystolic: 126, bpDiastolic: 84, temp: 98.8 },
  { time: '16:00', spo2: 98, heartRate: 79, bpSystolic: 123, bpDiastolic: 81, temp: 98.6 },
  { time: '18:00', spo2: 98, heartRate: 75, bpSystolic: 120, bpDiastolic: 80, temp: 98.5 },
  { time: '20:00', spo2: 99, heartRate: 73, bpSystolic: 119, bpDiastolic: 78, temp: 98.4 },
  { time: '22:00', spo2: 98, heartRate: 71, bpSystolic: 117, bpDiastolic: 77, temp: 98.3 },
  { time: '00:00', spo2: 98, heartRate: 74, bpSystolic: 120, bpDiastolic: 79, temp: 98.4 },
  { time: '01:30', spo2: 99, heartRate: 76, bpSystolic: 122, bpDiastolic: 80, temp: 98.6 },
];

export const PatientVitalsTrend: React.FC<PatientVitalsTrendProps> = ({
  patientName = 'Devika Singhania',
  bedId = 'B-302',
  uhid = 'UHID-884102',
  className = '',
  initialTimeRange = '24h',
  customData,
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '12h' | '6h'>(initialTimeRange);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const rawData = customData || DEFAULT_24H_DATA;
  const data =
    timeRange === '6h'
      ? rawData.slice(-4)
      : timeRange === '12h'
      ? rawData.slice(-7)
      : rawData;

  // Helper to generate SVG polyline points
  const getPoints = (values: number[], min: number, max: number, height: number = 48, width: number = 240) => {
    const range = max - min || 1;
    const step = width / (values.length - 1 || 1);
    return values
      .map((val, idx) => {
        const x = idx * step;
        const normalized = (val - min) / range;
        const y = height - normalized * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const spo2Values = data.map((d) => d.spo2);
  const hrValues = data.map((d) => d.heartRate);
  const sysValues = data.map((d) => d.bpSystolic);
  const diaValues = data.map((d) => d.bpDiastolic);

  const current = data[data.length - 1];
  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : current;

  return (
    <div className={`bg-white rounded-3xl p-5 border border-black/5 shadow-sm space-y-4 ${className}`}>
      {/* Top Header & Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">show_chart</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-neutral-900 font-['Plus_Jakarta_Sans']">
                24-Hour Continuous Telemetry Trend
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Live Waveform Sync
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-mono">
              {patientName} • {bedId} • {uhid}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
          {(['6h', '12h', '24h'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                timeRange === r
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1: SpO2 */}
        <div className="p-4 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              SpO2 Trend
            </span>
            <span className="text-[11px] font-mono font-bold text-neutral-400">
              Min 97% • Max 99%
            </span>
          </div>

          <div className="flex items-baseline justify-between my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {activePoint.spo2}%
              </span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase px-1.5 py-0.2 rounded bg-emerald-100">
                Optimal
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              @ {activePoint.time}
            </span>
          </div>

          {/* Sparkline SVG */}
          <div className="w-full h-12 relative flex items-center overflow-hidden">
            <svg
              className="w-full h-12 overflow-visible"
              viewBox="0 0 240 48"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={getPoints(spo2Values, 95, 100, 48, 240)}
              />
            </svg>
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Target: &gt; 95% on Room Air</span>
        </div>

        {/* Metric 2: Heart Rate */}
        <div className="p-4 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Heart Rate
            </span>
            <span className="text-[11px] font-mono font-bold text-neutral-400">
              Avg 75 bpm
            </span>
          </div>

          <div className="flex items-baseline justify-between my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-neutral-900">
                {activePoint.heartRate} <span className="text-xs text-neutral-500 font-normal">bpm</span>
              </span>
              <span className="text-[10px] font-bold text-neutral-700 uppercase px-1.5 py-0.2 rounded bg-neutral-200">
                Sinus Rhythm
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              @ {activePoint.time}
            </span>
          </div>

          {/* Sparkline SVG */}
          <div className="w-full h-12 relative flex items-center overflow-hidden">
            <svg
              className="w-full h-12 overflow-visible"
              viewBox="0 0 240 48"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={getPoints(hrValues, 60, 95, 48, 240)}
              />
            </svg>
          </div>
          <span className="text-[10px] text-neutral-500 block mt-1">Normal Resting Range: 60 - 100 bpm</span>
        </div>

        {/* Metric 3: Blood Pressure */}
        <div className="p-4 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Blood Pressure
            </span>
            <span className="text-[11px] font-mono font-bold text-neutral-400">
              122/80 Baseline
            </span>
          </div>

          <div className="flex items-baseline justify-between my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-neutral-900">
                {activePoint.bpSystolic}/{activePoint.bpDiastolic}
              </span>
              <span className="text-[10px] font-bold text-neutral-700 uppercase px-1.5 py-0.2 rounded bg-neutral-200">
                Normotensive
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              @ {activePoint.time}
            </span>
          </div>

          {/* Dual Systolic & Diastolic Sparkline SVG */}
          <div className="w-full h-12 relative flex items-center overflow-hidden">
            <svg
              className="w-full h-12 overflow-visible"
              viewBox="0 0 240 48"
              preserveAspectRatio="none"
            >
              {/* Systolic (Blue) */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={getPoints(sysValues, 70, 140, 48, 240)}
              />
              {/* Diastolic (Light Blue) */}
              <polyline
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1.8"
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={getPoints(diaValues, 70, 140, 48, 240)}
              />
            </svg>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-blue-500"></span> Systolic
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-blue-300"></span> Diastolic
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Time scrub slider */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500 border-t border-neutral-100">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-neutral-400">info</span>
          Hover or tap any timeline stamp to view continuous telemetry readings:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {data.map((pt, i) => (
            <button
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(i)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                hoveredIdx === i
                  ? 'bg-[#141416] text-white font-bold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {pt.time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
