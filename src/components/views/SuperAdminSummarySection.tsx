import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { HospitalRecord, DoctorRecord, StaffRecord } from '../../services/hospitalManagementService';
import { downloadHospitalCSV } from '../../utils/csvExport';

interface SuperAdminSummarySectionProps {
  hospitals: HospitalRecord[];
  allDoctors: DoctorRecord[];
  allStaff: StaffRecord[];
  onTriggerToast: (msg: string) => void;
  onFilterStatus?: (status: 'all' | 'active' | 'deactivated') => void;
}

export const SuperAdminSummarySection: React.FC<SuperAdminSummarySectionProps> = ({
  hospitals,
  allDoctors,
  allStaff,
  onTriggerToast,
}) => {
  // Calculations
  const totalHospitals = hospitals.length;
  const activeHospitals = hospitals.filter((h) => h.isActive);
  const deactivatedHospitals = hospitals.filter((h) => !h.isActive);

  const totalCapacity = hospitals.reduce((acc, h) => acc + (h.totalBeds || 0), 0);
  const totalOccupied = hospitals.reduce((acc, h) => acc + (h.occupiedBeds || 0), 0);
  const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
  const systemAvgOccupancy = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Active clinical staff calculation
  const activeDoctors = allDoctors.filter(
    (d) => d.status === 'ACTIVE' || d.status === 'EMERGENCY_ON_CALL'
  );
  const activeStaff = allStaff.filter(
    (s) => s.status === 'ON_DUTY' || s.status === 'ON_CALL'
  );
  const totalActiveClinicalStaff = activeDoctors.length + activeStaff.length;

  // Chart Data 1: Hospital Bed Capacities & Status
  const hospitalCapacityData = hospitals.map((h) => ({
    name: h.name,
    code: h.code,
    totalBeds: h.totalBeds,
    occupiedBeds: h.occupiedBeds || 0,
    isActive: h.isActive,
    tier: h.tier === 'TIER_1_QUATERNARY' ? 'Tier 1' : h.tier === 'TIER_2_TERTIARY' ? 'Tier 2' : 'Secondary',
  }));

  // Chart Data 2: System-wide Bed Occupancy Donut
  const occupancyDonutData = [
    { name: 'Occupied Beds', value: totalOccupied, color: '#2563eb' },
    { name: 'Available Beds', value: totalAvailable, color: '#e2e8f0' },
  ];

  // Chart Data 3: Active Clinical Staff Breakdown per Hospital
  const staffBreakdownData = hospitals.map((h) => {
    const docs = allDoctors.filter(
      (d) => d.hospitalId === h.id && (d.status === 'ACTIVE' || d.status === 'EMERGENCY_ON_CALL')
    ).length;
    const stf = allStaff.filter(
      (s) => s.hospitalId === h.id && (s.status === 'ON_DUTY' || s.status === 'ON_CALL')
    ).length;
    return {
      code: h.code,
      name: h.name,
      doctors: docs,
      nursingStaff: stf,
      total: docs + stf,
    };
  });

  const handleExportCSV = () => {
    if (hospitals.length === 0) {
      onTriggerToast('No hospital records available to export.');
      return;
    }
    downloadHospitalCSV(hospitals);
    onTriggerToast(
      `Exported ${hospitals.length} registered hospital records as CSV for compliance audit.`
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-5">
      {/* Section Header with Audit Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Enterprise Network Key Indicators
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs font-mono text-neutral-500">Live Multi-Tenant Telemetry</span>
          </div>
          <h2 className="text-lg font-bold font-['Plus_Jakarta_Sans'] text-neutral-900 tracking-tight">
            Network Operations Summary &amp; Compliance Hub
          </h2>
        </div>

        {/* Audit Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-all hover:shadow cursor-pointer"
            title="Export all registered hospitals as CSV for offline reporting and compliance audits"
          >
            <span className="material-symbols-outlined text-[18px] text-[#fcde6d]">
              file_download
            </span>
            Export Registered Hospitals (CSV)
          </button>
        </div>
      </div>

      {/* 3 Prominent Recharts Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: Total Hospitals Managed */}
        <div className="bg-[#faf8f4] rounded-2xl p-5 border border-black/5 flex flex-col justify-between hover:border-black/10 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Total Hospitals Managed
              </span>
              <span className="p-1.5 rounded-lg bg-neutral-200/60 text-neutral-700">
                <span className="material-symbols-outlined text-[18px]">domain</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight font-['Plus_Jakarta_Sans']">
                {totalHospitals}
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                Facilities
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {activeHospitals.length} Active
              </span>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {deactivatedHospitals.length} Deactivated
              </span>
              <span className="text-neutral-300">·</span>
              <span className="font-mono text-neutral-500">{totalCapacity.toLocaleString()} Total Beds</span>
            </div>
          </div>

          {/* Recharts Visual 1: Bed Capacity Scale by Hospital */}
          <div className="mt-4 pt-3 border-t border-black/5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>Bed Capacity Distribution</span>
              <span className="font-mono text-[10px] text-emerald-700 font-bold">Teal: Active · Red: Deactivated</span>
            </div>
            <div className="h-[95px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalCapacityData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 9, fill: '#737373', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#141416] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-white/10">
                            <p className="font-bold text-[#fcde6d]">{data.name}</p>
                            <p className="text-[11px] text-neutral-300">
                              Code: <span className="font-mono font-semibold">{data.code}</span> ({data.tier})
                            </p>
                            <p className="text-[11px] text-neutral-300">
                              Total Beds: <span className="font-bold text-white">{data.totalBeds}</span>
                            </p>
                            <p className="text-[11px]">
                              Status:{' '}
                              <span className={data.isActive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {data.isActive ? 'Active Node' : 'Deactivated Node'}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalBeds" radius={[4, 4, 0, 0]}>
                    {hospitalCapacityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isActive ? '#0d9488' : '#e11d48'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* CARD 2: System-wide Average Bed Occupancy */}
        <div className="bg-[#faf8f4] rounded-2xl p-5 border border-black/5 flex flex-col justify-between hover:border-black/10 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                System-wide Average Bed Occupancy
              </span>
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                <span className="material-symbols-outlined text-[18px]">bed</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight font-['Plus_Jakarta_Sans']">
                {systemAvgOccupancy}%
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                Network Utilization
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <span className="font-semibold text-blue-700">
                {totalOccupied.toLocaleString()} Occupied
              </span>
              <span className="text-neutral-300">·</span>
              <span className="font-semibold text-neutral-600">
                {totalAvailable.toLocaleString()} Available
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-[11px] font-medium text-neutral-500">
                Target: 75%–85%
              </span>
            </div>
          </div>

          {/* Recharts Visual 2: Occupancy Gauge Donut + Sub-metrics */}
          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-3">
            <div className="w-[100px] h-[95px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        const pct = totalCapacity > 0 ? Math.round((Number(item.value) / totalCapacity) * 100) : 0;
                        return (
                          <div className="bg-[#141416] text-white p-2 rounded-xl text-xs shadow-lg border border-white/10">
                            <p className="font-bold">{item.name}</p>
                            <p className="text-[11px] text-neutral-300">
                              {Number(item.value).toLocaleString()} beds ({pct}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={occupancyDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={26}
                    outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {occupancyDonutData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Occupied
                </span>
                <span className="font-bold font-mono text-neutral-900">{systemAvgOccupancy}%</span>
              </div>
              <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, systemAvgOccupancy)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-neutral-500 leading-tight">
                {systemAvgOccupancy >= 85
                  ? 'High utilization across acute care units.'
                  : systemAvgOccupancy >= 65
                  ? 'Stable inpatient load across departments.'
                  : 'Sufficient surplus surge capacity.'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: Total Active Clinical Staff */}
        <div className="bg-[#faf8f4] rounded-2xl p-5 border border-black/5 flex flex-col justify-between hover:border-black/10 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Total Active Clinical Staff
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                <span className="material-symbols-outlined text-[18px]">medical_services</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight font-['Plus_Jakarta_Sans']">
                {totalActiveClinicalStaff}
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                Personnel On Duty
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
              <span className="font-semibold text-indigo-700">
                {activeDoctors.length} Active Doctors
              </span>
              <span className="text-neutral-300">·</span>
              <span className="font-semibold text-cyan-700">
                {activeStaff.length} On-Duty Staff
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-neutral-500 font-mono text-[11px]">
                {(totalActiveClinicalStaff / Math.max(1, totalHospitals)).toFixed(1)}/hosp
              </span>
            </div>
          </div>

          {/* Recharts Visual 3: Active Staff Breakdown per Hospital */}
          <div className="mt-4 pt-3 border-t border-black/5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>Active Clinicians by Hospital</span>
              <span className="font-mono text-[10px] text-indigo-700 font-bold">
                Indigo: Doctors · Cyan: Nurses/Techs
              </span>
            </div>
            <div className="h-[95px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffBreakdownData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="code"
                    tick={{ fontSize: 9, fill: '#737373', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#141416] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-white/10">
                            <p className="font-bold text-[#fcde6d]">{data.name}</p>
                            <p className="text-[11px] text-neutral-300">
                              Active Doctors: <span className="font-bold text-indigo-300">{data.doctors}</span>
                            </p>
                            <p className="text-[11px] text-neutral-300">
                              On-Duty Staff: <span className="font-bold text-cyan-300">{data.nursingStaff}</span>
                            </p>
                            <p className="text-[11px] text-white font-bold border-t border-white/10 pt-1 mt-1">
                              Total Active: {data.total}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="doctors" stackId="staff" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nursingStaff" stackId="staff" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
