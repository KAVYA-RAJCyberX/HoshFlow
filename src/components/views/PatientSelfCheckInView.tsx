import React, { useState, useEffect } from 'react';
import { ViewType, PatientRecord } from '../../types';
import { generateQRCodeDataURL, createPatientCheckInPayload, downloadQRCodePNG } from '../../utils/qrCodeGenerator';
import { TriageIndicator } from '../common/TriageIndicator';
import { useQuery } from '@tanstack/react-query';

interface PatientSelfCheckInViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
  initialPatientId?: string;
}

interface ArrivalRecord {
  patientId: string;
  uhid: string;
  name: string;
  timestamp: string;
  kioskId: string;
  token: string;
  ward: string;
  bedId: string;
  confirmed: boolean;
}

export const PatientSelfCheckInView: React.FC<PatientSelfCheckInViewProps> = ({
  onNavigate,
  onTriggerToast,
  initialPatientId = 'UH-9402',
}) => {
  // Fetch actual patients from backend
  const { data: dbPatients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/patients', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    }
  });

  const availablePatients = dbPatients.slice(0, 5).map((p: any) => ({
    ...p,
    token: `HOSFLOW-REG-${p.uhid}-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: '+91 98220 14820', // Mock phone
  }));

  // Fallback if db is empty
  if (availablePatients.length === 0) {
    availablePatients.push({
      id: 'P-9402',
      uhid: 'UH-9402',
      name: 'Harish Mehta',
      age: 61,
      gender: 'M',
      ward: 'Bay 204 (Surgical Recovery Wing)',
      bedId: 'Bay 204',
      diagnosis: 'Post-Op Knee Arthroplasty (Physical Rehab Staging)',
      attendingDoctor: 'Dr. Vikram Kulkarni',
      acuity: 'urgent',
      phone: '+91 98220 14820',
      token: 'HOSFLOW-REG-UH-9402-4921',
    });
  }

  const [selectedUhid, setSelectedUhid] = useState<string>(initialPatientId);
  const [customUhidInput, setCustomUhidInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr_pass' | 'scanner' | 'arrival_status'>('qr_pass');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannedTokenInput, setScannedTokenInput] = useState<string>('');
  const [arrivalRecord, setArrivalRecord] = useState<ArrivalRecord | null>(null);

  // Find active patient record
  const currentPatient =
    availablePatients.find((p) => p.uhid.toLowerCase() === selectedUhid.toLowerCase()) ||
    availablePatients[0];

  const activeToken = currentPatient.token || `HOSFLOW-REG-${currentPatient.uhid}-8821`;

  // Generate dynamic QR code whenever the selected patient changes
  useEffect(() => {
    let mounted = true;
    setIsGeneratingQr(true);

    const payload = createPatientCheckInPayload({
      uhid: currentPatient.uhid,
      name: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      ward: currentPatient.ward,
      bed: currentPatient.bedId,
      triageAcuity: currentPatient.acuity,
      token: activeToken,
    });

    generateQRCodeDataURL(payload, {
      width: 440,
      margin: 2,
      darkColor: '#141416',
      lightColor: '#ffffff',
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (mounted) {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate check-in QR code:', err);
        if (mounted) {
          setIsGeneratingQr(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentPatient.uhid, currentPatient.name, activeToken]);

  // Handle confirming arrival
  const handleConfirmArrival = (source: string = 'Digital QR Pass') => {
    const record: ArrivalRecord = {
      patientId: currentPatient.id,
      uhid: currentPatient.uhid,
      name: currentPatient.name,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      kioskId: 'Central Lobby Kiosk #01',
      token: activeToken,
      ward: currentPatient.ward,
      bedId: currentPatient.bedId,
      confirmed: true,
    };

    setArrivalRecord(record);
    setActiveTab('arrival_status');

    // Record audit event in governance ledger via backend
    const tokenStr = localStorage.getItem('hosflow_jwt');
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStr}` },
      body: JSON.stringify({
        actor: currentPatient.name,
        role: 'Patient / Attendant',
        action: `Patient Self-Check-in Arrival Confirmed: Scanned reception QR pass [${activeToken}] for ${currentPatient.name} [${currentPatient.uhid}]. Verified at ${record.kioskId}. Ward ${currentPatient.ward} notified for patient escort.`,
        category: 'patient_admission',
        severity: 'success',
        status: 'VERIFIED',
        metadata: {
          uhid: currentPatient.uhid,
          patientName: currentPatient.name,
          verificationSource: source,
          ward: currentPatient.ward,
          token: activeToken,
        },
      })
    }).catch(console.error);

    onTriggerToast(
      `Arrival Confirmed! Welcome to CityCare Hospital, ${currentPatient.name}. Your arrival has been sent to ${currentPatient.ward}.`
    );
  };

  const handleSimulateScanToken = (tokenToScan: string) => {
    setScannerActive(true);
    setTimeout(() => {
      setScannerActive(false);
      handleConfirmArrival(`Scanner Verification [${tokenToScan}]`);
    }, 1200);
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUhidInput.trim()) return;
    const found = availablePatients.find(
      (p) =>
        p.uhid.toLowerCase().includes(customUhidInput.toLowerCase()) ||
        p.name.toLowerCase().includes(customUhidInput.toLowerCase())
    );
    if (found) {
      setSelectedUhid(found.uhid);
      setCustomUhidInput('');
      onTriggerToast(`Loaded check-in QR pass for ${found.name} (${found.uhid}).`);
    } else {
      // Create ad-hoc patient lookup
      setSelectedUhid(customUhidInput.toUpperCase());
      onTriggerToast(`Rendered custom check-in pass for Patient ID ${customUhidInput.toUpperCase()}.`);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    downloadQRCodePNG(qrDataUrl, `CityCare-Arrival-QR-${currentPatient.uhid}.png`);
    onTriggerToast(`Downloaded official arrival QR Pass for ${currentPatient.name}.`);
  };

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(activeToken);
    setCopiedToken(true);
    onTriggerToast(`Check-in Token ${activeToken} copied to clipboard.`);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto pb-12 font-['Inter',sans-serif] space-y-6">
      {/* Top Navigation & Status Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fcde6d] flex items-center justify-center text-[#756100] shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[26px]">how_to_reg</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-xl sm:text-2xl text-neutral-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                Patient Self-Check-in &amp; Arrival Pass
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Self-Service Portal
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Render your digital arrival QR pass or scan the token generated at Reception Intake to confirm your arrival.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('patient_portal')}
            className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span>Inpatient Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reception')}
            className="px-4 py-2.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="View Reception Intake Desk"
          >
            <span className="material-symbols-outlined text-[16px]">desk</span>
            <span>Reception Desk</span>
          </button>
        </div>
      </div>

      {/* Patient Selector Strip */}
      <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Select Patient Record:
            </span>
            <span className="text-xs text-neutral-400">•</span>
            <span className="text-xs font-semibold text-neutral-700">
              Active: <span className="font-bold text-neutral-900">{currentPatient.name}</span> ({currentPatient.uhid})
            </span>
          </div>

          {/* Quick Search / Direct Patient ID Form */}
          <form onSubmit={handleCustomSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-neutral-400 text-[18px]">
                badge
              </span>
              <input
                type="text"
                value={customUhidInput}
                onChange={(e) => setCustomUhidInput(e.target.value)}
                placeholder="Lookup UHID or Name..."
                className="pl-9 pr-3 py-1.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none w-48 sm:w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs"
            >
              Lookup
            </button>
          </form>
        </div>

        {/* Quick Patient Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {availablePatients.map((p) => {
            const isSelected = p.uhid.toLowerCase() === selectedUhid.toLowerCase();
            return (
              <button
                key={p.uhid}
                onClick={() => {
                  setSelectedUhid(p.uhid);
                  onTriggerToast(`Viewing QR pass for ${p.name} (${p.uhid}).`);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-[#141416] text-white border-[#141416] shadow-sm'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {p.gender === 'F' ? 'face_3' : 'face'}
                </span>
                <span>{p.name}</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20' : 'bg-neutral-200 text-neutral-700'}`}>
                  {p.uhid}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs navigation: QR Pass vs Scanner vs Arrival Status */}
      <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-2">
        <button
          onClick={() => setActiveTab('qr_pass')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'qr_pass'
              ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs font-extrabold'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          <span>1. Patient Arrival QR Pass</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'scanner'
              ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs font-extrabold'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          <span>2. Scan Reception Intake QR</span>
        </button>

        <button
          onClick={() => setActiveTab('arrival_status')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'arrival_status'
              ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs font-extrabold'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>
            3. Arrival Confirmation{' '}
            {arrivalRecord?.confirmed && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-1"></span>
            )}
          </span>
        </button>
      </div>

      {/* TAB 1: Patient Check-in QR Pass */}
      {activeTab === 'qr_pass' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: QR Code Display Card */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fcde6d]/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f6f3ed] text-neutral-800 text-xs font-bold mb-4">
              <span className="material-symbols-outlined text-[16px] text-[#756100]">verified</span>
              <span>CityCare Official Check-In Pass</span>
            </div>

            {/* QR Card Frame */}
            <div className="relative p-6 rounded-3xl bg-[#faf8f4] border border-[#e5e2dc] flex flex-col items-center shadow-inner max-w-sm w-full">
              {/* Corner reticle marks */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#141416]/50 rounded-tl"></div>
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#141416]/50 rounded-tr"></div>
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#141416]/50 rounded-bl"></div>
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#141416]/50 rounded-br"></div>

              {/* QR Image Box */}
              <div className="relative w-64 h-64 bg-white p-3 rounded-2xl shadow-md border border-neutral-200 flex items-center justify-center overflow-hidden">
                {isGeneratingQr ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#141416] animate-spin"></span>
                    <span className="text-xs text-neutral-500 font-medium">Rendering Patient QR...</span>
                  </div>
                ) : qrDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt={`Arrival QR for ${currentPatient.name}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-xl shadow-md border border-neutral-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#141416] text-[20px]">local_hospital</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-500">Failed to render QR Code</div>
                )}
              </div>

              {/* Patient Badge Under QR */}
              <div className="mt-4 w-full text-left bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-neutral-900">{currentPatient.name}</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                    {currentPatient.uhid}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
                  <span>{currentPatient.age}{currentPatient.gender}</span>
                  <span>•</span>
                  <span>{currentPatient.ward}</span>
                  <TriageIndicator level={currentPatient.acuity} size="xs" />
                </div>
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-500 truncate max-w-[200px]">{activeToken}</span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="text-[#756100] font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedToken ? 'check' : 'content_copy'}
                    </span>
                    {copiedToken ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 w-full max-w-sm space-y-2.5">
              <button
                type="button"
                onClick={() => handleConfirmArrival('Self-Service Kiosk')}
                className="w-full py-3.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Confirm Arrival with this QR Pass</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="py-2.5 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Save QR PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onTriggerToast('Wristband tag sent to Lobby Thermal Printer #01.');
                    window.print();
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Wristband</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Admission & Care Team Details */}
          <div className="lg:col-span-6 space-y-5">
            {/* Admission Summary Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">hotel</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                      Assigned Ward &amp; Bed
                    </h3>
                    <p className="text-[11px] text-neutral-500">Live Hospital Bed Allocation</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  Bed Reserved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Ward Unit
                  </span>
                  <span className="font-bold text-sm text-neutral-900 block font-['Plus_Jakarta_Sans']">
                    {currentPatient.ward}
                  </span>
                  <span className="text-[11px] text-neutral-500 mt-0.5 block">Floor 3 • Central Medical Wing</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Attending Physician
                  </span>
                  <span className="font-bold text-sm text-neutral-900 block font-['Plus_Jakarta_Sans']">
                    {currentPatient.attendingDoctor}
                  </span>
                  <span className="text-[11px] text-neutral-500 mt-0.5 block">Consultant Surgeon • Lead</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e5e2dc] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-700">Clinical Diagnosis:</span>
                  <span className="text-neutral-500 font-mono text-[11px]">ICD-10 Categorized</span>
                </div>
                <p className="text-xs text-neutral-800 font-semibold">{currentPatient.diagnosis}</p>
              </div>
            </div>

            {/* How Self-Check-in Works Guide */}
            <div className="bg-[#f6f3ed] rounded-3xl p-6 border border-black/5 space-y-3.5">
              <h4 className="font-bold text-sm text-neutral-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#756100]">info</span>
                How Self-Check-in Arrival Works
              </h4>

              <div className="space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fcde6d] text-[#221b00] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    <strong className="text-neutral-900">Show this QR Pass at Lobby Kiosks:</strong> Present this screen to any optical scanner or reception assistant upon arrival.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fcde6d] text-[#221b00] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    <strong className="text-neutral-900">Instant Nursing &amp; Escort Notification:</strong> Your assigned ward and floor nurse receive an automated chime that you have arrived on campus.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fcde6d] text-[#221b00] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    <strong className="text-neutral-900">Unlock Digital Companion:</strong> View live discharge timeline, request nursing calls, review itemized insurance coverage, and track meal plans.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Scan Reception Intake QR */}
      {activeTab === 'scanner' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-sm space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#fcde6d]/30 text-[#756100] text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Optical Scanner Simulation</span>
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">
              Scan Reception Intake Pass
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              If you received a physical printout, paper slip, or digital QR token at the Front Intake Desk, hold it up to the scanner or select your token below to confirm your arrival.
            </p>
          </div>

          {/* Optical Scanner Viewfinder Graphic */}
          <div className="max-w-md mx-auto relative rounded-3xl bg-[#141416] p-8 overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center justify-center min-h-[320px]">
            {/* Viewfinder corner brackets */}
            <div className="absolute top-5 left-5 w-8 h-8 border-t-4 border-l-4 border-[#fcde6d] rounded-tl-lg"></div>
            <div className="absolute top-5 right-5 w-8 h-8 border-t-4 border-r-4 border-[#fcde6d] rounded-tr-lg"></div>
            <div className="absolute bottom-5 left-5 w-8 h-8 border-b-4 border-l-4 border-[#fcde6d] rounded-bl-lg"></div>
            <div className="absolute bottom-5 right-5 w-8 h-8 border-b-4 border-r-4 border-[#fcde6d] rounded-br-lg"></div>

            {/* Scanning Laser Line */}
            {scannerActive ? (
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] animate-pulse"></div>
            ) : (
              <div className="absolute inset-x-12 top-10 h-0.5 bg-[#fcde6d] shadow-[0_0_12px_#fcde6d] animate-bounce"></div>
            )}

            <div className="flex flex-col items-center text-center space-y-3 z-10 text-white">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#fcde6d] border border-white/20">
                <span className="material-symbols-outlined text-[36px]">
                  {scannerActive ? 'document_scanner' : 'qr_code_2'}
                </span>
              </div>
              <div>
                <span className="text-sm font-bold block text-white font-['Plus_Jakarta_Sans']">
                  {scannerActive ? 'Verifying QR Token Matrix...' : 'Align Reception QR Pass in Frame'}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono mt-1 block">
                  Kiosk Optical Reader #01 • Auto-Focus Ready
                </span>
              </div>
            </div>
          </div>

          {/* Quick Preset Tokens Generated at Reception Desk */}
          <div className="max-w-2xl mx-auto space-y-3 pt-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
              Or Select Token Generated from Reception Intake:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePatients.map((pat) => (
                <div
                  key={pat.uhid}
                  onClick={() => handleSimulateScanToken(pat.token)}
                  className="p-4 rounded-2xl bg-neutral-50 hover:bg-[#fcde6d]/20 border border-neutral-200 hover:border-[#fcde6d] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-neutral-900 group-hover:text-[#756100]">
                      {pat.name}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {pat.uhid} • {pat.ward}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono mt-1 truncate max-w-[180px]">
                      {pat.token}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-[#141416] text-white text-xs font-bold shrink-0 group-hover:bg-[#756100]"
                  >
                    Simulate Scan
                  </button>
                </div>
              ))}
            </div>

            {/* Manual Token Entry */}
            <div className="pt-4 border-t border-neutral-100 flex items-center gap-2">
              <input
                type="text"
                value={scannedTokenInput}
                onChange={(e) => setScannedTokenInput(e.target.value)}
                placeholder="Or paste Reception QR token e.g. HOSFLOW-REG-UH-9402-4921"
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#fcde6d] outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (!scannedTokenInput.trim()) {
                    onTriggerToast('Please enter a valid token.');
                    return;
                  }
                  handleSimulateScanToken(scannedTokenInput);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold"
              >
                Scan Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Arrival Confirmation State */}
      {activeTab === 'arrival_status' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-sm space-y-6">
          {arrivalRecord ? (
            <div className="space-y-6">
              {/* Celebratory Arrival Card */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                      <span className="material-symbols-outlined text-[32px]">task_alt</span>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-white text-xs font-bold font-mono tracking-wider uppercase mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                        Arrival Verified &amp; Recorded
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight">
                        Welcome to CityCare Hospital, {arrivalRecord.name}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-80 block">
                      Confirmed At
                    </span>
                    <span className="text-base font-mono font-bold">{arrivalRecord.timestamp} IST</span>
                  </div>
                </div>
              </div>

              {/* Verified Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#faf8f4] border border-[#e5e2dc] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Patient Identity</span>
                  <span className="font-bold text-sm text-neutral-900 block">{arrivalRecord.name}</span>
                  <span className="text-xs text-neutral-500 font-mono">UHID: {arrivalRecord.uhid}</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f4] border border-[#e5e2dc] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Assigned Destination</span>
                  <span className="font-bold text-sm text-neutral-900 block">{arrivalRecord.ward}</span>
                  <span className="text-xs text-emerald-700 font-semibold">Nurse Station Alerted</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f4] border border-[#e5e2dc] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Verification Station</span>
                  <span className="font-bold text-sm text-neutral-900 block">{arrivalRecord.kioskId}</span>
                  <span className="text-xs text-neutral-500 font-mono">Token: {arrivalRecord.token.slice(0, 18)}...</span>
                </div>
              </div>

              {/* Wayfinding Instructions */}
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#756100]">alt_route</span>
                  Turn-by-Turn Wayfinding to your Ward
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Proceed through the Central Lobby to <strong className="text-neutral-900">Elevator Bank B</strong>. Take Elevator B to <strong className="text-neutral-900">Floor 3</strong>, step out and turn right into the <strong className="text-neutral-900">Surgical Recovery Wing</strong>. Porter escort #P-12 is en route to assist with wheelchair transfer.
                </p>
              </div>

              {/* Action: Open Inpatient Companion Dashboard */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-neutral-500">
                  Access your discharge journey, nurse calling, and itemized billing from the companion dashboard.
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('patient_portal')}
                  className="px-6 py-3 rounded-2xl bg-[#141416] hover:bg-neutral-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  <span>Launch Inpatient Companion Dashboard</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <span className="material-symbols-outlined text-[28px]">pending_actions</span>
              </div>
              <h3 className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans']">
                No Arrival Confirmed Yet
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm">
                Confirm your arrival using your digital QR pass in Tab 1 or by scanning the Reception Intake token in Tab 2.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('qr_pass')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] font-bold text-xs"
              >
                Go to QR Pass
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
