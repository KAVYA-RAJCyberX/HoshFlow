import React from 'react';
import { ViewType, RoleType } from '../../types';
import { CLINICAL_PERSONAS } from '../../data/mockHospitalData';

interface SidebarProps {
  activeView: ViewType;
  onSelectView: (view: ViewType) => void;
  activeRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  dischargeReqCount?: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  activeRole,
  onSelectRole,
  mobileOpen,
  onCloseMobile,
  dischargeReqCount = 1,
  onLogout
}) => {
  const currentPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;

  const navItems: { id: ViewType; label: string; icon: string; badge?: string; badgeColor?: string; roleFocus?: string }[] = [
    { id: 'ward_flow', label: 'My Inpatients (Ward Flow)', icon: 'transfer_within_a_station', roleFocus: 'Doctor / Lead' },
    { id: 'bed_matrix', label: 'Bed Matrix & Turnover', icon: 'hotel', badge: '14 Free', badgeColor: 'bg-[#9AAB63] text-white' },
    { id: 'clinical_rounds', label: 'Clinical Rounds & MAR', icon: 'medical_services' },
    { id: 'discharge_hub', label: 'Discharge Authorizations', icon: 'output', badge: `${dischargeReqCount} Req`, badgeColor: 'bg-[#F5D867] text-[#221b00]' },
    { id: 'billing', label: 'Billing & Invoices (TPA)', icon: 'receipt_long', badge: '2 Holds', badgeColor: 'bg-rose-200 text-rose-900' },
    { id: 'housekeeping', label: 'Housekeeping Hub', icon: 'cleaning_services', badge: 'Voice', badgeColor: 'bg-amber-100 text-amber-900' },
    { id: 'reception', label: 'Reception & Intake Desk', icon: 'how_to_reg', badge: 'ER Radar', badgeColor: 'bg-red-500 text-white' },
    { id: 'pharmacy', label: 'Pharmacy & STAT Orders', icon: 'prescriptions', badge: '3 STAT', badgeColor: 'bg-red-100 text-red-900' },
    { id: 'nursing_station', label: 'Nursing Station (Shift 02)', icon: 'vital_signs' },
    { id: 'executive_admin', label: 'Hospital Admin Cockpit', icon: 'local_hospital', badge: 'Resources', badgeColor: 'bg-indigo-600 text-white' },
    { id: 'super_admin_panel', label: 'Super Admin Network Hub', icon: 'hub', badge: 'Multi-Hosp', badgeColor: 'bg-emerald-600 text-white' },
    { id: 'turnover_manager', label: 'Turnover & Allocation', icon: 'speed' },
    { id: 'governance', label: 'System Governance & RBAC', icon: 'admin_panel_settings' },
    { id: 'patient_portal', label: 'Patient Self-Service (Pass)', icon: 'qr_code_scanner', badge: 'QR Pass', badgeColor: 'bg-emerald-100 text-emerald-900' }
  ];

  // Role-specific allowed views mapping to enforce strict access per role
  const roleAllowedViews: Record<RoleType, ViewType[]> = {
    doctor: ['ward_flow', 'clinical_rounds', 'bed_matrix'],
    nurse: ['nursing_station', 'clinical_rounds', 'bed_matrix'],
    reception: ['reception', 'bed_matrix'],
    bed_manager: ['turnover_manager', 'bed_matrix', 'ward_flow'],
    billing: ['billing', 'discharge_hub'],
    pharmacy: ['pharmacy'],
    housekeeping: ['housekeeping', 'bed_matrix'],
    hospital_admin: ['executive_admin', 'super_admin_panel', 'governance', 'bed_matrix', 'ward_flow'],
    super_admin: ['super_admin_panel', 'executive_admin', 'governance', 'ward_flow', 'bed_matrix', 'billing'],
    patient_portal: ['patient_portal', 'patient_self_checkin'],
  };

  const allowedViews = roleAllowedViews[activeRole] || ['ward_flow'];
  const filteredNavItems = navItems.filter((item) => allowedViews.includes(item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed left-3 top-3 bottom-3 w-64 lg:w-[17.5rem] bg-[#141416] text-white z-50 flex flex-col justify-between 
        rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden transition-all duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Branding & Hospital Context */}
        <div className="flex flex-col">
          {/* Logo & Version */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => onSelectView('ward_flow')}
            >
              <span className="text-2xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">hosflow</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffd8ec] group-hover:scale-125 transition-transform"></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono">v2.4</span>
              {/* Mobile close button */}
              <button 
                className="lg:hidden w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                onClick={onCloseMobile}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Hospital Node Card */}
          <div className="px-3.5 mb-2">
            <div className="bg-white/5 rounded-2xl p-3 flex flex-col gap-1.5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#ffd8ec]">
                    <span className="material-symbols-outlined text-[18px]">local_hospital</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-white font-semibold leading-tight">CityCare Pune</span>
                    <span className="text-[11px] text-neutral-400">Central Wing • Bay 4</span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#fcde6d] animate-pulse"></span>
              </div>

              {/* Persona indicator pill */}
              <div className="mt-1 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fcde6d]/25 text-[#ffe16f] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">verified_user</span>
                  <span className="truncate max-w-[125px]">{currentPersona.badgeText}</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono uppercase">On Duty</span>
              </div>
            </div>
          </div>

          {/* Navigation Links Scrollable */}
          <nav className="flex flex-col gap-1 px-3 max-h-[calc(100vh-22rem)] overflow-y-auto no-scrollbar">
            {filteredNavItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left text-sm ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`material-symbols-outlined text-[19px] shrink-0 ${isActive ? 'text-[#ffd8ec]' : 'text-neutral-400'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate text-[13px]">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-white/10 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & System Sync Status */}
        <div className="p-3.5 flex flex-col gap-2 border-t border-white/10 bg-[#141416]/90">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] uppercase tracking-wider flex items-center gap-1 font-semibold text-[#ffd8ec]">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Role-Scoped
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">HIPAA Tier-1</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Clinical / Prescriptions / Discharges (CityCare Pune Node)
            </p>
          </div>

          <div className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#fcde6d] animate-ping"></span>
              <span className="text-[11px] text-white font-medium">Doctor Emergency Sync</span>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">Live (2s)</span>
          </div>

          <button
            data-testid="sign-out-btn"
            onClick={() => {
              onCloseMobile();
              if (onLogout) onLogout();
              else onSelectView('login_portal');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-300 text-xs font-semibold transition-colors border border-white/5"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px]">logout</span>
              <span>Sign Out Workstation</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">Lock</span>
          </button>
        </div>
      </aside>
    </>
  );
};
