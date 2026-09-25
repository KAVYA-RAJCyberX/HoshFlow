import { BedItem, InvoiceItem, PatientRecord, PersonaProfile } from '../types';

export const HOSPITAL_INFO = {
  name: 'CityCare Multispeciality Hospital',
  campus: 'Pune Central Campus',
  location: 'Pune, Maharashtra',
  totalBeds: 250,
  occupiedBeds: 205,
  vacantBeds: 45,
  occupancyPercent: 82,
  todayAdmits: 24,
  todayDischarges: 18,
  activeCriticalAlerts: 4,
  avgDischargeVelocity: '2h 15m',
  targetVelocity: '2h 30m',
  sterilizedReadyBays: 14,
  cleaningBays: 8,
  cleaningSpeed: '22 min/bed'
};

export const CLINICAL_PERSONAS: Record<string, PersonaProfile> = {
  doctor: {
    role: 'doctor',
    name: 'Dr. Ananya Rao',
    designation: 'Attending Gen Med • Shift Lead',
    avatarInitials: 'AR',
    email: 'ananya.rao@hospital.com',
    department: 'General Medicine (Inpatient Ward 3)',
    badgeText: 'Doctor Mode • Gen Med'
  },
  nurse: {
    role: 'nurse',
    name: 'Sister Nirmala Joshi, RN',
    designation: 'Ward In-Charge • Shift Supervisor',
    avatarInitials: 'NJ',
    email: 'nirmala.joshi@hospital.com',
    department: 'Central Inpatient Wing (Ward 3)',
    badgeText: 'Charge Nurse • Floor 2'
  },
  hospital_admin: {
    role: 'hospital_admin',
    name: 'Dr. Vikram Malhotra',
    designation: 'Medical Superintendent & COO',
    avatarInitials: 'VM',
    email: 'v.malhotra@hospital.com',
    department: 'Executive Medical Directorate',
    badgeText: 'Hospital Admin • Exec'
  },
  super_admin: {
    role: 'super_admin',
    name: 'Dr. Rajeshwari Sen',
    designation: 'Group Chief Info & Compliance Officer',
    avatarInitials: 'RS',
    email: 'r.sen@hospital.com',
    department: 'Network IT & Governance Node',
    badgeText: 'Super Admin • Cockpit'
  },
  bed_manager: {
    role: 'bed_manager',
    name: 'Sanjay Deshmukh',
    designation: 'COO & Bed Flow Director',
    avatarInitials: 'SD',
    email: 's.deshmukh@hospital.com',
    department: 'Central Operations Command',
    badgeText: 'Flow Director • Logistics'
  },
  billing: {
    role: 'billing',
    name: 'Meena Kadam',
    designation: 'Senior TPA & Accounts Manager',
    avatarInitials: 'MK',
    email: 'billing.desk@hospital.com',
    department: 'Revenue & Cashless Clearance Desk',
    badgeText: 'Billing Lead • TPA'
  },
  pharmacy: {
    role: 'pharmacy',
    name: 'K. Ramanathan, B.Pharm, RPh',
    designation: 'Chief Pharmacist • Schedule X Custodian',
    avatarInitials: 'KR',
    email: 'dispensary@hospital.com',
    department: 'Central Inpatient & Satellite OT Pharmacy',
    badgeText: 'Pharmacist • Schedule X'
  },
  housekeeping: {
    role: 'housekeeping',
    name: 'Ramesh Kumar',
    designation: 'Lead Sanitarian & Floor Tech #408',
    avatarInitials: 'RK',
    email: 'ramesh.k@hospital.com',
    department: 'Ward 3 & ICU Step-Down Sanitation',
    badgeText: 'Housekeeping • Tech'
  },
  reception: {
    role: 'reception',
    name: 'Pooja Kadam',
    designation: 'Senior Patient Care Executive #PC-4482',
    avatarInitials: 'PK',
    email: 'reception.intake@hospital.com',
    department: 'Lobby Counter 01 & Emergency Intake',
    badgeText: 'Front Desk • Intake'
  },
  patient_portal: {
    role: 'patient_portal',
    name: 'Harish Mehta & Family',
    designation: 'Patient UH-9402 (Son: Rakesh)',
    avatarInitials: 'HM',
    email: 'harish.mehta@personal.com',
    department: 'Surgical Recovery Bay 204',
    badgeText: 'Patient • Self-Service'
  }
};

export const MOCK_WARDS = [
  { id: 'med_a', name: 'Medical Ward A', floor: 'Floor 2', capacity: 40, occupied: 36, rate: 90, available: 4, nurseLead: 'Sr. Nirmala' },
  { id: 'med_b', name: 'Medical Ward B', floor: 'Floor 2', capacity: 40, occupied: 34, rate: 85, available: 6, nurseLead: 'Sr. Pratima' },
  { id: 'surgical', name: 'Surgical Ward', floor: 'Floor 3', capacity: 50, occupied: 39, rate: 78, available: 11, nurseLead: 'Br. David' },
  { id: 'icu', name: 'Intensive Care Unit (ICU)', floor: 'Floor 1', capacity: 20, occupied: 19, rate: 95, available: 1, nurseLead: 'Dr. Mehra', alert: true },
  { id: 'ccu', name: 'Coronary Care (CCU)', floor: 'Floor 1', capacity: 20, occupied: 16, rate: 80, available: 4, nurseLead: 'Sr. Deepali' },
  { id: 'pediatrics', name: 'Pediatrics / PICU', floor: 'Floor 4', capacity: 40, occupied: 26, rate: 65, available: 14, nurseLead: 'Sr. Kavita' },
  { id: 'emergency', name: 'Emergency Room (ER)', floor: 'Ground Floor', capacity: 40, occupied: 36, rate: 90, available: 4, nurseLead: 'Dr. Ashok' }
];

export const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: 'P-1001',
    uhid: 'HOS-2026-1001',
    name: 'Aarav Mehta',
    age: 54,
    gender: 'M',
    bloodGroup: 'B+',
    ward: 'Medical Ward A',
    bedId: 'M-104',
    diagnosis: 'Acute Gastritis & Dehydration (Post-Op Observation)',
    attendingDoctor: 'Dr. Ananya Rao',
    admitDate: '20 Sep 2026 (3 days ago)',
    status: 'discharge_planned',
    acuity: 'low',
    vitals: {
      bp: '120/80',
      pulse: 76,
      temp: 98.6,
      spO2: 98,
      respRate: 18,
      painScore: 2
    },
    allergies: ['Penicillin'],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'Star Health TPA',
      preAuthAmount: 40000,
      billedAmount: 48500,
      coPayDue: 8500,
      status: 'co_pay_pending',
      queryNote: 'Room Rent & Pharmacy disallowed by policy ceiling: ₹8,500 pending patient desk clearance.'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: false,
      billingClearance: false,
      exitGatePassGenerated: false
    }
  },
  {
    id: 'P-1002',
    uhid: 'HOS-2026-1002',
    name: 'Priya Sharma',
    age: 38,
    gender: 'F',
    bloodGroup: 'O+',
    ward: 'Surgical Ward',
    bedId: 'S-202',
    diagnosis: 'Post-Laparoscopic Cholecystectomy (Day 1)',
    attendingDoctor: 'Dr. Rajesh Patel',
    admitDate: '22 Sep 2026 (2 days ago)',
    status: 'discharge_hold',
    acuity: 'moderate',
    vitals: {
      bp: '124/82',
      pulse: 78,
      temp: 98.4,
      spO2: 98,
      respRate: 16,
      painScore: 6
    },
    allergies: ['Penicillin (Rash)'],
    fallRisk: 'Moderate',
    tpaInsurance: {
      provider: 'ICICI Lombard Health TPA',
      preAuthAmount: 112000,
      billedAmount: 112000,
      coPayDue: 0,
      status: 'query_raised',
      queryNote: 'Query raised on surgical consumable invoice #SURG-44. TPA dispute hold: 35m elapsed.'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: false,
      exitGatePassGenerated: false
    }
  },
  {
    id: 'P-1003',
    uhid: 'HOS-2026-1003',
    name: 'Rohan Patel',
    age: 65,
    gender: 'M',
    bloodGroup: 'AB+',
    ward: 'Intensive Care Unit (ICU)',
    bedId: 'ICU-03',
    diagnosis: 'ARDS / Sepsis Risk (Post-Cardiac Arrest)',
    attendingDoctor: 'Dr. Ananya Rao & Dr. Mehra',
    admitDate: '21 Sep 2026 (4 days ago)',
    status: 'critical',
    acuity: 'critical',
    vitals: {
      bp: '142/96',
      pulse: 118,
      temp: 101.8,
      spO2: 91,
      respRate: 28,
      painScore: 7
    },
    allergies: ['Sulfa Drugs'],
    fallRisk: 'High',
    tpaInsurance: {
      provider: 'Care Health Insurance',
      preAuthAmount: 145000,
      billedAmount: 145000,
      coPayDue: 0,
      status: 'approved'
    },
    dischargeChecklist: {
      clinicalSignOff: false,
      nursingHandover: false,
      pharmacyBag: false,
      billingClearance: false,
      exitGatePassGenerated: false
    }
  },
  {
    id: 'P-1004',
    uhid: 'HOS-2026-1004',
    name: 'Kavita Deshmukh',
    age: 42,
    gender: 'F',
    bloodGroup: 'A+',
    ward: 'Medical Ward A',
    bedId: 'M-102',
    diagnosis: 'Orthopedic Knee Arthroplasty (Recovery Day 2 of 4)',
    attendingDoctor: 'Dr. K. Saxena',
    admitDate: '21 Sep 2026',
    status: 'admitted',
    acuity: 'moderate',
    vitals: {
      bp: '128/84',
      pulse: 80,
      temp: 98.8,
      spO2: 97,
      respRate: 18,
      painScore: 4
    },
    allergies: [],
    fallRisk: 'Moderate'
  },
  {
    id: 'P-0988',
    uhid: 'HOS-2026-0988',
    name: 'Sunita Rao',
    age: 52,
    gender: 'F',
    bloodGroup: 'B-',
    ward: 'Surgical Ward',
    bedId: 'P-301',
    diagnosis: 'Elective Laparoscopic Hernioplasty',
    attendingDoctor: 'Dr. K. Saxena',
    admitDate: '21 Sep 2026',
    status: 'cleared',
    acuity: 'low',
    vitals: {
      bp: '118/78',
      pulse: 72,
      temp: 98.4,
      spO2: 99,
      respRate: 16,
      painScore: 1
    },
    allergies: [],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'MediAssist Cashless',
      preAuthAmount: 92000,
      billedAmount: 92000,
      coPayDue: 0,
      status: 'cleared'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: true,
      exitGatePassGenerated: true
    }
  },
  {
    id: 'P-9402',
    uhid: 'UH-9402',
    name: 'Harish Mehta',
    age: 61,
    gender: 'M',
    bloodGroup: 'B+',
    ward: 'Surgical Recovery Wing',
    bedId: 'Bay 204',
    diagnosis: 'Laparoscopic Cholecystectomy (Day 4)',
    attendingDoctor: 'Dr. Vikram Kulkarni',
    admitDate: '12 May 2026 (4 days ago)',
    status: 'discharge_planned',
    acuity: 'low',
    vitals: {
      bp: '120/80',
      pulse: 74,
      temp: 98.4,
      spO2: 98,
      respRate: 16,
      painScore: 1
    },
    allergies: [],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'Star Health Policy #SH-882190',
      preAuthAmount: 142000,
      billedAmount: 145200,
      coPayDue: 3200,
      status: 'cleared'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: true,
      exitGatePassGenerated: true
    }
  },
  {
    id: 'P-884102',
    uhid: 'UHID-884102',
    name: 'Devika Singhania',
    age: 48,
    gender: 'F',
    bloodGroup: 'O+',
    ward: 'Post-Surg Recovery',
    bedId: 'B-302',
    diagnosis: 'Laparoscopic Cholecystectomy with Adhesiolysis (Day 4)',
    attendingDoctor: 'Dr. Anand Joshi (GI Surgery)',
    admitDate: '21 Sep 2026 (4 days ago)',
    status: 'cleared',
    acuity: 'low',
    vitals: {
      bp: '122/80',
      pulse: 76,
      temp: 98.6,
      spO2: 99,
      respRate: 16,
      painScore: 2
    },
    allergies: ['NSAIDs (Mild Nausea)'],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'Star Health (Claim Approved)',
      preAuthAmount: 85000,
      billedAmount: 85000,
      coPayDue: 0,
      status: 'cleared'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: true,
      exitGatePassGenerated: true
    }
  },
  {
    id: 'P-884119',
    uhid: 'UHID-884119',
    name: 'Kishore Kulkarni',
    age: 63,
    gender: 'M',
    bloodGroup: 'A+',
    ward: 'Cardio-Thoracic Stepdown',
    bedId: 'A-108',
    diagnosis: 'Post-CABG Day 3 (Triple Vessel Disease)',
    attendingDoctor: 'Dr. Rohini Mehta (Cardiology)',
    admitDate: '20 Sep 2026 (5 days ago)',
    status: 'discharge_hold',
    acuity: 'moderate',
    vitals: {
      bp: '138/86',
      pulse: 82,
      temp: 98.6,
      spO2: 97,
      respRate: 18,
      painScore: 4
    },
    allergies: ['Aspirin (Sensitivity)'],
    fallRisk: 'Moderate',
    tpaInsurance: {
      provider: 'HDFC ERGO (TPA Co-Pay Query)',
      preAuthAmount: 220000,
      billedAmount: 235000,
      coPayDue: 15000,
      status: 'query_raised',
      queryNote: 'Cardiac consumable split audit requested by underwriter.'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: false,
      exitGatePassGenerated: false
    }
  },
  {
    id: 'P-884091',
    uhid: 'UHID-884091',
    name: 'Priya N. Deshmukh',
    age: 32,
    gender: 'F',
    bloodGroup: 'B+',
    ward: 'Maternity & Obs Suite',
    bedId: 'C-204',
    diagnosis: 'Post-LSCS Day 2 (Elective Repeat Caesarean)',
    attendingDoctor: 'Dr. Sunita Kulkarni (Obs/Gyn)',
    admitDate: '23 Sep 2026 (2 days ago)',
    status: 'discharge_planned',
    acuity: 'low',
    vitals: {
      bp: '118/74',
      pulse: 80,
      temp: 98.4,
      spO2: 98,
      respRate: 16,
      painScore: 3
    },
    allergies: [],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'Max Bupa Health (Direct Cashless)',
      preAuthAmount: 75000,
      billedAmount: 72000,
      coPayDue: 0,
      status: 'approved'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: false,
      pharmacyBag: false,
      billingClearance: false,
      exitGatePassGenerated: false
    }
  },
  {
    id: 'P-884145',
    uhid: 'UHID-884145',
    name: 'Aarav Patil',
    age: 9,
    gender: 'M',
    bloodGroup: 'O+',
    ward: 'Pediatric Care',
    bedId: 'P-104',
    diagnosis: 'Acute Bronchitis & Viral Pyrexia (Resolved)',
    attendingDoctor: 'Dr. Vikram Rao (Pediatrics)',
    admitDate: '23 Sep 2026',
    status: 'cleared',
    acuity: 'low',
    vitals: {
      bp: '104/68',
      pulse: 88,
      temp: 98.2,
      spO2: 99,
      respRate: 20,
      painScore: 0
    },
    allergies: [],
    fallRisk: 'Low',
    tpaInsurance: {
      provider: 'Bajaj Allianz (Pre-Auth Settled)',
      preAuthAmount: 32000,
      billedAmount: 29500,
      coPayDue: 0,
      status: 'cleared'
    },
    dischargeChecklist: {
      clinicalSignOff: true,
      nursingHandover: true,
      pharmacyBag: true,
      billingClearance: true,
      exitGatePassGenerated: true
    }
  }
];

export const MOCK_BEDS: BedItem[] = [
  {
    id: 'M-101',
    ward: 'Medical Ward A',
    wardCategory: 'med_a',
    status: 'available',
    hardwareType: 'Motorized Semi-Fowler',
    tempAndPressure: '22.4°C • +12 Pa',
    lastSanitized: 'Deep UV sanitization completed at 14:10',
    suggestedAllocation: 'Kavita D. (ER Triage Yellow • UHID 8829)'
  },
  {
    id: 'M-102',
    ward: 'Medical Ward A',
    wardCategory: 'med_a',
    status: 'occupied',
    patientName: 'Kavita Deshmukh (42/F)',
    patientUhid: 'HOS-2026-1004',
    attendingStaff: 'Dr. Joshi • Internal Med',
    expectedDischargeTime: 'Checkout Today 4:00 PM',
    hardwareType: 'Standard Clinical Bay Bed',
    tempAndPressure: '22.8°C • +10 Pa',
    lastSanitized: '2 days ago'
  },
  {
    id: 'M-103',
    ward: 'Medical Ward A',
    wardCategory: 'med_a',
    status: 'cleaning',
    assignedHousekeeper: 'Sunita M. (Floor Tech)',
    cleaningProgress: 65,
    cleaningEstMinutesLeft: 10,
    hardwareType: 'Motorized Semi-Fowler',
    tempAndPressure: '23.0°C • Normal',
    lastSanitized: 'In progress (Stage 2/3 - Chemical wash)'
  },
  {
    id: 'M-104',
    ward: 'Medical Ward A',
    wardCategory: 'med_a',
    status: 'occupied',
    patientName: 'Aarav Mehta (54/M)',
    patientUhid: 'HOS-2026-1001',
    attendingStaff: 'Dr. Ananya Rao',
    hardwareType: 'Motorized Semi-Fowler Bed',
    tempAndPressure: '22.4°C • +12 Pa',
    lastSanitized: '3 days ago'
  },
  {
    id: 'S-201',
    ward: 'Surgical Ward',
    wardCategory: 'surgical',
    status: 'ready',
    assignedHousekeeper: 'Ramesh K. (Lead Housekeeper)',
    hardwareType: 'Post-Op Surgical Bed',
    tempAndPressure: '21.5°C • Positive',
    lastSanitized: 'Passed UV-C protocol 8m ago • Awaits nurse sign-off'
  },
  {
    id: 'S-202',
    ward: 'Surgical Ward',
    wardCategory: 'surgical',
    status: 'occupied',
    patientName: 'Priya Sharma (38/F)',
    patientUhid: 'HOS-2026-1002',
    attendingStaff: 'Dr. Rajesh Patel',
    hardwareType: 'Post-Op Surgical Bay',
    tempAndPressure: '22.0°C • Positive',
    lastSanitized: '2 days ago'
  },
  {
    id: 'ICU-01',
    ward: 'Intensive Care Unit (ICU)',
    wardCategory: 'icu',
    status: 'critical',
    patientName: 'Ventilated Patient (61M)',
    patientUhid: 'HOS-2026-0914',
    attendingStaff: 'Dr. Mehra',
    hardwareType: 'ICU Critical Bed + Maquet Ventilator',
    tempAndPressure: '21.0°C • Negative Pressure',
    lastSanitized: '5 days ago'
  },
  {
    id: 'ICU-02',
    ward: 'Intensive Care Unit (ICU)',
    wardCategory: 'icu',
    status: 'maintenance',
    assignedHousekeeper: 'Lead Tech: Vijay K.',
    hardwareType: 'Biomedical Sensor Calibration & Gas Manifold',
    tempAndPressure: '21.2°C • Testing',
    lastSanitized: 'Under calibration till 18:00'
  },
  {
    id: 'ICU-03',
    ward: 'Intensive Care Unit (ICU)',
    wardCategory: 'icu',
    status: 'critical',
    patientName: 'Rohan Patel (65/M)',
    patientUhid: 'HOS-2026-1003',
    attendingStaff: 'Dr. Ananya Rao & Dr. Mehra',
    hardwareType: 'Critical Care Monitoring Bay',
    tempAndPressure: '20.8°C • Negative Pressure',
    lastSanitized: '4 days ago'
  },
  {
    id: 'M-204',
    ward: 'Medical Ward B',
    wardCategory: 'med_b',
    status: 'ready',
    assignedHousekeeper: 'Ramesh Kumar (Sanitation Lead)',
    hardwareType: 'Motorized Semi-Fowler',
    tempAndPressure: '22.4°C • +12 Pa',
    lastSanitized: 'Terminal clean passed • 14:40 UV-C Robot (254nm)'
  },
  {
    id: 'G-108',
    ward: 'General Ward',
    wardCategory: 'med_a',
    status: 'cleaning',
    assignedHousekeeper: 'Deepa S. (EVS Spec)',
    cleaningProgress: 90,
    cleaningEstMinutesLeft: 3,
    hardwareType: 'General Inpatient Bed',
    tempAndPressure: '23.1°C • Ambient',
    lastSanitized: 'Final wipeout & fresh linens staged'
  }
];

export const MOCK_INVOICES: InvoiceItem[] = [
  {
    id: 'INV-2048',
    uhid: 'HOS-2026-1001',
    patientName: 'Aarav Mehta',
    wardBed: 'Medical Ward A (M-104)',
    insuranceProvider: 'Star Health TPA',
    dateTime: 'Today 11:20 AM',
    totalAmount: 48500,
    tpaPaid: 40000,
    patientCoPay: 8500,
    clearanceStatus: 'co_pay_pending',
    claimQueryNote: 'Room Rent & Pharmacy disallowed by policy ceiling. Co-pay required before gate-pass.'
  },
  {
    id: 'INV-2047',
    uhid: 'HOS-2026-0994',
    patientName: 'Vikram Seth',
    wardBed: 'Surgical Ward (S-201)',
    insuranceProvider: 'HDFC ERGO Health',
    dateTime: 'Today 09:45 AM',
    totalAmount: 76400,
    tpaPaid: 76400,
    patientCoPay: 0,
    clearanceStatus: 'cleared'
  },
  {
    id: 'INV-2046',
    uhid: 'HOS-2026-0988',
    patientName: 'Kavita Nair',
    wardBed: 'General Ward B (M-102)',
    insuranceProvider: 'New India Assurance',
    dateTime: 'Yesterday',
    totalAmount: 34200,
    tpaPaid: 34200,
    patientCoPay: 0,
    clearanceStatus: 'cleared'
  },
  {
    id: 'INV-2045',
    uhid: 'HOS-2026-0972',
    patientName: 'Sunita Rao',
    wardBed: 'Orthopedics (P-301)',
    insuranceProvider: 'Cashless MediAssist',
    dateTime: 'Yesterday',
    totalAmount: 92000,
    tpaPaid: 92000,
    patientCoPay: 0,
    clearanceStatus: 'discharged'
  },
  {
    id: 'INV-2044',
    uhid: 'HOS-2026-0960',
    patientName: 'Rohan Patel',
    wardBed: 'ICU (ICU-03)',
    insuranceProvider: 'Care Health Insurance',
    dateTime: '21 Sep 2026',
    totalAmount: 145000,
    tpaPaid: 100000,
    patientCoPay: 0,
    clearanceStatus: 'in_progress',
    claimQueryNote: 'Interim running ledger active. Critical care stay day 4.'
  },
  {
    id: 'INV-2049',
    uhid: 'HOS-2026-1002',
    patientName: 'Priya Sharma',
    wardBed: 'Surgical Ward (S-202)',
    insuranceProvider: 'ICICI Lombard Health',
    dateTime: 'Today 10:15 AM',
    totalAmount: 112000,
    tpaPaid: 0,
    patientCoPay: 0,
    clearanceStatus: 'tpa_query',
    claimQueryNote: 'Query on implant breakdown & surgical consumable invoice #SURG-44.'
  }
];

export const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'STAT Emergency Review', desc: 'Rohan Patel (ICU-03) SpO2 decreased to 91%. Attending review required.', time: '2m ago', unread: true, type: 'critical' },
  { id: '2', title: 'TPA Dispute Alert', desc: 'ICICI Lombard raised consumable query for Priya Sharma (S-202).', time: '14m ago', unread: true, type: 'warning' },
  { id: '3', title: 'Bed Sanitized & Certified', desc: 'Bed M-204 UV-C robot passed (4.2 J/cm²). Ready for admission.', time: '28m ago', unread: false, type: 'success' },
  { id: '4', title: 'Ambulance Inbound ETA 6m', desc: 'Trauma Bay 2 reserved for air-ambulance inward cardiac patient.', time: '35m ago', unread: false, type: 'info' }
];

export const MOCK_LOBBY_TOKENS = [
  { token: '#A-24', category: 'EMERG', name: 'Rahul Sharma', age: '42M', condition: 'Chest Discomfort & Diaphoresis', wait: '4m', action: 'Instant ER Escort', bay: 'ER-01', urgent: true },
  { token: '#B-12', category: 'ADMIT', name: 'Smt. Anjali Joshi', age: '68F', condition: 'Ortho IPD Scheduled (TKR)', wait: '9m', action: 'Confirm Admission', bay: 'S-204', urgent: false },
  { token: '#C-08', category: 'VISIT', name: 'Manoj R. Patil', age: 'Relative', condition: 'Visiting Ramesh Patil (ICU 04)', wait: '12m', action: 'Issue NFC Badge', bay: 'ICU-04', urgent: false },
  { token: '#D-31', category: 'OPD', name: 'Sunita Deshmukh', age: '34F', condition: 'Cardiology (Dr. Parekh Room 102)', wait: '15m', action: 'Send to Room 102', bay: 'OPD-102', urgent: false }
];
