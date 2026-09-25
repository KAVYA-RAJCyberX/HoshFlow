import React, { useState, useEffect } from 'react';
import { ViewType, ClinicalObservation, SelectablePatient, ObservationCategory } from '../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientVitalsTrend } from '../common/PatientVitalsTrend';
import { clinicalNotesService } from '../../services/clinicalNotesService';
import { CLINICAL_PERSONAS } from '../../data/mockHospitalData';

interface ClinicalStationViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

const DEFAULT_PATIENT: SelectablePatient = {
  id: 'P-1001',
  uhid: 'HOS-2026-1001',
  name: 'Aarav Mehta',
  age: 54,
  gender: 'Male',
  ward: 'Medical Ward A',
  bedId: 'Bed M-104',
  diagnosis: 'Acute Gastritis & Dehydration (Post-Op Observation)',
  attendingDoctor: 'Dr. Ananya Rao',
  acuity: 'low',
  status: 'discharge_planned',
  vitals: {
    bp: '120/80',
    pulse: 76,
    temp: 98.6,
    spO2: 98,
    respRate: 18,
    painScore: 2,
  },
};

export const ClinicalStationView: React.FC<ClinicalStationViewProps> = ({
  onNavigate,
  onTriggerToast
}) => {
  const [adminAmoxicillin, setAdminAmoxicillin] = useState(false);
  const [signedHandover, setSignedHandover] = useState(false);
  const [copilotDismissed, setCopilotDismissed] = useState(false);
  const [showAddendumInput, setShowAddendumInput] = useState(false);
  const [addendumText, setAddendumText] = useState('');
  const [addenda, setAddenda] = useState<string[]>([]);

  // Dynamic Patient and Clinical Notes State
  const [activePatient, setActivePatient] = useState<SelectablePatient>(
    clinicalNotesService.getActivePatient() || DEFAULT_PATIENT
  );
  const [allPatients, setAllPatients] = useState<SelectablePatient[]>([]);
  const [patientNotes, setPatientNotes] = useState<ClinicalObservation[]>([]);
  const [notesFilter, setNotesFilter] = useState<'all' | 'doctor' | 'nurse' | 'critical'>('all');

  // Inline Note Composer in Patient Record
  const [showInlineNoteForm, setShowInlineNoteForm] = useState(false);
  const [inlineRole, setInlineRole] = useState<'doctor' | 'nurse'>('doctor');
  const [inlineCategory, setInlineCategory] = useState<ObservationCategory>('physician_round');
  const [inlinePriority, setInlinePriority] = useState<'routine' | 'important' | 'stat_urgent'>('routine');
  const [inlineNoteText, setInlineNoteText] = useState('');

  const queryClient = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const res = await fetch('/api/clinical-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (!res.ok) throw new Error('Failed to create clinical note');
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries or refresh local state if needed
      const current = clinicalNotesService.getActivePatient() || activePatient;
      setPatientNotes(clinicalNotesService.getObservationsForPatient(current.uhid));
      onTriggerToast(`Note successfully saved to EHR.`);
    },
    onError: (err) => {
      console.error(err);
      onTriggerToast('Error saving note to EHR!');
    }
  });

  const signHandoffMutation = useMutation({
    mutationFn: async (uhid: string) => {
      const res = await fetch(`/api/patients/${uhid}/handoff`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer stub' }
      });
      if (!res.ok) throw new Error('Failed to sign handoff');
      return res.json();
    },
    onSuccess: () => {
      setSignedHandover(true);
      onTriggerToast('Handover countersigned and synced with backend.');
    },
    onError: (err) => {
      console.error(err);
      onTriggerToast('Failed to sync handover to database.');
    }
  });

  // Synchronize with clinicalNotesService
  useEffect(() => {
    setAllPatients(clinicalNotesService.getAllAvailablePatients());

    const refreshNotes = () => {
      setAllPatients(clinicalNotesService.getAllAvailablePatients());
      const current = clinicalNotesService.getActivePatient() || activePatient;
      setPatientNotes(clinicalNotesService.getObservationsForPatient(current.uhid));
    };

    refreshNotes();

    const unsubNotes = clinicalNotesService.subscribeToNotes(refreshNotes);
    const unsubPanel = clinicalNotesService.subscribeToPanel((_isOpen: boolean, pat: SelectablePatient | null) => {
      if (pat) {
        setActivePatient(pat);
        setPatientNotes(clinicalNotesService.getObservationsForPatient(pat.uhid));
      }
    });

    return () => {
      unsubNotes();
      unsubPanel();
    };
  }, [activePatient.uhid]);

  const handleSwitchPatient = (uhid: string) => {
    const found = allPatients.find((p) => p.uhid === uhid);
    if (found) {
      setActivePatient(found);
      setPatientNotes(clinicalNotesService.getObservationsForPatient(found.uhid));
      onTriggerToast(`Switched active EHR record to ${found.name} (${found.uhid}).`);
    }
  };

  const handleSaveInlineNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineNoteText.trim()) {
      onTriggerToast('Please enter observation text.');
      return;
    }

    const persona = inlineRole === 'doctor' ? CLINICAL_PERSONAS.doctor : CLINICAL_PERSONAS.nurse;
    
    // Write to local cache first so it shows up instantly (Optimistic Update)
    clinicalNotesService.addObservation({
      patientId: activePatient.id,
      patientUhid: activePatient.uhid,
      patientName: activePatient.name,
      authorName: persona.name,
      authorRole: inlineRole,
      authorDesignation: persona.designation,
      category: inlineCategory,
      priority: inlinePriority,
      observation: inlineNoteText,
      vitalsSnapshot: activePatient.vitals
        ? {
            bp: activePatient.vitals.bp,
            pulse: activePatient.vitals.pulse,
            spO2: activePatient.vitals.spO2,
            temp: activePatient.vitals.temp,
            painScore: activePatient.vitals.painScore,
          }
        : undefined,
    });

    // Also persist to actual DB via API
    createNoteMutation.mutate({
      patientId: activePatient.id,
      patientUhid: activePatient.uhid,
      patientName: activePatient.name,
      authorName: persona.name,
      authorRole: inlineRole,
      authorDesignation: persona.designation,
      category: inlineCategory,
      priority: inlinePriority,
      observation: inlineNoteText,
      fullDate: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric' })
    });

    setInlineNoteText('');
    setShowInlineNoteForm(false);
  };

  const filteredPatientNotes = patientNotes.filter((note) => {
    if (notesFilter === 'doctor') return note.authorRole === 'doctor';
    if (notesFilter === 'nurse') return note.authorRole === 'nurse';
    if (notesFilter === 'critical') return note.priority === 'stat_urgent' || note.category === 'critical_stat';
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-10 space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap">
          <button onClick={() => onNavigate('ward_flow')} className="hover:text-black">All Patients</button>
          <span>›</span>
          <button onClick={() => onNavigate('bed_matrix')} className="hover:text-black">{activePatient.ward || 'Ward'}</button>
          <span>›</span>
          <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-bold">{activePatient.bedId || 'Assigned Bay'}</span>
          <span>›</span>
          <span className="font-bold text-neutral-900">{activePatient.name}</span>
          <span className="text-neutral-400 font-mono">({activePatient.uhid})</span>
        </nav>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Patient Record Switcher */}
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-black/5 shadow-2xs text-xs">
            <span className="text-neutral-400 font-medium">Record:</span>
            <select
              value={activePatient.uhid}
              onChange={(e) => handleSwitchPatient(e.target.value)}
              className="bg-transparent font-bold text-neutral-900 outline-none cursor-pointer"
            >
              {allPatients.map((p) => (
                <option key={p.uhid} value={p.uhid}>
                  {p.name} ({p.bedId || p.uhid})
                </option>
              ))}
            </select>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
            Live Biotelemetry Active
          </span>

          {/* Clinical Notes Side-Panel Button */}
          <button 
            onClick={() => clinicalNotesService.openNotesPanel(activePatient)}
            className="px-3.5 py-1.5 rounded-full bg-[#141416] hover:bg-neutral-800 text-[#fcde6d] text-xs font-bold shadow-sm border border-black/5 flex items-center gap-1.5 transition-all active:scale-95"
            title="Open Clinical Notes & Bedside Observations Side-Panel"
          >
            <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
            <span>Clinical Notes</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#fcde6d]/20 text-[#fcde6d] text-[10px] font-mono font-bold">
              {patientNotes.length}
            </span>
          </button>

          <button 
            onClick={() => onTriggerToast(`Printing Clinical Round Sheet for ${activePatient.name}...`)}
            className="px-3 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold shadow-sm border border-black/5 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">print</span>
            Print Sheet
          </button>
        </div>
      </div>

      {/* Patient Executive Bio & Unified Live Vitals Cockpit */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-5">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          {/* Identity & Metadata */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center text-lg font-bold font-mono">
                {activePatient.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold text-[10px]">
                {activePatient.vitals?.bp ? 'Vitals OK' : 'B+'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{activePatient.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs font-mono">{activePatient.uhid}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">hotel</span> {activePatient.ward || 'Medical Ward A'} • {activePatient.bedId || 'Bed M-104'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold">
                  {patientNotes.length} EHR Notes
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold">
                  Acuity: {activePatient.acuity?.toUpperCase() || 'MODERATE'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500 flex-wrap">
                <span>{activePatient.gender}, {activePatient.age} yrs</span>
                <span>Diagnosis: <strong className="text-neutral-900 font-semibold">{activePatient.diagnosis || 'Post-Op Observation'}</strong></span>
                <span>Attending: <strong className="text-neutral-900 font-semibold">{activePatient.attendingDoctor || 'Dr. Ananya Rao'}</strong></span>
              </div>
            </div>
          </div>

          {/* Clinical Fast Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => onTriggerToast('Code Alert verified. Resuscitation team notified.')}
              className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-rose-600">emergency</span>
              Code Alert
            </button>
            <button 
              onClick={() => onTriggerToast('Bed transfer dialog opened. Selecting available isolation bed.')}
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              Transfer Bed
            </button>
            <button 
              onClick={() => onTriggerToast('Clinical test requisition order sent to Central LIS!')}
              className="px-4 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Order Clinical Test
            </button>
          </div>
        </div>

        {/* Continuous Vitals Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Continuous Telemetry (Updated 14 mins ago)
            </span>
            <button 
              onClick={() => onTriggerToast('Refreshed vitals telemetry stream from bedside monitor.')}
              className="text-neutral-500 hover:text-black flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Re-check Telemetry
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* BP */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>BP Rate</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">favorite</span>
              </div>
              <div className="my-1">
                <span className="text-xl font-bold text-neutral-900">120/80</span>
                <span className="text-xs text-neutral-400 ml-1">mmHg</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
                Normal
              </span>
            </div>

            {/* Pulse */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Pulse Rate</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">ecg_heart</span>
              </div>
              <div className="my-1">
                <span className="text-xl font-bold text-neutral-900">76</span>
                <span className="text-xs text-neutral-400 ml-1">bpm</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
                Stable
              </span>
            </div>

            {/* Temp */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Temperature</span>
                <span className="material-symbols-outlined text-[16px] text-neutral-600">thermostat</span>
              </div>
              <div className="my-1">
                <span className="text-xl font-bold text-neutral-900">98.6</span>
                <span className="text-xs text-neutral-400 ml-1">°F</span>
              </div>
              <span className="text-[11px] font-bold text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded-full w-fit">
                Afebrile
              </span>
            </div>

            {/* SpO2 */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>SpO2 Oxygen</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">air</span>
              </div>
              <div className="my-1">
                <span className="text-xl font-bold text-neutral-900">98%</span>
                <span className="text-xs text-neutral-400 ml-1">Room air</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
                Optimal
              </span>
            </div>

            {/* Resp Rate */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                <span>Resp. Rate</span>
                <span className="material-symbols-outlined text-[16px] text-neutral-600">file_copy</span>
              </div>
              <div className="my-1">
                <span className="text-xl font-bold text-neutral-900">18</span>
                <span className="text-xs text-neutral-400 ml-1">/min</span>
              </div>
              <span className="text-[11px] font-bold text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded-full w-fit">
                Eupneic
              </span>
            </div>

            {/* Pain Score */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>Pain Score</span>
                <span className="material-symbols-outlined text-[16px] text-amber-600">sentiment_satisfied</span>
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-900">2</span>
                <span className="text-xs text-amber-700">/ 10</span>
              </div>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full w-fit">
                Mild localized
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 24-Hour Patient Vitals Trend Sparkline Module */}
      <PatientVitalsTrend
        patientName="Aarav Mehta"
        bedId="Bed M-104 (Medical Ward A)"
        uhid="HOS-2026-1001"
      />

      {/* Balanced 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Clinical Round, MAR, Labs */}
        <div className="xl:col-span-7 space-y-6">
          {/* Doctor's Daily Clinical Round Note */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Doctor's Daily Clinical Round</h2>
                  <span className="text-xs text-neutral-500">23 Sep 2026 • 09:40 AM • Dr. Ananya Rao (Attending Physician)</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold">
                Signed & Locked
              </span>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4 text-neutral-800 text-sm leading-relaxed border border-neutral-100">
              “Patient stable post-procedure. Lungs clear bilaterally, abdomen soft. Continue current IV hydration and antibiotic regimen. Review tomorrow morning before discharge planning.”
            </div>

            {/* Exam Findings Cluster */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Respiratory System</span>
                <p className="text-xs font-semibold text-neutral-900 mt-1">Bilateral Vesicular Breath Sounds</p>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Cardiovascular</span>
                <p className="text-xs font-semibold text-neutral-900 mt-1">S1 S2 Normal, No Murmurs</p>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Surgical Site</span>
                <p className="text-xs font-semibold text-neutral-900 mt-1">Clean, dry & intact dressing</p>
              </div>
            </div>

            {/* Addenda list if any */}
            {addenda.map((ad, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-neutral-800">
                <span className="font-bold text-amber-900 block mb-0.5">Addendum #{idx + 1} (Logged by Dr. Rao):</span>
                {ad}
              </div>
            ))}

            {showAddendumInput && (
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <textarea
                  value={addendumText}
                  onChange={(e) => setAddendumText(e.target.value)}
                  placeholder="Enter clinical round addendum notes..."
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 bg-white outline-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowAddendumInput(false)}
                    className="px-3 py-1 rounded-full text-xs text-neutral-600 hover:bg-neutral-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (addendumText.trim()) {
                        setAddenda([...addenda, addendumText]);
                        setAddendumText('');
                        setShowAddendumInput(false);
                        onTriggerToast('Addendum signed and committed to clinical EHR ledger.');
                      }
                    }}
                    className="px-4 py-1 rounded-full bg-black text-white text-xs font-bold"
                  >
                    Commit Addendum
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button 
                onClick={() => onTriggerToast('Loaded full historical 4-day clinical rounds timeline.')}
                className="text-xs font-semibold text-neutral-600 hover:text-black flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                View previous 4 days round history
              </button>
              <button 
                onClick={() => setShowAddendumInput(true)}
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Addendum
              </button>
            </div>
          </div>

          {/* Interdisciplinary Clinical Notes & Bedside Observations Ledger */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#fcde6d] text-[#221b00] flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">clinical_notes</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                      Clinical Notes & Bedside Observations
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold">
                      {patientNotes.length} Recorded
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    Chronological multidisciplinary observation timeline for {activePatient.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowInlineNoteForm(!showInlineNoteForm)}
                  className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showInlineNoteForm ? 'close' : 'edit_note'}
                  </span>
                  <span>{showInlineNoteForm ? 'Cancel' : 'Quick Note'}</span>
                </button>

                <button
                  onClick={() => clinicalNotesService.openNotesPanel(activePatient)}
                  className="px-3.5 py-1.5 rounded-full bg-[#141416] hover:bg-neutral-800 text-[#fcde6d] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                  title="Open Clinical Notes Side-Panel Drawer"
                >
                  <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
                  <span>Open Side-Panel</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs pb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Filter:</span>
                {[
                  { id: 'all', label: `All (${patientNotes.length})` },
                  { id: 'doctor', label: `Doctors (${patientNotes.filter(n => n.authorRole === 'doctor').length})` },
                  { id: 'nurse', label: `Nurses (${patientNotes.filter(n => n.authorRole === 'nurse').length})` },
                  { id: 'critical', label: `Alerts (${patientNotes.filter(n => n.priority === 'stat_urgent').length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setNotesFilter(f.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      notesFilter === f.id
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                Real-Time EHR Feed
              </span>
            </div>

            {/* Quick Inline Note Form */}
            {showInlineNoteForm && (
              <form onSubmit={handleSaveInlineNote} className="p-4 rounded-2xl bg-[#faf8f4] border border-amber-200/80 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-700">add_comment</span>
                    Log Bedside Observation for {activePatient.name}
                  </span>

                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-full border border-neutral-200 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setInlineRole('doctor');
                        setInlineCategory('physician_round');
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                        inlineRole === 'doctor' ? 'bg-blue-600 text-white' : 'text-neutral-600'
                      }`}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineRole('nurse');
                        setInlineCategory('nursing_assessment');
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                        inlineRole === 'nurse' ? 'bg-emerald-600 text-white' : 'text-neutral-600'
                      }`}
                    >
                      Nurse
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">Category</label>
                    <select
                      value={inlineCategory}
                      onChange={(e) => setInlineCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-xs outline-none"
                    >
                      <option value="physician_round">Doctor's Clinical Round</option>
                      <option value="nursing_assessment">Nursing Kardex Assessment</option>
                      <option value="vital_signs">Vitals & Hemodynamic Check</option>
                      <option value="medication_response">Medication Response</option>
                      <option value="care_plan">Care Plan & Discharge Order</option>
                      <option value="critical_stat">STAT Critical Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">Priority</label>
                    <select
                      value={inlinePriority}
                      onChange={(e) => setInlinePriority(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-xs outline-none"
                    >
                      <option value="routine">Routine</option>
                      <option value="important">Important / Priority</option>
                      <option value="stat_urgent">STAT / Urgent Alert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    required
                    value={inlineNoteText}
                    onChange={(e) => setInlineNoteText(e.target.value)}
                    placeholder="Enter timestamped observation, clinical findings, or nursing assessment..."
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 bg-white outline-none focus:ring-2 focus:ring-[#fcde6d]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">
                    Timestamp: <strong>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInlineNoteForm(false)}
                      className="px-3 py-1 rounded-full text-xs text-neutral-600 hover:bg-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 shadow-sm"
                    >
                      Sign & Append Note
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Observation Cards Timeline in Patient Record */}
            <div className="space-y-3">
              {filteredPatientNotes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-neutral-400">notes</span>
                  <p className="text-xs font-semibold text-neutral-700">No clinical observations found for this filter.</p>
                  <button
                    onClick={() => clinicalNotesService.openNotesPanel(activePatient)}
                    className="px-3 py-1.5 rounded-full bg-[#141416] text-[#fcde6d] text-xs font-bold shadow-sm"
                  >
                    Open Clinical Notes Panel
                  </button>
                </div>
              ) : (
                filteredPatientNotes.map((note) => {
                  const isDoctor = note.authorRole === 'doctor';
                  const isStat = note.priority === 'stat_urgent';

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isStat
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-neutral-50/70 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                              isStat
                                ? 'bg-rose-600'
                                : isDoctor
                                ? 'bg-blue-700'
                                : 'bg-emerald-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isStat ? 'emergency' : isDoctor ? 'stethoscope' : 'medical_services'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-900">{note.authorName}</span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  isDoctor ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isDoctor ? 'Doctor' : 'Nurse'}
                              </span>
                              {isStat && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                                  STAT
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500">{note.authorDesignation}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-neutral-900 block">{note.timestamp}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">{note.fullDate.split(' ')[0]}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 text-xs text-neutral-800 leading-relaxed bg-white p-3 rounded-xl border border-neutral-200/80">
                        {note.observation}
                      </div>

                      {/* Vitals Snapshot if attached */}
                      {note.vitalsSnapshot && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] bg-white/80 p-2 rounded-lg border border-neutral-200">
                          <span className="font-bold text-neutral-400 uppercase">Vitals:</span>
                          {note.vitalsSnapshot.bp && <span>BP: <strong>{note.vitalsSnapshot.bp}</strong></span>}
                          {note.vitalsSnapshot.pulse && <span>Pulse: <strong>{note.vitalsSnapshot.pulse} bpm</strong></span>}
                          {note.vitalsSnapshot.spO2 && <span className="text-emerald-700 font-semibold">SpO2: <strong>{note.vitalsSnapshot.spO2}%</strong></span>}
                          {note.vitalsSnapshot.temp && <span>Temp: <strong>{note.vitalsSnapshot.temp}°F</strong></span>}
                          {note.vitalsSnapshot.painScore !== undefined && (
                            <span className="text-amber-800">Pain: <strong>{note.vitalsSnapshot.painScore}/10</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Medication Administration Record (MAR) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">pill</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Medication Administration Record (MAR)</h2>
                  <span className="text-xs text-neutral-500">Real-time nurse verification & scheduling</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  onNavigate('pharmacy');
                  onTriggerToast('Opening Pharmacy Order Console for Bed M-104...');
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">playlist_add</span>
                New Rx Order
              </button>
            </div>

            <div className="space-y-3">
              {/* Paracetamol */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-100">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">check_circle</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-neutral-900">Paracetamol 500mg</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-semibold">Oral Tab</span>
                      <span className="text-xs text-neutral-500">Twice daily (q12h)</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Administered at <strong className="text-neutral-900">08:00 AM</strong> by Nurse Neha Singh. Next dose due at 08:00 PM.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold self-start sm:self-auto">
                  Administered
                </span>
              </div>

              {/* Pantoprazole */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-100">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">check_circle</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-neutral-900">Pantoprazole 40mg</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-semibold">IV Push</span>
                      <span className="text-xs text-neutral-500">Once daily (Before meal)</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Administered at <strong className="text-neutral-900">07:30 AM</strong> before breakfast by Nurse Neha Singh. Completed for the day.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold self-start sm:self-auto">
                  Administered
                </span>
              </div>

              {/* Amoxicillin */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">schedule</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-neutral-900">Amoxicillin 625mg</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold">Oral Tab</span>
                      <span className="text-xs text-amber-900 font-semibold">Three times daily (q8h)</span>
                    </div>
                    <p className="text-xs text-neutral-700 mt-0.5">
                      {adminAmoxicillin 
                        ? 'Administered at 14:00 PM and verified in nursing MAR.'
                        : '14:00 PM dose pending administration. Dispensed by pharmacy, awaiting nurse verification.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAdminAmoxicillin(true);
                    onTriggerToast('Amoxicillin 625mg confirmed administered to Aarav Mehta!');
                  }}
                  disabled={adminAmoxicillin}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto ${
                    adminAmoxicillin ? 'bg-emerald-100 text-emerald-900' : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{adminAmoxicillin ? 'done' : 'check'}</span>
                  <span>{adminAmoxicillin ? 'Administered' : 'Confirm Admin'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Labs & Imaging Tracker */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <span className="material-symbols-outlined text-[20px]">biotech</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Diagnostic Labs & Imaging Tracker</h2>
                  <span className="text-xs text-neutral-500">Pathology & Radiology Order Pipeline • LIS Sync: 10:02 AM</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* CBC */}
              <div className="rounded-2xl bg-emerald-50/40 p-4 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900">Complete Blood Count</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 block w-fit mb-3">
                    Completed
                  </span>
                  <div className="space-y-1 text-xs text-neutral-600">
                    <div className="flex justify-between"><span>Hemoglobin:</span><strong className="text-neutral-900">13.8 g/dL</strong></div>
                    <div className="flex justify-between"><span>WBC:</span><strong className="text-neutral-900">7,200 /μL</strong></div>
                    <div className="flex justify-between"><span>Platelets:</span><strong className="text-neutral-900">240,000 /μL</strong></div>
                  </div>
                </div>
                <button 
                  onClick={() => onTriggerToast('Opening Pathology PDF Lab Slip for Aarav Mehta...')}
                  className="mt-4 w-full py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-black/5 shadow-sm"
                >
                  View PDF Lab Slip
                </button>
              </div>

              {/* LFT & KFT */}
              <div className="rounded-2xl bg-amber-50/40 p-4 border border-amber-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900">LFT & KFT Profiles</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 block w-fit mb-3">
                    Central Lab Processing
                  </span>
                  <div className="space-y-1 text-xs text-neutral-600">
                    <p>Sample collected: <strong className="text-neutral-900 font-semibold">09:15 AM</strong></p>
                    <p>Phlebotomist: <span className="text-neutral-800">K. Shinde</span></p>
                    <p className="text-amber-800 font-bold">ETA: ~12:30 PM</p>
                  </div>
                </div>
                <button 
                  onClick={() => onTriggerToast('Central Lab Auto-Analyzer: Specimen in batch carousel (72% processed).')}
                  className="mt-4 w-full py-1.5 rounded-full bg-white hover:bg-neutral-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-sm"
                >
                  Track Analyzer
                </button>
              </div>

              {/* Chest X-Ray */}
              <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900">Chest X-Ray PA View</span>
                    <span className="material-symbols-outlined text-[16px] text-neutral-500">radiology</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 block w-fit mb-3">
                    Ordered (Awaiting Bay)
                  </span>
                  <div className="space-y-1 text-xs text-neutral-600">
                    <p>Scheduled: <strong className="text-neutral-900">11:30 AM</strong></p>
                    <p>Modality: Portable Unit 02</p>
                    <p>Routine post-op clearance</p>
                  </div>
                </div>
                <button 
                  onClick={() => onTriggerToast('Radiology technician paged for portable bedside X-Ray.')}
                  className="mt-4 w-full py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-black/5 shadow-sm"
                >
                  Page Radiology Tech
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): AI Copilot, Allergies, Nursing Handover */}
        <div className="xl:col-span-5 space-y-6">
          {/* AI Clinical Intelligence Assistant */}
          {!copilotDismissed && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#ffd8ec] text-[#330c28] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      HOSFLOW Clinical Intelligence
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">Copilot Active</span>
                    </h3>
                    <span className="text-[11px] text-neutral-400">Realtime ward decision telemetry</span>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#fcde6d] animate-ping"></span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border-l-4 border-[#ffd8ec] text-xs text-neutral-800 leading-relaxed">
                “Dr. Rao, CBC panel shows normal recovery trend (WBC 7,200). Patient is afebrile &gt;48 hrs. Recommended: Verify oral tolerance and approve discharge readiness.”
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onNavigate('discharge_hub')}
                  className="flex-1 py-2 px-3 rounded-full bg-[#ffd8ec] text-[#330c28] hover:brightness-95 text-xs font-bold shadow-sm transition-all"
                >
                  Review Criteria & Approve Discharge
                </button>
                <button 
                  onClick={() => setCopilotDismissed(true)}
                  className="py-2 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Critical Alerts & Allergies */}
          <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-300 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold text-sm">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>Critical Alerts & Allergies</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">High Attention</span>
            </div>
            <div className="text-xs text-rose-950 font-medium space-y-1">
              <p>• Fall Risk: <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Low</span> (Bed rails upright, call bell within reach)</p>
              <p>• Allergy: <span className="font-bold text-rose-900 bg-rose-200 px-1.5 py-0.5 rounded">Penicillin</span> (Documented synthetic tolerance verified)</p>
            </div>
          </div>

          {/* Nursing Handover Station */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-neutral-800">assignment_turned_in</span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Nursing Handover</h3>
                  <span className="text-xs text-neutral-400">Shift 1 (07:00-15:00) → Shift 2</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                {signedHandover ? 'Signed & Verified' : 'Ready for Sign-off'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl text-xs">
              <span className="text-neutral-600">Duty Nurse: <strong className="text-neutral-900 font-semibold">Nurse Neha Singh</strong></span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">Active Duty</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-neutral-50 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Condition Summary</span>
                <p className="font-medium text-neutral-800">
                  Ambulatory with minimal assistance. Tolerating oral fluids well. Surgical incision dressing dry and intact.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Pending Ward Tasks</span>
                <ul className="space-y-1 text-neutral-700">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Administer scheduled oral Amoxicillin 625mg (14:00 PM)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Routine post-prandial blood sugar check (15:30 PM)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Portable chest X-ray positioning check with radiology
                  </li>
                </ul>
              </div>
            </div>

            {/* Attending Actions */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    if (!signedHandover) {
                      signHandoffMutation.mutate(activePatient.uhid);
                    }
                  }}
                  className={`py-2 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 ${
                    signedHandover ? 'bg-emerald-100 text-emerald-900' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">draw</span>
                  {signedHandover ? 'Signed' : 'Sign Handover'}
                </button>
                <button 
                  onClick={() => onTriggerToast('Transfer dialog initialized for Bed M-104.')}
                  className="py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  Transfer Bed
                </button>
              </div>

              <button 
                onClick={() => onNavigate('discharge_hub')}
                className="w-full py-2.5 rounded-full bg-[#fcde6d] text-[#221b00] hover:brightness-95 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                Discharge Authorization
              </button>
            </div>
          </div>

          {/* Medical Ward A Bay Matrix Mini Panel */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                Medical Ward A Bay Matrix
              </span>
              <span className="text-neutral-500">14 / 16 Beds</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {['M-101', 'M-102', 'M-103', 'M-104', 'M-105', 'M-106', 'M-107', 'M-108'].map((bed) => {
                const isCurrent = bed === 'M-104';
                return (
                  <div
                    key={bed}
                    className={`py-1 text-center rounded-lg text-xs font-bold transition-all ${
                      isCurrent 
                        ? 'bg-black text-white ring-2 ring-black ring-offset-1'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer'
                    }`}
                  >
                    {bed}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
