import React, { useState } from 'react';
import { ViewType, BedItem } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { TriageIndicator } from '../common/TriageIndicator';
import { clinicalNotesService } from '../../services/clinicalNotesService';

interface DoctorFlowPipelineViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const DoctorFlowPipelineView: React.FC<DoctorFlowPipelineViewProps> = ({
  onNavigate,
  onTriggerToast
}) => {
  const [signedRx, setSignedRx] = useState(false);
  const [authorizedLab, setAuthorizedLab] = useState(false);
  const [bedM204Available, setBedM204Available] = useState(false);
  const [expeditedTpa, setExpeditedTpa] = useState(false);

  // Fetch live bed data for ward occupancy sidebar
  const { data: beds = [] } = useQuery<BedItem[]>({
    queryKey: ['beds'],
    queryFn: async () => {
      const res = await fetch('/api/beds');
      if (!res.ok) throw new Error('Failed to fetch beds');
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Aggregate beds into ward stats (mirrors MOCK_WARDS structure)
  const WARD_DEFS = [
    { id: 'med_a',     name: 'Medical Ward A',            floor: 'Floor 2',     capacity: 40 },
    { id: 'med_b',     name: 'Medical Ward B',            floor: 'Floor 2',     capacity: 40 },
    { id: 'surgical',  name: 'Surgical Ward',             floor: 'Floor 3',     capacity: 50 },
    { id: 'icu',       name: 'Intensive Care Unit (ICU)', floor: 'Floor 1',     capacity: 20 },
    { id: 'ccu',       name: 'Coronary Care (CCU)',        floor: 'Floor 1',     capacity: 20 },
    { id: 'pediatrics',name: 'Pediatrics / PICU',         floor: 'Floor 4',     capacity: 40 },
    { id: 'emergency', name: 'Emergency Room (ER)',        floor: 'Ground Floor', capacity: 40 },
  ];

  const computedWards = WARD_DEFS.map(def => {
    const wardBeds = beds.filter(b => b.wardCategory === def.id);
    const occupied = wardBeds.filter(b => b.status === 'occupied' || b.status === 'critical').length;
    const total = wardBeds.length > 0 ? wardBeds.length : def.capacity;
    const rate = Math.round((occupied / total) * 100);
    return { ...def, occupied, available: total - occupied, rate, alert: rate >= 90 };
  });

  return (
    <div className="flex flex-col w-full pb-10 space-y-6">
      {/* Top Greeting Headline */}
      <section className="flex flex-col">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1c18] tracking-tight leading-tight">
          Good morning, Dr. Ananya Rao
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Attending Gen Med • Shift Lead | CityCare Multispeciality Hospital • Pune, Maharashtra{' '}
          <span className="font-medium text-neutral-800">
            (250 Beds Capacity • 205 / 250 Occupied (82% Occupancy) • 24 Admits • 18 Discharges • 4 Critical Alerts Active)
          </span>
        </p>
      </section>

      {/* 4 Signature Pastel Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Bed Occupancy (Yellow Tone #fbe788) */}
        <div 
          onClick={() => onNavigate('bed_matrix')}
          className="relative overflow-hidden rounded-[24px] bg-[#fbe788] p-5 shadow-sm flex flex-col justify-between min-h-[175px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold tracking-wider text-amber-950 uppercase">BED OCCUPANCY</span>
            <div className="w-7 h-7 rounded-full bg-amber-900/10 flex items-center justify-center text-amber-950 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">single_bed</span>
            </div>
          </div>
          <div className="z-10 my-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold text-[#1a1915] leading-none">82%</span>
              <span className="text-[13px] text-amber-950/80 font-medium">(205 / 250)</span>
            </div>
            <p className="text-[12px] text-amber-950/90 font-medium mt-1">45 bays currently vacant</p>
          </div>
          <div className="flex items-center justify-between z-10 text-[12px] font-bold text-amber-950 pt-2 border-t border-amber-900/10">
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[11px]">+24 Admits • 18 Disch</span>
              <span className="text-[9px] font-normal text-amber-900/80">Flow trend (+8.4% 12h)</span>
            </div>
            <svg className="w-16 h-5 overflow-visible" viewBox="0 0 64 20" aria-label="Bed Occupancy Trend">
              <title>Bed Occupancy Trend</title>
              <path d="M2 16 Q 16 13, 28 11 T 46 8 T 60 4" fill="none" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="60" cy="4" r="3" fill="#451a03" />
            </svg>
          </div>
        </div>

        {/* Card 2: Discharge Velocity (Pink Tone #f9c7d4) */}
        <div 
          onClick={() => onNavigate('discharge_hub')}
          className="relative overflow-hidden rounded-[24px] bg-[#f9c7d4] p-5 shadow-sm flex flex-col justify-between min-h-[175px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold tracking-wider text-[#481c2b] uppercase">DISCHARGE VELOCITY</span>
            <div className="w-7 h-7 rounded-full bg-pink-950/10 flex items-center justify-center text-[#481c2b] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">timelapse</span>
            </div>
          </div>
          <div className="z-10 my-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col leading-none">
                <span className="text-[28px] font-bold text-[#231219] leading-none">2h 15m</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-pink-950/15 text-[#3e1724] text-[11px] font-bold flex flex-col items-center leading-tight">
                <span>-18m</span>
                <span className="text-[9px]">avg</span>
              </div>
            </div>
            <p className="text-[12px] text-[#4a2331] font-medium mt-1">Benchmark target: ≤ 2h 30m</p>
          </div>
          <div className="flex items-center justify-between z-10 text-[12px] text-[#481c2b] font-medium pt-2 border-t border-pink-950/10">
            <span className="text-[11px] font-semibold">Trend (Last 6h)</span>
            <svg className="w-16 h-5 overflow-visible" viewBox="0 0 64 20">
              <path d="M2 14 Q 15 16, 25 13 T 45 10 T 60 4" fill="none" stroke="#2a161f" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="60" cy="4" r="3" fill="#2a161f" />
            </svg>
          </div>
        </div>

        {/* Card 3: Turnover & Hygiene (Sage Green #c3dac0) */}
        <div 
          onClick={() => onNavigate('housekeeping')}
          className="relative overflow-hidden rounded-[24px] bg-[#c3dac0] p-5 shadow-sm flex flex-col justify-between min-h-[175px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold tracking-wider text-[#213420] uppercase">TURNOVER & HYGIENE</span>
            <div className="w-7 h-7 rounded-full bg-green-950/10 flex items-center justify-center text-[#213420] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">sanitizer</span>
            </div>
          </div>
          <div className="z-10 my-1">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[30px] font-bold text-[#111e10] leading-none">6</span>
                <span className="text-[18px] font-bold text-[#182a17] leading-tight">Cleaning</span>
              </div>
              <span className="text-[12px] text-[#294227] font-semibold">/ 8 in queue</span>
            </div>
            <p className="text-[12px] text-[#273d25] font-medium mt-1">12 Bays sterilized & ready</p>
          </div>
          <div className="flex items-center justify-between z-10 text-[12px] text-[#1c2e1b] pt-2 border-t border-green-950/10">
            <span>Speed: <strong className="font-bold">22 min/bed</strong></span>
            <span className="px-2 py-0.5 rounded-full bg-[#182817] text-white font-bold text-[10px] tracking-wide">Fast Pace</span>
          </div>
        </div>

        {/* Card 4: Critical Attention (Blue/Red Alert #b9d9f9) */}
        <div 
          onClick={() => onNavigate('clinical_rounds')}
          className="relative overflow-hidden rounded-[24px] bg-[#b9d9f9] p-5 shadow-sm flex flex-col justify-between min-h-[175px] cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold tracking-wider text-[#102742] uppercase">CRITICAL ATTENTION</span>
            <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-[#ba1a1a] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">warning</span>
            </div>
          </div>
          <div className="z-10 my-1">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[30px] font-bold text-[#0c1f36] leading-none">4</span>
                <span className="text-[18px] font-bold text-[#0e2540] leading-tight">Patients</span>
              </div>
              <span className="px-2 py-1 rounded-full bg-[#b3261e] text-white font-bold text-[10px] tracking-wide shadow-sm flex items-center justify-center leading-none text-center">Action req.</span>
            </div>
            <p className="text-[12px] text-[#1a3759] font-medium mt-1">ICU Ward Load at 95% capacity</p>
          </div>
          <div className="flex items-center justify-between z-10 text-[12px] text-[#122c4d] font-semibold pt-2 border-t border-blue-950/10">
            <span className="truncate">SpO2 dips (2) • Urgent Rx...</span>
            <span className="material-symbols-outlined text-[16px] shrink-0">arrow_forward</span>
          </div>
        </div>
      </section>

      {/* Asymmetric Split Layout: Left 3-cols Ward Breakdown Rail + Right 9-cols Sequential Acuity Kanban */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 3 Cols: 7-Ward Occupancy Progress List */}
        <aside className="xl:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-neutral-800">domain</span>
                <h3 className="text-sm font-bold text-neutral-900">Ward Occupancy Breakdown</h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">7 Wards</span>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {(computedWards.length > 0 ? computedWards : WARD_DEFS.map(d => ({ ...d, occupied: 0, available: d.capacity, rate: 0, alert: false }))).map((ward) => (
                <div 
                  key={ward.id}
                  className={`flex flex-col gap-1 p-1.5 rounded-xl transition-colors cursor-pointer ${
                    ward.alert ? 'bg-red-50 border border-red-200' : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => onNavigate('bed_matrix')}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold flex items-center gap-1 ${ward.alert ? 'text-red-700 font-bold' : 'text-neutral-800'}`}>
                      {ward.alert && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>}
                      {ward.name} ({ward.occupied}/{ward.capacity})
                    </span>
                    <span className={`font-bold ${ward.alert ? 'text-red-700' : 'text-neutral-900'}`}>{ward.rate}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${ward.alert ? 'bg-red-200' : 'bg-neutral-100'}`}>
                    <div 
                      className={`h-full rounded-full transition-all ${ward.alert ? 'bg-red-600' : 'bg-black'}`}
                      style={{ width: `${ward.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('bed_matrix')}
              className="mt-2 w-full py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors flex items-center justify-center gap-1"
            >
              <span>Explore Full Bay Matrix</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </aside>

        {/* Right 9 Cols: Stage Pipeline 3-Column Acuity Kanban Grid */}
        <main className="xl:col-span-9 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* COLUMN 1: CRITICAL & HIGH ACUITY */}
            <section className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F5B8DB]/40 border border-rose-300/40 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                  <h2 className="text-xs font-bold text-red-700 uppercase tracking-wider">CRITICAL & HIGH ACUITY</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">2 Cases</span>
              </div>

              {/* Critical Alert Card: Rohan Patel */}
              <div className="bg-[#FFEBEB] rounded-[24px] p-4 border border-red-200 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TriageIndicator level="emergent" size="xs" />
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> STAT Emergency
                      </span>
                    </div>
                    <span className="text-[11px] text-red-700 font-mono font-bold">UHID: HOS-2026-1003</span>
                  </div>
                  <div className="mt-1">
                    <h3 className="text-sm font-bold text-red-900 leading-snug">
                      Rohan Patel 65M ARDS / Sepsis Risk Bed ICU-03
                    </h3>
                    <p className="text-xs text-red-800 font-semibold mt-1">
                      SpO2 91% (Decreasing) Pulse Rate: 118 bpm • UHID: HOS-2026-1003
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-red-200">
                  <button 
                    onClick={() => {
                      onNavigate('clinical_rounds');
                      onTriggerToast('Opening Rohan Patel Critical Chart in ICU...');
                    }}
                    className="py-2 px-2 rounded-full bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">emergency</span>
                    <span>Review</span>
                  </button>
                  <button 
                    onClick={() => {
                      clinicalNotesService.openNotesPanel({
                        id: 'P-1003',
                        uhid: 'HOS-2026-1003',
                        name: 'Rohan Patel',
                        age: 65,
                        gender: 'Male',
                        ward: 'Intensive Care Unit (ICU)',
                        bedId: 'ICU-03',
                        diagnosis: 'ARDS / Sepsis Risk (Post-Cardiac Arrest)',
                        attendingDoctor: 'Dr. Ananya Rao & Dr. Mehra',
                        acuity: 'critical',
                        vitals: { bp: '142/96', pulse: 118, temp: 101.8, spO2: 91, respRate: 28, painScore: 7 },
                      });
                      onTriggerToast('Opened Clinical Notes for Rohan Patel (ICU-03).');
                    }}
                    className="py-2 px-2 rounded-full bg-[#141416] text-[#fcde6d] text-[11px] font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">clinical_notes</span>
                    <span>Notes</span>
                  </button>
                  <button 
                    onClick={() => {
                      onNavigate('clinical_rounds');
                      onTriggerToast('Opening Pathology & ABG Lab slip...');
                    }}
                    className="py-2 px-2 rounded-full bg-white text-red-700 border border-red-300 text-[11px] font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">biotechnology</span>
                    <span>Labs</span>
                  </button>
                </div>
              </div>

              {/* Attending Doctor Sign-Offs Due Card */}
              <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-neutral-800">draw</span>
                    <h3 className="text-sm font-bold text-neutral-900">Attending Doctor Sign-Offs</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5D867] text-[#221b00] font-bold">
                    {(!signedRx || !authorizedLab) ? '2 Due' : 'All Signed'}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Item 1: Priya Sharma Rx */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 leading-snug">
                      Priya Sharma (S-202) Take-Home Rx Scripts awaiting countersign - Sign Rx
                    </span>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-500">Surgical Ward Discharge</span>
                      <button 
                        onClick={() => {
                          setSignedRx(true);
                          onTriggerToast('Priya Sharma Take-Home Rx digitally countersigned by Dr. Ananya Rao!');
                        }}
                        disabled={signedRx}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                          signedRx ? 'bg-emerald-100 text-emerald-800' : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{signedRx ? 'check' : 'edit_document'}</span>
                        {signedRx ? 'Signed' : 'Sign Rx'}
                      </button>
                    </div>
                  </div>

                  {/* Item 2: Rohan Patel Lab Authorization */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 leading-snug">
                      Rohan Patel (ICU-03) Stat ABG & Sepsis lab order verification - Authorize
                    </span>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-red-600 font-semibold">ICU Priority Order</span>
                      <button 
                        onClick={() => {
                          setAuthorizedLab(true);
                          onTriggerToast('Stat ABG & Sepsis lab order verified & dispatched to Central Lab!');
                        }}
                        disabled={authorizedLab}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                          authorizedLab ? 'bg-emerald-100 text-emerald-800' : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{authorizedLab ? 'check' : 'check_circle'}</span>
                        {authorizedLab ? 'Authorized' : 'Authorize'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* COLUMN 2: DISCHARGE & CLEARANCE HOLDS */}
            <section className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F5D867]/40 border border-amber-300/40 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider">DISCHARGE & CLEARANCE HOLDS</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5D867] text-[#221b00] font-bold">2 Pending</span>
              </div>

              {/* Discharge Hold: Priya Sharma */}
              <div className="bg-amber-50/70 rounded-[24px] p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TriageIndicator level="urgent" size="xs" />
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span> 
                        {expeditedTpa ? 'TPA Fast-Tracked' : 'TPA Dispute Hold 35m elapsed'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">Surgical Bay</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    Priya Sharma 38F Post-Laparoscopy Bed S-202
                  </h3>
                  <div className="mt-1 p-2 rounded-xl bg-white/90 border border-amber-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-medium text-amber-950">
                      <span>Clearance: {expeditedTpa ? '4/4 Complete' : '3/4 Complete (Billing Pending Desk)'}</span>
                      <span className="font-bold">{expeditedTpa ? '100%' : '75%'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${expeditedTpa ? 'bg-emerald-600' : 'bg-amber-600'}`} 
                        style={{ width: expeditedTpa ? '100%' : '75%' }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200">
                  <button 
                    onClick={() => {
                      setExpeditedTpa(true);
                      onTriggerToast('ICICI Lombard TPA consumable dispute expedited to Medical Superintendent!');
                    }}
                    className="py-2 px-2 rounded-full bg-[#F5D867] text-[#221b00] text-[11px] font-bold hover:brightness-95 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    <span>{expeditedTpa ? 'Expedited' : 'Expedite'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      clinicalNotesService.openNotesPanel({
                        id: 'P-1002',
                        uhid: 'HOS-2026-1002',
                        name: 'Priya Sharma',
                        age: 38,
                        gender: 'Female',
                        ward: 'Surgical Ward',
                        bedId: 'S-202',
                        diagnosis: 'Post-Laparoscopic Cholecystectomy (Day 1)',
                        attendingDoctor: 'Dr. Rajesh Patel',
                        acuity: 'moderate',
                        vitals: { bp: '124/82', pulse: 78, temp: 98.4, spO2: 98, respRate: 16, painScore: 6 },
                      });
                      onTriggerToast('Opened Clinical Notes for Priya Sharma (S-202).');
                    }}
                    className="py-2 px-2 rounded-full bg-[#141416] text-[#fcde6d] text-[11px] font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">clinical_notes</span>
                    <span>Notes</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('discharge_hub')}
                    className="py-2 px-2 rounded-full bg-white text-neutral-800 border border-black/10 text-[11px] font-semibold hover:bg-neutral-50 transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">description</span>
                    <span>Summary</span>
                  </button>
                </div>
              </div>

              {/* Stable Inpatients: Aarav Mehta */}
              <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TriageIndicator level="non_urgent" size="xs" />
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#B6CAEB]/40 text-blue-900 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">event_available</span> Scheduled 4:00 PM Checkout
                      </span>
                    </div>
                    <span className="text-[11px] text-[#2e7d32] font-bold">Stable</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    Aarav Mehta 54M Med Ward A • Bed M-104
                  </h3>
                  <p className="text-xs text-neutral-600 font-medium">
                    Attending: Dr. Ananya Rao BP 120/80 • SpO2 98%
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      clinicalNotesService.openNotesPanel({
                        id: 'P-1001',
                        uhid: 'HOS-2026-1001',
                        name: 'Aarav Mehta',
                        age: 54,
                        gender: 'Male',
                        ward: 'Medical Ward A',
                        bedId: 'Bed M-104',
                        diagnosis: 'Acute Gastritis & Dehydration (Post-Op Observation)',
                        attendingDoctor: 'Dr. Ananya Rao',
                        acuity: 'low',
                        vitals: { bp: '120/80', pulse: 76, temp: 98.6, spO2: 98, respRate: 18, painScore: 2 },
                      });
                      onTriggerToast('Opened Clinical Notes for Aarav Mehta (Bed M-104).');
                    }}
                    className="py-2 px-3 rounded-full bg-[#fcde6d] text-[#221b00] text-xs font-bold hover:bg-[#ebd061] transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">clinical_notes</span>
                    <span>Notes</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('clinical_rounds')}
                    className="py-2 px-3 rounded-full bg-black text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>View Chart</span>
                    <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>

            {/* COLUMN 3: BED TURNOVER & READY STREAM */}
            <section className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#9AAB63]/25 border border-[#9AAB63]/40 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9AAB63]"></span>
                  <h2 className="text-xs font-bold text-[#354316] uppercase tracking-wider">BED TURNOVER & READY STREAM</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#9AAB63] text-white font-bold">12 Ready</span>
              </div>

              {/* Bed M-204 Sanitized & Ready Card */}
              <div className="bg-[#E8F5E9] rounded-[24px] p-4 border border-[#9AAB63]/40 shadow-sm flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2E7D32] text-white font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span> Sanitized & Ready
                    </span>
                    <span className="text-[11px] text-neutral-600 font-semibold">Central Wing</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                    Bed M-204 (Med Ward B) Sanitized & Ready
                  </h3>
                  <div className="mt-1 p-2 rounded-xl bg-white/80 border border-[#9AAB63]/20 flex flex-col gap-1 text-[11px] font-medium text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span>Discharged 2:15 PM</span>
                      <span>Cleaning Started 2:25 PM</span>
                    </div>
                    <div className="flex items-center justify-between text-[#2E7D32] font-semibold pt-1 border-t border-neutral-100">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">done_all</span> Finished (Terminal UV) 2:40 PM
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setBedM204Available(true);
                    onTriggerToast('Bed M-204 released for instant admission intake!');
                  }}
                  className={`w-full py-2.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm mt-1 ${
                    bedM204Available ? 'bg-emerald-700 text-white' : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{bedM204Available ? 'Bed Available in Admission Mesh' : 'Mark Available for Admission'}</span>
                </button>
              </div>

              {/* Housekeeping Queue Card */}
              <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-neutral-800">cleaning_services</span>
                    <h3 className="text-sm font-bold text-neutral-900">Housekeeping Queue</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold">
                    6 Cleaning • 12 Ready
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Bed S-201 */}
                  <div 
                    onClick={() => onNavigate('housekeeping')}
                    className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1.5 cursor-pointer hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">Bed S-201 Surgical Bay</span>
                      <span className="text-[11px] text-amber-700 font-semibold">Est. 8 mins left</span>
                    </div>
                    <span className="text-[11px] text-neutral-500">Sanitizing Staff: Ramesh K.</span>
                    <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-[#fcde6d] rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>

                  {/* Bed ICU-02 */}
                  <div 
                    onClick={() => onNavigate('housekeeping')}
                    className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex flex-col gap-1 cursor-pointer hover:bg-red-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-700">Bed ICU-02 ICU Wing</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-200 text-red-900 text-[10px] font-bold">Priority Step</span>
                    </div>
                    <p className="text-[11px] text-red-800 leading-snug">
                      Pending UV Terminal Protocol • Critical Ward Reset
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
