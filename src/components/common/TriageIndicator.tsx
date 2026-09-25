import React from 'react';

export type TriageLevel = 'emergent' | 'urgent' | 'non_urgent';

interface TriageIndicatorProps {
  level: TriageLevel | 'critical' | 'moderate' | 'low' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const normalizeTriageLevel = (
  rawLevel: string | undefined
): { level: TriageLevel; label: string; bg: string; text: string; border: string; icon: string; dotColor: string } => {
  const norm = (rawLevel || '').toLowerCase().trim();

  if (norm.includes('emerg') || norm.includes('crit') || norm.includes('red') || norm === 'level 1') {
    return {
      level: 'emergent',
      label: 'Emergent (Immediate)',
      bg: 'bg-red-50 text-red-700',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'crisis_alert',
      dotColor: 'bg-red-600',
    };
  }

  if (norm.includes('urg') || norm.includes('mod') || norm.includes('yellow') || norm === 'level 2') {
    return {
      level: 'urgent',
      label: 'Urgent (15-30m)',
      bg: 'bg-amber-50 text-amber-800',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: 'priority_high',
      dotColor: 'bg-amber-500',
    };
  }

  // Non-urgent / Low / Green
  return {
    level: 'non_urgent',
    label: 'Non-Urgent (Standard)',
    bg: 'bg-emerald-50 text-emerald-800',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: 'check_circle',
    dotColor: 'bg-emerald-500',
  };
};

export const TriageIndicator: React.FC<TriageIndicatorProps> = ({
  level,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const info = normalizeTriageLevel(level);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  const iconSizes = {
    xs: 'text-[11px]',
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-[18px]',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border shadow-2xs ${info.bg} ${info.border} ${sizeClasses} ${className}`}
      title={`Triage Priority: ${info.label}`}
    >
      <span className="relative flex items-center justify-center shrink-0">
        {info.level === 'emergent' && (
          <span className="absolute w-2.5 h-2.5 rounded-full bg-red-400 animate-ping opacity-75"></span>
        )}
        <span className={`w-1.5 h-1.5 rounded-full ${info.dotColor}`}></span>
      </span>

      <span className={`material-symbols-outlined ${iconSizes} ${info.text} shrink-0`}>
        {info.icon}
      </span>

      {showLabel && (
        <span className="leading-none whitespace-nowrap">
          {info.level === 'emergent' ? 'Emergent' : info.level === 'urgent' ? 'Urgent' : 'Non-Urgent'}
        </span>
      )}
    </span>
  );
};
