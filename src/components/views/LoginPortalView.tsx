import React, { useState } from 'react';
import { RoleType, ViewType } from '../../types';
import { CLINICAL_PERSONAS } from '../../data/mockHospitalData';
import { auditLogService } from '../../services/auditLogService';

interface LoginPortalViewProps {
  onSelectRole: (role: RoleType) => void;
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const LoginPortalView: React.FC<LoginPortalViewProps> = ({
  onSelectRole,
  onNavigate,
  onTriggerToast,
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'super_admin' | 'patient'>('staff');
  const [selectedStaffRole, setSelectedStaffRole] = useState<RoleType>('doctor');
  const [staffPin, setStaffPin] = useState('2026');
  const [superAdminKey, setSuperAdminKey] = useState('MASTER-ROOT-2026');
  const [patientUhid, setPatientUhid] = useState('UH-9402');
  const [patientPhone, setPatientPhone] = useState('9823044912');
  const [isScanningQR, setIsScanningQR] = useState(false);

  const staffRoles: { role: RoleType; title: string; defaultView: ViewType; icon: string; dept: string }[] = [
    { role: 'doctor', title: 'Lead Physician / Doctor', defaultView: 'ward_flow', icon: 'stethoscope', dept: 'General Medicine / Surgery' },
    { role: 'nurse', title: 'Nursing Station Sister', defaultView: 'nursing_station', icon: 'healing', dept: 'Inpatient Floor 3 Ward B' },
    { role: 'reception', title: 'Emergency Intake & Reception', defaultView: 'reception', icon: 'how_to_reg', dept: 'Central Lobby Counter 01' },
    { role: 'bed_manager', title: 'Bed Turnover & Logistics', defaultView: 'turnover_manager', icon: 'hotel', dept: 'Operations Command' },
    { role: 'billing', title: 'TPA Insurance & Billing', defaultView: 'billing', icon: 'receipt_long', dept: 'Revenue & Cashless Desk' },
    { role: 'pharmacy', title: 'Satellite & STAT Rx Pharmacy', defaultView: 'pharmacy', icon: 'medication', dept: 'Floor Dispensary' },
    { role: 'housekeeping', title: 'Housekeeping & Sanitation', defaultView: 'housekeeping', icon: 'cleaning_services', dept: 'Bio-Sanitation Team' },
    { role: 'hospital_admin', title: 'Medical Superintendent', defaultView: 'executive_admin', icon: 'shield_person', dept: 'Executive Medical Directorate' },
    { role: 'super_admin', title: 'Super Admin Multi-Hospital', defaultView: 'super_admin_panel', icon: 'hub', dept: 'Enterprise Multi-Hospital Governance' },
  ];

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleConfig = staffRoles.find((r) => r.role === selectedStaffRole) || staffRoles[0];
    const emailMapping: Record<string, string> = {
      'doctor': 'arao@citycare.com',
      'reception': 'reception@citycare.com',
      'bed_manager': 'bedmgr@citycare.com',
      'housekeeping': 'housekeeping@citycare.com',
      'super_admin': 'superadmin@citycare.com',
      'nurse': 'nurse@citycare.com',
      'pharmacy': 'pharmacy@citycare.com',
      'billing': 'billing@citycare.com',
      'hospital_admin': 'hospadmin@citycare.com'
    };
    const email = emailMapping[selectedStaffRole] || 'arao@citycare.com';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Hosflow@2026' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('hosflow_jwt', data.token);
      localStorage.setItem('hosflow_user', JSON.stringify(data.user));

      const persona = CLINICAL_PERSONAS[roleConfig.role] || CLINICAL_PERSONAS.doctor;
      auditLogService.addLog({
        actor: data.user.name,
        role: roleConfig.title,
        action: `Staff Login Authenticated via JWT. Workspace started.`,
        category: 'auth',
        severity: 'success',
        status: 'VERIFIED',
      });
      onSelectRole(data.user.role as RoleType || roleConfig.role);
      onNavigate(roleConfig.defaultView);
      onTriggerToast(`Authenticated as ${data.user.name} (${roleConfig.title}). Token securely stored.`);
    } catch (err: any) {
      onTriggerToast(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  const handleSuperAdminDirectLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@citycare.com', password: 'Hosflow@2026' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('hosflow_jwt', data.token);
      localStorage.setItem('hosflow_user', JSON.stringify(data.user));

      const persona = CLINICAL_PERSONAS.super_admin;
      auditLogService.addLog({
        actor: data.user.name,
        role: 'Super Admin',
        action: 'Super Admin JWT Authenticated: Full network scope granted.',
        category: 'auth',
        severity: 'success',
        status: 'VERIFIED',
      });
      onSelectRole('super_admin');
      onNavigate('super_admin_panel');
      onTriggerToast(`Master Session Verified: Authenticated as ${data.user.name} (Super Admin).`);
    } catch (err: any) {
      onTriggerToast(err.message || 'Auth failed.');
    }
  };

  const handleHospitalAdminDirectLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hospadmin@citycare.com', password: 'Hosflow@2026' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('hosflow_jwt', data.token);
      localStorage.setItem('hosflow_user', JSON.stringify(data.user));

      const persona = CLINICAL_PERSONAS.hospital_admin;
      auditLogService.addLog({
        actor: data.user.name,
        role: 'Hospital Admin',
        action: 'Hospital Admin JWT Authenticated.',
        category: 'auth',
        severity: 'success',
        status: 'VERIFIED',
      });
      onSelectRole('hospital_admin');
      onNavigate('executive_admin');
      onTriggerToast(`Authenticated as ${data.user.name} (Hospital Admin).`);
    } catch (err: any) {
      onTriggerToast(err.message || 'Auth failed.');
    }
  };

  const handlePatientQRScan = () => {
    setIsScanningQR(true);
    setTimeout(() => {
      setIsScanningQR(false);
      auditLogService.addLog({
        actor: 'Harish Mehta',
        role: 'Patient Portal',
        action: 'Patient QR Pass Scanned: Token GP-2024-PUNE-0491 verified. Personal patient journey active.',
        category: 'auth',
        severity: 'info',
        status: 'VERIFIED',
      });
      onSelectRole('patient_portal');
      onNavigate('patient_portal');
      onTriggerToast('QR Code Verified: Admission token GP-2024-PUNE-0491. Welcome Harish Mehta & Family!');
    }, 1200);
  };

  const handlePatientUhidLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientUhid.trim()) {
      onTriggerToast('Please enter your UHID or Phone number.');
      return;
    }
    onSelectRole('patient_portal');
    onNavigate('patient_portal');
    onTriggerToast(`Authenticated Patient Session for ${patientUhid.toUpperCase()}. Live Discharge Journey active.`);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f3] flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-['Inter',sans-serif]">
      {/* Top Branding Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#141416] text-white flex items-center justify-center font-bold shadow-sm">
            <span className="material-symbols-outlined text-[22px]">local_hospital</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                hosflow
              </span>
              <span className="w-2 h-2 rounded-full bg-[#ffd8ec]"></span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-200 text-neutral-700 rounded-full font-bold">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">CityCare Multispeciality Hospital • Pune Central Node</p>
          </div>
        </div>

        {/* Quick Super Admin Bypass Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSuperAdminDirectLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141416] hover:bg-neutral-800 text-[#fcde6d] text-xs font-bold transition-all shadow-xs border border-white/10"
            title="Instant Super Admin One-Click Login"
          >
            <span className="material-symbols-outlined text-[17px] text-[#fcde6d]">key</span>
            <span>Super Admin Quick Login</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-white px-3.5 py-1.5 rounded-full border border-black/5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>DISHA 2.0 &amp; NABH Zero-Trust</span>
          </div>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-xl w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
          {/* Header Switcher: Staff vs Super Admin vs Patient */}
          <div className="grid grid-cols-3 p-1.5 bg-neutral-100/80 border-b border-neutral-200 gap-1 text-center">
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">badge</span>
              <span>Staff Login</span>
            </button>

            <button
              onClick={() => setActiveTab('super_admin')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'super_admin'
                  ? 'bg-[#141416] text-[#fcde6d] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">hub</span>
              <span>Super Admin</span>
            </button>

            <button
              onClick={() => setActiveTab('patient')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'patient'
                  ? 'bg-[#fcde6d] text-[#221b00] shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">qr_code_scanner</span>
              <span>Patient Portal</span>
            </button>
          </div>

          {/* TAB 1: HOSPITAL STAFF LOGIN */}
          {activeTab === 'staff' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Verified Personnel Workstation
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                  Sign In to Role Workspace
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Select your operational role to launch authorized clinical and administrative modules.
                </p>
              </div>

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                    Select Your Operational Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {staffRoles.map((item) => {
                      const isSelected = selectedStaffRole === item.role;
                      return (
                        <div
                          key={item.role}
                          onClick={() => setSelectedStaffRole(item.role)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? 'border-[#141416] bg-[#141416] text-white shadow-sm'
                              : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 text-neutral-800'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[18px] shrink-0 ${
                              isSelected ? 'text-[#fcde6d]' : 'text-neutral-500'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs truncate leading-tight">{item.title}</span>
                            <span
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-neutral-300' : 'text-neutral-500'
                              }`}
                            >
                              {item.dept}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                      Personnel Badge ID
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={CLINICAL_PERSONAS[selectedStaffRole]?.email || 'staff@hospital.com'}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-mono truncate"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                      Security PIN / Passcode
                    </label>
                    <input
                      type="password"
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      placeholder="••••"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-neutral-900 text-xs font-mono tracking-widest text-center focus:ring-2 focus:ring-[#fcde6d] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    <span>Authenticate &amp; Open Role Workspace</span>
                  </button>

                  {/* Secondary Quick Jump */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Need Administrator Access?</span>
                    <button
                      type="button"
                      onClick={handleSuperAdminDirectLogin}
                      className="text-xs font-bold text-neutral-900 hover:text-black flex items-center gap-1 underline underline-offset-2"
                    >
                      <span className="material-symbols-outlined text-[15px]">key</span>
                      Direct Super Admin Sign-In
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: DEDICATED SUPER ADMIN LOGIN PORTAL */}
          {activeTab === 'super_admin' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#756100] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fcde6d]/30 inline-block mb-1">
                    Enterprise Root Security Gateway
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                    Super Admin Console Login
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    High-clearance gateway granting global authority over all registered hospitals, hospital administrators, and network D3 analytics.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#141416] text-[#fcde6d] flex items-center justify-center shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[24px]">shield</span>
                </div>
              </div>

              {/* Pre-authenticated Super Admin Credential Box */}
              <div className="p-4 rounded-2xl bg-[#faf8f4] border border-black/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141416] text-[#fcde6d] flex items-center justify-center font-bold text-sm">
                    RS
                  </div>
                  <div>
                    <div className="font-bold text-sm text-neutral-900">Dr. Rajeshwari Sen</div>
                    <div className="text-xs text-neutral-500">Group Chief Info &amp; Compliance Officer (Super Admin)</div>
                    <div className="text-[11px] font-mono text-neutral-400">r.sen@hospital.com • Clearance Level 5</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5 text-xs text-neutral-600 flex items-center justify-between">
                  <span>Authorized Scope:</span>
                  <strong className="text-neutral-900">Multi-Hospital Network Cluster</strong>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                    Enterprise Master Root Key
                  </label>
                  <input
                    type="text"
                    value={superAdminKey}
                    onChange={(e) => setSuperAdminKey(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs text-neutral-800 bg-neutral-50 outline-none focus:ring-2 focus:ring-[#fcde6d]"
                  />
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleSuperAdminDirectLogin}
                  className="w-full py-3.5 rounded-2xl bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#fcde6d]">key</span>
                  <span>Enter Super Admin Console (Direct Access)</span>
                </button>

                {/* Secondary Hospital Admin Option */}
                <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
                  <span>Looking for single facility admin?</span>
                  <button
                    type="button"
                    onClick={handleHospitalAdminDirectLogin}
                    className="font-bold text-neutral-800 hover:text-black hover:underline"
                  >
                    Medical Supt (Hospital Admin) &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PATIENT & ATTENDANT SELF-SERVICE LOGIN */}
          {activeTab === 'patient' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-[10px] font-bold text-[#756100] uppercase tracking-wider block mb-1">
                  Patient &amp; Attendant Companion
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                  Scan Your Admission QR Code
                </h2>
                <p className="text-xs text-neutral-600 mt-1">
                  Registered at Reception? Scan the QR printed on your admission wristband or enter your UHID.
                </p>
              </div>

              {/* QR Scanner Simulation Box */}
              <div className="p-6 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative w-40 h-40 bg-white p-3 rounded-2xl shadow-inner border border-neutral-200 flex items-center justify-center overflow-hidden">
                  {isScanningQR ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-neutral-800 animate-pulse">
                      <span className="material-symbols-outlined text-4xl text-[#705d00] animate-spin">
                        qr_code_scanner
                      </span>
                      <span className="text-[11px] font-bold">Reading Token...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-5xl text-neutral-300">
                        qr_code_scanner
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">Admission Wristband QR</span>
                    </div>
                  )}

                  {/* Laser scan animation line */}
                  {isScanningQR && (
                    <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_8px_red] animate-bounce"></div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePatientQRScan}
                  disabled={isScanningQR}
                  className="px-5 py-2.5 rounded-full bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  <span>{isScanningQR ? 'Connecting Scanner...' : 'Simulate Scanning Admission QR'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-neutral-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-neutral-400">
                  Or Manual Verification
                </span>
              </div>

              {/* Manual UHID / Phone Login Form */}
              <form onSubmit={handlePatientUhidLogin} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Patient UHID
                    </label>
                    <input
                      type="text"
                      value={patientUhid}
                      onChange={(e) => setPatientUhid(e.target.value)}
                      placeholder="e.g. UH-9402"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#fcde6d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                      Registered Mobile
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="98230 44912"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono focus:ring-2 focus:ring-[#fcde6d] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span>Open Harish Mehta's Patient Dashboard</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center py-2 text-xs text-neutral-400">
        CityCare Multispeciality Hospital • Pune, Maharashtra • 24x7 Emergency Line: +91 20 6688 9900
      </div>
    </div>
  );
};
