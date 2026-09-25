import React, { useEffect, useRef } from 'react';
import { RoleType, ViewType } from '../../types';
import { CLINICAL_PERSONAS } from '../../data/mockHospitalData';
import { auditLogService } from '../../services/auditLogService';

/**
 * Hospital Role-Based Access Control (RBAC) Matrix
 * Defines the strict whitelist of authorized roles for every clinical and administrative view.
 */
export const VIEW_ROLE_PERMISSIONS: Record<ViewType, RoleType[]> = {
  ward_flow: ['doctor', 'bed_manager', 'hospital_admin', 'super_admin'],
  bed_matrix: ['doctor', 'nurse', 'bed_manager', 'reception', 'housekeeping', 'hospital_admin', 'super_admin'],
  clinical_rounds: ['doctor', 'nurse'],
  discharge_hub: ['billing', 'doctor', 'nurse', 'hospital_admin', 'super_admin'],
  billing: ['billing', 'hospital_admin', 'super_admin'],
  housekeeping: ['housekeeping', 'hospital_admin', 'super_admin'],
  reception: ['reception', 'hospital_admin', 'super_admin'],
  pharmacy: ['pharmacy', 'hospital_admin', 'super_admin'],
  executive_admin: ['hospital_admin', 'super_admin'],
  super_admin_panel: ['super_admin', 'hospital_admin'],
  governance: ['super_admin', 'hospital_admin'], // STRICT: Doctor, Nurse, Reception, Billing, Housekeeping, Patient cannot mount this!
  turnover_manager: ['bed_manager', 'hospital_admin', 'super_admin'],
  nursing_station: ['nurse', 'hospital_admin', 'super_admin'],
  patient_portal: ['patient_portal'],
  patient_self_checkin: ['patient_portal'],
  login_portal: [
    'doctor',
    'nurse',
    'hospital_admin',
    'super_admin',
    'bed_manager',
    'billing',
    'pharmacy',
    'housekeeping',
    'reception',
    'patient_portal',
  ],
};

/**
 * Canonical default workspace for each clinical role upon redirect
 */
export const DEFAULT_ROLE_VIEW: Record<RoleType, ViewType> = {
  doctor: 'ward_flow',
  nurse: 'nursing_station',
  bed_manager: 'turnover_manager',
  billing: 'billing',
  pharmacy: 'pharmacy',
  housekeeping: 'housekeeping',
  reception: 'reception',
  hospital_admin: 'executive_admin',
  super_admin: 'super_admin_panel',
  patient_portal: 'patient_self_checkin',
};

const VIEW_METADATA: Record<ViewType, { name: string; category: string; description: string }> = {
  ward_flow: {
    name: 'Doctor Inpatient Flow Pipeline',
    category: 'Clinical Operations',
    description: 'Patient admission queues, attending physician handovers, and discharge staging.',
  },
  bed_matrix: {
    name: 'Bed Matrix & Turnover Grid',
    category: 'Capacity Management',
    description: 'Real-time bed occupancy, cleaning turnover status, and ward allocations.',
  },
  clinical_rounds: {
    name: 'Clinical Rounds & Medication Administration (MAR)',
    category: 'Direct Patient Care',
    description: 'Medication administration records, clinical notes, and physician orders.',
  },
  discharge_hub: {
    name: 'Discharge Authorizations & Clearances',
    category: 'Discharge Planning',
    description: 'Multi-department clearance checklist (clinical, pharmacy, nursing, billing).',
  },
  billing: {
    name: 'TPA Claims & Financial Invoicing Desk',
    category: 'Hospital Finance',
    description: 'Cashless claims, co-pay balances, itemized invoices, and settlement ledgers.',
  },
  housekeeping: {
    name: 'Housekeeping & Terminal Sanitization Hub',
    category: 'Environmental Services',
    description: 'Bed turnover sanitization schedules, UV sterilization logs, and voice-assisted dispatch.',
  },
  reception: {
    name: 'Front Intake & Emergency Reception Desk',
    category: 'Admissions & Intake',
    description: 'Emergency triage radar, outpatient walk-in registry, and digital QR pass issuance.',
  },
  pharmacy: {
    name: 'Central Pharmacy & STAT Dispensing',
    category: 'Pharmacy Services',
    description: 'Schedule X narcotics custody, barcode verification, and STAT medication delivery.',
  },
  executive_admin: {
    name: 'Executive Medical Operations Cockpit',
    category: 'Hospital Administration',
    description: 'Hospital-wide bed occupancy, revenue pacing, and operational velocity KPIs.',
  },
  super_admin_panel: {
    name: 'Super Admin Multi-Hospital Command Centre',
    category: 'Enterprise Network Governance',
    description: 'Global hospital registry, hospital admins, network-wide KPIs, and clinical resource schemas.',
  },
  governance: {
    name: 'System Governance, Security & Audit Trail',
    category: 'Compliance & Governance',
    description: 'Lightweight audit logs, security access trails, role switch history, and RBAC matrix.',
  },
  turnover_manager: {
    name: 'Bed Turnover & AI Allocation Engine',
    category: 'Capacity Management',
    description: 'Predictive bed turnover models, turnaround queues, and patient transfer routes.',
  },
  nursing_station: {
    name: 'Floor Nursing Station (Shift Console)',
    category: 'Direct Patient Care',
    description: 'Shift handovers, patient vitals monitoring, and floor nurse assignments.',
  },
  patient_portal: {
    name: 'Patient & Family Companion Dashboard',
    category: 'Patient Services',
    description: 'Live 5-step discharge journey, attendant passes, billing review, and nurse calling.',
  },
  patient_self_checkin: {
    name: 'Patient Self-Check-in & QR Arrival Pass',
    category: 'Patient Services',
    description: 'Dynamic check-in QR code pass, scanner verification, and arrival confirmation.',
  },
  login_portal: {
    name: 'Workstation Authentication Portal',
    category: 'Authentication',
    description: 'Staff PIN login and patient check-in authentication.',
  },
};

interface ProtectedRoleViewProps {
  activeRole: RoleType;
  view: ViewType;
  onNavigate: (view: ViewType) => void;
  onSelectRole?: (role: RoleType) => void;
  onTriggerToast?: (msg: string) => void;
  children: React.ReactNode | (() => React.ReactNode);
}

/**
 * Protective wrapper for all view components.
 * Guarantees that sensitive hospital operations data remains restricted to the appropriate roles.
 * If unauthorized, prevents mounting the underlying view component completely.
 */
export const ProtectedRoleView: React.FC<ProtectedRoleViewProps> = ({
  activeRole,
  view,
  onNavigate,
  onSelectRole,
  onTriggerToast,
  children,
}) => {
  const allowedRoles = VIEW_ROLE_PERMISSIONS[view] || [];
  const isAuthorized = allowedRoles.includes(activeRole);
  const loggedRef = useRef<string | null>(null);

  const currentPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;
  const targetViewMeta = VIEW_METADATA[view] || {
    name: view.replace(/_/g, ' ').toUpperCase(),
    category: 'Restricted Clinical Resource',
    description: 'Confidential clinical operations workspace.',
  };

  useEffect(() => {
    if (!isAuthorized) {
      const key = `${activeRole}-${view}`;
      if (loggedRef.current !== key) {
        loggedRef.current = key;
        // Log unauthorized view mount attempt to the governance audit trail
        auditLogService.addLog({
          actor: currentPersona.name,
          role: currentPersona.designation,
          action: `Unauthorized View Access Blocked: Role [${activeRole.toUpperCase()}] attempted to mount restricted view [${targetViewMeta.name} (${view})]. RBAC policy enforced; component mount suppressed.`,
          category: 'system',
          severity: 'warning',
          status: 'ALERT',
          metadata: {
            attemptedView: view,
            activeRole,
            requiredRoles: allowedRoles,
            timestamp: new Date().toISOString(),
          },
        });

        if (onTriggerToast) {
          onTriggerToast(
            `Access Denied: ${currentPersona.designation} is not authorized to mount ${targetViewMeta.name}.`
          );
        }
      }
    } else {
      loggedRef.current = null;
    }
  }, [isAuthorized, activeRole, view, currentPersona, targetViewMeta.name, allowedRoles, onTriggerToast]);

  // If authorized, safely render the children view component
  if (isAuthorized) {
    return <>{typeof children === 'function' ? children() : children}</>;
  }

  // If unauthorized: Completely block the component mount and render an informative security restriction screen
  const defaultDestination = DEFAULT_ROLE_VIEW[activeRole] || 'ward_flow';
  const defaultMeta = VIEW_METADATA[defaultDestination] || { name: 'My Workspace' };

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-300 font-['Inter',sans-serif]">
      <div className="bg-white rounded-3xl border border-red-200/80 shadow-[0_10px_40px_-10px_rgba(239,68,68,0.15)] overflow-hidden">
        {/* Top Warning Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <span className="material-symbols-outlined text-[32px]">gpp_maybe</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-white text-xs font-bold font-mono tracking-wider uppercase mb-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  RBAC Security Guard Active
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight">
                  Access Restricted • Unauthorized Clinical Role
                </h2>
              </div>
            </div>

            <span className="px-3.5 py-1.5 rounded-xl bg-black/25 text-white/90 text-xs font-mono font-bold border border-white/20">
              HTTP 403 Forbidden
            </span>
          </div>
        </div>

        {/* Security Context Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[24px] mt-0.5">lock</span>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Component Mount Blocked for Sensitive Operations
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Hospital Information Governance policy strictly restricts mounting of the{' '}
                  <span className="font-bold text-neutral-900 font-mono">
                    {targetViewMeta.name}
                  </span>{' '}
                  to prevent unauthorized data exposure (NABH, HIPAA &amp; DPDP compliance).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-200 text-xs">
              <div className="p-3 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-1">
                  Your Current Role
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                    {currentPersona.badgeText}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                    UNAUTHORIZED
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">{currentPersona.name} ({currentPersona.designation})</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-neutral-200">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-1">
                  Authorized Whitelist Roles
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {allowedRoles.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold"
                    >
                      {r.replace('_', ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Notice */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
            <span className="material-symbols-outlined text-amber-700 text-[18px]">verified</span>
            <span>
              This access prevention event has been securely appended to the immutable Governance Audit Ledger with your session credentials.
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-100">
            <div className="text-xs text-neutral-500">
              Need access? Request temporary elevation from the Medical Superintendent.
            </div>

            <div className="flex items-center gap-2">
              {onSelectRole && (
                <button
                  type="button"
                  onClick={() => onNavigate('login_portal')}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all"
                >
                  Switch User / Re-login
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate(defaultDestination)}
                className="px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Return to {defaultMeta.name}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
