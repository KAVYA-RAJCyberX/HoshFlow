import React, { useState, useRef, useEffect } from 'react';
import { RoleType, ViewType, PatientRecord } from '../../types';
import { CLINICAL_PERSONAS, MOCK_NOTIFICATIONS, MOCK_PATIENTS, MOCK_BEDS } from '../../data/mockHospitalData';
import { TriageIndicator } from '../common/TriageIndicator';
import { PatientVitalsTrend } from '../common/PatientVitalsTrend';

interface HeaderProps {
  activeRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  onSelectView: (view: ViewType) => void;
  onToggleMobile: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenHandover?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRole,
  onSelectRole,
  onSelectView,
  onToggleMobile,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenHandover,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<'all' | 'critical' | 'discharges' | 'icu'>('all');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const currentPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter patients based on query and activeCategory
  const query = searchQuery.toLowerCase().trim();
  const matchedPatients = MOCK_PATIENTS.filter((patient) => {
    // Text search matching
    const matchesText =
      !query ||
      patient.name.toLowerCase().includes(query) ||
      patient.uhid.toLowerCase().includes(query) ||
      patient.id.toLowerCase().includes(query) ||
      patient.bedId.toLowerCase().includes(query) ||
      patient.ward.toLowerCase().includes(query) ||
      patient.diagnosis.toLowerCase().includes(query) ||
      patient.attendingDoctor.toLowerCase().includes(query);

    if (!matchesText) return false;

    // Filter category
    if (activeFilterCategory === 'critical') {
      return patient.acuity === 'critical' || patient.status === 'critical';
    }
    if (activeFilterCategory === 'discharges') {
      return patient.status === 'discharge_planned' || patient.status === 'discharge_hold' || patient.status === 'cleared';
    }
    if (activeFilterCategory === 'icu') {
      return patient.ward.toLowerCase().includes('icu') || patient.ward.toLowerCase().includes('ccu');
    }
    return true;
  });

  // Also match beds if query matches a bed code not already in patients
  const matchedBeds = query
    ? MOCK_BEDS.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          b.ward.toLowerCase().includes(query) ||
          (b.patientName && b.patientName.toLowerCase().includes(query))
      ).slice(0, 3)
    : [];

  const handlePatientClick = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsSearchFocused(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 lg:left-[17.5rem] right-0 h-16 bg-[#fcf9f3]/90 backdrop-blur-xl z-40 border-b border-black/5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] px-4 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Universal Patient Search */}
        <div ref={searchContainerRef} className="relative flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl bg-white shadow-sm border border-black/5 text-[#1c1c18] hover:bg-neutral-100"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          {/* Universal Patient Search Input */}
          <div className="relative w-full">
            <div className={`flex items-center w-full bg-white rounded-full px-3.5 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border transition-all ${
              isSearchFocused ? 'border-[#fcde6d] ring-2 ring-[#fcde6d]/30 shadow-md' : 'border-black/5'
            }`}>
              <span className="material-symbols-outlined text-neutral-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search patient by ID, UHID (e.g. 1001, 884102), name, or bed..."
                className="w-full bg-transparent text-[13px] text-[#1c1c18] outline-none placeholder:text-neutral-400"
              />

              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="w-5 h-5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center mr-1"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}

              {/* Quick Jump Buttons */}
              <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-black/10 shrink-0">
                <button 
                  onClick={() => onSelectView('clinical_rounds')}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0eee8] text-neutral-600 hover:bg-[#e5e2dc] transition-colors"
                >
                  Rounds
                </button>
                <button 
                  onClick={() => onSelectView('bed_matrix')}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0eee8] text-neutral-600 hover:bg-[#e5e2dc] transition-colors"
                >
                  Beds
                </button>
                <button 
                  onClick={() => onSelectView('discharge_hub')}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0eee8] text-neutral-600 hover:bg-[#e5e2dc] transition-colors"
                >
                  Discharges
                </button>
              </div>
            </div>

            {/* Live Global Patient Search Results Dropdown */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-black/10 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[30rem] flex flex-col overflow-hidden">
                {/* Search Meta & Filter Chips */}
                <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Filter:</span>
                    {[
                      { id: 'all', label: 'All Patients' },
                      { id: 'critical', label: 'Critical / High Acuity' },
                      { id: 'discharges', label: 'Discharges' },
                      { id: 'icu', label: 'ICU / CCU' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFilterCategory(tab.id as any)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                          activeFilterCategory === tab.id
                            ? 'bg-[#141416] text-white shadow-xs'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] font-mono font-bold text-neutral-400 shrink-0">
                    {matchedPatients.length} found
                  </span>
                </div>

                {/* Patient Results List */}
                <div className="overflow-y-auto divide-y divide-neutral-100 my-1 pr-1">
                  {matchedPatients.length > 0 ? (
                    matchedPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="p-3 rounded-2xl hover:bg-[#faf8f4] transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        onClick={() => handlePatientClick(patient)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono shrink-0 ${
                            patient.acuity === 'critical'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : patient.acuity === 'moderate'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {patient.bedId}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-neutral-900 group-hover:text-black">
                                {patient.name}
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold">
                                {patient.uhid}
                              </span>
                              <TriageIndicator level={patient.acuity || 'non_urgent'} size="xs" />
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                patient.status === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : patient.status === 'discharge_planned' || patient.status === 'cleared'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}>
                                {patient.status.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{patient.gender}, {patient.age}y</span>
                              <span>•</span>
                              <span className="font-medium text-neutral-700">{patient.ward}</span>
                              <span>•</span>
                              <span className="truncate max-w-[200px] text-neutral-600">{patient.diagnosis}</span>
                            </div>

                            {/* Vitals preview */}
                            <div className="text-[11px] font-mono text-neutral-500 mt-1 flex items-center gap-3">
                              <span>BP: <strong className="text-neutral-800">{patient.vitals.bp}</strong></span>
                              <span>Pulse: <strong className="text-neutral-800">{patient.vitals.pulse}</strong></span>
                              <span>SpO2: <strong className="text-emerald-700">{patient.vitals.spO2}%</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsSearchFocused(false);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold transition-colors"
                          >
                            Quick View
                          </button>
                          <button
                            onClick={() => {
                              onSelectView('clinical_rounds');
                              setIsSearchFocused(false);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>Open MAR</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-neutral-500">
                      <span className="material-symbols-outlined text-3xl text-neutral-300 mb-1">person_search</span>
                      <p className="text-xs font-semibold text-neutral-800">No matching patients found for "{searchQuery}"</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Try searching by UHID, bed code (e.g. B-302, M-104), or patient name.</p>
                    </div>
                  )}

                  {/* Bed matches if any */}
                  {matchedBeds.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-neutral-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 block mb-1">
                        Matching Hospital Beds
                      </span>
                      {matchedBeds.map((bed) => (
                        <div
                          key={bed.id}
                          onClick={() => {
                            onSelectView('bed_matrix');
                            setIsSearchFocused(false);
                          }}
                          className="p-2 rounded-xl hover:bg-neutral-50 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-neutral-900">{bed.id}</span>
                            <span className="text-neutral-500">({bed.ward})</span>
                            <span className="text-neutral-700 font-medium">{bed.patientName || 'Vacant / Sanitized'}</span>
                          </div>
                          <span className="text-[11px] font-bold text-[#756100]">View in Bed Matrix →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 px-2">
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 font-mono text-[10px] text-neutral-700">ESC</kbd> to dismiss</span>
                  <button
                    onClick={() => {
                      onSelectView('clinical_rounds');
                      setIsSearchFocused(false);
                    }}
                    className="font-bold text-[#756100] hover:underline"
                  >
                    View All Active Inpatients →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Code Status, Notifications, Settings, Profile */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Code Normal Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fcde6d]/30 border border-[#fcde6d]/40">
            <span className="w-2 h-2 rounded-full bg-[#705d00] animate-pulse"></span>
            <span className="text-[11px] font-bold text-[#544600] tracking-wide">Level 1 Code Normal</span>
          </div>

          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center relative text-neutral-700 shadow-sm border border-black/5 transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#dc2626]"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-black/10 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2 px-1">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Clinical Alerts & Telemetry</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">4 Active</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {MOCK_NOTIFICATIONS.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border border-neutral-100 text-left"
                      onClick={() => {
                        if (n.id === '1') onSelectView('clinical_rounds');
                        else if (n.id === '2') onSelectView('billing');
                        else if (n.id === '3') onSelectView('bed_matrix');
                        else onSelectView('reception');
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">{n.title}</span>
                        <span className="text-[10px] text-neutral-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1 leading-snug">{n.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-2 border-t border-neutral-100 text-center">
                  <button
                    onClick={() => {
                      onSelectView('ward_flow');
                      setShowNotifications(false);
                    }}
                    className="text-xs font-semibold text-neutral-900 hover:underline"
                  >
                    Open Full Ops Board →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Super Admin Hub Button */}
          {activeRole !== 'super_admin' && (
            <button
              onClick={() => {
                onSelectRole('super_admin');
                onSelectView('super_admin_panel');
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] text-[#fcde6d] hover:bg-neutral-800 text-xs font-bold shadow-xs border border-white/10 transition-all active:scale-95"
              title="Quick Access: Switch to Super Admin Console"
            >
              <span className="material-symbols-outlined text-[16px] text-[#fcde6d]">key</span>
              <span>Super Admin</span>
            </button>
          )}

          {/* Shift Handover Briefing Trigger */}
          {onOpenHandover && activeRole !== 'patient_portal' && (
            <button
              onClick={onOpenHandover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] text-[#ffd8ec] hover:bg-neutral-800 text-xs font-bold shadow-xs border border-white/10 transition-all active:scale-95"
              title="Open Shift Handover Briefing"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horizontal_circle</span>
              <span className="hidden sm:inline">Shift Handover</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-700 shadow-sm border border-black/5 transition-colors"
            title="Hospital Node Configuration"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>

          {/* Log Out / Lock Button */}
          <button
            onClick={() => {
              if (onLogout) onLogout();
              else onSelectView('login_portal');
            }}
            className="w-9 h-9 rounded-full bg-white hover:bg-red-50 hover:text-red-700 flex items-center justify-center text-neutral-600 shadow-sm border border-black/5 transition-colors"
            title="Log Out of Workstation"
          >
            <span className="material-symbols-outlined text-[19px]">logout</span>
          </button>

          {/* User Identity Pill with Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white hover:bg-neutral-100 border border-black/5 shadow-sm transition-all"
            >
              <div className="hidden md:flex flex-col text-right leading-tight">
                <span className="text-[12px] font-bold text-[#1c1c18]">{currentPersona.name}</span>
                <span className="text-[10px] text-neutral-500 truncate max-w-[130px]">{currentPersona.designation}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#141416] text-white flex items-center justify-center text-xs font-bold">
                {currentPersona.avatarInitials}
              </div>
            </button>

            {/* Persona Details & Sign Out Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-black/10 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="pb-3 mb-2 border-b border-neutral-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141416] text-white flex items-center justify-center font-bold text-sm">
                    {currentPersona.avatarInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs text-neutral-900 truncate">{currentPersona.name}</span>
                    <span className="text-[10px] text-neutral-500 truncate">{currentPersona.designation}</span>
                    <span className="text-[10px] font-mono text-neutral-400 truncate">{currentPersona.email}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Department:</span>
                    <span className="font-semibold text-neutral-800 text-right truncate max-w-[140px]">{currentPersona.department}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Security Clearance:</span>
                    <span className="font-bold text-emerald-700 uppercase text-[10px]">{activeRole.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Role Switcher with Shift Handover */}
                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block px-1 mb-1.5">
                    Switch Clinical Role & Handover:
                  </span>
                  <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
                    {[
                      { role: 'doctor', label: 'Doctor / Lead' },
                      { role: 'nurse', label: 'Charge Nurse' },
                      { role: 'bed_manager', label: 'Bed Flow COO' },
                      { role: 'billing', label: 'TPA & Billing' },
                      { role: 'reception', label: 'Reception / ER' },
                      { role: 'pharmacy', label: 'Pharmacy Lead' },
                      { role: 'housekeeping', label: 'Housekeeper' },
                      { role: 'hospital_admin', label: 'Medical Supt' },
                      { role: 'super_admin', label: 'IT Governance' },
                    ].map((item) => (
                      <button
                        key={item.role}
                        onClick={() => {
                          onSelectRole(item.role as RoleType);
                          setShowProfileMenu(false);
                        }}
                        className={`text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors truncate ${
                          activeRole === item.role
                            ? 'bg-[#141416] text-white'
                            : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-neutral-100 flex flex-col gap-1 text-xs">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) onLogout();
                      else onSelectView('login_portal');
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-left font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px]">logout</span>
                    <span>Sign Out of Workstation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Patient Detail Quick-View Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold font-mono text-xl shrink-0 ${
                  selectedPatient.acuity === 'critical'
                    ? 'bg-red-100 text-red-800 border-2 border-red-300'
                    : selectedPatient.acuity === 'moderate'
                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                }`}>
                  {selectedPatient.bedId}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-neutral-900">
                      {selectedPatient.name}
                    </h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      {selectedPatient.uhid}
                    </span>
                    <TriageIndicator level={selectedPatient.acuity} size="sm" />
                  </div>

                  <p className="text-xs text-neutral-500 mt-1">
                    {selectedPatient.gender}, {selectedPatient.age} yrs • Blood Group: <strong className="text-neutral-800">{selectedPatient.bloodGroup}</strong> • Ward: <strong className="text-neutral-800">{selectedPatient.ward}</strong>
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Attending: <strong className="text-neutral-900">{selectedPatient.attendingDoctor}</strong> • Admitted: {selectedPatient.admitDate}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Diagnosis & Vitals Bar */}
            <div className="py-4 space-y-4">
              <div className="bg-[#faf8f4] p-3.5 rounded-2xl border border-black/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Primary Clinical Diagnosis
                </span>
                <p className="text-sm font-bold text-neutral-900 leading-snug">
                  {selectedPatient.diagnosis}
                </p>
              </div>

              {/* Vitals Grid */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Bedside Continuous Telemetry
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">BP</span>
                    <span className="font-bold text-neutral-900 font-mono text-sm">{selectedPatient.vitals.bp}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">PULSE</span>
                    <span className="font-bold text-neutral-900 font-mono text-sm">{selectedPatient.vitals.pulse}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">SpO2</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">{selectedPatient.vitals.spO2}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">TEMP</span>
                    <span className="font-bold text-neutral-900 font-mono text-sm">{selectedPatient.vitals.temp}°F</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">RESP</span>
                    <span className="font-bold text-neutral-900 font-mono text-sm">{selectedPatient.vitals.respRate}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <span className="text-neutral-400 text-[10px] block font-bold">PAIN</span>
                    <span className="font-bold text-amber-700 font-mono text-sm">{selectedPatient.vitals.painScore}/10</span>
                  </div>
                </div>
              </div>

              {/* 24-Hour Continuous Telemetry Trend Chart */}
              <PatientVitalsTrend
                patientName={selectedPatient.name}
                bedId={`${selectedPatient.bedId} (${selectedPatient.ward})`}
                uhid={selectedPatient.uhid}
              />

              {/* TPA Insurance & Allergies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    TPA / Cashless Insurance
                  </span>
                  <div className="font-bold text-neutral-900">
                    {selectedPatient.tpaInsurance ? selectedPatient.tpaInsurance.provider : 'Direct Cash / Private'}
                  </div>
                  {selectedPatient.tpaInsurance && (
                    <div className="text-neutral-600 text-[11px] mt-1">
                      Pre-Auth: <strong>₹{selectedPatient.tpaInsurance.preAuthAmount.toLocaleString()}</strong> • Status: <span className="font-bold text-emerald-700 uppercase">{selectedPatient.tpaInsurance.status}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Known Allergies & Fall Risk
                  </span>
                  <div className="font-bold text-red-700">
                    {selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(', ') : 'No Known Drug Allergies (NKDA)'}
                  </div>
                  <div className="text-neutral-600 text-[11px] mt-1">
                    Fall Risk: <strong>{selectedPatient.fallRisk}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectView('bed_matrix');
                  setSelectedPatient(null);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hotel</span>
                View in Bed Matrix
              </button>
              <button
                onClick={() => {
                  onSelectView('discharge_hub');
                  setSelectedPatient(null);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">output</span>
                Check Discharge
              </button>
              <button
                onClick={() => {
                  onSelectView('clinical_rounds');
                  setSelectedPatient(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">medical_services</span>
                Open Clinical Rounds & MAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
