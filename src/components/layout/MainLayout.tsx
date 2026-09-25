import React, { useState } from 'react';
import { RoleType, ViewType } from '../../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HOSPITAL_INFO, CLINICAL_PERSONAS } from '../../data/mockHospitalData';
import { HosflowMetricsSummary } from '../common/HosflowMetricsSummary';
import { UserSettingsModal } from '../common/UserSettingsModal';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: ViewType;
  onSelectView: (view: ViewType) => void;
  activeRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  toastMessage: string | null;
  onClearToast: () => void;
  onTriggerToast?: (msg: string) => void;
  dischargeReqCount?: number;
  onOpenHandover?: () => void;
  onLogout?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeView,
  onSelectView,
  activeRole,
  onSelectRole,
  toastMessage,
  onClearToast,
  onTriggerToast,
  dischargeReqCount = 1,
  onOpenHandover,
  onLogout
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currentPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;

  // 1. Full-screen dedicated Login Screen mode (No layout chrome)
  if (activeView === 'login_portal') {
    return (
      <div className="min-h-screen bg-[#fcf9f3]">
        {children}
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#141416] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
              <span className="material-symbols-outlined text-[#fcde6d] text-[22px]">check_circle</span>
              <span className="text-sm font-medium">{toastMessage}</span>
              <button onClick={onClearToast} className="ml-2 text-neutral-400 hover:text-white p-1">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Dedicated Patient & Family Portal mode (No hospital staff sidebar, no staff dashboard controls)
  if (activeRole === 'patient_portal' || activeView === 'patient_portal' || activeView === 'patient_self_checkin') {
    return (
      <div className="min-h-screen bg-[#fcf9f3] text-[#1c1c18] font-['Inter',sans-serif]">
        {/* Patient Portal Header */}
        <header className="sticky top-0 z-40 bg-[#fcf9f3]/90 backdrop-blur-xl border-b border-black/5 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_1px_8px_rgba(20,20,22,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#141416] text-white flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[20px]">local_hospital</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                  hosflow
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fcde6d]/50 text-[#756100]">
                  Patient Companion
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">CityCare Multispeciality Hospital, Pune</p>
            </div>
          </div>

          {/* Sub-navigation for Patient Mode: Self-Check-in Pass vs Inpatient Portal */}
          <div className="hidden sm:flex items-center gap-1 bg-white p-1 rounded-full border border-black/5 shadow-2xs">
            <button
              onClick={() => onSelectView('patient_self_checkin')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'patient_self_checkin'
                  ? 'bg-[#141416] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
              <span>Self-Check-in Pass</span>
            </button>
            <button
              onClick={() => onSelectView('patient_portal')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'patient_portal'
                  ? 'bg-[#141416] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">dashboard</span>
              <span>Inpatient Dashboard</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-white px-3.5 py-1.5 rounded-full border border-black/5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted Session • Harish Mehta (UH-9402)</span>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-full bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Exit Portal</span>
            </button>
          </div>
        </header>

        {/* Patient Viewport */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#141416] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
              <span className="material-symbols-outlined text-[#fcde6d] text-[22px]">check_circle</span>
              <span className="text-sm font-medium">{toastMessage}</span>
              <button onClick={onClearToast} className="ml-2 text-neutral-400 hover:text-white p-1">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Hospital Staff Mode (Role-Specific Workspace)
  return (
    <div className="min-h-screen bg-[#fcf9f3] text-[#1c1c18] font-['Plus_Jakarta_Sans','Inter',sans-serif] selection:bg-[#fcde6d] selection:text-[#756100]">
      {/* Sidebar Navigation - Strictly filtered to current role's tools */}
      <Sidebar
        activeView={activeView}
        onSelectView={onSelectView}
        activeRole={activeRole}
        onSelectRole={onSelectRole}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        dischargeReqCount={dischargeReqCount}
        onLogout={onLogout}
      />

      {/* Top Header */}
      <Header
        activeRole={activeRole}
        onSelectRole={onSelectRole}
        onSelectView={onSelectView}
        onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenHandover={onOpenHandover}
        onLogout={onLogout}
      />

      {/* Main Content Viewport */}
      <div className="lg:pl-[17.5rem] pt-16 flex flex-col min-h-screen">
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
          {/* Top Operational Context Strip */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 mb-5 border-b border-[#e5e2dc]/80">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/50 text-[#756100]">
                  {currentPersona.badgeText}
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-[11px] text-neutral-600 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#705d00] animate-ping"></span>
                  Live Telemetry Active ({HOSPITAL_INFO.location})
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                <strong className="text-neutral-900 font-semibold">{HOSPITAL_INFO.name}</strong> • 
                {' '}{HOSPITAL_INFO.occupiedBeds} / {HOSPITAL_INFO.totalBeds} Beds ({HOSPITAL_INFO.occupancyPercent}% Occupancy) • 
                {' '}{HOSPITAL_INFO.todayAdmits} Admits • {HOSPITAL_INFO.todayDischarges} Discharges • 
                {' '}<span className="text-red-700 font-bold">{HOSPITAL_INFO.activeCriticalAlerts} Critical Alerts Active</span>
              </p>
            </div>

            {/* Role-Specific Badge, Shift Handover & Direct Sign Out */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start xl:self-auto">
              {onOpenHandover && (
                <button
                  onClick={onOpenHandover}
                  className="px-3.5 py-1.5 rounded-full bg-[#141416] text-[#ffd8ec] hover:bg-neutral-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 border border-white/10"
                  title="Open Shift Handover & Operational Briefing"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horizontal_circle</span>
                  <span>Shift Handover</span>
                </button>
              )}

              <div className="flex items-center gap-2 bg-[#f0eee8] px-3.5 py-1.5 rounded-full border border-black/5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-neutral-800">
                  {currentPersona.name} • <span className="text-neutral-500 font-normal">{currentPersona.designation}</span>
                </span>
              </div>

              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 rounded-full bg-neutral-200 hover:bg-red-100 hover:text-red-700 text-neutral-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                title="Sign out of workstation"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Hosflow Operations Summary Card for Dashboard Views */}
          {['ward_flow', 'bed_matrix', 'clinical_rounds', 'discharge_hub', 'turnover_manager', 'executive_admin', 'nursing_station'].includes(activeView) && (
            <HosflowMetricsSummary onNavigate={onSelectView} />
          )}

          {/* Active View Child Render */}
          {children}
        </main>
      </div>

      {/* Floating Action / Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#141416] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <span className="material-symbols-outlined text-[#fcde6d] text-[22px]">check_circle</span>
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={onClearToast}
              className="ml-2 text-neutral-400 hover:text-white p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* User Settings Modal (Includes Audible Alert Toggle for Emergent Admissions) */}
      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onTriggerToast={onTriggerToast}
      />
    </div>
  );
};
