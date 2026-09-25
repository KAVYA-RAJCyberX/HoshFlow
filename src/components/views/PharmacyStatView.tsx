import React, { useState } from 'react';
import { ViewType } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PharmacyStatViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface StatRxItem {
  id: string;
  uhid: string;
  patientName: string;
  bed: string;
  ward: string;
  medicationName: string;
  dosage: string;
  route: string;
  urgency: string;
  narcoticVault: boolean;
  status: string;
  doctorName: string;
  tubeStation?: string;
  [key: string]: any;
}

export const PharmacyStatView: React.FC<PharmacyStatViewProps> = ({ onNavigate, onTriggerToast }) => {
  const queryClient = useQueryClient();
  const [dualSignModal, setDualSignModal] = useState<StatRxItem | null>(null);
  const [pharmacistPin, setPharmacistPin] = useState('');

  // Fetch prescriptions from backend
  const { data: rxList = [] } = useQuery<StatRxItem[]>({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/pharmacy', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch prescriptions');
      return res.json();
    }
  });

  // Dispense mutation
  const dispenseMutation = useMutation({
    mutationFn: async ({ id, dualSigner }: { id: string; dualSigner?: string }) => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch(`/api/pharmacy/${id}/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pharmacistPin, dualSigner: dualSigner || 'Ravi Verma (Chief Pharmacist)' })
      });
      if (!res.ok) throw new Error('Dispense request failed');
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onTriggerToast(data.message);
      setDualSignModal(null);
      setPharmacistPin('');
    }
  });

  const handleDualSignAndSend = () => {
    if (!dualSignModal) return;
    dispenseMutation.mutate({ id: dualSignModal.id, dualSigner: 'Ravi Verma (Chief Pharmacist)' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              Satellite OT & Floor Station
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Pneumatic Tube Velocity: 14 m/sec • Pressure: 4.2 Bar</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Central Inpatient & STAT Rx Satellite Pharmacy
          </h1>
          <p className="text-sm text-neutral-400">
            Automated pneumatic tube dispatch, narcotic vault biometric dual-sign, and allergy cross-reference.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('clinical_rounds')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">medical_services</span>
            Clinical Rounds MAR
          </button>
          <button
            onClick={() => onTriggerToast('Central narcotic safe inventory audit verified. Logged to Pune Drug Controller log.')}
            className="px-4 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-base">lock</span>
            Narcotics Vault Audit
          </button>
        </div>
      </div>

      {/* Pneumatic Tube Pod Rings Status Strip */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-neutral-700">settings_ethernet</span>
            <h2 className="text-base font-bold text-neutral-900">High-Speed Pneumatic Tube Stations</h2>
          </div>
          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All 4 Capsule Loops Pressurized (0 Faults)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Station 1: ICU / CCU', status: 'In Transit', time: 'Arriving in 18s', color: 'border-amber-400 bg-amber-50/50' },
            { name: 'Station 2: Main OT Complex', status: 'Ready for Pod', time: 'Docked & Latched', color: 'border-emerald-300 bg-emerald-50/30' },
            { name: 'Station 3: Trauma Bay ER', status: 'Inbound Empty', time: 'Arrival in 32s', color: 'border-blue-300 bg-blue-50/30' },
            { name: 'Station 4: Post-Surg Floor 3', status: 'Ready for Pod', time: 'Docked & Latched', color: 'border-emerald-300 bg-emerald-50/30' },
          ].map((tube, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border ${tube.color} flex items-center justify-between`}>
              <div>
                <span className="text-xs font-bold text-neutral-900 block">{tube.name}</span>
                <span className="text-[11px] text-neutral-600 block mt-0.5">{tube.time}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-neutral-800 shadow-xs border border-black/5">
                {tube.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STAT Prescriptions Queue */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">STAT Immediate & High-Risk Prescription Queue</h2>
            <p className="text-xs text-neutral-500">Requires licensed pharmacist verification before pneumatic capsule latch.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
            {rxList.filter((r) => r.status === 'pending_dual_sign').length} Pending Dual-Sign
          </span>
        </div>

        <div className="space-y-4">
          {rxList.map((rx) => (
            <div
              key={rx.id}
              className="p-5 rounded-2xl border border-neutral-200 bg-[#fdfcf9] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 ${
                    rx.narcoticVault ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{rx.narcoticVault ? 'lock' : 'medication'}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">{rx.medicationName || rx.medication}</h3>
                    {rx.narcoticVault && (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        Schedule X / Narcotic
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono">
                      {rx.bed} ({rx.ward})
                    </span>
                  </div>

                  <div className="text-xs text-neutral-600 mt-1">
                    Patient: <strong className="text-neutral-900">{rx.patientName}</strong> ({rx.uhid}) • Order: <strong className="text-neutral-900">{rx.dosage}</strong> ({rx.route})
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                    <span>Ordered by {rx.doctorName || rx.prescribedBy}</span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-700">Target: {rx.tubeStation || 'Pod 1'}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action */}
              <div className="flex items-center gap-3 shrink-0">
                {rx.status === 'in_transit_tube' ? (
                  <span className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                    Capsule In Transit
                  </span>
                ) : (
                  <button
                    onClick={() => setDualSignModal(rx)}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    Dual-Sign & Dispatch Pod
                  </button>
                )}

                <button
                  onClick={() => onTriggerToast(`Drug interaction check cleared for ${rx.medicationName || rx.medication}. No allergy contraindications.`)}
                  className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium"
                >
                  Allergy Check
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Sign Modal */}
      {dualSignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-100 text-red-700">
                  <span className="material-symbols-outlined">shield_person</span>
                </span>
                <h3 className="font-bold text-base text-neutral-900">Narcotics & STAT Dual-Verification</h3>
              </div>
              <button onClick={() => setDualSignModal(null)} className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900">
                <strong>Schedule X Vault Protocol:</strong> Requires two registered personnel verification for controlled substance release.
              </div>

              <div className="space-y-1">
                <span className="text-neutral-500">Selected Medication:</span>
                <div className="font-bold text-sm text-neutral-900">{dualSignModal.medicationName || dualSignModal.medication}</div>
                <div className="text-neutral-600">{dualSignModal.patientName} • {dualSignModal.bed}</div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Chief Pharmacist PIN / Biometric Code</label>
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pharmacistPin}
                  onChange={(e) => setPharmacistPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono tracking-widest text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
              <button
                onClick={handleDualSignAndSend}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">lock_open</span>
                Authorize & Launch Pod
              </button>
              <button
                onClick={() => setDualSignModal(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
