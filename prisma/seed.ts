import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clean existing data
  await prisma.clinicalObservation.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const defaultPassword = await bcrypt.hash('Hosflow@2026', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: { name: 'Pooja Kadam', email: 'reception@citycare.com', password: defaultPassword, role: 'reception', department: 'Front Desk' }
    }),
    prisma.user.create({
      data: { name: 'Sanjay Deshmukh', email: 'bedmgr@citycare.com', password: defaultPassword, role: 'bed_manager', department: 'Operations' }
    }),
    prisma.user.create({
      data: { name: 'Dr. Ananya Rao', email: 'arao@citycare.com', password: defaultPassword, role: 'doctor', department: 'General Medicine' }
    }),
    prisma.user.create({
      data: { name: 'Ramesh Kumar', email: 'housekeeping@citycare.com', password: defaultPassword, role: 'housekeeping', department: 'Sanitation' }
    }),
    prisma.user.create({
      data: { name: 'Nurse Clara', email: 'nurse@citycare.com', password: defaultPassword, role: 'nurse', department: 'Inpatient Floor' }
    }),
    prisma.user.create({
      data: { name: 'Ravi Verma', email: 'pharmacy@citycare.com', password: defaultPassword, role: 'pharmacy', department: 'Pharmacy' }
    }),
    prisma.user.create({
      data: { name: 'Neha Gupta', email: 'billing@citycare.com', password: defaultPassword, role: 'billing', department: 'Billing' }
    }),
    prisma.user.create({
      data: { name: 'Super Admin', email: 'superadmin@citycare.com', password: defaultPassword, role: 'super_admin', department: 'IT' }
    }),
    prisma.user.create({
      data: { name: 'Dr. Vikram', email: 'hospadmin@citycare.com', password: defaultPassword, role: 'hospital_admin', department: 'Management' }
    })
  ]);
  console.log(`✅ Seeded ${users.length} hospital staff.`);

  // 3. Seed Beds
  const beds = await Promise.all([
    prisma.bed.create({ data: { id: 'M-101', ward: 'Medical Ward A', wardCategory: 'med_a', status: 'available', hardwareType: 'Motorized Semi-Fowler', tempAndPressure: '22.4°C / +12 Pa', lastSanitized: new Date().toISOString() } }),
    prisma.bed.create({ data: { id: 'M-102', ward: 'Medical Ward A', wardCategory: 'med_a', status: 'occupied', hardwareType: 'Standard Clinical', tempAndPressure: '22.8°C / +10 Pa', lastSanitized: new Date(Date.now() - 172800000).toISOString() } }),
    prisma.bed.create({ data: { id: 'M-103', ward: 'Medical Ward A', wardCategory: 'med_a', status: 'cleaning', hardwareType: 'Motorized Semi-Fowler', tempAndPressure: '23.0°C / Ambient', lastSanitized: null, assignedHousekeeper: 'Ramesh Kumar' } }),
    prisma.bed.create({ data: { id: 'ICU-01', ward: 'Intensive Care Unit (ICU)', wardCategory: 'icu', status: 'available', hardwareType: 'ICU Critical Bed', tempAndPressure: '21.0°C / Negative', lastSanitized: new Date().toISOString() } })
  ]);
  console.log(`✅ Seeded ${beds.length} hospital beds.`);

  // 4. Seed Patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        uhid: 'UH-1001',
        name: 'Aarav Mehta',
        age: 54,
        gender: 'M',
        bloodGroup: 'B+',
        ward: 'Medical Ward A',
        bedId: 'M-102',
        diagnosis: 'Acute Gastritis & Dehydration',
        acuity: 'low',
        status: 'discharge_planned',
        attendingDoctor: 'Dr. Ananya Rao',
        vitals: JSON.stringify({ bp: '120/80', pulse: 76, spO2: 98 }),
        allergies: JSON.stringify([]),
        fallRisk: 'Low'
      }
    }),
    prisma.patient.create({
      data: {
        uhid: 'UH-1003',
        name: 'Rohan Patel',
        age: 65,
        gender: 'M',
        bloodGroup: 'AB+',
        ward: 'Intensive Care Unit (ICU)',
        bedId: null,
        diagnosis: 'ARDS / Sepsis Risk',
        acuity: 'critical',
        status: 'admitted',
        attendingDoctor: 'Dr. Ananya Rao',
        vitals: JSON.stringify({ bp: '142/96', pulse: 118, spO2: 91 }),
        allergies: JSON.stringify([]),
        fallRisk: 'High'
      }
    })
  ]);
  console.log(`✅ Seeded ${patients.length} active patients.`);

  // 5. Seed Invoices
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        id: 'INV-2048',
        uhid: 'HOS-2026-1001',
        patientName: 'Aarav Mehta',
        wardBed: 'Medical Ward A (M-104)',
        insuranceProvider: 'Star Health TPA',
        totalAmount: 48500,
        tpaPaid: 40000,
        patientCoPay: 8500,
        clearanceStatus: 'co_pay_pending',
        claimQueryNote: 'Room Rent & Pharmacy disallowed by policy ceiling. Co-pay required before gate-pass.'
      }
    }),
    prisma.invoice.create({
      data: {
        id: 'INV-2047',
        uhid: 'HOS-2026-0994',
        patientName: 'Vikram Seth',
        wardBed: 'Surgical Ward (S-201)',
        insuranceProvider: 'HDFC ERGO Health',
        totalAmount: 76400,
        tpaPaid: 76400,
        patientCoPay: 0,
        clearanceStatus: 'cleared'
      }
    }),
    prisma.invoice.create({
      data: {
        id: 'INV-2046',
        uhid: 'HOS-2026-0988',
        patientName: 'Kavita Nair',
        wardBed: 'General Ward B (M-102)',
        insuranceProvider: 'New India Assurance',
        totalAmount: 34200,
        tpaPaid: 34200,
        patientCoPay: 0,
        clearanceStatus: 'cleared'
      }
    }),
    prisma.invoice.create({
      data: {
        id: 'INV-2045',
        uhid: 'HOS-2026-0972',
        patientName: 'Sunita Rao',
        wardBed: 'Orthopedics (P-301)',
        insuranceProvider: 'Cashless MediAssist',
        totalAmount: 92000,
        tpaPaid: 92000,
        patientCoPay: 0,
        clearanceStatus: 'tpa_query',
        claimQueryNote: 'ICICI Lombard TPA consumable dispute flagged for audit.'
      }
    })
  ]);
  console.log(`✅ Seeded ${invoices.length} invoices.`);

  // 6. Seed Prescriptions
  const prescriptions = await Promise.all([
    prisma.prescription.create({
      data: {
        id: 'RX-9901',
        uhid: 'UHID-884102',
        patientName: 'Devika Singhania',
        bed: 'B-302',
        ward: 'Post-Surg Recovery',
        medicationName: 'Inj Fentanyl 50 mcg / 2ml',
        dosage: '50 mcg IV Push Stat',
        frequency: 'STAT',
        route: 'IV Bolus',
        doctorName: 'Dr. Anand Joshi',
        urgency: 'STAT Immediate (<10m)',
        narcoticVault: true,
        status: 'pending_dual_sign',
        tubeStation: 'Pod 3 (Floor 3 Post-Surg)',
        orderTime: 'Today 11:15 AM'
      }
    }),
    prisma.prescription.create({
      data: {
        id: 'RX-9902',
        uhid: 'UHID-884119',
        patientName: 'Kishore Kulkarni',
        bed: 'A-108',
        ward: 'Cardio-Thoracic Stepdown',
        medicationName: 'Inj Noradrenaline 4mg / 4ml',
        dosage: '0.05 mcg/kg/min infusion',
        frequency: 'Continuous',
        route: 'Central Line Infusion',
        doctorName: 'Dr. Rohini Mehta',
        urgency: 'STAT Immediate (<10m)',
        narcoticVault: false,
        status: 'in_transit_tube',
        tubeStation: 'Pod 1 (Floor 2 ICU/CCU)',
        orderTime: 'Today 10:45 AM'
      }
    }),
    prisma.prescription.create({
      data: {
        id: 'RX-9903',
        uhid: 'UHID-884091',
        patientName: 'Priya N. Deshmukh',
        bed: 'C-204',
        ward: 'Maternity & Obs Suite',
        medicationName: 'Inj Oxytocin 10 IU in 500ml RL',
        dosage: '10 IU Infusion',
        frequency: 'STAT',
        route: 'IV Drip',
        doctorName: 'Dr. Sunita Kulkarni',
        urgency: 'Urgent Priority',
        narcoticVault: false,
        status: 'pending_dual_sign',
        tubeStation: 'Pod 2 (Floor 1 Obs)',
        orderTime: 'Today 09:30 AM'
      }
    })
  ]);
  console.log(`✅ Seeded ${prescriptions.length} prescriptions.`);

  // 7. Seed System Config
  const configs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { id: 'narcotic_dual_sign' },
      update: {},
      create: {
        id: 'narcotic_dual_sign',
        name: 'Narcotic Vault Dual-Signoff',
        description: 'Require 2 clinical credentials for dispensing schedule X drugs.',
        enabled: true,
        category: 'safety'
      }
    })
  ]);
  console.log(`✅ Seeded ${configs.length} system configs.`);

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
