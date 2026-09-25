/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Clinical Notes & Bedside Observations Service
 * Provides centralized storage, real-time event subscription,
 * and multi-disciplinary note management for Doctors and Nurses.
 */

import { ClinicalObservation, SelectablePatient, ObservationCategory } from '../types';
import { auditLogService } from './auditLogService';

const STORAGE_KEY = 'hosflow_clinical_observations_v1';

// Seed observations providing immediate clinical context
const INITIAL_OBSERVATIONS: ClinicalObservation[] = [
  // Aarav Mehta (HOS-2026-1001 / P-1001)
  {
    id: 'OBS-101',
    patientId: 'P-1001',
    patientUhid: 'HOS-2026-1001',
    patientName: 'Aarav Mehta',
    authorName: 'Dr. Ananya Rao',
    authorRole: 'doctor',
    authorDesignation: 'Attending Physician • Shift Lead',
    category: 'physician_round',
    priority: 'routine',
    observation: 'Patient stable post-procedure. Bilateral breath sounds clear, abdomen soft, non-tender. Bowel sounds present. Continue IV hydration at 75ml/hr and step-down antibiotic regimen.',
    timestamp: '09:40 AM',
    fullDate: '2026-09-25 09:40 AM',
    vitalsSnapshot: {
      bp: '120/80',
      pulse: 76,
      temp: 98.6,
      spO2: 98,
      respRate: 18,
      painScore: 2,
    },
    tags: ['Physician Round', 'Post-Op Day 3', 'Hemodynamics Stable'],
  },
  {
    id: 'OBS-102',
    patientId: 'P-1001',
    patientUhid: 'HOS-2026-1001',
    patientName: 'Aarav Mehta',
    authorName: 'Sister Nirmala Joshi, RN',
    authorRole: 'nurse',
    authorDesignation: 'Ward In-Charge • Floor 2 Lead',
    category: 'nursing_assessment',
    priority: 'routine',
    observation: 'Bedside Kardex check completed. Ambulated 30 meters along corridor with light assistance, tolerated well without dizziness. IV peripheral cannula in left forearm patent, dressing dry. Oral fluid intake tolerated.',
    timestamp: '08:15 AM',
    fullDate: '2026-09-25 08:15 AM',
    vitalsSnapshot: {
      bp: '118/78',
      pulse: 74,
      temp: 98.4,
      spO2: 99,
      respRate: 16,
      painScore: 2,
    },
    tags: ['Ambulation', 'Cannula Check', 'Nursing Kardex'],
  },
  {
    id: 'OBS-103',
    patientId: 'P-1001',
    patientUhid: 'HOS-2026-1001',
    patientName: 'Aarav Mehta',
    authorName: 'Sister Nirmala Joshi, RN',
    authorRole: 'nurse',
    authorDesignation: 'Ward In-Charge • Floor 2 Lead',
    category: 'medication_response',
    priority: 'routine',
    observation: 'Administered prescribed IV Pantoprazole 40mg and oral hydration salts. No adverse reaction observed. Patient resting comfortably in semi-Fowler position.',
    timestamp: '06:30 AM',
    fullDate: '2026-09-25 06:30 AM',
    vitalsSnapshot: {
      bp: '122/80',
      pulse: 78,
      temp: 98.6,
      spO2: 98,
      respRate: 18,
      painScore: 3,
    },
    tags: ['Medication', 'MAR Sign-off'],
  },

  // Priya Sharma (HOS-2026-1002 / P-1002)
  {
    id: 'OBS-201',
    patientId: 'P-1002',
    patientUhid: 'HOS-2026-1002',
    patientName: 'Priya Sharma',
    authorName: 'Dr. Rajesh Patel',
    authorRole: 'doctor',
    authorDesignation: 'Consultant Laparoscopic Surgeon',
    category: 'physician_round',
    priority: 'important',
    observation: 'Post-Laparoscopic Cholecystectomy Day 1. Trocar puncture sites clean, dry, no signs of erythema or active bleeding. Abdomen soft, mild umbilical tenderness expected. Advance to light semisolid diet.',
    timestamp: '10:15 AM',
    fullDate: '2026-09-25 10:15 AM',
    vitalsSnapshot: {
      bp: '124/82',
      pulse: 78,
      temp: 98.4,
      spO2: 98,
      respRate: 16,
      painScore: 6,
    },
    tags: ['Surgical Round', 'Laparoscopy', 'Wound Clean'],
  },
  {
    id: 'OBS-202',
    patientId: 'P-1002',
    patientUhid: 'HOS-2026-1002',
    patientName: 'Priya Sharma',
    authorName: 'Sister Nirmala Joshi, RN',
    authorRole: 'nurse',
    authorDesignation: 'Ward In-Charge • Floor 2 Lead',
    category: 'nursing_assessment',
    priority: 'important',
    observation: 'Reported localized surgical site pain score 6/10. Administered prescribed oral analgesia with warm compress. Incentive spirometry encouraged: achieved 750ml x 5 reps. Voided clear urine spontaneously.',
    timestamp: '09:00 AM',
    fullDate: '2026-09-25 09:00 AM',
    vitalsSnapshot: {
      bp: '126/84',
      pulse: 82,
      temp: 98.8,
      spO2: 97,
      respRate: 18,
      painScore: 6,
    },
    tags: ['Pain Management', 'Incentive Spirometry'],
  },

  // Rohan Patel (HOS-2026-1003 / P-1003)
  {
    id: 'OBS-301',
    patientId: 'P-1003',
    patientUhid: 'HOS-2026-1003',
    patientName: 'Rohan Patel',
    authorName: 'Dr. Mehra',
    authorRole: 'doctor',
    authorDesignation: 'Intensivist & ICU Clinical Lead',
    category: 'critical_stat',
    priority: 'stat_urgent',
    observation: 'STAT CRITICAL ALERT: Patient displaying increased work of breathing. SpO2 dipped to 91% on room air. Escalated to Venturi mask 40% FiO2. Arterial Blood Gas (ABG) and repeat lactate sent to STAT lab. Titrating inotropic support.',
    timestamp: '11:10 AM',
    fullDate: '2026-09-25 11:10 AM',
    vitalsSnapshot: {
      bp: '142/96',
      pulse: 118,
      temp: 101.8,
      spO2: 91,
      respRate: 28,
      painScore: 7,
    },
    tags: ['STAT Alert', 'ARDS', 'Venturi Mask', 'ABG Ordered'],
  },
  {
    id: 'OBS-302',
    patientId: 'P-1003',
    patientUhid: 'HOS-2026-1003',
    patientName: 'Rohan Patel',
    authorName: 'Sister Kavita, RN',
    authorRole: 'nurse',
    authorDesignation: 'ICU Specialist Nurse',
    category: 'vital_signs',
    priority: 'stat_urgent',
    observation: 'Bedside arterial line calibrated and zeroed. Continuous ECG telemetry demonstrates sinus tachycardia at 118 bpm. Febrile at 101.8°F; ice packs applied to axillae, IV antipyretic infused.',
    timestamp: '11:25 AM',
    fullDate: '2026-09-25 11:25 AM',
    vitalsSnapshot: {
      bp: '138/92',
      pulse: 112,
      temp: 101.2,
      spO2: 94,
      respRate: 24,
      painScore: 5,
    },
    tags: ['ICU Telemetry', 'Arterial Line', 'Fever Protocol'],
  },

  // Devika Singhania (UHID-884102)
  {
    id: 'OBS-401',
    patientId: 'UHID-884102',
    patientUhid: 'UHID-884102',
    patientName: 'Devika Singhania',
    authorName: 'Sunita Nair, RN',
    authorRole: 'nurse',
    authorDesignation: 'Charge Nurse • Station B',
    category: 'nursing_assessment',
    priority: 'routine',
    observation: 'Post-Surg Day 4. Surgical abdominal drain removed aseptically by surgical registrar. Dressing intact. Patient tolerating solid diet well, ambulating freely. Discharge meds verified in pharmacy bag.',
    timestamp: '10:05 AM',
    fullDate: '2026-09-25 10:05 AM',
    vitalsSnapshot: {
      bp: '122/80',
      pulse: 76,
      temp: 98.4,
      spO2: 99,
      respRate: 16,
      painScore: 2,
    },
    tags: ['Drain Removed', 'Discharge Ready'],
  },

  // Kishore Kulkarni (UHID-884119)
  {
    id: 'OBS-501',
    patientId: 'UHID-884119',
    patientUhid: 'UHID-884119',
    patientName: 'Kishore Kulkarni',
    authorName: 'Sunita Nair, RN',
    authorRole: 'nurse',
    authorDesignation: 'Charge Nurse • Station B',
    category: 'nursing_assessment',
    priority: 'important',
    observation: 'Post-CABG Day 3 Stepdown. Sternal compression binder securely applied. Incentive spirometry achieved 800ml x 5 reps. Potassium infusion completed, repeat serum electrolytes drawn.',
    timestamp: '09:15 AM',
    fullDate: '2026-09-25 09:15 AM',
    vitalsSnapshot: {
      bp: '138/86',
      pulse: 82,
      temp: 98.6,
      spO2: 97,
      respRate: 18,
      painScore: 4,
    },
    tags: ['Post-CABG', 'Spirometry', 'Sternal Binder'],
  },

  // Harish Mehta (UH-9402 / P-9402)
  {
    id: 'OBS-601',
    patientId: 'P-9402',
    patientUhid: 'UH-9402',
    patientName: 'Harish Mehta',
    authorName: 'Dr. Vikram Kulkarni',
    authorRole: 'doctor',
    authorDesignation: 'Senior Consultant General Surgeon',
    category: 'care_plan',
    priority: 'routine',
    observation: 'Day 4 post-op cholecystectomy review. Patient in high spirits, bowel movements restored, vitals optimal. Cleared for discharge by 14:00 today. Outpatient follow-up scheduled for 7 days.',
    timestamp: '08:45 AM',
    fullDate: '2026-09-25 08:45 AM',
    vitalsSnapshot: {
      bp: '118/76',
      pulse: 72,
      temp: 98.2,
      spO2: 99,
      respRate: 16,
      painScore: 1,
    },
    tags: ['Discharge Sign-off', 'Care Plan', 'Follow-up'],
  },
];

type NotesListener = () => void;
type PanelListener = (isOpen: boolean, patient: SelectablePatient | null) => void;

class ClinicalNotesService {
  private observations: ClinicalObservation[] = [];
  private notesListeners: Set<NotesListener> = new Set();
  private panelListeners: Set<PanelListener> = new Set();

  private isPanelOpenState: boolean = false;
  private activePatientState: SelectablePatient | null = null;

  private availablePatientsCache: SelectablePatient[] = [];

  constructor() {
    this.loadObservations();
    this.fetchData();
  }

  private async fetchData() {
    try {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      const [patientsRes, notesRes] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/clinical-notes', { headers })
      ]);
      
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        this.availablePatientsCache = data.map((p: any) => ({
          ...p,
          gender: p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'
        }));
      }
      if (notesRes.ok) {
        const data = await notesRes.json();
        this.observations = data.map((n: any) => ({
          ...n,
          vitalsSnapshot: n.vitalsSnapshot ? JSON.parse(n.vitalsSnapshot) : undefined
        }));
        this.saveObservations();
      }
      this.notifyNotes();
    } catch (err) {
      console.error('Failed to fetch clinical data', err);
    }
  }

  private loadObservations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.observations = JSON.parse(stored);
      } else {
        this.observations = [...INITIAL_OBSERVATIONS];
        this.saveObservations();
      }
    } catch {
      this.observations = [...INITIAL_OBSERVATIONS];
    }
  }

  private saveObservations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.observations));
    } catch {
      // ignore local storage limits
    }
  }

  private notifyNotes() {
    this.notesListeners.forEach((cb) => {
      try { cb(); } catch (err) { console.error('Error notifying notes listener', err); }
    });
  }

  private notifyPanel() {
    this.panelListeners.forEach((cb) => {
      try { cb(this.isPanelOpenState, this.activePatientState); } catch (err) { console.error('Error notifying panel listener', err); }
    });
  }

  // --- Observer subscriptions ---
  public subscribeToNotes(listener: NotesListener): () => void {
    this.notesListeners.add(listener);
    return () => this.notesListeners.delete(listener);
  }

  public subscribeToPanel(listener: PanelListener): () => void {
    this.panelListeners.add(listener);
    listener(this.isPanelOpenState, this.activePatientState);
    return () => this.panelListeners.delete(listener);
  }

  // --- Side-panel controls ---
  public openNotesPanel(patient: SelectablePatient) {
    this.activePatientState = patient;
    this.isPanelOpenState = true;
    this.notifyPanel();
  }

  public closeNotesPanel() {
    this.isPanelOpenState = false;
    this.notifyPanel();
  }

  public getActivePatient(): SelectablePatient | null {
    return this.activePatientState;
  }

  public isPanelOpen(): boolean {
    return this.isPanelOpenState;
  }

  // --- Observation operations ---
  public getAllObservations(): ClinicalObservation[] {
    return [...this.observations];
  }

  public getObservationsForPatient(patientIdOrUhid: string): ClinicalObservation[] {
    if (!patientIdOrUhid) return [];
    const query = patientIdOrUhid.trim().toLowerCase();
    return this.observations
      .filter((obs) => {
        return (
          obs.patientId.toLowerCase() === query ||
          obs.patientUhid.toLowerCase() === query ||
          (obs.patientName && obs.patientName.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        // Return most recent first
        return b.id.localeCompare(a.id);
      });
  }

  public addObservation(data: {
    patientId: string;
    patientUhid: string;
    patientName: string;
    authorName: string;
    authorRole: 'doctor' | 'nurse' | 'hospital_admin' | 'specialist';
    authorDesignation: string;
    category: ObservationCategory;
    priority?: 'routine' | 'important' | 'stat_urgent';
    observation: string;
    vitalsSnapshot?: {
      bp?: string;
      pulse?: number;
      temp?: number;
      spO2?: number;
      respRate?: number;
      painScore?: number;
    };
    tags?: string[];
  }): ClinicalObservation {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    const fullDateStr = `${dateStr} ${timeStr}`;

    const newObservation: ClinicalObservation = {
      id: `OBS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: data.patientId,
      patientUhid: data.patientUhid,
      patientName: data.patientName,
      authorName: data.authorName,
      authorRole: data.authorRole,
      authorDesignation: data.authorDesignation,
      category: data.category,
      priority: data.priority || 'routine',
      observation: data.observation.trim(),
      timestamp: timeStr,
      fullDate: fullDateStr,
      vitalsSnapshot: data.vitalsSnapshot,
      tags: data.tags || [],
    };

    // Prepend to list
    this.observations.unshift(newObservation);
    this.saveObservations();
    this.notifyNotes();

    // Log to clinical audit trail
    auditLogService.addLog({
      actor: data.authorName,
      role: data.authorDesignation,
      action: `Clinical Note Appended: [${data.category.toUpperCase().replace('_', ' ')}] recorded for patient ${data.patientName} (${data.patientUhid}). Priority: ${newObservation.priority.toUpperCase()}. Note: "${newObservation.observation.substring(0, 90)}..."`,
      category: 'clinical',
      severity: newObservation.priority === 'stat_urgent' ? 'critical' : newObservation.priority === 'important' ? 'warning' : 'info',
      status: 'VERIFIED',
      metadata: {
        observationId: newObservation.id,
        uhid: data.patientUhid,
        category: data.category,
        vitals: data.vitalsSnapshot,
      },
    });

    const token = localStorage.getItem('hosflow_jwt') || '';
    fetch('/api/clinical-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newObservation)
    }).catch(console.error);

    return newObservation;
  }

  public deleteObservation(id: string): boolean {
    const prevLen = this.observations.length;
    this.observations = this.observations.filter((obs) => obs.id !== id);
    if (this.observations.length !== prevLen) {
      this.saveObservations();
      this.notifyNotes();
      return true;
    }
    return false;
  }

  /**
   * Helper to return all admitted/registered patients across the hospital
   * for easy switching in the Clinical Notes panel.
   */
  public getAllAvailablePatients(): SelectablePatient[] {
    return [...this.availablePatientsCache];
  }
}

export const clinicalNotesService = new ClinicalNotesService();
