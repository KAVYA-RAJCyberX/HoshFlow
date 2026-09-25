import React, { useState } from 'react';
import { HOSPITAL_INFO } from '../../data/mockHospitalData';
import { ViewType } from '../../types';
import { FlowSparkline, FlowDataPoint } from './FlowSparkline';

interface HosflowMetricsSummaryProps {
  onNavigate?: (view: ViewType) => void;
  onFilterChange?: (filter: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

// 12-Hour Shift Influx Data Points (Every 2-3 hours)
const ADMISSIONS_12H_DATA: FlowDataPoint[] = [
  { label: '04:00', value: 184, subtext: 'Early Shift Base' },
  { label: '07:00', value: 188, subtext: '+4 Emergency Triage' },
  { label: '10:00', value: 194, subtext: '+6 Morning Electives' },
  { label: '13:00', value: 198, subtext: '+4 Daycare Admissions' },
  { label: '16:00', value: 202, subtext: '+4 Afternoon Transfers' },
  { label: '19:00', value: 204, subtext: '+2 Evening Admissions' },
  { label: 'Now', value: 205, subtext: 'Current Active Inpatients' },
];

const ADMISSIONS_7D_DATA: FlowDataPoint[] = [
  { label: 'Mon', value: 178, subtext: 'Weekly Baseline' },
  { label: 'Tue', value: 186, subtext: 'Surgical Pipeline' },
  { label: 'Wed', value: 193, subtext: 'Mid-week Peak' },
  { label: 'Thu', value: 189, subtext: 'Discharge Net Balance' },
  { label: 'Fri', value: 199, subtext: 'Pre-weekend Influx' },
  { label: 'Sat', value: 202, subtext: 'Emergency Surge' },
  { label: 'Today', value: 205, subtext: 'Current Census' },
];

// Bed Occupancy % Trend Data Points
const OCCUPANCY_12H_DATA: FlowDataPoint[] = [
  { label: '04:00', value: 73.6, subtext: '184 Beds Occupied' },
  { label: '07:00', value: 75.2, subtext: '188 Beds Occupied' },
  { label: '10:00', value: 77.6, subtext: '194 Beds Occupied' },
  { label: '13:00', value: 79.2, subtext: '198 Beds Occupied' },
  { label: '16:00', value: 80.8, subtext: '202 Beds Occupied' },
  { label: '19:00', value: 81.6, subtext: '204 Beds Occupied' },
  { label: 'Now', value: 82.0, subtext: '205 Beds Occupied' },
];

const OCCUPANCY_7D_DATA: FlowDataPoint[] = [
  { label: 'Mon', value: 71.2, subtext: '178 Beds' },
  { label: 'Tue', value: 74.4, subtext: '186 Beds' },
  { label: 'Wed', value: 77.2, subtext: '193 Beds' },
  { label: 'Thu', value: 75.6, subtext: '189 Beds' },
  { label: 'Fri', value: 79.6, subtext: '199 Beds' },
  { label: 'Sat', value: 80.8, subtext: '202 Beds' },
  { label: 'Today', value: 82.0, subtext: '205 Beds' },
];

export const HosflowMetricsSummary: React.FC<HosflowMetricsSummaryProps> = ({
  onNavigate,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [trendTimeframe, setTrendTimeframe] = useState<'12h' | '7d'>('12h');

  const occupancy = HOSPITAL_INFO.occupancyPercent;
  const occupiedBeds = HOSPITAL_INFO.occupiedBeds;
  const totalBeds = HOSPITAL_INFO.totalBeds;
  const vacantBeds = HOSPITAL_INFO.vacantBeds;
  const todayAdmits = HOSPITAL_INFO.todayAdmits;
  const expectedDischarges = HOSPITAL_INFO.todayDischarges;

  const activeAdmissionsData = trendTimeframe === '12h' ? ADMISSIONS_12H_DATA : ADMISSIONS_7D_DATA;
  const occupancyTrendData = trendTimeframe === '12h' ? OCCUPANCY_12H_DATA : OCCUPANCY_7D_DATA;

  return (
    <div className={`w-full mb-6 ${className}`}>
      <div className="bg-white rounded-3xl border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
        {/* Header Bar of the Summary Card */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#faf8f4] to-white border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#fcde6d]/30 text-[#756100] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-neutral-900 tracking-tight">
                  hosflow Clinical Intelligence
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fcde6d]/40 text-[#5a4800] uppercase tracking-wider">
                  Live Operations
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {HOSPITAL_INFO.name} • Central Pune Campus • Continuous Flow Synchronizer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Trend History Timeframe Switcher */}
            <div className="flex items-center bg-[#f0eee8] p-0.5 rounded-full text-[10px] font-bold border border-black/5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTrendTimeframe('12h');
                }}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  trendTimeframe === '12h'
                    ? 'bg-white text-neutral-900 shadow-2xs font-extrabold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="View 12-Hour Shift Flow Trend"
              >
                12H Shift Flow
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTrendTimeframe('7d');
                }}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  trendTimeframe === '7d'
                    ? 'bg-white text-neutral-900 shadow-2xs font-extrabold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="View 7-Day Historical Trend"
              >
                7-Day History
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Level 1 Code Normal • All 7 Wards Online
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1 text-xs font-semibold"
              title={isExpanded ? 'Collapse metric cards' : 'Expand metric cards'}
            >
              <span className="text-[11px] hidden md:inline">{isExpanded ? 'Compact' : 'Expand'}</span>
              <span className="material-symbols-outlined text-[18px]">
                {isExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Metrics Body */}
        {isExpanded && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Metric 1: Active Admissions (WITH SPARKLINE TREND CHART) */}
              <div
                onClick={() => onNavigate && onNavigate('ward_flow')}
                className={`p-4 rounded-2xl bg-gradient-to-br from-white to-[#faf8f4] border border-black/5 hover:border-[#fcde6d] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-neutral-400 group-hover:text-amber-600 transition-colors">
                        airline_seat_flat
                      </span>
                      Active Admissions
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">north_east</span>
                      +{todayAdmits} Today
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                      {occupiedBeds}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">/ {totalBeds} Total Beds</span>
                  </div>

                  {/* Sparkline Trend Chart: Active Admissions Flow History */}
                  <div className="mt-2.5 pt-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                    <FlowSparkline
                      data={activeAdmissionsData}
                      color="#d97706"
                      fillGradientId="sparkline-grad-admissions"
                      gradientStart="rgba(217, 119, 6, 0.28)"
                      gradientStop="rgba(217, 119, 6, 0.02)"
                      height={40}
                      unit=" beds"
                      badgeLabel={trendTimeframe === '12h' ? '12H Influx' : '7D Flow'}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-600 font-medium">198 Inpatient • 7 Daycare</span>
                  <span className="text-[#756100] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    View Inpatients <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Metric 2: Expected Discharges */}
              <div
                onClick={() => onNavigate && onNavigate('discharge_hub')}
                className={`p-4 rounded-2xl bg-gradient-to-br from-white to-[#faf8f4] border border-black/5 hover:border-[#fcde6d] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-neutral-400 group-hover:text-emerald-600 transition-colors">
                        output
                      </span>
                      Expected Discharges
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      9 Ready for Exit
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                      {expectedDischarges}
                    </span>
                    <span className="text-xs font-semibold text-neutral-500">Planned Today</span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900 flex flex-col gap-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Discharge Velocity</span>
                      <span className="text-emerald-700">1h 45m Avg</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>5 TPA Clearance</span>
                      <span>4 Clinical Sign-Off</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-600 font-medium">5 TPA Pending • 4 Doctor Sign</span>
                  <span className="text-[#756100] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Exit Hub <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Metric 3: Bed Occupancy % (WITH SPARKLINE TREND CHART) */}
              <div
                onClick={() => onNavigate && onNavigate('bed_matrix')}
                className={`p-4 rounded-2xl bg-gradient-to-br from-white to-[#faf8f4] border border-black/5 hover:border-[#fcde6d] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-neutral-400 group-hover:text-blue-600 transition-colors">
                        donut_large
                      </span>
                      Bed Occupancy %
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      occupancy > 90 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {occupancy > 90 ? 'High Acuity Load' : 'Optimal Capacity'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                      {occupancy}%
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">({vacantBeds} Vacant Bays)</span>
                  </div>

                  {/* Sparkline Trend Chart: Bed Occupancy % Flow History */}
                  <div className="mt-2.5 pt-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                    <FlowSparkline
                      data={occupancyTrendData}
                      color="#059669"
                      fillGradientId="sparkline-grad-occupancy"
                      gradientStart="rgba(5, 150, 105, 0.28)"
                      gradientStop="rgba(5, 150, 105, 0.02)"
                      height={40}
                      unit="%"
                      threshold={80}
                      thresholdLabel="80% Benchmark"
                      badgeLabel={trendTimeframe === '12h' ? '12H Census' : '7D Capacity'}
                    />
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        occupancy > 90 ? 'bg-red-500' : occupancy > 80 ? 'bg-[#9AAB63]' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-medium">ICU: 95% • Surg: 78% • ER: 90%</span>
                  <span className="text-[#756100] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Bed Matrix <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Metric 4: Turnover & Velocity Engine */}
              <div
                onClick={() => onNavigate && onNavigate('turnover_manager')}
                className={`p-4 rounded-2xl bg-gradient-to-br from-white to-[#faf8f4] border border-black/5 hover:border-[#fcde6d] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between hidden lg:flex`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-neutral-400 group-hover:text-purple-600 transition-colors">
                        speed
                      </span>
                      Discharge Velocity
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold">
                      -15m vs Target
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                      {HOSPITAL_INFO.avgDischargeVelocity}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">Target: {HOSPITAL_INFO.targetVelocity}</span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-950 flex flex-col gap-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Bed Sanitization</span>
                      <span className="text-purple-700">18.5m Turnover</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>14 Porters Active</span>
                      <span>8 Disinfections Pending</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-600 font-medium">14 Porters Active • 8 Cleaning</span>
                  <span className="text-[#756100] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Turnover Engine <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
