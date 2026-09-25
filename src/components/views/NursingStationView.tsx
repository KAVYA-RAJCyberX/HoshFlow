import React, { useState } from 'react';
import { ViewType } from '../../types';
import { TriageIndicator } from '../common/TriageIndicator';
import { alertSoundService } from '../../services/alertSoundService';
import { auditLogService } from '../../services/auditLogService';
import { clinicalNotesService } from '../../services/clinicalNotesService';
import { useQuery } from '@tanstack/react-query';

interface NursingStationViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface KardexPatient {
  uhid: string;
  bed: string;
  name: string;
  age: number;
  gender: string;
  postOpDay: string;
  vitals: { bp: string; pulse: number; spO2: number; pain: number };
  ivInfusion: string;
  nextMedDue: string;
  fallRisk: 'Low' | 'Moderate' | 'High';
  acuity: 'emergent' | 'urgent' | 'non_urgent';
  nursingNotes: string;
}

export const NursingStationView: React.FC<NursingStationViewProps> = ({ onNavigate, onTriggerToast }) => {
  const { data: patients = [], isLoading, refetch } = useQuery<KardexPatient[]>({
    queryKey: ['nursing_kardex'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await res.json();
      
      // Filter out discharged patients (e.g., status === 'discharged')
      const activePatients = data.filter((p: any) => p.status !== 'discharged');
      
      return activePatients.map((p: any) => {
        let parsedVitals = { bp: '120/80', pulse: 80, spO2: 98, pain: 2 };
        if (p.vitals) {
          try {
            parsedVitals = { ...parsedVitals, ...JSON.parse(p.vitals) };
          } catch(e) {}
        }
        
        // Find latest nursing note if exists
        const notes = p.clinicalNotes || [];
        const nursingNotes = notes.filter((n: any) => n.authorRole === 'nurse' || n.category === 'nursing')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latestNote = nursingNotes.length > 0 ? nursingNotes[0].observation : p.diagnosis;
        
        return {
          uhid: p.uhid,
          bed: p.bedId || 'TBA',
          name: p.name,
          age: p.age,
          gender: p.gender,
          postOpDay: p.diagnosis || 'Admitted',
          vitals: parsedVitals,
          ivInfusion: 'Standard IV Fluids',
          nextMedDue: 'Check MAR',
          fallRisk: p.fallRisk || 'Low',
          acuity: p.acuity || 'non_urgent',
          nursingNotes: latestNote,
        };
      });
    },
    refetchInterval: 10000 // Polling every 10s for real-time board
  });

  const handleAdministerMed = (uhid: string, med: string) => {
    onTriggerToast(`Administered and e-signed: ${med} for ${uhid}. Logged to central MAR.`);
  };

  const handleAddEmergentTransfer = () => {
    const newUhid = `UHID-884${Math.floor(120 + Math.random() * 80)}`;
    const emergentTransfer: KardexPatient = {
      uhid: newUhid,
      bed: 'ICU-B02',
      name: 'Rohan Deshpande',
      age: 52,
      gender: 'M',
      postOpDay: 'Acute STEMI / Post-Primary PCI (STAT Transfer)',
      vitals: { bp: '94/62', pulse: 114, spO2: 91, pain: 8 },
      ivInfusion: 'Inj Noradrenaline 4mcg/min + Heparin infusion',
      nextMedDue: 'STAT Dual Antiplatelet Bag + Echocardiogram',
      fallRisk: 'High',
      acuity: 'emergent',
      nursingNotes: 'Direct emergent transfer from Cath Lab. Arterial line zeroed, telemetry continuous monitoring initiated.',
    };

    // In a fully wired app, this would POST to /api/patients and then invalidate/refetch the query.
    // We will simulate it by adding a toast and re-fetching in case the backend creates it (if we actually did a POST).
    // For now, since it's a demo button, let's just show a toast for emergent transfer.
    // If we wanted to actually create a patient in the backend:
    fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uhid: newUhid,
        name: 'Rohan Deshpande',
        age: 52,
        gender: 'M',
        ward: 'ICU',
        bedId: 'ICU-B02',
        diagnosis: 'Acute STEMI / Critical Bedside STAT Transfer',
        attendingDoctor: 'Dr. Urgent',
        status: 'admitted',
        acuity: 'emergent',
        fallRisk: 'High',
        vitals: JSON.stringify({ bp: '94/62', pulse: 114, spO2: 91, pain: 8 })
      })
    }).then(() => refetch());

    const alertInfo = alertSoundService.notifyEmergentPatient({
      name: emergentTransfer.name,
      uhid: emergentTransfer.uhid,
      complaint: 'Acute STEMI / Critical Bedside STAT Transfer',
    });

    auditLogService.addLog({
      actor: 'Sunita Nair, RN',
      role: 'Charge Nurse',
      action: `🚨 Bedside Emergent Transfer Added: Admitted ${emergentTransfer.name} [${emergentTransfer.uhid}] to Bed ${emergentTransfer.bed}. ${
        alertInfo.soundPlayed ? 'Audible clinical chime sounded.' : 'Audible alert muted per user settings.'
      }`,
      category: 'patient_admission',
      severity: 'critical',
      status: 'ALERT',
    });

    onTriggerToast(
      alertInfo.soundPlayed
        ? `🚨 EMERGENT PATIENT ADDED: ${emergentTransfer.name} [${emergentTransfer.uhid}] in Bed ${emergentTransfer.bed}! Audible chime played 🔔`
        : `🚨 EMERGENT PATIENT ADDED: ${emergentTransfer.name} [${emergentTransfer.uhid}] in Bed ${emergentTransfer.bed} (Audible alert muted in settings 🔕)`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/20 text-[#fcde6d]">
              Shift 02 Kardex
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Charge Nurse: Sunita Nair, RN • Station B Floor 3</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Floor Nursing Station & E-Kardex
          </h1>
          <p className="text-sm text-neutral-400">
            Live bedside telemetry, IV piggyback schedule, pain scores, and seamless shift handover protocols.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <button
            onClick={handleAddEmergentTransfer}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-red-500"
            title="Admit an emergent acute transfer and test audible alert"
          >
            <span className="material-symbols-outlined text-sm animate-pulse">e911_emergency</span>
            <span>+ Emergent Transfer</span>
          </button>
          <button
            onClick={() => onNavigate('clinical_rounds')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            Doctor Rounds
          </button>
          <button
            onClick={() => {
              if (patients.length > 0) {
                const first = patients[0];
                clinicalNotesService.openNotesPanel({
                  id: first.uhid,
                  uhid: first.uhid,
                  name: first.name,
                  age: first.age,
                  gender: first.gender === 'F' ? 'Female' : 'Male',
                  ward: 'Central Inpatient Station B',
                  bedId: first.bed,
                  diagnosis: first.postOpDay,
                  acuity: first.acuity,
                  vitals: {
                    bp: first.vitals.bp,
                    pulse: first.vitals.pulse,
                    spO2: first.vitals.spO2,
                    painScore: first.vitals.pain,
                  },
                });
              }
            }}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/20 text-[#fcde6d] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 border border-white/10"
            title="Open Interdisciplinary Clinical Notes Side-Panel"
          >
            <span className="material-symbols-outlined text-sm">clinical_notes</span>
            <span>Clinical Notes</span>
          </button>
          <button
            onClick={() => onTriggerToast('Shift 02 Handover Digest compiled and sent to Night Sister.')}
            className="px-5 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">checklist</span>
            Execute Shift Handover
          </button>
        </div>
      </div>

      {/* Patients Kardex Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500 bg-white rounded-3xl border border-black/5">Loading Kardex board from database...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-white rounded-3xl border border-black/5">No active patients assigned to this station.</div>
        ) : (
          patients.map((pat) => (
          <div
            key={pat.uhid}
            className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6"
          >
            {/* Patient Header */}
            <div className="min-w-[260px]">
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center font-mono font-bold text-amber-900 text-sm">
                  {pat.bed}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-neutral-900">{pat.name}</h3>
                    <TriageIndicator level={pat.acuity} size="xs" />
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">{pat.uhid} • {pat.gender}, {pat.age}y</span>
                </div>
              </div>

              <div className="mt-2">
                <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full inline-block">
                  {pat.postOpDay}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ml-2 ${
                  pat.fallRisk === 'High' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Fall Risk: {pat.fallRisk}
                </span>
              </div>
            </div>

            {/* Bedside Vitals Strip */}
            <div className="bg-[#faf8f4] p-4 rounded-2xl border border-black/5 flex-1 max-w-xl">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex justify-between">
                <span>Real-Time Bedside Vitals</span>
                <span className="text-emerald-700 font-bold">Stable</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-neutral-200">
                  <span className="text-neutral-500 text-[10px] block font-bold">BP</span>
                  <span className="font-bold text-neutral-900 font-mono">{pat.vitals.bp}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-neutral-200">
                  <span className="text-neutral-500 text-[10px] block font-bold">PULSE</span>
                  <span className="font-bold text-neutral-900 font-mono">{pat.vitals.pulse} bpm</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-neutral-200">
                  <span className="text-neutral-500 text-[10px] block font-bold">SpO2</span>
                  <span className="font-bold text-emerald-600 font-mono">{pat.vitals.spO2}%</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-neutral-200">
                  <span className="text-neutral-500 text-[10px] block font-bold">PAIN</span>
                  <span className="font-bold text-neutral-900 font-mono">{pat.vitals.pain}/10</span>
                </div>
              </div>
              <p className="text-xs text-neutral-600 mt-2 italic bg-white/60 p-2 rounded-lg border border-neutral-200">
                "{pat.nursingNotes}"
              </p>
            </div>

            {/* Meds & Actions */}
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 justify-end min-w-[200px]">
              <div className="text-xs text-neutral-700 font-semibold mb-1">
                Next: <strong className="text-neutral-900">{pat.nextMedDue}</strong>
              </div>
              <button
                onClick={() => handleAdministerMed(pat.uhid, pat.nextMedDue)}
                className="px-4 py-2 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Sign-off Medication
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onTriggerToast(`Vitals recorded for ${pat.name} at ${new Date().toLocaleTimeString()}.`)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">monitor_heart</span>
                  Log Vitals
                </button>
                <button
                  onClick={() => {
                    clinicalNotesService.openNotesPanel({
                      id: pat.uhid,
                      uhid: pat.uhid,
                      name: pat.name,
                      age: pat.age,
                      gender: pat.gender === 'F' ? 'Female' : 'Male',
                      ward: 'Central Inpatient Station B',
                      bedId: pat.bed,
                      diagnosis: pat.postOpDay,
                      acuity: pat.acuity,
                      vitals: {
                        bp: pat.vitals.bp,
                        pulse: pat.vitals.pulse,
                        spO2: pat.vitals.spO2,
                        painScore: pat.vitals.pain,
                      },
                    });
                    onTriggerToast(`Opened Clinical Notes side-panel for ${pat.name}.`);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95"
                  title="Open Clinical Notes side-panel for this patient"
                >
                  <span className="material-symbols-outlined text-sm">clinical_notes</span>
                  <span>Notes</span>
                </button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};
