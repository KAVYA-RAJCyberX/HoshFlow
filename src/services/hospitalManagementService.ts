/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Multi-Tenant Hospital Management Service
 * Provides centralized, reactive state management and CRUD for:
 * - Super Admin (Multi-Hospital Registry, Admin Assignment, Network Analytics)
 * - Hospital Admin (Doctors, Staff & Nurses, Patients, Departments)
 * - Resource Scheduling (Staff Shifts, Equipment Bookings, Operating Theatres)
 */

export interface HospitalRecord {
  id: string;
  code: string;
  name: string;
  campus: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
  emergencyHotline: string;
  contactEmail: string;
  tier: 'TIER_1_QUATERNARY' | 'TIER_2_TERTIARY' | 'SECONDARY_CARE';
  accreditation: string;
  totalBeds: number;
  occupiedBeds: number;
  isActive: boolean;
  createdAt: string;
  hospitalAdminId?: string;
  hospitalAdminName?: string;
  hospitalAdminEmail?: string;
  hospitalAdminPhone?: string;
}

export interface DoctorRecord {
  id: string;
  hospitalId: string;
  name: string;
  specialty: string;
  medicalLicense: string;
  qualification: string;
  department: string;
  opdRoom: string;
  opdTiming: string;
  consultationFee: number;
  contactPhone: string;
  email: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'EMERGENCY_ON_CALL';
  activePatientsCount: number;
}

export interface StaffRecord {
  id: string;
  hospitalId: string;
  name: string;
  roleType: 'Head Nurse' | 'Staff Nurse' | 'ICU Specialist Nurse' | 'Radiology Tech' | 'Biomedical Tech' | 'Pharmacist' | 'Admin Coordinator';
  department: string;
  assignedShift: 'Morning' | 'Evening' | 'Night' | 'On-Call';
  contactPhone: string;
  email: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_CALL' | 'LEAVE';
  assignedWard: string;
}

export interface PatientAppointment {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface MedicalRecordEntry {
  id: string;
  date: string;
  title: string;
  doctor: string;
  notes: string;
  diagnosis: string;
}

export interface PatientEntity {
  id: string;
  hospitalId: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  department: string;
  attendingDoctor: string;
  admitDate: string;
  status: 'Admitted' | 'Discharge Planned' | 'Critical ICU' | 'Outpatient' | 'Discharged';
  acuity: 'Low' | 'Moderate' | 'High' | 'Critical';
  roomBed: string;
  contactPhone: string;
  emergencyContact: string;
  insuranceProvider: string;
  appointments: PatientAppointment[];
  medicalRecords: MedicalRecordEntry[];
}

export interface DepartmentRecord {
  id: string;
  hospitalId: string;
  code: string;
  name: string;
  deptType: 'ICU' | 'OPD' | 'EMERGENCY' | 'SURGICAL' | 'CARDIOLOGY' | 'PEDIATRICS' | 'ONCOLOGY' | 'GENERAL_WARD';
  headOfDept: string;
  floorLocation: string;
  bedCapacity: number;
  occupiedBeds: number;
  emergencyContact: string;
  isOperational: boolean;
}

export interface StaffShiftItem {
  id: string;
  hospitalId: string;
  staffName: string;
  role: string;
  department: string;
  shiftDate: string;
  shiftType: 'Morning' | 'Evening' | 'Night' | 'On-Call';
  startTime: string;
  endTime: string;
  stationBay: string;
  isCovered: boolean;
  minRequiredStaff: number;
  currentStaffCount: number;
}

export interface EquipmentItem {
  id: string;
  hospitalId: string;
  code: string;
  name: string;
  category: 'Radiology' | 'ICU Life Support' | 'Surgical Robotic' | 'Cardiology' | 'Anesthesiology';
  location: string;
  status: 'AVAILABLE' | 'BOOKED' | 'IN_USE' | 'CALIBRATION' | 'MAINTENANCE';
  serialNumber: string;
  currentBooking?: {
    patientUhid: string;
    procedure: string;
    allocatedRoom: string;
    requestedBy: string;
    startTime: string;
    endTime: string;
  };
}

export interface OperatingTheatreItem {
  id: string;
  hospitalId: string;
  name: string;
  suiteType: string;
  floorWing: string;
  status: 'READY_FOR_CASE' | 'SURGERY_IN_PROGRESS' | 'STERILIZING_TURNOVER' | 'MAINTENANCE';
  turnoverMinutes: number;
  leadSurgeon?: string;
  anesthesiologist?: string;
  procedure?: string;
  patientUhid?: string;
  urgencyLevel?: 'ELECTIVE' | 'URGENT' | 'CODE_RED_EMERGENCY';
  estimatedFinish?: string;
}

export interface SystemAlertItem {
  id: string;
  hospitalId: string;
  hospitalName: string;
  timestamp: string;
  category: 'BLOOD_BANK' | 'CAPACITY_SURGE' | 'EQUIPMENT' | 'STAFFING_GAP' | 'CODE_RED';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

// STORAGE KEY
const STORAGE_KEY = 'hosflow_multi_hospital_system_v3';

const INITIAL_SYSTEM_ALERTS: SystemAlertItem[] = [
  {
    id: 'ALT-901',
    hospitalId: 'HOSP-001',
    hospitalName: 'CityCare Multispeciality Hospital, Pune',
    timestamp: '10 mins ago',
    category: 'BLOOD_BANK',
    severity: 'critical',
    title: 'O-Negative PRBC Stock Below Reserve Threshold',
    message: 'Only 2 units remaining in Central Blood Bank. Auto-requisition dispatched to Red Cross Regional Centre Pune.',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-902',
    hospitalId: 'HOSP-002',
    hospitalName: 'Apollo Lifecare Institute, Mumbai',
    timestamp: '25 mins ago',
    category: 'CAPACITY_SURGE',
    severity: 'warning',
    title: 'Neuro Critical Care ICU Occupancy Exceeds 86%',
    message: '26 of 30 beds occupied in Floor 5 ICU pod. Bed manager alerted for step-down transfers to High Dependency Unit.',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-903',
    hospitalId: 'HOSP-001',
    hospitalName: 'CityCare Multispeciality Hospital, Pune',
    timestamp: '42 mins ago',
    category: 'CODE_RED',
    severity: 'critical',
    title: 'Code Red Polytrauma Resuscitation Protocol',
    message: 'Emergency trauma team Bay 1 engaged for incoming vehicular collision resuscitation. OT-4 reserved.',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-904',
    hospitalId: 'HOSP-003',
    hospitalName: 'Fortis Health Sciences, Bengaluru',
    timestamp: '1 hour ago',
    category: 'STAFFING_GAP',
    severity: 'warning',
    title: 'Night Shift Nursing Coverage Gap in Pediatrics',
    message: '2 staff nurses on emergency leave. Head nurse notified to dispatch float pool relief personnel.',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-905',
    hospitalId: 'HOSP-001',
    hospitalName: 'CityCare Multispeciality Hospital, Pune',
    timestamp: '2 hours ago',
    category: 'EQUIPMENT',
    severity: 'info',
    title: 'Siemens 3T MRI Magnetom Calibration Validated',
    message: 'Biomedical engineering routine QA inspection completed. Cryogen level verified at 94% liquid helium.',
    status: 'RESOLVED',
  },
];

// SEED DATA
const INITIAL_HOSPITALS: HospitalRecord[] = [
  {
    id: 'HOSP-001',
    code: 'CC-PUNE-01',
    name: 'CityCare Multispeciality Hospital',
    campus: 'Central Medical Campus, Shivajinagar',
    address: '42 Senapati Bapat Road, Shivajinagar',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411016',
    contactPhone: '+91 20 6712 4000',
    emergencyHotline: '108 / +91 20 6712 4999',
    contactEmail: 'superintendent@citycare.org',
    tier: 'TIER_1_QUATERNARY',
    accreditation: 'NABH Digital & JCI Gold Seal',
    totalBeds: 250,
    occupiedBeds: 205,
    isActive: true,
    createdAt: '2023-01-15T00:00:00.000Z',
    hospitalAdminId: 'ADM-001',
    hospitalAdminName: 'Dr. Vikram Malhotra',
    hospitalAdminEmail: 'v.malhotra@hospital.com',
    hospitalAdminPhone: '+91 98230 44521',
  },
  {
    id: 'HOSP-002',
    code: 'AP-MUM-02',
    name: 'Apollo Lifecare Institute',
    campus: 'South Mumbai Waterfront Pod',
    address: '15 Marine Lines Boulevard, Colaba',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400020',
    contactPhone: '+91 22 2284 9000',
    emergencyHotline: '+91 22 2284 9100',
    contactEmail: 'coo@apollolifecare.org',
    tier: 'TIER_1_QUATERNARY',
    accreditation: 'NABH & Green Hospital Certified',
    totalBeds: 170,
    occupiedBeds: 146,
    isActive: true,
    createdAt: '2023-08-20T00:00:00.000Z',
    hospitalAdminId: 'ADM-002',
    hospitalAdminName: 'Dr. Sunita Deshmukh',
    hospitalAdminEmail: 's.deshmukh@apollolifecare.org',
    hospitalAdminPhone: '+91 98201 88722',
  },
  {
    id: 'HOSP-003',
    code: 'FT-BLR-03',
    name: 'Fortis Health Sciences Centre',
    campus: 'Whitefield Technology Hospital Park',
    address: '88 ITPL Main Road, Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
    contactPhone: '+91 80 4199 8000',
    emergencyHotline: '+91 80 4199 8999',
    contactEmail: 'director@fortisblr.org',
    tier: 'TIER_2_TERTIARY',
    accreditation: 'NABH Center of Clinical Excellence',
    totalBeds: 100,
    occupiedBeds: 78,
    isActive: true,
    createdAt: '2024-02-10T00:00:00.000Z',
    hospitalAdminId: 'ADM-003',
    hospitalAdminName: 'Dr. Arvind Nambiar',
    hospitalAdminEmail: 'a.nambiar@fortisblr.org',
    hospitalAdminPhone: '+91 94480 33119',
  },
];

const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  { id: 'DEP-01', hospitalId: 'HOSP-001', code: 'ICU-CCU', name: 'Intensive Critical Care Pod', deptType: 'ICU', headOfDept: 'Dr. Meera Nambiar', floorLocation: 'Tower A, 3rd Floor', bedCapacity: 40, occupiedBeds: 36, emergencyContact: 'Ext 301', isOperational: true },
  { id: 'DEP-02', hospitalId: 'HOSP-001', code: 'EMR-TRAUMA', name: 'Emergency & Acute Trauma Care', deptType: 'EMERGENCY', headOfDept: 'Dr. Rohan Kulkarni', floorLocation: 'Ground Floor Bay 1', bedCapacity: 30, occupiedBeds: 24, emergencyContact: 'Ext 100', isOperational: true },
  { id: 'DEP-03', hospitalId: 'HOSP-001', code: 'GEN-MED', name: 'General & Internal Medicine', deptType: 'GENERAL_WARD', headOfDept: 'Dr. Ananya Rao', floorLocation: 'Tower B, 2nd Floor', bedCapacity: 60, occupiedBeds: 52, emergencyContact: 'Ext 202', isOperational: true },
  { id: 'DEP-04', hospitalId: 'HOSP-001', code: 'CARDIO-S', name: 'Interventional Cardiology', deptType: 'CARDIOLOGY', headOfDept: 'Dr. Rohini Mehta', floorLocation: 'Tower A, 4th Floor', bedCapacity: 35, occupiedBeds: 30, emergencyContact: 'Ext 401', isOperational: true },
  { id: 'DEP-05', hospitalId: 'HOSP-001', code: 'ORTHO-J', name: 'Orthopedics & Joint Replacement', deptType: 'SURGICAL', headOfDept: 'Dr. Anand Joshi', floorLocation: 'Tower B, 4th Floor', bedCapacity: 35, occupiedBeds: 28, emergencyContact: 'Ext 405', isOperational: true },
  { id: 'DEP-06', hospitalId: 'HOSP-001', code: 'PED-NEO', name: 'Pediatrics & Neonatal ICU', deptType: 'PEDIATRICS', headOfDept: 'Dr. Preeti Deshpande', floorLocation: 'Tower B, 1st Floor', bedCapacity: 25, occupiedBeds: 18, emergencyContact: 'Ext 112', isOperational: true },
  { id: 'DEP-07', hospitalId: 'HOSP-001', code: 'OPD-CENT', name: 'Comprehensive Outpatient Clinics', deptType: 'OPD', headOfDept: 'Dr. S. K. Gupta', floorLocation: 'Ground Floor Bay 2', bedCapacity: 25, occupiedBeds: 17, emergencyContact: 'Ext 105', isOperational: true },
  
  // Hospital 2
  { id: 'DEP-08', hospitalId: 'HOSP-002', code: 'ICU-MUM', name: 'Neuro Critical Care ICU', deptType: 'ICU', headOfDept: 'Dr. Ashok Varma', floorLocation: 'Floor 5', bedCapacity: 30, occupiedBeds: 26, emergencyContact: 'Ext 501', isOperational: true },
  { id: 'DEP-09', hospitalId: 'HOSP-002', code: 'ONCO-MUM', name: 'Comprehensive Oncology Wing', deptType: 'ONCOLOGY', headOfDept: 'Dr. Rashmi Sen', floorLocation: 'Floor 6', bedCapacity: 45, occupiedBeds: 40, emergencyContact: 'Ext 601', isOperational: true },
];

const INITIAL_DOCTORS: DoctorRecord[] = [
  { id: 'DOC-101', hospitalId: 'HOSP-001', name: 'Dr. Ananya Rao', specialty: 'General Medicine & Inpatient Care', medicalLicense: 'MCI-2015-89421', qualification: 'MD (Internal Medicine), MRCP', department: 'General & Internal Medicine', opdRoom: 'Room 204', opdTiming: 'Mon-Sat 09:00 - 13:00', consultationFee: 900, contactPhone: '+91 98221 44102', email: 'ananya.rao@hospital.com', status: 'ACTIVE', activePatientsCount: 16 },
  { id: 'DOC-102', hospitalId: 'HOSP-001', name: 'Dr. Rohini Mehta', specialty: 'Cardiothoracic Surgery & TAVR', medicalLicense: 'MCI-2010-43219', qualification: 'MS, MCh (Cardio-Thoracic)', department: 'Interventional Cardiology', opdRoom: 'Room 401', opdTiming: 'Tue-Fri 14:00 - 18:00', consultationFee: 1500, contactPhone: '+91 98220 99411', email: 'rohini.mehta@citycare.org', status: 'ACTIVE', activePatientsCount: 12 },
  { id: 'DOC-103', hospitalId: 'HOSP-001', name: 'Dr. Anand Joshi', specialty: 'Orthopedics & Joint Robotic Reconstruction', medicalLicense: 'MCI-2012-78114', qualification: 'MS (Ortho), Fellowship (Arthroplasty)', department: 'Orthopedics & Joint Replacement', opdRoom: 'Room 408', opdTiming: 'Mon, Wed, Fri 10:00 - 15:00', consultationFee: 1200, contactPhone: '+91 98233 11844', email: 'anand.joshi@citycare.org', status: 'ACTIVE', activePatientsCount: 14 },
  { id: 'DOC-104', hospitalId: 'HOSP-001', name: 'Dr. Meera Nambiar', specialty: 'Critical Care & Pulmonology', medicalLicense: 'MCI-2014-55190', qualification: 'MD, FNB (Critical Care)', department: 'Intensive Critical Care Pod', opdRoom: 'ICU Console 1', opdTiming: 'Daily Round 08:00 & 17:00', consultationFee: 1100, contactPhone: '+91 98231 66209', email: 'meera.nambiar@citycare.org', status: 'ACTIVE', activePatientsCount: 18 },
  { id: 'DOC-105', hospitalId: 'HOSP-001', name: 'Dr. Rohan Kulkarni', specialty: 'Emergency Medicine & Trauma Resuscitation', medicalLicense: 'MCI-2018-99234', qualification: 'MD (Emergency Medicine), FACEM', department: 'Emergency & Acute Trauma Care', opdRoom: 'ER Trauma Bay 1', opdTiming: 'Rotating Shifts', consultationFee: 1000, contactPhone: '+91 98229 00812', email: 'rohan.kulkarni@citycare.org', status: 'ACTIVE', activePatientsCount: 22 },
  
  // Hospital 2
  { id: 'DOC-201', hospitalId: 'HOSP-002', name: 'Dr. Ashok Varma', specialty: 'Neurosurgery & Stroke Intervention', medicalLicense: 'MCI-2009-32810', qualification: 'MCh (Neurosurgery)', department: 'Neuro Critical Care ICU', opdRoom: 'Room 501', opdTiming: 'Mon-Thu 11:00 - 15:00', consultationFee: 1800, contactPhone: '+91 98200 55198', email: 'a.varma@apollolifecare.org', status: 'ACTIVE', activePatientsCount: 11 },
  { id: 'DOC-202', hospitalId: 'HOSP-002', name: 'Dr. Rashmi Sen', specialty: 'Medical Oncology & Immunotherapy', medicalLicense: 'MCI-2013-67123', qualification: 'MD, DM (Medical Oncology)', department: 'Comprehensive Oncology Wing', opdRoom: 'Room 604', opdTiming: 'Mon-Fri 10:00 - 14:00', consultationFee: 1600, contactPhone: '+91 98205 77120', email: 'rashmi.sen@apollolifecare.org', status: 'ACTIVE', activePatientsCount: 15 },
];

const INITIAL_STAFF: StaffRecord[] = [
  { id: 'STF-301', hospitalId: 'HOSP-001', name: 'Sister Nirmala Joshi', roleType: 'Head Nurse', department: 'General & Internal Medicine', assignedShift: 'Morning', contactPhone: '+91 98228 11450', email: 'nirmala.joshi@hospital.com', status: 'ON_DUTY', assignedWard: 'Ward 3 (General Inpatients)' },
  { id: 'STF-302', hospitalId: 'HOSP-001', name: 'Staff Nurse Kavita Patil', roleType: 'Staff Nurse', department: 'Intensive Critical Care Pod', assignedShift: 'Morning', contactPhone: '+91 98227 99231', email: 'kavita.p@citycare.org', status: 'ON_DUTY', assignedWard: 'ICU Pod A (Bed 1-6)' },
  { id: 'STF-303', hospitalId: 'HOSP-001', name: 'Staff Nurse Sunita Shinde', roleType: 'Staff Nurse', department: 'Emergency & Acute Trauma Care', assignedShift: 'Evening', contactPhone: '+91 98225 66782', email: 'sunita.s@citycare.org', status: 'ON_DUTY', assignedWard: 'Triage & Resuscitation' },
  { id: 'STF-304', hospitalId: 'HOSP-001', name: 'Pooja Kadam', roleType: 'Admin Coordinator', department: 'General & Internal Medicine', assignedShift: 'Morning', contactPhone: '+91 98230 11984', email: 'pooja.kadam@citycare.org', status: 'ON_DUTY', assignedWard: 'Central Reception Desk' },
  { id: 'STF-305', hospitalId: 'HOSP-001', name: 'Mahesh Jadhav', roleType: 'Biomedical Tech', department: 'Interventional Cardiology', assignedShift: 'Morning', contactPhone: '+91 98232 44100', email: 'mahesh.tech@citycare.org', status: 'ON_DUTY', assignedWard: 'OT Complex / Cath Lab' },
  { id: 'STF-306', hospitalId: 'HOSP-001', name: 'Amit Gokhale', roleType: 'Pharmacist', department: 'General & Internal Medicine', assignedShift: 'Evening', contactPhone: '+91 98229 33201', email: 'amit.g@citycare.org', status: 'ON_DUTY', assignedWard: 'Central STAT Pharmacy' },
];

const INITIAL_PATIENTS: PatientEntity[] = [
  {
    id: 'PAT-401',
    hospitalId: 'HOSP-001',
    uhid: 'UHID-2026-9041',
    name: 'Rajesh V. Sharma',
    age: 58,
    gender: 'Male',
    bloodGroup: 'B+ve',
    department: 'General & Internal Medicine',
    attendingDoctor: 'Dr. Ananya Rao',
    admitDate: '2026-09-22 10:15',
    status: 'Admitted',
    acuity: 'Moderate',
    roomBed: 'Bed W3-04',
    contactPhone: '+91 98220 12345',
    emergencyContact: 'Sunita Sharma (Wife) +91 98220 12346',
    insuranceProvider: 'Star Health Allied Insurance (Cashless)',
    appointments: [
      { id: 'APT-1', doctorName: 'Dr. Ananya Rao', date: '2026-09-25', time: '11:00 AM', reason: 'Post-Glycemic Inpatient Review', status: 'Scheduled' },
    ],
    medicalRecords: [
      { id: 'MR-1', date: '2026-09-22', title: 'Admission Case Workup', doctor: 'Dr. Ananya Rao', diagnosis: 'Type II Diabetes with Acute Cellulitis right lower extremity', notes: 'Initiated IV Piperacillin-Tazobactam. HbA1c 9.4%. Blood sugar monitored QID.' },
    ],
  },
  {
    id: 'PAT-402',
    hospitalId: 'HOSP-001',
    uhid: 'UHID-2026-8812',
    name: 'Priyanka D. Nair',
    age: 42,
    gender: 'Female',
    bloodGroup: 'O-ve',
    department: 'Interventional Cardiology',
    attendingDoctor: 'Dr. Rohini Mehta',
    admitDate: '2026-09-24 16:30',
    status: 'Critical ICU',
    acuity: 'Critical',
    roomBed: 'Bed ICU-02',
    contactPhone: '+91 98224 88712',
    emergencyContact: 'Devan Nair (Husband) +91 98224 88713',
    insuranceProvider: 'HDFC ERGO Health Optima',
    appointments: [
      { id: 'APT-2', doctorName: 'Dr. Rohini Mehta', date: '2026-09-25', time: '02:30 PM', reason: 'Coronary Angiogram / Stenting Evaluation', status: 'Scheduled' },
    ],
    medicalRecords: [
      { id: 'MR-2', date: '2026-09-24', title: 'Emergency Coronary Triage', doctor: 'Dr. Rohini Mehta', diagnosis: 'Acute Anterior Wall STEMI • Post Thrombolysis', notes: 'Troponin-T elevated at 480 pg/mL. Bedside 2D Echo shows EF 40%. Reserved PRBC O-ve units.' },
    ],
  },
  {
    id: 'PAT-403',
    hospitalId: 'HOSP-001',
    uhid: 'UHID-2026-7643',
    name: 'Dilip R. Kadam',
    age: 67,
    gender: 'Male',
    bloodGroup: 'A+ve',
    department: 'Orthopedics & Joint Replacement',
    attendingDoctor: 'Dr. Anand Joshi',
    admitDate: '2026-09-21 09:00',
    status: 'Discharge Planned',
    acuity: 'Low',
    roomBed: 'Bed W4-12',
    contactPhone: '+91 98231 44556',
    emergencyContact: 'Rahul Kadam (Son) +91 98231 44557',
    insuranceProvider: 'ICICI Lombard Complete Health',
    appointments: [
      { id: 'APT-3', doctorName: 'Dr. Anand Joshi', date: '2026-09-25', time: '12:00 PM', reason: 'Post-Op Knee Revision Mobilization Clearance', status: 'Scheduled' },
    ],
    medicalRecords: [
      { id: 'MR-3', date: '2026-09-21', title: 'Right Total Knee Arthroplasty (Stryker Triathlon)', doctor: 'Dr. Anand Joshi', diagnosis: 'Grade IV Osteoarthritis Right Knee • Surgical Recovery', notes: 'Surgical incision clean, active knee flexion 95 degrees, full weight bearing tolerated with walker.' },
    ],
  },
];

const INITIAL_SHIFTS: StaffShiftItem[] = [
  { id: 'SHF-1', hospitalId: 'HOSP-001', staffName: 'Sister Nirmala Joshi', role: 'Head Nurse', department: 'General & Internal Medicine', shiftDate: '2026-09-25', shiftType: 'Morning', startTime: '07:00', endTime: '15:30', stationBay: 'Ward 3 Nursing Hub', isCovered: true, minRequiredStaff: 4, currentStaffCount: 5 },
  { id: 'SHF-2', hospitalId: 'HOSP-001', staffName: 'Kavita Patil, RN', role: 'Staff Nurse', department: 'Intensive Critical Care Pod', shiftDate: '2026-09-25', shiftType: 'Morning', startTime: '07:00', endTime: '15:30', stationBay: 'ICU Pod A (Bed 1-4)', isCovered: true, minRequiredStaff: 6, currentStaffCount: 6 },
  { id: 'SHF-3', hospitalId: 'HOSP-001', staffName: 'Sunita Shinde, RN', role: 'Staff Nurse', department: 'Emergency & Acute Trauma Care', shiftDate: '2026-09-25', shiftType: 'Evening', startTime: '15:00', endTime: '23:30', stationBay: 'Triage Acute Bay', isCovered: true, minRequiredStaff: 5, currentStaffCount: 5 },
  { id: 'SHF-4', hospitalId: 'HOSP-001', staffName: 'Dr. Rohan Kulkarni', role: 'Emergency Physician', department: 'Emergency & Acute Trauma Care', shiftDate: '2026-09-25', shiftType: 'Night', startTime: '23:00', endTime: '07:30', stationBay: 'Trauma Bay 1 Resuscitation', isCovered: true, minRequiredStaff: 2, currentStaffCount: 2 },
  { id: 'SHF-5', hospitalId: 'HOSP-001', staffName: 'Mahesh Jadhav', role: 'Biomedical Tech', department: 'Interventional Cardiology', shiftDate: '2026-09-25', shiftType: 'Morning', startTime: '08:00', endTime: '16:30', stationBay: 'Cath Lab 1 / OT 2', isCovered: true, minRequiredStaff: 2, currentStaffCount: 2 },
  { id: 'SHF-6', hospitalId: 'HOSP-001', staffName: 'Priya Salunke, RN', role: 'ICU Specialist Nurse', department: 'Intensive Critical Care Pod', shiftDate: '2026-09-25', shiftType: 'Evening', startTime: '15:00', endTime: '23:30', stationBay: 'ICU Pod B (Bed 5-8)', isCovered: true, minRequiredStaff: 6, currentStaffCount: 5 }, // understaffed hint
];

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  { id: 'EQ-01', hospitalId: 'HOSP-001', code: 'MRI-3T-01', name: 'Siemens 3T Magnetom Vida MRI', category: 'Radiology', location: 'Radiology Suite Ground Floor', status: 'IN_USE', serialNumber: 'SN-MAG-3T-8821', currentBooking: { patientUhid: 'UHID-2026-9041', procedure: 'Brain MRI with Contrast', allocatedRoom: 'G-12 MRI Bay', requestedBy: 'Dr. Ananya Rao', startTime: '10:30 AM', endTime: '11:45 AM' } },
  { id: 'EQ-02', hospitalId: 'HOSP-001', code: 'CT-128-01', name: 'GE Revolution 128-Slice Dual CT', category: 'Radiology', location: 'Emergency Diagnostics Wing', status: 'AVAILABLE', serialNumber: 'SN-GE-REV-9014' },
  { id: 'EQ-03', hospitalId: 'HOSP-001', code: 'ROBOT-XI-01', name: 'Intuitive Da Vinci Xi Robotic Surgical Console', category: 'Surgical Robotic', location: 'OT Complex Suite 6', status: 'BOOKED', serialNumber: 'SN-DAVINCI-XI-004', currentBooking: { patientUhid: 'UHID-2026-8812', procedure: 'Robotic Minimally Invasive Valve Repair', allocatedRoom: 'OT-6 Robotic Suite', requestedBy: 'Dr. Rohini Mehta', startTime: '01:30 PM', endTime: '04:30 PM' } },
  { id: 'EQ-04', hospitalId: 'HOSP-001', code: 'ECMO-LIFE-01', name: 'Maquet Cardiosave Intra-Aortic ECMO Life Support', category: 'ICU Life Support', location: 'ICU Critical Care Pod 1', status: 'IN_USE', serialNumber: 'SN-ECMO-MQ-720', currentBooking: { patientUhid: 'UHID-2026-8812', procedure: 'Veno-Arterial ECMO Support (Post-STEMI)', allocatedRoom: 'ICU Bed 02', requestedBy: 'Dr. Meera Nambiar', startTime: '08:00 AM', endTime: 'Ongoing (24H)' } },
  { id: 'EQ-05', hospitalId: 'HOSP-001', code: 'C-ARM-01', name: 'Ziehm Solo High-Resolution Mobile C-Arm Fluoroscopy', category: 'Radiology', location: 'OT-3 Orthopedic Suite', status: 'BOOKED', serialNumber: 'SN-C-ARM-ZH-331', currentBooking: { patientUhid: 'UHID-2026-7643', procedure: 'Intra-Op Fluoroscopy Knee Stability', allocatedRoom: 'OT-3 Ortho', requestedBy: 'Dr. Anand Joshi', startTime: '11:15 AM', endTime: '01:00 PM' } },
  { id: 'EQ-06', hospitalId: 'HOSP-001', code: 'VENT-HAM-01', name: 'Hamilton-G5 High-Frequency ICU Ventilator', category: 'ICU Life Support', location: 'Biomedical Reserve Depot', status: 'AVAILABLE', serialNumber: 'SN-HAM-G5-1049' },
  { id: 'EQ-07', hospitalId: 'HOSP-001', code: 'USG-4D-01', name: 'Philips EPIQ 7G 4D Echocardiography Console', category: 'Cardiology', location: 'Cardiology OPD 401', status: 'CALIBRATION', serialNumber: 'SN-PHI-EPIQ-77' },
];

const INITIAL_OTS: OperatingTheatreItem[] = [
  { id: 'OT-01', hospitalId: 'HOSP-001', name: 'OT-1 Cardio-Thoracic Hybrid', suiteType: 'Cardiothoracic & Vascular', floorWing: 'Tower A 2nd Floor', status: 'SURGERY_IN_PROGRESS', turnoverMinutes: 30, leadSurgeon: 'Dr. Rohini Mehta', anesthesiologist: 'Dr. S. K. Roy', procedure: 'Off-Pump CABG 3-Vessel Bypass', patientUhid: 'UHID-2026-8812', urgencyLevel: 'URGENT', estimatedFinish: '01:15 PM' },
  { id: 'OT-02', hospitalId: 'HOSP-001', name: 'OT-2 Neuro & Micro-Surgical', suiteType: 'Neurosurgery & Spine', floorWing: 'Tower A 2nd Floor', status: 'READY_FOR_CASE', turnoverMinutes: 25 },
  { id: 'OT-03', hospitalId: 'HOSP-001', name: 'OT-3 Orthopedic & Joint Robotic', suiteType: 'Orthopedics & Joint', floorWing: 'Tower B 2nd Floor', status: 'SURGERY_IN_PROGRESS', turnoverMinutes: 20, leadSurgeon: 'Dr. Anand Joshi', anesthesiologist: 'Dr. Sunita Rao', procedure: 'Stryker Robotic Total Knee Revision', patientUhid: 'UHID-2026-7643', urgencyLevel: 'ELECTIVE', estimatedFinish: '02:00 PM' },
  { id: 'OT-04', hospitalId: 'HOSP-001', name: 'OT-4 Emergency & Polytrauma', suiteType: 'Acute Trauma Resuscitation', floorWing: 'Ground Floor OT Complex', status: 'READY_FOR_CASE', turnoverMinutes: 15 },
  { id: 'OT-05', hospitalId: 'HOSP-001', name: 'OT-5 Laparoscopic & GI Surgery', suiteType: 'Minimally Invasive Surgery', floorWing: 'Tower B 2nd Floor', status: 'STERILIZING_TURNOVER', turnoverMinutes: 25 },
  { id: 'OT-06', hospitalId: 'HOSP-001', name: 'OT-6 Da Vinci Xi Robotic Suite', suiteType: 'Robotic Multidisciplinary', floorWing: 'Tower A 2nd Floor', status: 'READY_FOR_CASE', turnoverMinutes: 35 },
  { id: 'OT-07', hospitalId: 'HOSP-001', name: 'OT-7 Pediatric & Neonatal Surgery', suiteType: 'Pediatric Surgery', floorWing: 'Tower B 1st Floor', status: 'STERILIZING_TURNOVER', turnoverMinutes: 20 },
  { id: 'OT-08', hospitalId: 'HOSP-001', name: 'OT-8 Day-Care & Endoscopy Suite', suiteType: 'Ambulatory Day Care', floorWing: 'Ground Floor East Wing', status: 'READY_FOR_CASE', turnoverMinutes: 15 },
];

interface SystemStore {
  hospitals: HospitalRecord[];
  departments: DepartmentRecord[];
  doctors: DoctorRecord[];
  staff: StaffRecord[];
  patients: PatientEntity[];
  shifts: StaffShiftItem[];
  equipment: EquipmentItem[];
  operatingTheatres: OperatingTheatreItem[];
  alerts: SystemAlertItem[];
  activeHospitalId: string;
}

class HospitalManagementService {
  private store: SystemStore;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.store = this.loadStore();
  }

  private loadStore(): SystemStore {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.hospitals && parsed.hospitals.length > 0) {
          if (!parsed.alerts || parsed.alerts.length === 0) {
            parsed.alerts = INITIAL_SYSTEM_ALERTS;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse hospital store from localStorage', e);
    }

    return {
      hospitals: INITIAL_HOSPITALS,
      departments: INITIAL_DEPARTMENTS,
      doctors: INITIAL_DOCTORS,
      staff: INITIAL_STAFF,
      patients: INITIAL_PATIENTS,
      shifts: INITIAL_SHIFTS,
      equipment: INITIAL_EQUIPMENT,
      operatingTheatres: INITIAL_OTS,
      alerts: INITIAL_SYSTEM_ALERTS,
      activeHospitalId: 'HOSP-001',
    };
  }

  private saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch (e) {
      console.error('Failed to save hospital store to localStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getActiveHospitalId(): string {
    return this.store.activeHospitalId || 'HOSP-001';
  }

  public setActiveHospitalId(hospitalId: string) {
    this.store.activeHospitalId = hospitalId;
    this.saveStore();
  }

  public getActiveHospital(): HospitalRecord {
    const id = this.getActiveHospitalId();
    return this.store.hospitals.find((h) => h.id === id) || this.store.hospitals[0];
  }

  /* -------------------------------------------------------------------------- */
  /* SUPER ADMIN: HOSPITALS CRUD                                                */
  /* -------------------------------------------------------------------------- */

  public getAllHospitals(): HospitalRecord[] {
    return this.store.hospitals;
  }

  public registerHospital(hospital: Omit<HospitalRecord, 'id' | 'createdAt' | 'occupiedBeds'>): HospitalRecord {
    const newHospital: HospitalRecord = {
      ...hospital,
      id: `HOSP-00${this.store.hospitals.length + 1}-${Date.now().toString().slice(-4)}`,
      occupiedBeds: Math.round(hospital.totalBeds * 0.7),
      createdAt: new Date().toISOString(),
    };

    this.store.hospitals.push(newHospital);

    // Bootstrap standard clinical departments for new hospital
    const defaultDepts: DepartmentRecord[] = [
      { id: `DEP-${Date.now()}-1`, hospitalId: newHospital.id, code: 'ICU-1', name: 'Critical Care ICU', deptType: 'ICU', headOfDept: 'Dr. Medical In-Charge', floorLocation: 'Floor 3', bedCapacity: 20, occupiedBeds: 14, emergencyContact: 'Ext 300', isOperational: true },
      { id: `DEP-${Date.now()}-2`, hospitalId: newHospital.id, code: 'EMR-1', name: 'Emergency Trauma Ward', deptType: 'EMERGENCY', headOfDept: 'Dr. Trauma Specialist', floorLocation: 'Ground Floor', bedCapacity: 15, occupiedBeds: 10, emergencyContact: 'Ext 100', isOperational: true },
      { id: `DEP-${Date.now()}-3`, hospitalId: newHospital.id, code: 'MED-1', name: 'General Inpatient Wards', deptType: 'GENERAL_WARD', headOfDept: 'Dr. Ward Physician', floorLocation: 'Floor 2', bedCapacity: 40, occupiedBeds: 30, emergencyContact: 'Ext 200', isOperational: true },
    ];
    this.store.departments.push(...defaultDepts);

    this.saveStore();
    return newHospital;
  }

  public updateHospital(id: string, updates: Partial<HospitalRecord>): HospitalRecord | null {
    const idx = this.store.hospitals.findIndex((h) => h.id === id);
    if (idx === -1) return null;

    this.store.hospitals[idx] = {
      ...this.store.hospitals[idx],
      ...updates,
    };

    this.saveStore();
    return this.store.hospitals[idx];
  }

  public toggleHospitalActive(id: string): boolean {
    const hosp = this.store.hospitals.find((h) => h.id === id);
    if (!hosp) return false;
    hosp.isActive = !hosp.isActive;
    this.saveStore();
    return hosp.isActive;
  }

  public deleteHospital(id: string): boolean {
    if (this.store.hospitals.length <= 1) {
      return false; // prevent deleting last hospital
    }

    this.store.hospitals = this.store.hospitals.filter((h) => h.id !== id);
    this.store.doctors = this.store.doctors.filter((d) => d.hospitalId !== id);
    this.store.staff = this.store.staff.filter((s) => s.hospitalId !== id);
    this.store.patients = this.store.patients.filter((p) => p.hospitalId !== id);
    this.store.departments = this.store.departments.filter((d) => d.hospitalId !== id);
    this.store.shifts = this.store.shifts.filter((s) => s.hospitalId !== id);
    this.store.equipment = this.store.equipment.filter((e) => e.hospitalId !== id);
    this.store.operatingTheatres = this.store.operatingTheatres.filter((o) => o.hospitalId !== id);

    if (this.store.activeHospitalId === id) {
      this.store.activeHospitalId = this.store.hospitals[0]?.id || 'HOSP-001';
    }

    this.saveStore();
    return true;
  }

  public assignHospitalAdmin(hospitalId: string, admin: { name: string; email: string; phone?: string }): boolean {
    const hospital = this.store.hospitals.find((h) => h.id === hospitalId);
    if (!hospital) return false;

    hospital.hospitalAdminId = `ADM-${Date.now().toString().slice(-4)}`;
    hospital.hospitalAdminName = admin.name;
    hospital.hospitalAdminEmail = admin.email;
    hospital.hospitalAdminPhone = admin.phone || '+91 98000 00000';

    this.saveStore();
    return true;
  }

  public revokeHospitalAdmin(hospitalId: string): boolean {
    const hospital = this.store.hospitals.find((h) => h.id === hospitalId);
    if (!hospital) return false;

    hospital.hospitalAdminId = undefined;
    hospital.hospitalAdminName = undefined;
    hospital.hospitalAdminEmail = undefined;
    hospital.hospitalAdminPhone = undefined;

    this.saveStore();
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* NETWORK ANALYTICS                                                          */
  /* -------------------------------------------------------------------------- */

  public getNetworkAnalytics() {
    const totalHospitals = this.store.hospitals.length;
    const activeAdmins = this.store.hospitals.filter((h) => !!h.hospitalAdminId).length;
    const totalDoctors = this.store.doctors.length;
    const totalStaff = this.store.staff.length;
    const totalPatients = this.store.patients.length;

    const activeDoctorsCount = this.store.doctors.filter(
      (d) => d.status === 'ACTIVE' || d.status === 'EMERGENCY_ON_CALL'
    ).length;
    const activeStaffCount = this.store.staff.filter(
      (s) => s.status === 'ON_DUTY' || s.status === 'ON_CALL'
    ).length;
    const totalActiveClinicalStaff = activeDoctorsCount + activeStaffCount;
    
    const totalCapacity = this.store.hospitals.reduce((acc, h) => acc + h.totalBeds, 0);
    const totalOccupied = this.store.hospitals.reduce((acc, h) => acc + h.occupiedBeds, 0);
    const avgOccupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    const hospitalBreakdown = this.store.hospitals.map((h) => {
      const docs = this.store.doctors.filter((d) => d.hospitalId === h.id);
      const stf = this.store.staff.filter((s) => s.hospitalId === h.id);
      const pts = this.store.patients.filter((p) => p.hospitalId === h.id);
      const depts = this.store.departments.filter((d) => d.hospitalId === h.id);
      const activeDocsInHosp = docs.filter((d) => d.status === 'ACTIVE' || d.status === 'EMERGENCY_ON_CALL').length;
      const activeStaffInHosp = stf.filter((s) => s.status === 'ON_DUTY' || s.status === 'ON_CALL').length;
      return {
        ...h,
        doctorsCount: docs.length,
        staffCount: stf.length,
        patientsCount: pts.length,
        departmentsCount: depts.length,
        activeClinicalStaffCount: activeDocsInHosp + activeStaffInHosp,
        occupancyRate: h.totalBeds > 0 ? Math.round((h.occupiedBeds / h.totalBeds) * 100) : 0,
      };
    });

    return {
      totalHospitals,
      activeAdmins,
      totalDoctors,
      totalStaff,
      activeDoctorsCount,
      activeStaffCount,
      totalActiveClinicalStaff,
      totalPatients,
      totalCapacity,
      totalOccupied,
      avgOccupancyRate,
      hospitalBreakdown,
    };
  }

  public getAllDoctors(): DoctorRecord[] {
    return [...this.store.doctors];
  }

  public getAllStaff(): StaffRecord[] {
    return [...this.store.staff];
  }

  public getAllPatients(): PatientEntity[] {
    return [...this.store.patients];
  }

  /* -------------------------------------------------------------------------- */
  /* HOSPITAL ADMIN: DOCTORS CRUD                                               */
  /* -------------------------------------------------------------------------- */

  public getDoctors(hospitalId?: string): DoctorRecord[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.doctors.filter((d) => d.hospitalId === targetId);
  }

  public addDoctor(doctor: Omit<DoctorRecord, 'id' | 'activePatientsCount'>): DoctorRecord {
    const newDoc: DoctorRecord = {
      ...doctor,
      id: `DOC-${Date.now().toString().slice(-4)}`,
      activePatientsCount: 0,
    };
    this.store.doctors.unshift(newDoc);
    this.saveStore();
    return newDoc;
  }

  public updateDoctor(id: string, updates: Partial<DoctorRecord>): DoctorRecord | null {
    const idx = this.store.doctors.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.store.doctors[idx] = { ...this.store.doctors[idx], ...updates };
    this.saveStore();
    return this.store.doctors[idx];
  }

  public deleteDoctor(id: string): boolean {
    const initialLen = this.store.doctors.length;
    this.store.doctors = this.store.doctors.filter((d) => d.id !== id);
    if (this.store.doctors.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------------------------- */
  /* HOSPITAL ADMIN: NURSES & STAFF CRUD                                        */
  /* -------------------------------------------------------------------------- */

  public getStaff(hospitalId?: string): StaffRecord[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.staff.filter((s) => s.hospitalId === targetId);
  }

  public addStaff(staffMember: Omit<StaffRecord, 'id'>): StaffRecord {
    const newStaff: StaffRecord = {
      ...staffMember,
      id: `STF-${Date.now().toString().slice(-4)}`,
    };
    this.store.staff.unshift(newStaff);
    this.saveStore();
    return newStaff;
  }

  public updateStaff(id: string, updates: Partial<StaffRecord>): StaffRecord | null {
    const idx = this.store.staff.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.store.staff[idx] = { ...this.store.staff[idx], ...updates };
    this.saveStore();
    return this.store.staff[idx];
  }

  public deleteStaff(id: string): boolean {
    const initialLen = this.store.staff.length;
    this.store.staff = this.store.staff.filter((s) => s.id !== id);
    if (this.store.staff.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------------------------- */
  /* HOSPITAL ADMIN: PATIENTS CRUD & RECORDS                                    */
  /* -------------------------------------------------------------------------- */

  public getPatients(hospitalId?: string): PatientEntity[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.patients.filter((p) => p.hospitalId === targetId);
  }

  public registerPatient(patient: Omit<PatientEntity, 'id' | 'appointments' | 'medicalRecords'>): PatientEntity {
    const newPatient: PatientEntity = {
      ...patient,
      id: `PAT-${Date.now().toString().slice(-4)}`,
      appointments: [],
      medicalRecords: [
        {
          id: `MR-${Date.now()}`,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          title: 'Initial Intake Record & Vital Signs',
          doctor: patient.attendingDoctor,
          diagnosis: 'Under initial evaluation and admission workup.',
          notes: `Admitted to ${patient.roomBed} in ${patient.department}. Acuity status: ${patient.acuity}.`,
        },
      ],
    };
    this.store.patients.unshift(newPatient);

    // Increase hospital occupied beds
    const hospital = this.store.hospitals.find((h) => h.id === patient.hospitalId);
    if (hospital) {
      hospital.occupiedBeds = Math.min(hospital.totalBeds, hospital.occupiedBeds + 1);
    }

    this.saveStore();
    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<PatientEntity>): PatientEntity | null {
    const idx = this.store.patients.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.store.patients[idx] = { ...this.store.patients[idx], ...updates };
    this.saveStore();
    return this.store.patients[idx];
  }

  public deletePatient(id: string): boolean {
    const idx = this.store.patients.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const patient = this.store.patients[idx];
      const hospital = this.store.hospitals.find((h) => h.id === patient.hospitalId);
      if (hospital && hospital.occupiedBeds > 0) {
        hospital.occupiedBeds -= 1;
      }
      this.store.patients.splice(idx, 1);
      this.saveStore();
      return true;
    }
    return false;
  }

  public addPatientAppointment(patientId: string, appointment: Omit<PatientAppointment, 'id'>): boolean {
    const patient = this.store.patients.find((p) => p.id === patientId);
    if (!patient) return false;
    patient.appointments.unshift({
      ...appointment,
      id: `APT-${Date.now().toString().slice(-4)}`,
    });
    this.saveStore();
    return true;
  }

  public addPatientMedicalRecord(patientId: string, record: Omit<MedicalRecordEntry, 'id'>): boolean {
    const patient = this.store.patients.find((p) => p.id === patientId);
    if (!patient) return false;
    patient.medicalRecords.unshift({
      ...record,
      id: `MR-${Date.now().toString().slice(-4)}`,
    });
    this.saveStore();
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* HOSPITAL ADMIN: DEPARTMENTS CRUD                                           */
  /* -------------------------------------------------------------------------- */

  public getDepartments(hospitalId?: string): DepartmentRecord[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.departments.filter((d) => d.hospitalId === targetId);
  }

  public addDepartment(dept: Omit<DepartmentRecord, 'id'>): DepartmentRecord {
    const newDept: DepartmentRecord = {
      ...dept,
      id: `DEP-${Date.now().toString().slice(-4)}`,
    };
    this.store.departments.push(newDept);
    this.saveStore();
    return newDept;
  }

  public updateDepartment(id: string, updates: Partial<DepartmentRecord>): DepartmentRecord | null {
    const idx = this.store.departments.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.store.departments[idx] = { ...this.store.departments[idx], ...updates };
    this.saveStore();
    return this.store.departments[idx];
  }

  public deleteDepartment(id: string): boolean {
    const initialLen = this.store.departments.length;
    this.store.departments = this.store.departments.filter((d) => d.id !== id);
    if (this.store.departments.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------------------------- */
  /* RESOURCE SCHEDULING: STAFF SHIFTS                                          */
  /* -------------------------------------------------------------------------- */

  public getShifts(hospitalId?: string): StaffShiftItem[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.shifts.filter((s) => s.hospitalId === targetId);
  }

  public assignShift(shift: Omit<StaffShiftItem, 'id'>): StaffShiftItem {
    const newShift: StaffShiftItem = {
      ...shift,
      id: `SHF-${Date.now().toString().slice(-4)}`,
    };
    this.store.shifts.unshift(newShift);
    this.saveStore();
    return newShift;
  }

  public deleteShift(id: string): boolean {
    const initialLen = this.store.shifts.length;
    this.store.shifts = this.store.shifts.filter((s) => s.id !== id);
    if (this.store.shifts.length !== initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------------------------- */
  /* RESOURCE SCHEDULING: EQUIPMENT FLEET & BOOKING                             */
  /* -------------------------------------------------------------------------- */

  public getEquipment(hospitalId?: string): EquipmentItem[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.equipment.filter((e) => e.hospitalId === targetId);
  }

  public bookEquipment(
    equipmentId: string,
    booking: {
      patientUhid: string;
      procedure: string;
      allocatedRoom: string;
      requestedBy: string;
      startTime: string;
      endTime: string;
    }
  ): boolean {
    const item = this.store.equipment.find((e) => e.id === equipmentId);
    if (!item) return false;

    item.status = 'BOOKED';
    item.currentBooking = booking;
    this.saveStore();
    return true;
  }

  public releaseEquipment(equipmentId: string): boolean {
    const item = this.store.equipment.find((e) => e.id === equipmentId);
    if (!item) return false;

    item.status = 'AVAILABLE';
    item.currentBooking = undefined;
    this.saveStore();
    return true;
  }

  public setEquipmentStatus(equipmentId: string, status: EquipmentItem['status']): boolean {
    const item = this.store.equipment.find((e) => e.id === equipmentId);
    if (!item) return false;

    item.status = status;
    if (status === 'AVAILABLE') {
      item.currentBooking = undefined;
    }
    this.saveStore();
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* RESOURCE SCHEDULING: OPERATING THEATRES (OT)                               */
  /* -------------------------------------------------------------------------- */

  public getOperatingTheatres(hospitalId?: string): OperatingTheatreItem[] {
    const targetId = hospitalId || this.getActiveHospitalId();
    return this.store.operatingTheatres.filter((o) => o.hospitalId === targetId);
  }

  public scheduleOtSurgery(
    otId: string,
    surgery: {
      leadSurgeon: string;
      anesthesiologist: string;
      procedure: string;
      patientUhid: string;
      urgencyLevel: 'ELECTIVE' | 'URGENT' | 'CODE_RED_EMERGENCY';
      estimatedFinish: string;
    }
  ): boolean {
    const ot = this.store.operatingTheatres.find((o) => o.id === otId);
    if (!ot) return false;

    ot.status = 'SURGERY_IN_PROGRESS';
    ot.leadSurgeon = surgery.leadSurgeon;
    ot.anesthesiologist = surgery.anesthesiologist;
    ot.procedure = surgery.procedure;
    ot.patientUhid = surgery.patientUhid;
    ot.urgencyLevel = surgery.urgencyLevel;
    ot.estimatedFinish = surgery.estimatedFinish;

    this.saveStore();
    return true;
  }

  public cycleOtTurnover(otId: string): boolean {
    const ot = this.store.operatingTheatres.find((o) => o.id === otId);
    if (!ot) return false;

    if (ot.status === 'SURGERY_IN_PROGRESS') {
      ot.status = 'STERILIZING_TURNOVER';
      ot.procedure = undefined;
      ot.leadSurgeon = undefined;
      ot.anesthesiologist = undefined;
      ot.patientUhid = undefined;
    } else if (ot.status === 'STERILIZING_TURNOVER') {
      ot.status = 'READY_FOR_CASE';
    } else if (ot.status === 'READY_FOR_CASE') {
      ot.status = 'STERILIZING_TURNOVER';
    }

    this.saveStore();
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* SYSTEM ALERTS STREAM                                                       */
  /* -------------------------------------------------------------------------- */

  public getSystemAlerts(): SystemAlertItem[] {
    return this.store.alerts || INITIAL_SYSTEM_ALERTS;
  }

  public acknowledgeAlert(id: string): boolean {
    const alert = (this.store.alerts || []).find((a) => a.id === id);
    if (!alert) return false;
    alert.status = 'ACKNOWLEDGED';
    this.saveStore();
    return true;
  }

  public addSystemAlert(alert: Omit<SystemAlertItem, 'id' | 'timestamp' | 'status'>): SystemAlertItem {
    const newAlert: SystemAlertItem = {
      ...alert,
      id: `ALT-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just now',
      status: 'ACTIVE',
    };
    if (!this.store.alerts) this.store.alerts = [];
    this.store.alerts.unshift(newAlert);
    this.saveStore();
    return newAlert;
  }

  public resetAllToSeed() {
    this.store = {
      hospitals: INITIAL_HOSPITALS,
      departments: INITIAL_DEPARTMENTS,
      doctors: INITIAL_DOCTORS,
      staff: INITIAL_STAFF,
      patients: INITIAL_PATIENTS,
      shifts: INITIAL_SHIFTS,
      equipment: INITIAL_EQUIPMENT,
      operatingTheatres: INITIAL_OTS,
      alerts: INITIAL_SYSTEM_ALERTS,
      activeHospitalId: 'HOSP-001',
    };
    this.saveStore();
  }
}

export const hospitalManagementService = new HospitalManagementService();
