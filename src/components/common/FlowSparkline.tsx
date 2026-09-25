import React, { useState } from 'react';

export interface FlowDataPoint {
  label: string;       // e.g. "04:00", "08:00", "Mon", "Tue"
  value: number;       // metric number
  subtext?: string;    // e.g. "184 beds", "74% cap"
}

interface FlowSparklineProps {
  data: FlowDataPoint[];
  color?: string;           // stroke color e.g. '#d97706' (amber-600) or '#059669' (emerald-600)
  fillGradientId: string;   // unique ID for svg defs linearGradient
  gradientStart?: string;
  gradientStop?: string;
  height?: number;          // height in px (default 40)
  unit?: string;            // e.g. "%" or "pts"
  threshold?: number;       // optional benchmark line e.g. 80%
  thresholdLabel?: string;
  className?: string;
  badgeLabel?: string;
}

export const FlowSparkline: React.FC<FlowSparklineProps> = ({
  data,
  color = '#ca8a04',
  fillGradientId,
  gradientStart = 'rgba(234, 179, 8, 0.35)',
  gradientStop = 'rgba(234, 179, 8, 0.02)',
  height = 42,
  unit = '',
  threshold,
  thresholdLabel,
  className = '',
  badgeLabel,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Add 10% breathing room to y-axis so curve does not touch edges
  const padding = (rawMax - rawMin) * 0.18 || (rawMin === 0 ? 1 : rawMin * 0.1);
  const minY = Math.max(0, rawMin - padding);
  const maxY = rawMax + padding;

  const svgWidth = 240;
  const svgHeight = height;
  const padX = 8;
  const padY = 6;
  const usableWidth = svgWidth - padX * 2;
  const usableHeight = svgHeight - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * usableWidth;
    const y = padY + usableHeight - ((d.value - minY) / (maxY - minY)) * usableHeight;
    return { x, y, data: d };
  });

  // Generate smooth SVG curve using cubic bezier control points
  const generateSmoothPath = (pts: typeof points): string => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      d += ` C ${mx.toFixed(1)} ${curr.y.toFixed(1)}, ${mx.toFixed(1)} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${svgHeight} L ${points[0].x.toFixed(1)} ${svgHeight} Z`;

  // Threshold Y coordinate
  const thresholdY =
    threshold !== undefined
      ? padY + usableHeight - ((threshold - minY) / (maxY - minY)) * usableHeight
      : null;

  // Active hover point or default to last point
  const activePt = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const netDiff = lastVal - firstVal;
  const isUp = netDiff >= 0;

  return (
    <div className={`flex flex-col w-full select-none ${className}`}>
      {/* Top Header of Sparkline */}
      <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
        <div className="flex items-center gap-1 font-semibold">
          <span className="font-mono text-neutral-600 tracking-tight">
            {hoverIndex !== null ? (
              <span className="font-bold text-neutral-900 bg-black/5 px-1 rounded">
                {activePt.data.label}: {activePt.data.value}
                {unit}
              </span>
            ) : (
              <span>Trend: {badgeLabel || `${data[0].label} → ${data[data.length - 1].label}`}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono font-bold text-[10px]">
          <span
            className={`flex items-center ${
              isUp ? 'text-amber-800' : 'text-neutral-600'
            }`}
          >
            {isUp ? '▲ +' : '▼ '}
            {Math.abs(netDiff).toFixed(unit === '%' ? 1 : 0)}
            {unit}
          </span>
        </div>
      </div>

      {/* Interactive SVG Sparkline Canvas */}
      <div className="relative w-full h-[44px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientStart} />
              <stop offset="100%" stopColor={gradientStop} />
            </linearGradient>
          </defs>

          {/* Optional Benchmark Threshold Line */}
          {thresholdY !== null && thresholdY >= 0 && thresholdY <= svgHeight && (
            <g>
              <line
                x1={padX}
                y1={thresholdY}
                x2={svgWidth - padX}
                y2={thresholdY}
                stroke="#ef4444"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.65"
              />
              {thresholdLabel && (
                <text
                  x={svgWidth - padX - 2}
                  y={Math.max(8, thresholdY - 2)}
                  fontSize="7"
                  fill="#b91c1c"
                  textAnchor="end"
                  fontWeight="bold"
                >
                  {thresholdLabel}
                </text>
              )}
            </g>
          )}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#${fillGradientId})`} />

          {/* Trend Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover interactive vertical line */}
          {hoverIndex !== null && (
            <line
              x1={activePt.x}
              y1={padY}
              x2={activePt.x}
              y2={svgHeight}
              stroke="#525252"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              opacity="0.8"
            />
          )}

          {/* Subtle pulse / dot on latest or hovered point */}
          <circle
            cx={activePt.x}
            cy={activePt.y}
            r="3.2"
            fill={color}
            stroke="#ffffff"
            strokeWidth="1.5"
            className="transition-all duration-100"
          />

          {/* Interactive invisible touch/mouse hit zones across the data points */}
          {points.map((pt, i) => {
            const sliceWidth = usableWidth / (points.length - 1);
            const startX = pt.x - sliceWidth / 2;
            return (
              <rect
                key={i}
                x={Math.max(0, startX)}
                y="0"
                width={sliceWidth}
                height={svgHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {/* Floating tooltip preview upon hover */}
        {hoverIndex !== null && (
          <div
            className="absolute -top-6 px-2 py-0.5 rounded bg-[#141416] text-white text-[9px] font-mono font-bold pointer-events-none shadow-md border border-white/10 z-20 whitespace-nowrap transform -translate-x-1/2"
            style={{
              left: `${(activePt.x / svgWidth) * 100}%`,
            }}
          >
            {activePt.data.label}: {activePt.data.value}
            {unit} {activePt.data.subtext ? `• ${activePt.data.subtext}` : ''}
          </div>
        )}
      </div>

      {/* Axis markers: earliest and latest time labels */}
      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 mt-1">
        <span>{data[0].label}</span>
        <span className="text-[8px] font-sans text-neutral-400">
          min {rawMin}
          {unit} • max {rawMax}
          {unit}
        </span>
        <span className="text-neutral-600 font-semibold">{data[data.length - 1].label}</span>
      </div>
    </div>
  );
};
