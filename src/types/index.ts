export type RoleType = 
  | 'doctor' 
  | 'nurse' 
  | 'hospital_admin' 
  | 'super_admin' 
  | 'bed_manager' 
  | 'billing' 
  | 'pharmacy' 
  | 'housekeeping' 
  | 'reception'
  | 'patient_portal';

export type ViewType = 
  | 'ward_flow'
  | 'bed_matrix'
  | 'clinical_rounds'
  | 'discharge_hub'
  | 'billing'
  | 'housekeeping'
  | 'reception'
  | 'pharmacy'
  | 'executive_admin'
  | 'super_admin_panel'
  | 'governance'
  | 'turnover_manager'
  | 'nursing_station'
  | 'patient_portal'
  | 'patient_self_checkin'
  | 'login_portal';

export interface PatientRecord {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup: string;
  ward: string;
  bedId: string;
  diagnosis: string;
  attendingDoctor: string;
  admitDate: string;
  status: 'admitted' | 'discharge_planned' | 'discharge_hold' | 'critical' | 'cleared';
  acuity: 'low' | 'moderate' | 'high' | 'critical';
  vitals: {
    bp: string;
    pulse: number;
    temp: number;
    spO2: number;
    respRate: number;
    painScore: number;
  };
  allergies: string[];
  fallRisk: 'Low' | 'Moderate' | 'High';
  tpaInsurance?: {
    provider: string;
    preAuthAmount: number;
    billedAmount: number;
    coPayDue: number;
    status: 'approved' | 'query_raised' | 'co_pay_pending' | 'cleared';
    queryNote?: string;
  };
  dischargeChecklist?: {
    clinicalSignOff: boolean;
    nursingHandover: boolean;
    pharmacyBag: boolean;
    billingClearance: boolean;
    exitGatePassGenerated: boolean;
  };
  clinicalNotes?: ClinicalObservation[];
}

export type ObservationCategory = 
  | 'physician_round' 
  | 'nursing_assessment' 
  | 'vital_signs' 
  | 'medication_response' 
  | 'care_plan' 
  | 'critical_stat';

export interface ClinicalObservation {
  id: string;
  patientId: string;
  patientUhid: string;
  patientName: string;
  authorName: string;
  authorRole: 'doctor' | 'nurse' | 'hospital_admin' | 'specialist';
  authorDesignation: string;
  category: ObservationCategory;
  priority: 'routine' | 'important' | 'stat_urgent';
  observation: string;
  timestamp: string; // e.g. "10:45 AM"
  fullDate: string;  // e.g. "2026-09-25 10:45 AM"
  vitalsSnapshot?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    spO2?: number;
    respRate?: number;
    painScore?: number;
  };
  tags?: string[];
}

export interface SelectablePatient {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  ward?: string;
  bedId?: string;
  diagnosis?: string;
  attendingDoctor?: string;
  acuity?: string;
  status?: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    spO2?: number;
    respRate?: number;
    painScore?: number;
  };
}

export interface BedItem {
  id: string;
  ward: string;
  wardCategory: 'med_a' | 'med_b' | 'surgical' | 'icu' | 'ccu' | 'pediatrics' | 'emergency';
  status: 'available' | 'occupied' | 'cleaning' | 'ready' | 'reserved' | 'maintenance' | 'critical';
  patientName?: string;
  patientUhid?: string;
  patientAcuity?: string;
  attendingStaff?: string;
  assignedHousekeeper?: string;
  cleaningProgress?: number; // 0 to 100
  cleaningEstMinutesLeft?: number;
  expectedDischargeTime?: string;
  hardwareType: string;
  tempAndPressure: string;
  lastSanitized: string;
  suggestedAllocation?: string;
  updatedAt?: string; // ISO date string from backend
}

export interface InvoiceItem {
  id: string;
  uhid: string;
  patientName: string;
  wardBed: string;
  insuranceProvider: string;
  dateTime: string;
  totalAmount: number;
  tpaPaid: number;
  patientCoPay: number;
  clearanceStatus: 'cleared' | 'co_pay_pending' | 'tpa_query' | 'discharged' | 'in_progress';
  claimQueryNote?: string;
}

export interface PersonaProfile {
  role: RoleType;
  name: string;
  designation: string;
  avatarInitials: string;
  email: string;
  department: string;
  badgeText: string;
}

export type AuditCategory = 
  | 'role_switch' 
  | 'auth' 
  | 'patient_admission' 
  | 'clinical' 
  | 'pharmacy' 
  | 'billing' 
  | 'housekeeping'
  | 'discharge'
  | 'system';

export type AuditStatus = 'VERIFIED' | 'DUAL_SIGNED' | 'CLEARED' | 'RECORDED' | 'ALERT';
export type AuditSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // e.g. "11:48:12"
  fullDate: string;  // e.g. "2026-09-25 11:48:12"
  actor: string;
  role: string;
  action: string;
  category: AuditCategory;
  ipAddress: string;
  status: AuditStatus;
  severity: AuditSeverity;
  metadata?: Record<string, any>;
}

