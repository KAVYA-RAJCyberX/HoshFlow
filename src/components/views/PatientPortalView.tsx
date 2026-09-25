import React, { useState } from 'react';
import { ViewType } from '../../types';

interface PatientPortalViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({ onNavigate, onTriggerToast }) => {
  const [nurseAlerted, setNurseAlerted] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(3); // Step 3 in progress

  const handleRingNurse = () => {
    setNurseAlerted(true);
    onTriggerToast('Nurse station notified! Sister Nirmala has received your bay call.');
  };

  const handleDownloadSummary = () => {
    onTriggerToast('Discharge Summary (PDF, 1.4 MB) downloaded to your device.');
  };

  const handleDownloadItemizedBill = () => {
    onTriggerToast('Itemized Final Inpatient Bill (PDF) downloaded.');
  };

  const handleSavePassToPhone = () => {
    onTriggerToast('Digital Gate Pass GP-2024-PUNE-0491 saved to phone wallet.');
  };

  const handleAddToCalendar = () => {
    onTriggerToast('Follow-up visit with Dr. Vikram Kulkarni added to your device calendar.');
  };

  const handleRequestPorter = () => {
    onTriggerToast('Porter wheelchair requested for Bay 204. ETA: 8 minutes.');
  };

  const handleLuggageEscort = () => {
    onTriggerToast('Luggage bell desk booked to Bay 204 for transfer.');
  };

  return (
    <div className="flex flex-col w-full pb-12 font-['Inter',sans-serif]">
      <div className="space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Top Greeting & Real-time Acuity Bar */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-black/5 p-6 sm:p-8">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[#fcde6d]/20 blur-3xl pointer-events-none"></div>
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0eee8] text-neutral-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#ffe16f] animate-ping"></span>
                <span className="font-mono">IPD Patient ID #49281</span>
                <span className="text-neutral-400">•</span>
                <span className="font-bold text-neutral-900">Bay 204 (Surgical Recovery Wing)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1c1c18] font-['Plus_Jakarta_Sans'] tracking-tight">
                Namaste, Harish Mehta &amp; Family
              </h1>
              <p className="text-sm text-neutral-600 max-w-2xl">
                UHID: <span className="font-bold text-neutral-900 font-mono">UH-9402</span> (61M) • Attendant:{' '}
                <span className="font-bold text-neutral-900">Rakesh Mehta (Son)</span> • Primary Physician:{' '}
                <span className="font-bold text-neutral-900">Dr. Vikram Kulkarni</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('patient_self_checkin')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                <span>Self-Check-in Pass</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#fcde6d]/30 text-[#756100] border border-[#fcde6d]/50">
                <span className="material-symbols-outlined text-[24px]">schedule</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Estimated Exit</span>
                  <span className="text-base font-bold font-['Plus_Jakarta_Sans']">
                    11:30 AM IST <span className="text-xs font-normal opacity-80">(~45 min)</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRingNurse}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 ${
                  nurseAlerted
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#141416] hover:bg-neutral-800 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {nurseAlerted ? 'check_circle' : 'notifications_active'}
                </span>
                <span>{nurseAlerted ? 'Sister Nirmala Notified' : 'Ring Nurse Station'}</span>
              </button>
            </div>
          </div>

          {/* Live 5-Step Discharge Tracker */}
          <div className="mt-6 pt-4 bg-[#f6f3ed]/70 rounded-2xl p-4 sm:p-5 border border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1c1c18]">Live Discharge Journey</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#e5e2dc] text-neutral-800 text-[11px] font-bold">
                  Phase 4 of 5
                </span>
              </div>
              <span className="text-xs font-bold text-[#705d00] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">bolt</span>
                Fast-Track Discharge Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
              {/* Step 1 */}
              <div className="bg-white p-3 rounded-xl shadow-xs border border-black/5 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#fcde6d] text-[#221b00] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Step 1 • Completed</span>
                  <span className="text-xs font-bold text-[#1c1c18] truncate">Medical Clearance</span>
                  <span className="text-[11px] text-neutral-500 truncate">Dr. Kulkarni (08:30 AM)</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-3 rounded-xl shadow-xs border border-black/5 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#fcde6d] text-[#221b00] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Step 2 • Completed</span>
                  <span className="text-xs font-bold text-[#1c1c18] truncate">Pharmacy Take-Home</span>
                  <span className="text-[11px] text-neutral-500 truncate">5 Meds Reconciled</span>
                </div>
              </div>

              {/* Step 3 (Active) */}
              <div className="bg-white p-3 rounded-xl shadow-md ring-2 ring-[#141416] flex items-start gap-2.5 relative overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-[#141416] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[#141416] uppercase">Step 3 • In Progress</span>
                  <span className="text-xs font-bold text-[#1c1c18] truncate">Nurse Exit Check</span>
                  <span className="text-[11px] text-neutral-500 truncate">Sister Nirmala en route</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-3 rounded-xl shadow-xs border border-black/5 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#f0eee8] text-neutral-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Step 4 • Cleared</span>
                  <span className="text-xs font-bold text-[#1c1c18] truncate">Insurance / TPA</span>
                  <span className="text-[11px] text-neutral-500 truncate">Star Health Pre-Auth Done</span>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-white/80 p-3 rounded-xl flex items-start gap-2.5 border border-black/5 opacity-80">
                <div className="w-7 h-7 rounded-full bg-[#ebe8e2] text-neutral-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">qr_code</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Step 5 • Ready</span>
                  <span className="text-xs font-bold text-[#1c1c18] truncate">Security Gate Pass</span>
                  <span className="text-[11px] text-neutral-500 truncate">Awaiting Step 3 exit scan</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Characteristic Pastel Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Warm Amber / Yellow */}
          <div className="bg-[#FFFBEB] rounded-2xl p-5 shadow-sm border border-[#FDE68A]/60 relative overflow-hidden flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">Stay Duration &amp; Care</span>
              <span className="material-symbols-outlined text-[#B45309] text-[20px]">hotel</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-3xl font-extrabold text-[#78350F] font-['Plus_Jakarta_Sans'] tracking-tight">3N / 4D</div>
              <p className="text-xs text-[#92400E] leading-snug">
                Admitted May 12 • Lap Cholecystectomy • Recovery Grade A+
              </p>
            </div>
            <div className="w-full bg-[#FDE68A] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#D97706] h-full w-full"></div>
            </div>
          </div>

          {/* Card 2: Soft Rose / Pink */}
          <div className="bg-[#FDF2F8] rounded-2xl p-5 shadow-sm border border-[#FBCFE8]/60 relative overflow-hidden flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9D174D]">Discharge Velocity</span>
              <span className="material-symbols-outlined text-[#BE185D] text-[20px]">bolt</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#831843] font-['Plus_Jakarta_Sans'] tracking-tight">80%</span>
                <span className="text-xs font-bold text-[#9D174D]">Ready to Roll</span>
              </div>
              <p className="text-xs text-[#9D174D] leading-snug">
                4 of 5 hospital gates cleared • 18m faster than average
              </p>
            </div>
            {/* Embedded Mini Sparkline Chart */}
            <div className="h-6 w-full flex items-end gap-1">
              <div className="h-2 w-full bg-[#FBCFE8] rounded-t"></div>
              <div className="h-3 w-full bg-[#FBCFE8] rounded-t"></div>
              <div className="h-4 w-full bg-[#F472B6] rounded-t"></div>
              <div className="h-5 w-full bg-[#EC4899] rounded-t"></div>
              <div className="h-6 w-full bg-[#BE185D] rounded-t"></div>
            </div>
          </div>

          {/* Card 3: Fresh Sage Green */}
          <div className="bg-[#ECFDF5] rounded-2xl p-5 shadow-sm border border-[#A7F3D0]/60 relative overflow-hidden flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#065F46]">Discharge Meds &amp; Diet</span>
              <span className="material-symbols-outlined text-[#047857] text-[20px]">medication</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-3xl font-extrabold text-[#064E3B] font-['Plus_Jakarta_Sans'] tracking-tight">5 Prescriptions</div>
              <p className="text-xs text-[#065F46] leading-snug">
                Bilingual pouch verified • Low-sodium soft diet advisory
              </p>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#047857]">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Pharmacist explained to Rakesh</span>
            </div>
          </div>

          {/* Card 4: Soft Sky Blue */}
          <div className="bg-[#EFF6FF] rounded-2xl p-5 shadow-sm border border-[#BFDBFE]/60 relative overflow-hidden flex flex-col justify-between h-44">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF]">Inpatient Settlement</span>
              <span className="material-symbols-outlined text-[#2563EB] text-[20px]">account_balance_wallet</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-3xl font-extrabold text-[#1E3A8A] font-['Plus_Jakarta_Sans'] tracking-tight">₹0 Due</div>
              <p className="text-xs text-[#1E40AF] leading-snug">
                Cashless approved ₹1,42,000 • Attendant co-pay paid via UPI
              </p>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB]">
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              <span>Zero financial hold on gate</span>
            </div>
          </div>
        </div>

        {/* Main Content Workspace (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Patient Journey & Care Team (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Care Team Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-[#1c1c18] font-['Plus_Jakarta_Sans']">Bedside Care Team</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f0eee8] text-neutral-700 text-[11px] font-semibold">
                  Shift 02 Active
                </span>
              </div>
              <div className="space-y-2.5">
                {/* Doctor 1 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#faf8f4] border border-black/5">
                  <div className="w-10 h-10 rounded-full bg-[#141416] text-white flex items-center justify-center font-bold text-sm">
                    VK
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-[#1c1c18] block truncate">Dr. Vikram Kulkarni</span>
                    <span className="text-[11px] text-neutral-500 block truncate">Chief Surgical Gastroenterologist</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[#705d00]">verified</span>
                </div>
                {/* Doctor 2 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#faf8f4] border border-black/5">
                  <div className="w-10 h-10 rounded-full bg-[#e5e2dc] text-neutral-800 flex items-center justify-center font-bold text-sm">
                    AR
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-[#1c1c18] block truncate">Dr. Ananya Rao</span>
                    <span className="text-[11px] text-neutral-500 block truncate">Duty Registrar / RMO (Central Wing)</span>
                  </div>
                </div>
                {/* Floor Nurse */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#faf8f4] border border-black/5">
                  <div className="w-10 h-10 rounded-full bg-[#fcde6d] text-[#221b00] flex items-center justify-center font-bold text-sm">
                    SN
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-[#1c1c18] block truncate">Sister Nirmala</span>
                    <span className="text-[11px] text-neutral-500 block truncate">Senior Floor Nurse (Bay 201-208)</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#705d00] animate-pulse" title="At bedside"></span>
                </div>
              </div>

              {/* Quick Assistance Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRequestPorter}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] transition-colors text-xs font-bold text-[#1c1c18]"
                >
                  <span className="material-symbols-outlined text-[16px]">accessible</span>
                  <span>Wheelchair Porter</span>
                </button>
                <button
                  type="button"
                  onClick={handleLuggageEscort}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] transition-colors text-xs font-bold text-[#1c1c18]"
                >
                  <span className="material-symbols-outlined text-[16px]">luggage</span>
                  <span>Luggage Escort</span>
                </button>
              </div>
            </div>

            {/* 4-Day Hospitalization Journey */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-[#1c1c18] font-['Plus_Jakarta_Sans']">Hospitalization Log</h2>
                <span className="text-xs text-neutral-500 font-medium">May 12 - 15</span>
              </div>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5e2dc]">
                {/* Day 1 */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#e5e2dc] border-2 border-white"></div>
                  <span className="text-[11px] font-bold text-neutral-500 block">Day 1 • May 12</span>
                  <span className="text-xs font-bold text-[#1c1c18] block">Intake &amp; Ultrasound Diagnostics</span>
                  <p className="text-xs text-neutral-600 mt-0.5">Acute cholecystitis managed. Pre-op cardiac clearance received.</p>
                </div>
                {/* Day 2 */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#e5e2dc] border-2 border-white"></div>
                  <span className="text-[11px] font-bold text-neutral-500 block">Day 2 • May 13</span>
                  <span className="text-xs font-bold text-[#1c1c18] block">Laparoscopic Surgery</span>
                  <p className="text-xs text-neutral-600 mt-0.5">Uneventful gallbladder removal (45 mins). Shifted to HDU recovery.</p>
                </div>
                {/* Day 3 */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#e5e2dc] border-2 border-white"></div>
                  <span className="text-[11px] font-bold text-neutral-500 block">Day 3 • May 14</span>
                  <span className="text-xs font-bold text-[#1c1c18] block">Recovery &amp; Mobilization</span>
                  <p className="text-xs text-neutral-600 mt-0.5">Tolerated oral soft diet. Independent ambulation inside bay corridor.</p>
                </div>
                {/* Day 4 Today */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#705d00] border-2 border-white animate-pulse"></div>
                  <span className="text-[11px] font-bold text-[#705d00] block">Today • Day 4 (May 15)</span>
                  <span className="text-xs font-bold text-[#1c1c18] block">Discharge Orders Issued</span>
                  <p className="text-xs text-neutral-600 mt-0.5">Morning vitals: BP 120/80 • SpO2 98% • Pulse 74 bpm • Surgical site clean.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Discharge Clearance Detail Checklist (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-[#1c1c18] font-['Plus_Jakarta_Sans']">Live Clearance Hub</h2>
                  <p className="text-xs text-neutral-500">Clearances required before exit pass validation</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#fcde6d] text-[#221b00] text-xs font-bold">
                  Step 3 Pending
                </span>
              </div>

              {/* Clearance Checklist Items */}
              <div className="space-y-3">
                {/* Item 1: Summary */}
                <div className="p-4 rounded-xl bg-[#faf8f4] border border-black/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#705d00]">check_circle</span>
                      <span className="text-xs font-bold text-[#1c1c18]">Doctor Discharge Summary</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#f0eee8] text-neutral-700 text-[10px] font-bold uppercase">
                      Approved
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    Dr. Vikram Kulkarni finalized clinical discharge. Includes suture removal instructions for May 22 and emergency red flags.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSummary}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141416] bg-white px-3 py-1.5 rounded-full shadow-xs border border-black/5 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Discharge Summary (PDF, 1.4 MB)</span>
                    </button>
                  </div>
                </div>

                {/* Item 2: Pharmacy */}
                <div className="p-4 rounded-xl bg-[#faf8f4] border border-black/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#705d00]">check_circle</span>
                      <span className="text-xs font-bold text-[#1c1c18]">Pharmacy Take-Home Med-Kit</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#f0eee8] text-neutral-700 text-[10px] font-bold uppercase">
                      Dispensed
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    5 items sealed in thermal blister pack with dosage timetable:
                  </p>
                  <div className="bg-white p-2.5 rounded-lg space-y-1 text-xs border border-neutral-100">
                    <div className="flex justify-between"><span className="font-semibold">Tab. Cefuroxime 500mg</span><span className="text-neutral-500">1 tab twice daily • 5 days</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Tab. Pantoprazole 40mg</span><span className="text-neutral-500">1 tab before breakfast • 7 days</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Tab. Paracetamol 650mg</span><span className="text-neutral-500">SOS for pain/mild fever</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Syp. Lactulose 15ml</span><span className="text-neutral-500">Night time as needed</span></div>
                  </div>
                </div>

                {/* Item 3: Nursing (In progress) */}
                <div className="p-4 rounded-xl bg-[#fcde6d]/20 ring-1 ring-[#705d00]/30 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#705d00] animate-pulse">hourglass_top</span>
                      <span className="text-xs font-bold text-[#1c1c18]">Nursing Bay Inspection &amp; Cannula Exit</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#fcde6d] text-[#221b00] text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-800">
                    Sister Nirmala is removing the IV cannula, inspecting laparoscopy dressings, and registering the discharge vitals.
                  </p>
                  <div className="flex items-center gap-1.5 text-neutral-600 text-xs">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>Location: Bay 204 • Expected completion: 11:15 AM</span>
                  </div>
                </div>

                {/* Item 4: Insurance TPA Breakdown */}
                <div className="p-4 rounded-xl bg-[#faf8f4] border border-black/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[20px] text-[#705d00]">verified_user</span>
                      <span className="text-xs font-bold text-[#1c1c18]">TPA Cashless Settlement</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#f0eee8] text-neutral-700 text-[10px] font-bold uppercase">
                      Approved
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg space-y-1.5 text-xs border border-neutral-100">
                    <div className="flex justify-between text-neutral-500">
                      <span>Star Health Policy: #SH-882190</span>
                      <span className="font-semibold text-neutral-800">Pre-Auth Ref: #PUN-982</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Inpatient Bill</span>
                      <span className="font-bold">₹1,45,200</span>
                    </div>
                    <div className="flex justify-between text-[#705d00]">
                      <span>Insurance Cashless Authorized</span>
                      <span className="font-bold">- ₹1,42,000</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Non-Medical Co-Pay (Admission Kit &amp; Gloves)</span>
                      <span className="font-semibold text-neutral-900">₹3,200</span>
                    </div>
                    <div className="pt-1.5 border-t border-neutral-200 flex justify-between text-sm font-bold">
                      <span>Balance Due at Gate</span>
                      <span className="text-emerald-700">₹0.00 (PAID)</span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">Receipt #RCP-2024-819 via PhonePe UPI</span>
                    <button
                      type="button"
                      onClick={handleDownloadItemizedBill}
                      className="text-xs font-bold text-[#141416] underline hover:text-black"
                    >
                      Itemized Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dietary & Physical Home Care Guidelines */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#705d00]">health_and_safety</span>
                <h3 className="font-bold text-sm text-[#1c1c18] font-['Plus_Jakarta_Sans']">Diet &amp; Post-Op Mobility Plan</h3>
              </div>
              <p className="text-xs text-neutral-600">Guidance for the next 7 days at home:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#faf8f4] rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-[#705d00] uppercase block">DIET RESTRICTIONS</span>
                  <span className="text-neutral-700 mt-1 block">Low-oil, easily digestible meals (khichdi, oats, clear soups). Avoid raw spices &amp; sodas.</span>
                </div>
                <div className="p-3 bg-[#faf8f4] rounded-xl border border-black/5">
                  <span className="text-[10px] font-bold text-[#705d00] uppercase block">PHYSICAL ACTIVITY</span>
                  <span className="text-neutral-700 mt-1 block">Light indoor walks encouraged. Strictly no lifting objects heavier than 4 kg for 2 weeks.</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Digital Gate Pass, Follow-up OPD & Amenities (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* DIGITAL HOSPITAL SECURITY GATE PASS */}
            <div className="bg-white rounded-2xl p-5 shadow-md border border-black/5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px] text-[#705d00]">badge</span>
                  <span className="font-bold text-base text-[#1c1c18] font-['Plus_Jakarta_Sans']">Exit Gate Pass</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#fcde6d] text-[#221b00] text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              {/* QR Container */}
              <div className="bg-[#faf8f4] p-4 rounded-xl border border-black/5 flex flex-col items-center justify-center text-center space-y-3">
                {/* Stylized Inline SVG QR Code from HTML mockup */}
                <div className="w-44 h-44 bg-white p-3 rounded-xl shadow-inner border border-neutral-200 flex items-center justify-center">
                  <svg className="w-full h-full text-[#141416]" fill="currentColor" viewBox="0 0 100 100">
                    {/* Outer corners */}
                    <rect fill="currentColor" height="28" rx="4" width="28" x="5" y="5"></rect>
                    <rect fill="white" height="20" rx="2" width="20" x="9" y="9"></rect>
                    <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="13"></rect>
                    <rect fill="currentColor" height="28" rx="4" width="28" x="67" y="5"></rect>
                    <rect fill="white" height="20" rx="2" width="20" x="71" y="9"></rect>
                    <rect fill="currentColor" height="12" rx="1" width="12" x="75" y="13"></rect>
                    <rect fill="currentColor" height="28" rx="4" width="28" x="5" y="67"></rect>
                    <rect fill="white" height="20" rx="2" width="20" x="9" y="71"></rect>
                    <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="75"></rect>
                    {/* Data modules */}
                    <rect height="8" rx="1" width="8" x="38" y="10"></rect>
                    <rect height="8" rx="1" width="8" x="50" y="10"></rect>
                    <rect height="8" rx="1" width="8" x="38" y="24"></rect>
                    <rect height="8" rx="1" width="8" x="50" y="24"></rect>
                    <rect height="8" rx="1" width="8" x="10" y="38"></rect>
                    <rect height="8" rx="1" width="8" x="22" y="38"></rect>
                    <rect height="12" rx="1" width="12" x="38" y="38"></rect>
                    <rect height="8" rx="1" width="8" x="54" y="38"></rect>
                    <rect height="10" rx="1" width="10" x="66" y="38"></rect>
                    <rect height="10" rx="1" width="10" x="80" y="38"></rect>
                    <rect height="8" rx="1" width="8" x="10" y="52"></rect>
                    <rect height="8" rx="1" width="8" x="22" y="52"></rect>
                    <rect height="8" rx="1" width="8" x="38" y="54"></rect>
                    <rect height="8" rx="1" width="8" x="50" y="54"></rect>
                    <rect height="8" rx="1" width="8" x="66" y="52"></rect>
                    <rect height="8" rx="1" width="8" x="80" y="52"></rect>
                    <rect height="8" rx="1" width="8" x="38" y="68"></rect>
                    <rect height="8" rx="1" width="8" x="50" y="68"></rect>
                    <rect height="12" rx="1" width="12" x="66" y="68"></rect>
                    <rect height="8" rx="1" width="8" x="82" y="68"></rect>
                    <rect height="8" rx="1" width="8" x="38" y="80"></rect>
                    <rect height="8" rx="1" width="8" x="50" y="80"></rect>
                    <rect height="8" rx="1" width="8" x="82" y="80"></rect>
                  </svg>
                </div>

                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-[#1c1c18] font-mono">GP-2024-PUNE-0491</span>
                  <p className="text-[11px] text-neutral-500">Present at Gate 01 or 02 for boom barrier exit</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSavePassToPhone}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#141416] text-white text-xs font-bold shadow-md hover:bg-neutral-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Save Pass to Phone</span>
                </button>
                <p className="text-center text-[11px] text-neutral-500">Valid until 02:00 PM today</p>
              </div>
            </div>

            {/* Follow-up OPD Appointment */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1c1c18] font-['Plus_Jakarta_Sans']">Follow-up Visit</h3>
                <span className="material-symbols-outlined text-[20px] text-[#705d00]">event_available</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f4] border border-black/5 space-y-1.5 text-xs">
                <span className="font-bold text-neutral-900 block">Dr. Vikram Kulkarni</span>
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <span className="material-symbols-outlined text-[16px] text-neutral-400">calendar_month</span>
                  <span>Wednesday, May 22, 2024</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <span className="material-symbols-outlined text-[16px] text-neutral-400">schedule</span>
                  <span>10:30 AM IST • OPD Clinic Suite 102</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <span className="material-symbols-outlined text-[16px]">healing</span>
                  <span>Purpose: Suture removal &amp; abdomen check</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] transition-colors text-xs font-bold text-[#1c1c18]"
              >
                <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                <span>Add to Google / Apple Calendar</span>
              </button>
            </div>

            {/* Attendant Amenities & Support */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-3">
              <h3 className="font-bold text-sm text-[#1c1c18] font-['Plus_Jakarta_Sans']">Attendant Amenities</h3>
              <div className="space-y-2 text-xs">
                {/* Parking Waiver */}
                <div className="flex items-center justify-between p-2.5 bg-[#faf8f4] rounded-xl border border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#705d00]">local_parking</span>
                    <span className="text-neutral-700">Parking Fee Waiver</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerToast('Parking token validated for exit.')}
                    className="font-bold text-[#141416] underline hover:text-black"
                  >
                    Scan Voucher
                  </button>
                </div>
                {/* 24x7 Nurse Helpline */}
                <div className="flex items-center justify-between p-2.5 bg-[#faf8f4] rounded-xl border border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#705d00]">phone_in_talk</span>
                    <span className="text-neutral-700">Post-Discharge SOS</span>
                  </div>
                  <a
                    className="font-bold text-[#141416] underline hover:text-black"
                    href="tel:+912066889900"
                    onClick={(e) => {
                      e.preventDefault();
                      onTriggerToast('Dialing CityCare 24x7 Post-Discharge Helpline: +91 20 6688 9900');
                    }}
                  >
                    Call Helpline
                  </a>
                </div>
                {/* Pharmacy delivery to home */}
                <div className="flex items-center justify-between p-2.5 bg-[#faf8f4] rounded-xl border border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#705d00]">local_shipping</span>
                    <span className="text-neutral-700">Home Med Refill</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerToast('Free 30-day medicine refill service registered to your Pune address.')}
                    className="font-bold text-[#141416] underline hover:text-black"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Reassurance Banner */}
        <div className="p-5 rounded-2xl bg-[#ebe8e2]/60 border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#705d00] shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">sentiment_satisfied</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#1c1c18] block">Need any assistance before walking out?</span>
              <span className="text-[11px] text-neutral-600 block">
                CityCare Patient Care Experience Coordinators are on the floor to escort you.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onTriggerToast('Feedback form will open post-discharge. Thank you for choosing CityCare Pune!')}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-xs font-bold text-[#1c1c18] shadow-xs border border-black/5 transition-colors"
            >
              Share Feedback
            </button>
            <button
              type="button"
              onClick={() => onTriggerToast('Clinical escort coordinator paged to Bay 204.')}
              className="px-4 py-2 rounded-full bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Request Escort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
