import React, { useState, useEffect } from 'react';
import { ViewType, RoleType } from '../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TriageIndicator } from '../common/TriageIndicator';
import { PatientQRCodeCard } from '../common/PatientQRCodeCard';
import { auditLogService } from '../../services/auditLogService';
import { alertSoundService, UserAlertSettings } from '../../services/alertSoundService';

interface ReceptionIntakeViewProps {
  onNavigate: (view: ViewType) => void;
  onSelectRole?: (role: RoleType) => void;
  onTriggerToast: (msg: string) => void;
}

interface NewPatientForm {
  fullName: string;
  phone: string;
  age: string;
  gender: string;
  complaint: string;
  acuity: 'emergent' | 'urgent' | 'non_urgent';
  assignedWard: string;
}

export const ReceptionIntakeView: React.FC<ReceptionIntakeViewProps> = ({
  onNavigate,
  onSelectRole,
  onTriggerToast,
}) => {
  const [filterQueue, setFilterQueue] = useState<'all' | 'triage' | 'admit'>('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState<{
    uhid: string;
    name: string;
    bay?: string;
    ward?: string;
    age?: number | string;
    gender?: string;
    triageAcuity?: 'emergent' | 'urgent' | 'non_urgent';
    qrToken?: string;
    token?: string;
  } | null>(null);

  const [formData, setFormData] = useState<NewPatientForm>({
    fullName: '',
    phone: '',
    age: '',
    gender: 'M',
    complaint: '',
    acuity: 'urgent',
    assignedWard: 'Surgical Recovery Bay 204',
  });

  const [alertSettings, setAlertSettings] = useState<UserAlertSettings>(alertSoundService.getSettings());

  useEffect(() => {
    const unsub = alertSoundService.subscribe((s) => setAlertSettings(s));
    return unsub;
  }, []);

  const queryClient = useQueryClient();

  const createPatientMutation = useMutation({
    mutationFn: async (patData: any) => {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patData),
      });
      if (!res.ok) throw new Error('Failed to create patient in DB');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => {
      console.error(err);
      onTriggerToast('Error saving patient to database!');
    }
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      onTriggerToast('Please enter the patient full name.');
      return;
    }

    const newUhid = `UH-${Math.floor(9000 + Math.random() * 900)}`;
    const newQrToken = `HOSFLOW-REG-${newUhid}-${Date.now().toString().slice(-4)}`;

    const newPat = {
      uhid: newUhid,
      name: formData.fullName,
      bay: formData.assignedWard,
      ward: formData.assignedWard,
      age: formData.age || '42',
      gender: formData.gender,
      triageAcuity: formData.acuity,
      qrToken: newQrToken,
      token: newQrToken,
    };

    // Call backend API via mutation
    createPatientMutation.mutate({
      uhid: newUhid,
      name: formData.fullName,
      age: parseInt(formData.age || '42', 10),
      gender: formData.gender,
      bloodGroup: 'Pending',
      ward: formData.assignedWard,
      diagnosis: formData.complaint || 'Triage Assessment Pending',
      attendingDoctor: 'Unassigned',
      status: 'Admitted',
      acuity: formData.acuity,
      fallRisk: 'Standard',
    });

    setRegisteredPatient(newPat);
    setShowRegisterModal(false);
    setShowQRModal(true);

    const isEmergent = formData.acuity === 'emergent';

    // Trigger browser-based audible alert notification if acuity is 'emergent'
    if (isEmergent) {
      const alertInfo = alertSoundService.notifyEmergentPatient({
        name: formData.fullName,
        uhid: newUhid,
        complaint: formData.complaint || 'Acute Emergency / Trauma',
      });

      auditLogService.addLog({
        actor: 'Pooja Kadam',
        role: 'Reception Desk Lead',
        action: `🚨 CODE RED EMERGENT ADMISSION: Admitted ${formData.fullName} [${newUhid}] to ${formData.assignedWard}. Complaint: "${formData.complaint || 'Acute Emergent Triage'}". ${
          alertInfo.soundPlayed
            ? 'Browser audible chime alarm sounded on workstation.'
            : 'Audible alert muted via User Settings.'
        }`,
        category: 'patient_admission',
        severity: 'critical',
        status: 'ALERT',
      });

      onTriggerToast(
        alertInfo.soundPlayed
          ? `🚨 CODE RED ALERT: Emergent patient ${formData.fullName} [${newUhid}] added! Audible chime played 🔔`
          : `🚨 CODE RED ALERT: Emergent patient ${formData.fullName} [${newUhid}] added (Audible alert muted in settings 🔕)`
      );
    } else {
      auditLogService.addLog({
        actor: 'Pooja Kadam',
        role: 'Reception Desk Lead',
        action: `Patient Admission: Admitted ${formData.fullName} [${newUhid}] to ${formData.assignedWard} (${formData.acuity.toUpperCase()}). Generated dynamic Check-in QR Pass.`,
        category: 'patient_admission',
        severity: 'success',
        status: 'VERIFIED',
      });

      onTriggerToast(`Admitted ${formData.fullName} [${newUhid}]. Generated Patient Portal QR Pass.`);
    }
  };

  const handleQuickEmergentIntake = () => {
    const emergentPatients = [
      { name: 'Sanjay S. Gupta', age: '54', gender: 'M', complaint: 'Acute STEMI / Anterior Wall Infarction', ward: 'ER Resus Bay 01' },
      { name: 'Rupali Deshmukh', age: '29', gender: 'F', complaint: 'Severe Anaphylactic Shock & Stridor', ward: 'ICU Bay 03 (Critical Care)' },
      { name: 'Vikramaditya Rao', age: '67', gender: 'M', complaint: 'Acute Hemorrhagic Stroke / Code Neuro', ward: 'Bay 204 (Surgical Recovery Wing)' },
    ];
    const pick = emergentPatients[Math.floor(Math.random() * emergentPatients.length)];
    const newUhid = `UH-${Math.floor(9000 + Math.random() * 900)}`;
    const newQrToken = `HOSFLOW-REG-${newUhid}-${Date.now().toString().slice(-4)}`;

    const newPat = {
      uhid: newUhid,
      name: pick.name,
      bay: pick.ward,
      ward: pick.ward,
      age: pick.age,
      gender: pick.gender,
      triageAcuity: 'emergent' as const,
      qrToken: newQrToken,
      token: newQrToken,
    };

    createPatientMutation.mutate({
      uhid: newUhid,
      name: pick.name,
      age: parseInt(pick.age || '42', 10),
      gender: pick.gender,
      bloodGroup: 'Pending',
      ward: pick.ward,
      diagnosis: pick.complaint,
      attendingDoctor: 'Unassigned',
      status: 'Admitted',
      acuity: 'emergent',
      fallRisk: 'Standard',
    });

    setRegisteredPatient(newPat);
    setShowQRModal(true);

    const alertInfo = alertSoundService.notifyEmergentPatient({
      name: pick.name,
      uhid: newUhid,
      complaint: pick.complaint,
    });

    auditLogService.addLog({
      actor: 'Pooja Kadam',
      role: 'Reception Desk Lead',
      action: `🚨 EXPRESS TRAUMA INTAKE: Admitted Emergent patient ${pick.name} [${newUhid}] to ${pick.ward} (${pick.complaint}). ${
        alertInfo.soundPlayed
          ? 'Browser audible chime alarm sounded on workstation.'
          : 'Audible alert muted via User Settings.'
      }`,
      category: 'patient_admission',
      severity: 'critical',
      status: 'ALERT',
    });

    onTriggerToast(
      alertInfo.soundPlayed
        ? `🚨 CODE RED INTAKE: ${pick.name} [${newUhid}] admitted to ${pick.ward}! Audible chime played 🔔`
        : `🚨 CODE RED INTAKE: ${pick.name} [${newUhid}] admitted to ${pick.ward} (Audible alert muted in settings 🔕)`
    );
  };

  const handleSimulateScanAndLaunchPortal = () => {
    auditLogService.addLog({
      actor: registeredPatient?.name || 'Harish Mehta',
      role: 'Patient / Attendant',
      action: `Patient Check-in QR Scanned: Verified session token for ${registeredPatient?.name || 'Harish Mehta'} [${registeredPatient?.uhid || 'UH-9402'}]. Launched dedicated patient companion dashboard.`,
      category: 'auth',
      severity: 'info',
      status: 'VERIFIED',
    });

    if (onSelectRole) {
      onSelectRole('patient_portal');
    }
    onNavigate('patient_self_checkin');
    setShowQRModal(false);
    onTriggerToast(`QR Code scanned successfully! Authenticated patient self-check-in session for ${registeredPatient?.name || 'Harish Mehta'}.`);
  };


  return (
    <div className="flex flex-col w-full gap-6 pb-12 font-['Inter',sans-serif]">
      {/* TOP CONTEXT STRIP */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-[0_4px_20px_-2px_rgba(20,20,22,0.04)] border border-black/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fcde6d] flex items-center justify-center text-[#756100] shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[24px]">desk</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-neutral-900 tracking-tight font-['Plus_Jakarta_Sans']">
                Front Intake &amp; Emergency Desk
              </span>
              <span className="text-neutral-400">•</span>
              <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-3 py-0.5 rounded-full">
                Counter 01 (Central Lobby)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Active Operator:</span>
              <span className="font-bold text-neutral-900">Pooja Kadam</span>
              <span className="text-neutral-500">(Senior Patient Care Executive • ID #PC-4482)</span>
            </div>
          </div>
        </div>

        {/* Live System Station Badges */}
        <div className="flex items-center gap-2.5 self-stretch lg:self-auto justify-between lg:justify-end flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#f6f3ed] px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-[#705d00] animate-ping"></span>
            <span>Lobby Camera AI Synced</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#f6f3ed] px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-600">
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>UHID Thermal: Ready</span>
          </div>
          <button
            onClick={() => onTriggerToast('Handover report compiled for Evening Reception Shift.')}
            className="bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">sync_alt</span>
            Handover Desk
          </button>
        </div>
      </div>

      {/* 4 SIGNATURE PASTEL METRICS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Yellow Pastel: Today's Footfall */}
        <div className="bg-[#fcde6d]/50 hover:bg-[#fcde6d]/65 transition-all p-6 rounded-2xl shadow-sm border border-[#fcde6d]/60 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#544600]">
                Shift Intake Volume
              </span>
              <span className="text-3xl font-extrabold text-[#221b00] font-['Plus_Jakarta_Sans'] mt-1">
                142
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#fcde6d] flex items-center justify-center text-[#756100]">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="bg-white/80 px-2.5 py-0.5 rounded-full font-bold text-neutral-900">84 OPD</span>
            <span className="bg-white/80 px-2.5 py-0.5 rounded-full font-bold text-neutral-900">38 IPD</span>
            <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold">20 ER</span>
          </div>
        </div>

        {/* Pink Pastel: Average Wait Time */}
        <div className="bg-[#ffd8ec]/60 hover:bg-[#ffd8ec]/75 transition-all p-6 rounded-2xl shadow-sm border border-[#ffd8ec]/80 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#653855]">
                Average Wait Time
              </span>
              <span className="text-3xl font-extrabold text-[#330c28] font-['Plus_Jakarta_Sans'] mt-1">
                4.2 <span className="text-base font-normal">mins</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#ffd8ec] flex items-center justify-center text-[#330c28]">
              <span className="material-symbols-outlined text-[20px]">timer</span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex items-center gap-1 text-xs text-[#653855]">
            <span className="material-symbols-outlined text-[15px] text-[#330c28]">trending_down</span>
            <span className="font-bold text-[#330c28]">-2.0m vs yesterday</span>
            <span>• Token pacing on target</span>
          </div>
        </div>

        {/* Green Pastel: Bays Available */}
        <div className="bg-white hover:bg-neutral-50 transition-all p-6 rounded-2xl shadow-sm border border-black/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Direct Admit Bays
              </span>
              <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans'] mt-1">
                45 <span className="text-base font-normal text-neutral-500">Vacant</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
              <span className="material-symbols-outlined text-[20px]">single_bed</span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="bg-neutral-100 px-2.5 py-0.5 rounded-full text-neutral-900 font-bold">12 ICU</span>
            <span className="bg-neutral-100 px-2.5 py-0.5 rounded-full text-neutral-900 font-bold">18 General</span>
            <span className="bg-neutral-100 px-2.5 py-0.5 rounded-full text-neutral-900 font-bold">15 Semi-Pvt</span>
          </div>
        </div>

        {/* Blue/Soft Lavender Pastel: Queue in Lobby */}
        <div className="bg-[#ebe8e2]/60 hover:bg-[#ebe8e2] transition-all p-6 rounded-2xl shadow-sm border border-black/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Queue in Lobby
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">6</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#fcde6d] animate-pulse"></span>
                <span className="text-xs font-semibold text-neutral-600">Waiting Now</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-neutral-800 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </div>
          </div>
          <div className="mt-4 pt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
            <span className="bg-white px-2 py-0.5 rounded-full font-medium">3 Triage</span>
            <span className="bg-white px-2 py-0.5 rounded-full font-medium">2 Insurance</span>
            <span className="bg-white px-2 py-0.5 rounded-full font-medium">1 Billing</span>
          </div>
        </div>
      </div>

      {/* MAIN OPERATIONAL GRID (Asymmetrical 12-column layout) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* MAIN LEFT & CENTER WORKFLOW AREA (xl:col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* FAST PATIENT INTAKE ACTION BAR & SEARCH */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Universal Patient Lookup */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Lookup Phone, Aadhaar (UIDAI), or UHID (e.g. UH-2024-984)..."
                  className="w-full pl-11 pr-14 py-2.5 bg-[#f6f3ed] text-neutral-900 text-xs rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-[#fcde6d] transition-all placeholder:text-neutral-400"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                  ⌘ K
                </span>
              </div>

              {/* Fast Scan Button */}
              <button
                onClick={() => onTriggerToast('ABHA QR Scanner initiated. Camera stream connected.')}
                className="bg-[#f0eee8] hover:bg-[#e5e2dc] text-neutral-800 font-bold text-xs px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                Scan Ayushman / ABHA QR
              </button>
            </div>

            {/* Fast-Track Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="group bg-[#141416] text-white hover:bg-neutral-800 p-4 rounded-xl transition-all flex items-center justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[20px]">person_add</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs leading-tight">+ New Registration</span>
                    <span className="text-[10px] text-neutral-400">Fast-Track OPD / IPD Intake</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-neutral-400 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <button
                onClick={handleQuickEmergentIntake}
                className="group bg-red-100 hover:bg-red-200 text-red-900 p-4 rounded-xl transition-all flex items-center justify-between border border-red-300/80 shadow-xs hover:shadow-md active:scale-95"
                title="Admit an Emergent Code Red patient and trigger the browser audible alert notification"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center animate-pulse shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-red-900 leading-tight">Emergency Code Red</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-200 text-red-900 rounded">
                        {alertSettings.emergentAudibleAlerts ? '🔔 Audio On' : '🔕 Muted'}
                      </span>
                    </div>
                    <span className="text-[10px] text-red-700 font-medium">Instant Emergent Intake &amp; Audible Alert</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-red-700 group-hover:translate-x-1 transition-transform">
                  volume_up
                </span>
              </button>

              <button
                onClick={() => onTriggerToast('Visitor pass terminal ready. Tap NFC card on counter.')}
                className="group bg-[#f6f3ed] hover:bg-[#ebe8e2] text-neutral-900 p-4 rounded-xl transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs leading-tight">Issue Visitor Pass</span>
                    <span className="text-[10px] text-neutral-500">Ward / ICU Biometric Tag</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-neutral-500 group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {/* LIVE LOBBY TOKEN QUEUE MATRIX */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#141416] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[18px]">list_alt</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                    Live Lobby Token Matrix
                  </span>
                  <span className="text-xs text-neutral-500">
                    Real-time triage, admissions &amp; verification staging
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider mr-1">Filter:</span>
                <button
                  onClick={() => setFilterQueue('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    filterQueue === 'all'
                      ? 'bg-[#141416] text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  All (4)
                </button>
                <button
                  onClick={() => setFilterQueue('triage')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    filterQueue === 'triage'
                      ? 'bg-[#141416] text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Triage
                </button>
                <button
                  onClick={() => setFilterQueue('admit')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    filterQueue === 'admit'
                      ? 'bg-[#141416] text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Admissions
                </button>
              </div>
            </div>

            {/* Token Queue Items Stack */}
            <div className="flex flex-col gap-3 mt-1">
              {/* Token 1: Urgent Chest Pain -> ER Escort */}
              {(filterQueue === 'all' || filterQueue === 'triage') && (
                <div className="bg-red-50/80 border border-red-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-red-100/70">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="px-3.5 py-2 bg-red-600 text-white font-bold text-base rounded-xl flex flex-col items-center justify-center min-w-[64px] shadow-sm">
                      <span className="font-bold tracking-tight">#A-24</span>
                      <span className="text-[10px] leading-tight opacity-90 uppercase">EMERG</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">Rahul Sharma</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-neutral-600 font-mono">42M</span>
                        <TriageIndicator level="emergent" size="xs" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 flex-wrap">
                        <span className="flex items-center gap-1 text-red-700 font-bold">
                          <span className="material-symbols-outlined text-[15px]">warning</span> Chest Discomfort &amp; Diaphoresis
                        </span>
                        <span>•</span>
                        <span>Arrived: 08:38 IST (4m ago)</span>
                        <span>•</span>
                        <span className="font-mono">UHID: UH-9402</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <span className="text-[11px] bg-white text-neutral-800 px-3 py-1 rounded-full font-bold border border-red-200">
                      Bay ER-01 Prepped
                    </span>
                    <button
                      onClick={() => onTriggerToast('Patient Rahul Sharma escorted to Trauma Bay ER-01. Resuscitation team active.')}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">directions_run</span>
                      Instant ER Escort
                    </button>
                  </div>
                </div>
              )}

              {/* Token 2: Scheduled Ortho Admit -> Bed S-204 */}
              {(filterQueue === 'all' || filterQueue === 'admit') && (
                <div className="bg-[#f6f3ed] hover:bg-neutral-100 p-4 rounded-xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="px-3.5 py-2 bg-[#fcde6d] text-[#221b00] font-bold text-base rounded-xl flex flex-col items-center justify-center min-w-[64px] shadow-sm">
                      <span className="font-bold tracking-tight">#B-12</span>
                      <span className="text-[10px] leading-tight uppercase font-semibold">Admit</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">Smt. Anjali Joshi</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-neutral-600 font-mono">68F</span>
                        <TriageIndicator level="urgent" size="xs" />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          Ortho IPD Scheduled
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 flex-wrap">
                        <span>Dr. Rajesh Patil (TKR Procedure)</span>
                        <span>•</span>
                        <span>TPA Pre-Auth Cleared</span>
                        <span>•</span>
                        <span className="text-[#705d00] font-bold">Allocated: Bed S-204 (Semi-Private)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => {
                        setRegisteredPatient({
                          uhid: 'UH-9402',
                          name: 'Smt. Anjali Joshi',
                          bay: 'Bed S-204',
                          ward: 'Ortho Recovery Ward (Bed S-204)',
                          age: 68,
                          gender: 'F',
                          triageAcuity: 'urgent',
                          token: 'HOSFLOW-REG-UH-9402-9812',
                        });
                        setShowQRModal(true);
                        onTriggerToast('Loaded check-in QR pass for Smt. Anjali Joshi.');
                      }}
                      className="bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] font-bold text-xs px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                      QR Pass
                    </button>
                    <button
                      onClick={() => onTriggerToast('Wristband Tag printed for Smt. Anjali Joshi.')}
                      className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      Wristband Tag
                    </button>
                    <button
                      onClick={() => onTriggerToast('Admission confirmed. Porter assigned to escort to Bed S-204.')}
                      className="bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Confirm Admission
                    </button>
                  </div>
                </div>
              )}

              {/* Token 3: ICU Visitor Pass */}
              {filterQueue === 'all' && (
                <div className="bg-[#f6f3ed] hover:bg-neutral-100 p-4 rounded-xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="px-3.5 py-2 bg-neutral-200 text-neutral-800 font-bold text-base rounded-xl flex flex-col items-center justify-center min-w-[64px]">
                      <span className="font-bold tracking-tight">#C-08</span>
                      <span className="text-[10px] leading-tight uppercase font-semibold text-neutral-500">VISIT</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">Manoj R. Patil</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-neutral-600">Relative (Son)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffd8ec] text-[#330c28]">
                          ICU Attendant Pass
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 flex-wrap">
                        <span>Visiting: Ramesh Patil (ICU Bay 04)</span>
                        <span>•</span>
                        <span>Aadhaar Verified</span>
                        <span>•</span>
                        <span>Slot: 09:00 - 10:00 AM</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <span className="text-[11px] text-neutral-600 bg-white px-3 py-1 rounded-full flex items-center gap-1 border border-neutral-200">
                      <span className="material-symbols-outlined text-[14px] text-[#705d00]">fingerprint</span>
                      Biometric Ready
                    </span>
                    <button
                      onClick={() => onTriggerToast('NFC Badge #NFC-ICU-08 activated for Manoj R. Patil.')}
                      className="bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      Issue NFC Badge
                    </button>
                  </div>
                </div>
              )}

              {/* Token 4: General OPD Intake Verification */}
              {filterQueue === 'all' && (
                <div className="bg-[#f6f3ed] hover:bg-neutral-100 p-4 rounded-xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start md:items-center gap-4">
                    <div className="px-3.5 py-2 bg-neutral-200 text-neutral-800 font-bold text-base rounded-xl flex flex-col items-center justify-center min-w-[64px]">
                      <span className="font-bold tracking-tight">#D-31</span>
                      <span className="text-[10px] leading-tight uppercase font-semibold text-neutral-500">OPD</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">Sunita Deshmukh</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-neutral-600 font-mono">34F</span>
                        <TriageIndicator level="non_urgent" size="xs" />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                          Cardiology Consultation
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 flex-wrap">
                        <span>Dr. Ashok Parekh (Room 102)</span>
                        <span>•</span>
                        <span>Online Booking #CP-771</span>
                        <span>•</span>
                        <span>Fee Paid (UPI)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => onTriggerToast('Patient Sunita Deshmukh token routed to Cardiology Room 102 display.')}
                      className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm border border-black/5"
                    >
                      <span className="material-symbols-outlined text-[16px]">forward</span>
                      Send to Room 102
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QUICK BED AVAILABILITY MINI-MATRIX BY WARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#fcde6d] flex items-center justify-center text-[#756100]">
                  <span className="material-symbols-outlined text-[18px]">bed</span>
                </div>
                <div>
                  <span className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                    Quick Bed Allocation Matrix
                  </span>
                  <p className="text-xs text-neutral-500">
                    Real-time occupancy synced with Housekeeping Hub &amp; Nursing Stations
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('bed_matrix')}
                className="text-xs font-bold text-neutral-900 hover:text-black hover:underline flex items-center gap-1"
              >
                Full Visual Floor Plan
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Ward 1: General Ward */}
              <div className="bg-[#f6f3ed] p-4 rounded-xl flex flex-col justify-between gap-3 hover:shadow-md transition-all border border-black/5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-neutral-900">General Ward</span>
                    <p className="text-[11px] text-neutral-500">Wing B • Floor 2</p>
                  </div>
                  <span className="bg-[#fcde6d] text-[#221b00] text-xs px-2 py-0.5 rounded-full font-bold">
                    18 Free
                  </span>
                </div>
                <div className="w-full bg-[#e5e2dc] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#705d00] h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
                <div className="flex items-center justify-between text-neutral-600 text-xs font-medium">
                  <span>Total: 65 Beds</span>
                  <span>47 Occupied</span>
                </div>
                <button
                  onClick={() => onTriggerToast('Reserved 1 General Bed in Wing B.')}
                  className="w-full bg-white hover:bg-[#141416] hover:text-white text-neutral-900 text-xs font-bold py-1.5 rounded-full transition-all flex items-center justify-center gap-1 shadow-xs border border-black/5"
                >
                  <span className="material-symbols-outlined text-[15px]">add_circle</span>
                  Quick Reserve
                </button>
              </div>

              {/* Ward 2: ICU / Critical Care */}
              <div className="bg-red-50/60 p-4 rounded-xl flex flex-col justify-between gap-3 hover:shadow-md transition-all border border-red-200">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-neutral-900">ICU / CCU</span>
                    <p className="text-[11px] text-neutral-500">Tower A • Floor 3</p>
                  </div>
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    2 Free
                  </span>
                </div>
                <div className="w-full bg-red-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full rounded-full" style={{ width: '90%' }}></div>
                </div>
                <div className="flex items-center justify-between text-neutral-600 text-xs font-medium">
                  <span>Total: 20 Beds</span>
                  <span className="text-red-700 font-bold">High Occupancy</span>
                </div>
                <button
                  onClick={() => onTriggerToast('ICU Critical Care bed reserved for emergency intake.')}
                  className="w-full bg-red-600 text-white hover:bg-red-700 text-xs font-bold py-1.5 rounded-full transition-all flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">notification_important</span>
                  Reserve (ER Priority)
                </button>
              </div>

              {/* Ward 3: Deluxe Private */}
              <div className="bg-[#f6f3ed] p-4 rounded-xl flex flex-col justify-between gap-3 hover:shadow-md transition-all border border-black/5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-neutral-900">Deluxe Suites</span>
                    <p className="text-[11px] text-neutral-500">Tower C • Floor 4 &amp; 5</p>
                  </div>
                  <span className="bg-[#ffd8ec] text-[#330c28] text-xs px-2 py-0.5 rounded-full font-bold">
                    6 Free
                  </span>
                </div>
                <div className="w-full bg-[#e5e2dc] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#a97494] h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
                <div className="flex items-center justify-between text-neutral-600 text-xs font-medium">
                  <span>Total: 15 Suites</span>
                  <span>9 Occupied</span>
                </div>
                <button
                  onClick={() => onTriggerToast('Deluxe Suite reserved in Tower C.')}
                  className="w-full bg-white hover:bg-[#141416] hover:text-white text-neutral-900 text-xs font-bold py-1.5 rounded-full transition-all flex items-center justify-center gap-1 shadow-xs border border-black/5"
                >
                  <span className="material-symbols-outlined text-[15px]">add_circle</span>
                  Quick Reserve
                </button>
              </div>

              {/* Ward 4: Daycare Surgery */}
              <div className="bg-[#f6f3ed] p-4 rounded-xl flex flex-col justify-between gap-3 hover:shadow-md transition-all border border-black/5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm text-neutral-900">Daycare Unit</span>
                    <p className="text-[11px] text-neutral-500">Ground Floor • West</p>
                  </div>
                  <span className="bg-neutral-200 text-neutral-800 text-xs px-2 py-0.5 rounded-full font-bold">
                    12 Free
                  </span>
                </div>
                <div className="w-full bg-[#e5e2dc] h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-500 h-full rounded-full" style={{ width: '40%' }}></div>
                </div>
                <div className="flex items-center justify-between text-neutral-600 text-xs font-medium">
                  <span>Total: 20 Rec. Bays</span>
                  <span>8 Short-Stay</span>
                </div>
                <button
                  onClick={() => onTriggerToast('Daycare recovery bay assigned.')}
                  className="w-full bg-white hover:bg-[#141416] hover:text-white text-neutral-900 text-xs font-bold py-1.5 rounded-full transition-all flex items-center justify-center gap-1 shadow-xs border border-black/5"
                >
                  <span className="material-symbols-outlined text-[15px]">add_circle</span>
                  Quick Reserve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT OPERATIONS & DOCTOR SCHEDULE RAIL (xl:col-span-4) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* INBOUND EMERGENCY AMBULANCE RADAR CARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 relative overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Ambulance Tracker
                </span>
              </div>
              <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Trauma Alert
              </span>
            </div>

            <div className="bg-red-50/70 border border-red-200 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 text-[22px]">emergency</span>
                  <span className="font-bold text-sm text-neutral-900">Ambulance 04</span>
                </div>
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  ETA 6 mins
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-lg text-center border border-red-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">SpO2</span>
                  <span className="text-base font-mono font-bold text-red-600">88%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Pulse</span>
                  <span className="text-base font-mono font-bold text-neutral-900">114 bpm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">GCS</span>
                  <span className="text-base font-mono font-bold text-neutral-900">E3V4M5</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Enroute via SG Highway</span>
                <span className="font-bold text-neutral-900">Designated: ER Bay 02</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span className="material-symbols-outlined text-[18px] text-[#705d00]">check_circle</span>
              <span>Trauma Team Beta Paged &amp; Ventilator Pre-heated</span>
            </div>

            <button
              onClick={() => onTriggerToast('Live Ambulance Telemetry Feed connected to ER Central Station.')}
              className="w-full bg-[#141416] text-white hover:bg-neutral-800 text-xs font-bold py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
              Open Live Telemetry Feed
            </button>
          </div>

          {/* LIVE DOCTOR OPD AVAILABILITY & SLOTS */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-neutral-800">stethoscope</span>
                <span className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Doctor OPD Status
                </span>
              </div>
              <span className="text-xs text-neutral-500">32 Active Clinicians</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Doctor 1: Dr. Ashok Parekh */}
              <div className="bg-[#f6f3ed] p-3 rounded-xl flex items-center justify-between gap-3 border border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#fcde6d] flex items-center justify-center text-[#756100] font-bold text-sm">
                    AP
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-neutral-900">Dr. Ashok Parekh</span>
                    <span className="text-[11px] text-neutral-500">Cardiology • Room 102</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-white text-neutral-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-200">
                    3 in queue
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Next: 09:00 AM</span>
                </div>
              </div>

              {/* Doctor 2: Dr. Priya Sen */}
              <div className="bg-[#f6f3ed] p-3 rounded-xl flex items-center justify-between gap-3 border border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-800 font-bold text-sm">
                    PS
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-neutral-900">Dr. Priya Sen</span>
                    <span className="text-[11px] text-neutral-500">General Medicine • Room 105</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-[#fcde6d] text-[#221b00] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#705d00]"></span>
                    On Time
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Consulting Token #04</span>
                </div>
              </div>

              {/* Doctor 3: Dr. Rajesh Patil (In OT) */}
              <div className="bg-[#f6f3ed] p-3 rounded-xl flex items-center justify-between gap-3 border border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-800 font-bold text-sm">
                    RP
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-neutral-900">Dr. Rajesh Patil</span>
                    <span className="text-[11px] text-neutral-500">Orthopedics • OT Complex</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-neutral-200 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    In OT till 11:30
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Delayed OPD Intake</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onTriggerToast('OPD Roster: 18 departments active across Pune Central wings.')}
              className="w-full bg-[#f0eee8] hover:bg-[#e5e2dc] text-neutral-800 text-xs font-bold py-2 rounded-full transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_view_day</span>
              View All 18 Department Rosters
            </button>
          </div>

          {/* FRONT DESK INSTANT DISPATCH & UTILITIES */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col gap-3">
            <span className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
              Desk Rapid Actions
            </span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onTriggerToast('UHID Barcode card printer test pattern sent.')}
                className="w-full bg-[#f6f3ed] hover:bg-[#ebe8e2] text-neutral-900 p-3 rounded-xl transition-all flex items-center justify-between text-left border border-black/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
                    <span className="material-symbols-outlined text-[18px]">barcode</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs leading-tight">Print UHID Barcode Card</span>
                    <span className="text-[10px] text-neutral-500">Adhesive Wristband + IPD Sheet</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-neutral-400">print</span>
              </button>

              <button
                onClick={() => onTriggerToast('Complimentary Attendant Meal QR voucher printed.')}
                className="w-full bg-[#f6f3ed] hover:bg-[#ebe8e2] text-neutral-900 p-3 rounded-xl transition-all flex items-center justify-between text-left border border-black/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
                    <span className="material-symbols-outlined text-[18px]">local_cafe</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs leading-tight">Issue Guest Cafeteria &amp; Parking Voucher</span>
                    <span className="text-[10px] text-neutral-500">Complimentary Attendant Meal QR</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-neutral-400">confirmation_number</span>
              </button>

              <button
                onClick={() => onTriggerToast('Porter Ramesh (#P-12) dispatched to Lobby Counter 01 with wheelchair.')}
                className="w-full bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] p-3 rounded-xl transition-all flex items-center justify-between text-left shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#705d00] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">accessible</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs leading-tight">Call Porter / Wheelchair Assistance</span>
                    <span className="text-[10px] text-[#756100]">1-Click Dispatch to Central Porch</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#705d00]">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: New Patient Registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#fcde6d]/30 text-[#756100]">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </span>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                    Fast-Track Patient Intake &amp; Admission
                  </h3>
                  <span className="text-xs text-neutral-500">Generates instant UHID &amp; Patient Portal QR</span>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harish Mehta"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Attendant Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="98230 44912"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Age</label>
                    <input
                      type="number"
                      placeholder="61"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-2 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-semibold"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Clinical Chief Complaint</label>
                <input
                  type="text"
                  placeholder="e.g. Acute abdominal pain, post-op observation"
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-700 font-bold">Triage Acuity Level</label>
                    {formData.acuity === 'emergent' && (
                      <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">volume_up</span>
                        {alertSettings.emergentAudibleAlerts ? 'Audio Alert Armed' : 'Muted'}
                      </span>
                    )}
                  </div>
                  <select
                    value={formData.acuity}
                    onChange={(e) => setFormData({ ...formData, acuity: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-bold"
                  >
                    <option value="emergent">Emergent (Immediate / Red)</option>
                    <option value="urgent">Urgent (15-30m / Yellow)</option>
                    <option value="non_urgent">Non-Urgent (Standard / Green)</option>
                  </select>
                  {formData.acuity === 'emergent' && (
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {alertSettings.emergentAudibleAlerts
                        ? '🔔 Audible browser chime will sound when this patient is registered.'
                        : '🔕 Audible alert is disabled in User Settings.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Assigned Bay / Suite</label>
                  <select
                    value={formData.assignedWard}
                    onChange={(e) => setFormData({ ...formData, assignedWard: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-semibold"
                  >
                    <option value="Bay 204 (Surgical Recovery Wing)">Bay 204 (Surgical Recovery Wing)</option>
                    <option value="Bed S-202 (Surgical Ward)">Bed S-202 (Surgical Ward)</option>
                    <option value="ICU Bay 03 (Critical Care)">ICU Bay 03 (Critical Care)</option>
                    <option value="Deluxe Suite 401">Deluxe Suite 401</option>
                    <option value="ER Resus Bay 01">ER Resus Bay 01</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  Generate Admission &amp; QR Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR Code Generated (Scan to launch User Dashboard) */}
      {showQRModal && registeredPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PatientQRCodeCard
            patient={{
              uhid: registeredPatient.uhid,
              name: registeredPatient.name,
              ward: registeredPatient.ward || registeredPatient.bay,
              bed: registeredPatient.bay,
              age: registeredPatient.age,
              gender: registeredPatient.gender,
              triageAcuity: registeredPatient.triageAcuity,
              token: registeredPatient.token || registeredPatient.qrToken,
            }}
            onSimulateScan={handleSimulateScanAndLaunchPortal}
            onClose={() => setShowQRModal(false)}
            onTriggerToast={onTriggerToast}
          />
        </div>
      )}
    </div>
  );
};
