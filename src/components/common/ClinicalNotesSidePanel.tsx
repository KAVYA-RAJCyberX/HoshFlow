/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Clinical Notes Side-Panel (Slide-Over Drawer)
 * Allows Doctors and Nurses to add timestamped clinical observations,
 * reviews real-time bedside assessments, and synchronizes with patient records.
 */

import React, { useState, useEffect } from 'react';
import { ClinicalObservation, ObservationCategory, RoleType, SelectablePatient } from '../../types';
import { clinicalNotesService } from '../../services/clinicalNotesService';
import { CLINICAL_PERSONAS } from '../../data/mockHospitalData';

interface ClinicalNotesSidePanelProps {
  activeRole?: RoleType;
  onTriggerToast?: (msg: string) => void;
}

const CATEGORY_CONFIG: Record<
  ObservationCategory,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  physician_round: {
    label: "Doctor's Round",
    icon: 'stethoscope',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  nursing_assessment: {
    label: 'Nursing Assessment',
    icon: 'medical_services',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  vital_signs: {
    label: 'Vitals & Telemetry',
    icon: 'monitor_heart',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  medication_response: {
    label: 'Med Response',
    icon: 'pill',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  care_plan: {
    label: 'Care Plan',
    icon: 'checklist',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
  },
  critical_stat: {
    label: 'STAT Critical Alert',
    icon: 'emergency',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
  },
};

const QUICK_PHRASES = [
  'Bilateral breath sounds clear, lungs vesicular',
  'Bedside vitals stable, hemodynamics optimal',
  'Surgical dressing clean, dry, and intact',
  'Pain score controlled with analgesia',
  'Tolerating oral fluids and diet well',
  'Peripheral cannula patent, site healthy',
  'Ambulated 20m along ward without dyspnea',
  'Pending morning lab panel before discharge',
];

export const ClinicalNotesSidePanel: React.FC<ClinicalNotesSidePanelProps> = ({
  activeRole = 'doctor',
  onTriggerToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [patient, setPatient] = useState<SelectablePatient | null>(null);
  const [allPatients, setAllPatients] = useState<SelectablePatient[]>([]);
  const [notes, setNotes] = useState<ClinicalObservation[]>([]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [authorMode, setAuthorMode] = useState<'doctor' | 'nurse'>(
    activeRole === 'nurse' ? 'nurse' : 'doctor'
  );
  const [category, setCategory] = useState<ObservationCategory>(
    activeRole === 'nurse' ? 'nursing_assessment' : 'physician_round'
  );
  const [priority, setPriority] = useState<'routine' | 'important' | 'stat_urgent'>('routine');
  const [noteContent, setNoteContent] = useState('');
  const [includeVitals, setIncludeVitals] = useState(false);

  // Vitals Snapshot state
  const [vitalsBP, setVitalsBP] = useState('120/80');
  const [vitalsPulse, setVitalsPulse] = useState(76);
  const [vitalsSpO2, setVitalsSpO2] = useState(98);
  const [vitalsTemp, setVitalsTemp] = useState(98.6);
  const [vitalsPain, setVitalsPain] = useState(2);

  // Filter & Search State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to clinicalNotesService panel state and notes
  useEffect(() => {
    const unsubPanel = clinicalNotesService.subscribeToPanel((open, activePat) => {
      setIsOpen(open);
      setPatient(activePat);
      if (activePat) {
        setNotes(clinicalNotesService.getObservationsForPatient(activePat.uhid));
        if (activePat.vitals) {
          setVitalsBP(activePat.vitals.bp || '120/80');
          setVitalsPulse(activePat.vitals.pulse || 76);
          setVitalsSpO2(activePat.vitals.spO2 || 98);
          setVitalsTemp(activePat.vitals.temp || 98.6);
          setVitalsPain(activePat.vitals.painScore || 2);
        }
      }
    });

    const unsubNotes = clinicalNotesService.subscribeToNotes(() => {
      const current = clinicalNotesService.getActivePatient();
      if (current) {
        setNotes(clinicalNotesService.getObservationsForPatient(current.uhid));
      }
    });

    setAllPatients(clinicalNotesService.getAllAvailablePatients());

    return () => {
      unsubPanel();
      unsubNotes();
    };
  }, []);

  // Update default author role when global activeRole changes
  useEffect(() => {
    if (activeRole === 'nurse') {
      setAuthorMode('nurse');
      setCategory('nursing_assessment');
    } else {
      setAuthorMode('doctor');
      setCategory('physician_round');
    }
  }, [activeRole]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    clinicalNotesService.closeNotesPanel();
  };

  const handleSelectPatient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUhid = e.target.value;
    const found = allPatients.find((p) => p.uhid === selectedUhid);
    if (found) {
      clinicalNotesService.openNotesPanel(found);
    }
  };

  const handleInsertPhrase = (phrase: string) => {
    setNoteContent((prev) => (prev ? `${prev}. ${phrase}` : phrase));
  };

  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    if (!noteContent.trim()) {
      if (onTriggerToast) onTriggerToast('Please enter clinical observation text.');
      return;
    }

    const doctorPersona = CLINICAL_PERSONAS.doctor;
    const nursePersona = CLINICAL_PERSONAS.nurse;

    const authorName =
      authorMode === 'doctor' ? doctorPersona.name : nursePersona.name;
    const authorDesignation =
      authorMode === 'doctor'
        ? doctorPersona.designation
        : nursePersona.designation;

    const created = clinicalNotesService.addObservation({
      patientId: patient.id,
      patientUhid: patient.uhid,
      patientName: patient.name,
      authorName,
      authorRole: authorMode,
      authorDesignation,
      category,
      priority,
      observation: noteContent,
      vitalsSnapshot: includeVitals
        ? {
            bp: vitalsBP,
            pulse: Number(vitalsPulse),
            spO2: Number(vitalsSpO2),
            temp: Number(vitalsTemp),
            painScore: Number(vitalsPain),
          }
        : undefined,
      tags: [
        authorMode === 'doctor' ? 'Doctor E-Sign' : 'Nurse E-Sign',
        CATEGORY_CONFIG[category].label,
      ],
    });

    setNoteContent('');
    setShowAddForm(false);
    setIncludeVitals(false);

    if (onTriggerToast) {
      onTriggerToast(
        `Observation signed by ${authorName} and committed to ${patient.name}'s record.`
      );
    }
  };

  if (!isOpen || !patient) return null;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesCategory =
      filterCategory === 'all'
        ? true
        : filterCategory === 'doctor'
        ? n.authorRole === 'doctor'
        : filterCategory === 'nurse'
        ? n.authorRole === 'nurse'
        : filterCategory === 'critical'
        ? n.priority === 'stat_urgent' || n.category === 'critical_stat'
        : n.category === filterCategory;

    const matchesSearch = searchQuery
      ? n.observation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesCategory && matchesSearch;
  });

  const doctorNotesCount = notes.filter((n) => n.authorRole === 'doctor').length;
  const nurseNotesCount = notes.filter((n) => n.authorRole === 'nurse').length;
  const criticalNotesCount = notes.filter((n) => n.priority === 'stat_urgent').length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[580px] bg-white shadow-2xl flex flex-col border-l border-neutral-200 transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinical-notes-title"
      >
        {/* Header */}
        <div className="bg-[#141416] text-white p-5 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#fcde6d] text-[#221b00] flex items-center justify-center font-bold shadow-sm">
                <span className="material-symbols-outlined text-[20px]">clinical_notes</span>
              </div>
              <div>
                <h2
                  id="clinical-notes-title"
                  className="text-base font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white flex items-center gap-2"
                >
                  Clinical Notes & Observations
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Interdisciplinary Observation Ledger • Digital E-Sign Enabled
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              title="Close Clinical Notes Panel (Esc)"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Patient Executive Banner */}
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 text-[#fcde6d] border border-white/10 flex items-center justify-center font-bold text-sm">
                  {patient.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">{patient.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-neutral-200">
                      {patient.uhid}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-300 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{patient.gender}, {patient.age}y</span>
                    <span>•</span>
                    <span className="font-semibold text-[#fcde6d]">
                      {patient.bedId || 'Bed Assigned'}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-300 truncate max-w-[160px]">{patient.ward || 'General Inpatient'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Switch Patient Selector */}
              <div className="shrink-0">
                <select
                  value={patient.uhid}
                  onChange={handleSelectPatient}
                  className="bg-neutral-900 border border-white/20 rounded-xl text-[11px] text-neutral-200 px-2 py-1 outline-none cursor-pointer hover:border-[#fcde6d]"
                  title="Switch Active Patient"
                >
                  {allPatients.map((p) => (
                    <option key={p.uhid} value={p.uhid}>
                      {p.name} ({p.bedId || p.uhid})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {patient.diagnosis && (
              <p className="text-[11px] text-neutral-300 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5 truncate">
                <strong className="text-white font-semibold">Diagnosis:</strong> {patient.diagnosis}
              </p>
            )}
          </div>
        </div>

        {/* Stats & Fast Action Bar */}
        <div className="bg-[#fcf9f3] px-5 py-3 border-b border-neutral-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-neutral-800">{notes.length} Total Notes</span>
            <span className="text-neutral-400">•</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
              {doctorNotesCount} MD
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {nurseNotesCount} RN
            </span>
            {criticalNotesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                {criticalNotesCount} STAT
              </span>
            )}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
              showAddForm
                ? 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                : 'bg-[#141416] text-[#fcde6d] hover:bg-neutral-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAddForm ? 'close' : 'add_circle'}
            </span>
            <span>{showAddForm ? 'Cancel Note' : 'Add Observation'}</span>
          </button>
        </div>

        {/* Add Observation Form (Collapsible) */}
        {showAddForm && (
          <div className="bg-white p-5 border-b border-neutral-200 shadow-inner overflow-y-auto max-h-[50vh] shrink-0 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#221b00]">edit_note</span>
                New Timestamped Observation
              </span>

              {/* Author Persona Switcher */}
              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-full text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthorMode('doctor');
                    setCategory('physician_round');
                  }}
                  className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                    authorMode === 'doctor'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">stethoscope</span>
                  <span>Doctor Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthorMode('nurse');
                    setCategory('nursing_assessment');
                  }}
                  className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                    authorMode === 'nurse'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">medical_services</span>
                  <span>Nurse Mode</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveObservation} className="space-y-3">
              {/* Category & Priority Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Observation Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ObservationCategory)}
                    className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800 outline-none focus:border-black"
                  >
                    <option value="physician_round">Doctor's Clinical Round</option>
                    <option value="nursing_assessment">Nursing Kardex Assessment</option>
                    <option value="vital_signs">Vitals & Hemodynamic Check</option>
                    <option value="medication_response">Medication & Infusion Response</option>
                    <option value="care_plan">Care Plan & Discharge Order</option>
                    <option value="critical_stat">STAT Critical Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Acuity / Priority</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['routine', 'important', 'stat_urgent'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setPriority(lvl)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold capitalize transition-all border ${
                          priority === lvl
                            ? lvl === 'stat_urgent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : lvl === 'important'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {lvl === 'stat_urgent' ? 'STAT' : lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Macro Chips */}
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Quick Clinical Macro Phrases (Click to append)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PHRASES.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertPhrase(phrase)}
                      className="px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-semibold border border-neutral-200 transition-colors"
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observation Textarea */}
              <div>
                <label className="block text-neutral-700 font-bold text-xs mb-1">
                  Clinical Observation & Findings *
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={
                    authorMode === 'doctor'
                      ? 'Enter attending clinical impression, auscultation findings, diagnostic interpretation, and planned therapeutic regimen...'
                      : 'Record bedside observation, patient ambulation, drain/cannula status, pain feedback, and medication tolerance...'
                  }
                  className="w-full text-xs p-3 rounded-2xl border border-neutral-200 bg-[#faf8f4] text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-[#fcde6d] focus:bg-white transition-all leading-relaxed"
                />
              </div>

              {/* Optional Vitals Snapshot Toggle */}
              <div className="bg-[#faf8f4] p-3 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                    <input
                      type="checkbox"
                      checked={includeVitals}
                      onChange={(e) => setIncludeVitals(e.target.checked)}
                      className="w-4 h-4 rounded text-black focus:ring-black accent-black"
                    />
                    <span>Attach Bedside Vitals Snapshot with this observation</span>
                  </label>
                  {includeVitals && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Snapshot Active
                    </span>
                  )}
                </div>

                {includeVitals && (
                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-200 animate-in fade-in">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 block">BP</span>
                      <input
                        type="text"
                        value={vitalsBP}
                        onChange={(e) => setVitalsBP(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold border border-neutral-300 rounded-lg bg-white"
                        placeholder="120/80"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 block">Pulse</span>
                      <input
                        type="number"
                        value={vitalsPulse}
                        onChange={(e) => setVitalsPulse(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono font-bold border border-neutral-300 rounded-lg bg-white"
                        placeholder="76"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 block">SpO2 %</span>
                      <input
                        type="number"
                        value={vitalsSpO2}
                        onChange={(e) => setVitalsSpO2(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono font-bold border border-neutral-300 rounded-lg bg-white"
                        placeholder="98"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 block">Temp °F</span>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsTemp}
                        onChange={(e) => setVitalsTemp(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono font-bold border border-neutral-300 rounded-lg bg-white"
                        placeholder="98.6"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 block">Pain</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={vitalsPain}
                        onChange={(e) => setVitalsPain(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-mono font-bold border border-neutral-300 rounded-lg bg-white"
                        placeholder="2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                  Will timestamp as <strong>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#141416] hover:bg-neutral-800 text-[#fcde6d] text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[15px]">draw</span>
                    <span>Sign & Save to EHR</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Filter and Search Ribbon */}
        <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search observations, keywords, author..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 bg-white placeholder-neutral-400 outline-none focus:border-black"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px] font-semibold">
            {[
              { id: 'all', label: 'All' },
              { id: 'doctor', label: 'Doctors' },
              { id: 'nurse', label: 'Nurses' },
              { id: 'critical', label: 'Alerts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  filterCategory === tab.id
                    ? 'bg-neutral-900 text-white font-bold'
                    : 'bg-white text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observations Timeline Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fcf9f3]">
          {filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-400">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-800">No Clinical Observations Found</h3>
              <p className="text-xs text-neutral-500 max-w-xs">
                {searchQuery || filterCategory !== 'all'
                  ? 'No entries match your search criteria. Clear filter to review full clinical record.'
                  : 'No observations recorded yet for this patient. Click "Add Observation" above to log the first round or Kardex note.'}
              </p>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 rounded-full bg-[#141416] text-[#fcde6d] text-xs font-bold flex items-center gap-1.5 shadow-sm mt-2"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Record First Note</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const catConfig = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.physician_round;
              const isDoctor = note.authorRole === 'doctor';
              const isStat = note.priority === 'stat_urgent';

              return (
                <article
                  key={note.id}
                  className={`bg-white rounded-2xl p-4 border shadow-xs flex flex-col gap-3 transition-all hover:shadow-md ${
                    isStat
                      ? 'border-rose-300 bg-rose-50/30'
                      : 'border-neutral-200'
                  }`}
                >
                  {/* Note Header: Author, Badge, Timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                          isStat
                            ? 'bg-rose-600'
                            : isDoctor
                            ? 'bg-blue-700'
                            : 'bg-emerald-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isStat ? 'emergency' : isDoctor ? 'stethoscope' : 'medical_services'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-neutral-900">{note.authorName}</h4>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isDoctor
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDoctor ? 'Doctor' : 'Nurse'}
                          </span>

                          {isStat && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              STAT ALERT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">{note.authorDesignation}</p>
                      </div>
                    </div>

                    {/* Timestamp Badge */}
                    <div className="flex flex-col items-end text-right">
                      <span className="text-xs font-bold font-mono text-neutral-900">
                        {note.timestamp}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {note.fullDate.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{catConfig.icon}</span>
                      <span>{catConfig.label}</span>
                    </span>

                    {note.tags &&
                      note.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  {/* Observation Body */}
                  <div className="text-xs text-neutral-800 leading-relaxed bg-[#faf8f4] p-3 rounded-xl border border-neutral-200/70">
                    {note.observation}
                  </div>

                  {/* Vitals Snapshot if attached */}
                  {note.vitalsSnapshot && (
                    <div className="bg-white rounded-xl p-2.5 border border-neutral-200 flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">monitor_heart</span>
                        Vitals:
                      </span>
                      {note.vitalsSnapshot.bp && (
                        <span className="font-semibold text-neutral-800">
                          BP: <strong className="font-mono text-neutral-900">{note.vitalsSnapshot.bp}</strong>
                        </span>
                      )}
                      {note.vitalsSnapshot.pulse && (
                        <span className="font-semibold text-neutral-800">
                          Pulse: <strong className="font-mono text-neutral-900">{note.vitalsSnapshot.pulse}</strong> bpm
                        </span>
                      )}
                      {note.vitalsSnapshot.spO2 && (
                        <span className="font-semibold text-neutral-800">
                          SpO2: <strong className="font-mono text-emerald-700">{note.vitalsSnapshot.spO2}%</strong>
                        </span>
                      )}
                      {note.vitalsSnapshot.temp && (
                        <span className="font-semibold text-neutral-800">
                          Temp: <strong className="font-mono text-neutral-900">{note.vitalsSnapshot.temp}°F</strong>
                        </span>
                      )}
                      {note.vitalsSnapshot.painScore !== undefined && (
                        <span className="font-semibold text-neutral-800">
                          Pain: <strong className="font-mono text-amber-800">{note.vitalsSnapshot.painScore}/10</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Verified E-Sign stamp & Quick Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      Digitally committed to EHR
                    </span>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `[Clinical Note - ${note.patientName} (${note.patientUhid})]\n${note.fullDate} | Author: ${note.authorName} (${note.authorRole})\n${note.observation}`
                        );
                        if (onTriggerToast) onTriggerToast('Note copied to clipboard.');
                      }}
                      className="hover:text-black flex items-center gap-1 transition-colors"
                      title="Copy note text"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      <span>Copy</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Drawer Bottom Bar */}
        <div className="bg-white p-3.5 border-t border-neutral-200 px-5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync with Patient Record</span>
          </div>

          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
};
