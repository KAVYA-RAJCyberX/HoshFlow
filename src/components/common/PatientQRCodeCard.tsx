import React, { useState, useEffect } from 'react';
import { generateQRCodeDataURL, createPatientCheckInPayload, downloadQRCodePNG } from '../../utils/qrCodeGenerator';
import { TriageIndicator } from './TriageIndicator';

interface PatientQRCodeCardProps {
  patient: {
    uhid: string;
    name: string;
    age?: number | string;
    gender?: string;
    ward?: string;
    bed?: string;
    complaint?: string;
    triageAcuity?: 'emergent' | 'urgent' | 'non_urgent';
    token?: string;
  };
  onSimulateScan?: () => void;
  onClose?: () => void;
  onTriggerToast: (msg: string) => void;
}

export const PatientQRCodeCard: React.FC<PatientQRCodeCardProps> = ({
  patient,
  onSimulateScan,
  onClose,
  onTriggerToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);

  const token = patient.token || `HOSFLOW-REG-${patient.uhid}-${Date.now().toString().slice(-4)}`;

  useEffect(() => {
    let mounted = true;
    setIsGenerating(true);

    const payload = createPatientCheckInPayload({
      ...patient,
      token,
    });

    generateQRCodeDataURL(payload, {
      width: 400,
      margin: 2,
      darkColor: '#141416',
      lightColor: '#ffffff',
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (mounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (mounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [patient.uhid, patient.name, token]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    downloadQRCodePNG(qrDataUrl, `HOSFLOW-QR-${patient.uhid}-${patient.name.replace(/\s+/g, '_')}.png`);
    onTriggerToast(`Downloaded high-res check-in QR code for ${patient.name} (${patient.uhid}).`);
  };

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(true);
    onTriggerToast(`Check-in Token ${token} copied to clipboard.`);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handlePrintSlip = () => {
    onTriggerToast(`Thermal check-in slip & wristband dispatched to Lobby Printer #01.`);
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Header icon and title */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-10 h-10 rounded-2xl bg-[#fcde6d] flex items-center justify-center text-[#756100] font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-neutral-900 font-['Plus_Jakarta_Sans'] leading-tight">
              Patient Check-In QR Pass
            </h3>
            <p className="text-[11px] text-neutral-500">Official CityCare Intake Token</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <p className="text-xs text-neutral-600 mb-4 text-left leading-relaxed">
        Present this dynamic QR code at ward entry, nursing stations, or hand to the patient/attendant. Scanning launches their dedicated personal care dashboard.
      </p>

      {/* QR Code Container with High-Fidelity Presentation */}
      <div className="relative p-5 rounded-3xl bg-[#faf8f4] border border-[#e5e2dc] flex flex-col items-center shadow-inner">
        {/* Decorative corner target brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#141416]/40 rounded-tl-sm"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#141416]/40 rounded-tr-sm"></div>
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#141416]/40 rounded-bl-sm"></div>
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#141416]/40 rounded-br-sm"></div>

        <div className="relative w-56 h-56 bg-white p-3 rounded-2xl shadow-md border border-neutral-200 flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <span className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#141416] animate-spin"></span>
              <span className="text-xs text-neutral-500 font-medium">Generating QR Matrix...</span>
            </div>
          ) : qrDataUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={qrDataUrl}
                alt={`Check-in QR code for ${patient.name}`}
                className="w-full h-full object-contain rounded-lg"
              />
              {/* Center Hospital Cross badge */}
              <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-xl shadow-md border border-neutral-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#141416] text-[20px]">local_hospital</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-500">Failed to render QR Code</div>
          )}
        </div>

        {/* Patient Details Under QR Code */}
        <div className="mt-4 w-full text-left bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-neutral-900">{patient.name}</span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
              {patient.uhid}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
            {patient.gender && patient.age && (
              <span className="font-medium">{patient.age}{patient.gender} •</span>
            )}
            <span>{patient.ward || 'Surgical Recovery Bay 204'}</span>
            {patient.triageAcuity && (
              <TriageIndicator level={patient.triageAcuity} size="xs" />
            )}
          </div>

          <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 font-mono text-neutral-500 truncate max-w-[240px]">
              <span className="material-symbols-outlined text-[14px]">key</span>
              <span className="truncate">{token}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyToken}
              className="text-[#756100] font-bold hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copiedToken ? 'check' : 'content_copy'}
              </span>
              {copiedToken ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 space-y-2">
        {onSimulateScan && (
          <button
            type="button"
            onClick={onSimulateScan}
            className="w-full py-3 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            <span>Simulate Patient Scan (Launch User Dashboard)</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="py-2.5 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Save PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrintSlip}
            className="py-2.5 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Wristband</span>
          </button>
        </div>
      </div>
    </div>
  );
};
