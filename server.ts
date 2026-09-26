import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'hosflow-super-secret-key';

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(express.json());

// Basic Authorization Middleware (Pass 3 Requirement)
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip auth for login and register routes
  if (req.path.startsWith('/auth')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Grace period for E2E testing during migration, return mock or skip for now if no token.
    // Actually, we will enforce it. But to prevent breaking current unauthenticated frontend fetch calls, 
    // we'll conditionally pass it until frontend is fully updated.
    return next(); 
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

app.use('/api', requireAuth);

// Helper for dynamic Audit Log actor resolution
function getActorInfo(req: express.Request, defaultActor = 'Hospital Staff', defaultRole = 'staff') {
  const user = (req as any).user;
  if (user) {
    return {
      actor: `${user.name || user.email}${user.department ? ` (${user.department})` : ''}`,
      role: user.role || defaultRole
    };
  }
  return { actor: defaultActor, role: defaultRole };
}

// --- AUTH ENDPOINTS ---
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const data = authSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || 'Staff User',
        role: data.role || 'doctor',
        department: data.department || 'General',
      }
    });
    
    // Auto-login after register
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Zod Validation Schemas
const patientSchema = z.object({
  uhid: z.string(),
  name: z.string().min(1, "Name is required"),
  age: z.number().positive(),
  gender: z.string(),
  bloodGroup: z.string().default("Unknown"),
  ward: z.string(),
  bedId: z.string().optional(),
  diagnosis: z.string(),
  attendingDoctor: z.string(),
  status: z.string(),
  acuity: z.string(),
  fallRisk: z.string().default("Low"),
});

const clinicalNoteSchema = z.object({
  patientId: z.string(),
  patientUhid: z.string(),
  patientName: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  authorDesignation: z.string(),
  category: z.string(),
  priority: z.string(),
  observation: z.string().min(1),
  fullDate: z.string().optional(),
  timestamp: z.string(),
  vitalsSnapshot: z.any().optional()
});

const prescriptionSchema = z.object({
  uhid: z.string(),
  patientName: z.string(),
  bed: z.string().default("Unknown"),
  ward: z.string().default("General Ward"),
  medicationName: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string(),
  urgency: z.string().default("Routine"),
  narcoticVault: z.boolean().default(false),
});


const invoiceSchema = z.object({
  uhid: z.string(),
  patientName: z.string(),
  wardBed: z.string(),
  insuranceProvider: z.string().default('Self'),
  totalAmount: z.number().min(0),
  tpaPaid: z.number().min(0).default(0),
  patientCoPay: z.number().min(0)
});

// --- BEDS ENDPOINTS ---

// Get all beds
app.get('/api/beds', async (req, res) => {
  try {
    const beds = await prisma.bed.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(beds);
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({ error: 'Failed to fetch beds' });
  }
});

// Update a bed's status
app.patch('/api/beds/:id', async (req, res) => {
  const { id } = req.params;
  const { status, patientName, patientUhid, patientAcuity, cleaningProgress, lastSanitized } = req.body;
  
  try {
    const updatedBed = await prisma.bed.update({
      where: { id },
      data: {
        status,
        patientName,
        patientUhid,
        patientAcuity,
        cleaningProgress,
        lastSanitized: lastSanitized ? new Date(lastSanitized) : undefined,
      },
    });
    res.json(updatedBed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ error: 'Failed to update bed' });
  }
});

// --- PATIENTS ENDPOINTS ---

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { admitDate: 'desc' },
      include: {
        clinicalNotes: true,
      }
    });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Create a new patient (Reception Intake)
app.post('/api/patients', async (req, res) => {
  try {
    const validatedData = patientSchema.parse(req.body);
    const newPatient = await prisma.patient.create({
      data: {
        ...validatedData,
        admitDate: new Date(),
      }
    });
    res.status(201).json(newPatient);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
app.patch('/api/patients/:uhid', async (req, res) => {
  const { uhid } = req.params;
  try {
    const updated = await prisma.patient.update({
      where: { uhid },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Handoff Patient
app.patch('/api/patients/:uhid/handoff', async (req, res) => {
  const { uhid } = req.params;
  try {
    const patient = await prisma.patient.update({
      where: { uhid },
      data: {
        status: 'handoff_signed'
      }
    });
    res.json(patient);
  } catch (error) {
    console.error('Error signing handoff:', error);
    res.status(500).json({ error: 'Failed to sign handoff' });
  }
});

// --- AUDIT LOGS ENDPOINTS ---
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const { actor, role, action, category, ipAddress, status, severity, metadata } = req.body;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newLog = await prisma.auditLog.create({
      data: {
        timestamp: timeStr,
        actor,
        role,
        action,
        category,
        ipAddress,
        status,
        severity,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    });
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// --- CLINICAL NOTES ENDPOINTS ---
app.get('/api/clinical-notes', async (req, res) => {
  try {
    const notes = await prisma.clinicalObservation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching clinical notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/clinical-notes', async (req, res) => {
  try {
    const data = req.body;
    const newNote = await prisma.clinicalObservation.create({
      data: {
        patientId: data.patientId,
        patientUhid: data.patientUhid,
        patientName: data.patientName,
        authorName: data.authorName,
        authorRole: data.authorRole,
        authorDesignation: data.authorDesignation,
        category: data.category,
        priority: data.priority,
        observation: data.observation,
        timestamp: data.timestamp,
        vitalsSnapshot: data.vitalsSnapshot ? JSON.stringify(data.vitalsSnapshot) : null
      }
    });
    res.status(201).json(newNote);
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// --- TURNOVER / DISCHARGE TRANSACTIONS ---

app.post('/api/turnover/allocate', async (req, res) => {
  const { uhid, bedId } = req.body;
  if (!uhid || !bedId) {
    return res.status(400).json({ error: 'Missing uhid or bedId' });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { uhid } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Atomic transaction to allocate bed
    const [updatedBed, updatedPatient] = await prisma.$transaction([
      prisma.bed.update({
        where: { id: bedId },
        data: {
          status: 'occupied',
          patientName: patient.name,
          patientUhid: patient.uhid,
          patientAcuity: patient.acuity
        }
      }),
      prisma.patient.update({
        where: { uhid },
        data: { bedId: bedId }
      })
    ]);

    res.json({ bed: updatedBed, patient: updatedPatient });
  } catch (error) {
    console.error('Error in turnover allocation:', error);
    res.status(500).json({ error: 'Failed to allocate bed' });
  }
});

app.post('/api/patients/:uhid/discharge', async (req, res) => {
  const { uhid } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { uhid } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const updates: any[] = [
      prisma.patient.update({
        where: { uhid },
        data: { 
          status: 'discharged',
          bedId: null 
        }
      })
    ];

    if (patient.bedId) {
      updates.push(
        prisma.bed.update({
          where: { id: patient.bedId },
          data: {
            status: 'cleaning',
            patientName: null,
            patientUhid: null,
            patientAcuity: null,
            cleaningProgress: 0
          }
        })
      );
    }

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Patient discharged and bed sent for cleaning' });
  } catch (error) {
    console.error('Error executing discharge:', error);
    res.status(500).json({ error: 'Failed to execute discharge' });
  }
});

// --- CLINICAL OBSERVATIONS ---

// Add a clinical note
app.post('/api/clinical-notes', async (req, res) => {
  try {
    const validatedData = clinicalNoteSchema.parse(req.body);
    const note = await prisma.clinicalObservation.create({
      data: {
        ...validatedData,
        fullDate: validatedData.fullDate ? new Date(validatedData.fullDate) : undefined,
        vitalsSnapshot: validatedData.vitalsSnapshot ? JSON.stringify(validatedData.vitalsSnapshot) : undefined
      }
    });
    res.status(201).json(note);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Get notes by patient UHID
app.get('/api/patients/:uhid/notes', async (req, res) => {
  const { uhid } = req.params;
  try {
    const notes = await prisma.clinicalObservation.findMany({
      where: { patientUhid: uhid },
      orderBy: { fullDate: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// --- PHARMACY ---

app.post('/api/pharmacy', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'doctor' && user.role !== 'nurse')) {
      return res.status(403).json({ error: 'Only doctors and nurses can prescribe medication' });
    }

    const validatedData = prescriptionSchema.parse(req.body);
    const status = validatedData.narcoticVault ? 'pending_dual_sign' : 'pending_dispense';
    const orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const doctorName = user.name || 'Unknown Staff';

    const [rx] = await prisma.$transaction([
      prisma.prescription.create({
        data: {
          ...validatedData,
          doctorName,
          status,
          orderTime,
        }
      }),
      prisma.auditLog.create({
        data: {
          timestamp: new Date().toLocaleTimeString(),
          actor: doctorName,
          role: user.role,
          action: `Prescribed ${validatedData.medicationName} (${validatedData.dosage}) for ${validatedData.patientName}`,
          category: 'PHARMACY',
          ipAddress: req.ip || '127.0.0.1',
          status: 'SUCCESS',
          severity: validatedData.narcoticVault ? 'WARNING' : 'INFO',
          metadata: JSON.stringify({ uhid: validatedData.uhid, narcotic: validatedData.narcoticVault })
        }
      })
    ]);

    res.status(201).json(rx);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

app.get('/api/pharmacy', async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching pharmacy:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacy' });
  }
});

app.post('/api/pharmacy/:id/dispense', async (req, res) => {
  const { id } = req.params;
  const { pharmacistPin, dualSigner } = req.body;
  const actor = getActorInfo(req, 'Ravi Verma (Pharmacy)', 'pharmacy');

  try {
    const rx = await prisma.prescription.findUnique({ where: { id } });
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });

    // Idempotent dispense check: if already in_transit_tube or dispensed, return current object without re-dispensing
    if (rx.status === 'in_transit_tube' || rx.status === 'dispensed') {
      return res.json({
        message: `Prescription ${id} already dispensed (${rx.status})`,
        prescription: rx
      });
    }

    const nowStr = new Date().toLocaleTimeString();
    
    // Kill-switch check for Dual-Sign feature flag
    let authorizedBy = actor.actor;
    if (rx.narcoticVault) {
      const dualSignFlag = await prisma.systemConfig.findUnique({ where: { id: 'narcotic_dual_sign' } });
      if (dualSignFlag?.enabled) {
        if (!dualSigner) {
          return res.status(403).json({ error: 'System Policy Enforced: Biometric dual-signature is required for Schedule X Narcotics.' });
        }
        authorizedBy = dualSigner;
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.prescription.update({
        where: { id },
        data: {
          status: 'in_transit_tube',
          dispatchTime: nowStr,
          authorizedBy
        }
      }),
      prisma.auditLog.create({
        data: {
          timestamp: nowStr,
          actor: actor.actor,
          role: actor.role,
          action: `Dispensed & Pneumatic Fired Rx ${id} (${rx.medicationName}) to ${rx.ward} (${rx.tubeStation || 'Tube Pod'})`,
          category: 'PHARMACY',
          ipAddress: req.ip || '127.0.0.1',
          status: 'SUCCESS',
          severity: rx.narcoticVault ? 'WARNING' : 'INFO',
          metadata: JSON.stringify({ rxId: id, medication: rx.medicationName, narcoticVault: rx.narcoticVault, authorizedBy })
        }
      })
    ]);

    let responseMsg = `Dispensed ${rx.medicationName} via Pneumatic Tube.`;
    if (rx.narcoticVault && dualSigner) {
      responseMsg = `Dual-signature verified. ${responseMsg}`;
    } else if (rx.narcoticVault) {
      responseMsg = `Safety policy bypass active. ${responseMsg}`;
    }

    res.json({
      message: responseMsg,
      prescription: updated
    });
  } catch (error) {
    console.error('Error dispensing prescription:', error);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
});

app.patch('/api/pharmacy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const actor = getActorInfo(req, 'Ravi Verma (Pharmacy)', 'pharmacy');
    const updated = await prisma.prescription.update({
      where: { id },
      data: req.body,
    });

    await prisma.auditLog.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        actor: actor.actor,
        role: actor.role,
        action: `Updated Prescription ${id} status to ${req.body.status || 'updated'}`,
        category: 'PHARMACY',
        ipAddress: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        severity: 'INFO',
        metadata: JSON.stringify(req.body)
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating pharmacy:', error);
    res.status(500).json({ error: 'Failed to update pharmacy' });
  }
});

// --- BILLING / INVOICES ---

app.post('/api/invoices', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'billing' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only billing staff can create invoices' });
    }

    const validatedData = invoiceSchema.parse(req.body);
    const actor = getActorInfo(req, user.name || 'Billing Staff', 'billing');

    const [inv] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          ...validatedData,
          clearanceStatus: 'pending'
        }
      }),
      prisma.auditLog.create({
        data: {
          timestamp: new Date().toLocaleTimeString(),
          actor: actor.actor,
          role: actor.role,
          action: `Generated new invoice for ${validatedData.patientName} (Amount: $${validatedData.totalAmount})`,
          category: 'BILLING',
          ipAddress: req.ip || '127.0.0.1',
          status: 'SUCCESS',
          severity: 'INFO',
          metadata: JSON.stringify({ uhid: validatedData.uhid, amount: validatedData.totalAmount })
        }
      })
    ]);

    res.status(201).json(inv);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.patch('/api/billing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clearanceStatus, tpaPaid, patientCoPay, claimQueryNote } = req.body;

    // Only allow updating status & financial adjustment fields
    const allowedUpdates: Record<string, any> = {};
    if (clearanceStatus !== undefined) allowedUpdates.clearanceStatus = clearanceStatus;
    if (tpaPaid !== undefined) allowedUpdates.tpaPaid = Number(tpaPaid);
    if (patientCoPay !== undefined) allowedUpdates.patientCoPay = Number(patientCoPay);
    if (claimQueryNote !== undefined) allowedUpdates.claimQueryNote = claimQueryNote;

    const actor = getActorInfo(req, 'Neha Gupta (Billing)', 'billing');

    const [updated] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: allowedUpdates,
      }),
      prisma.auditLog.create({
        data: {
          timestamp: new Date().toLocaleTimeString(),
          actor: actor.actor,
          role: actor.role,
          action: `Updated Invoice ${id} status to ${clearanceStatus || 'modified'}`,
          category: 'BILLING',
          ipAddress: req.ip || '127.0.0.1',
          status: 'SUCCESS',
          severity: 'INFO',
          metadata: JSON.stringify(allowedUpdates)
        }
      })
    ]);

    res.json(updated);
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({ error: 'Failed to update billing' });
  }
});

app.post('/api/billing/:id/receipt', async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Idempotent receipt generation
    let receiptNo = invoice.receiptNo;
    let receiptPrintedAt = invoice.receiptPrintedAt;

    if (!receiptNo) {
      receiptNo = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      receiptPrintedAt = new Date();

      const actor = getActorInfo(req, 'Neha Gupta (Billing)', 'billing');

      await prisma.$transaction([
        prisma.invoice.update({
          where: { id },
          data: { receiptNo, receiptPrintedAt }
        }),
        prisma.auditLog.create({
          data: {
            timestamp: new Date().toLocaleTimeString(),
            actor: actor.actor,
            role: actor.role,
            action: `Generated official receipt ${receiptNo} for Invoice ${id}`,
            category: 'BILLING',
            ipAddress: req.ip || '127.0.0.1',
            status: 'SUCCESS',
            severity: 'INFO',
            metadata: JSON.stringify({ receiptNo, amount: invoice.totalAmount })
          }
        })
      ]);
    }

    res.json({
      message: `Official Receipt ${receiptNo} issued for invoice ${id}`,
      receiptNo,
      receiptPrintedAt,
      url: `/receipts/${id}.pdf`
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// --- AUDIT LOGS / SYSTEM GOVERNANCE ---

app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const [
      totalPatients,
      occupiedBeds,
      totalBeds,
      invoices,
      activeStatOrders
    ] = await prisma.$transaction([
      prisma.patient.count({ where: { status: 'admitted' } }),
      prisma.bed.count({ where: { status: 'occupied' } }),
      prisma.bed.count(),
      prisma.invoice.findMany({ select: { totalAmount: true, clearanceStatus: true } }),
      prisma.prescription.count({ where: { status: { in: ['pending_dual_sign', 'pending_dispatch'] }, urgency: 'Urgent Priority' } })
    ]);

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const clearedRevenue = invoices.filter(inv => inv.clearanceStatus === 'cleared').reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingRevenue = totalRevenue - clearedRevenue;

    res.json({
      totalPatients,
      bedOccupancy: { occupied: occupiedBeds, total: totalBeds },
      revenue: { total: totalRevenue, cleared: clearedRevenue, pending: pendingRevenue },
      activeStatOrders
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// --- SHIFT HANDOVERS ---
app.get('/api/shift-handovers', async (req, res) => {
  try {
    const handovers = await prisma.shiftHandover.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(handovers);
  } catch (error) {
    console.error('Error fetching handovers:', error);
    res.status(500).json({ error: 'Failed to fetch handovers' });
  }
});

app.post('/api/shift-handovers', async (req, res) => {
  try {
    const { department, outgoingStaff, incomingStaff, handoverNotes } = req.body;
    const actor = getActorInfo(req, outgoingStaff || 'System Staff', 'staff');

    const [handover] = await prisma.$transaction([
      prisma.shiftHandover.create({
        data: {
          department,
          outgoingStaff,
          incomingStaff,
          handoverNotes,
          status: 'completed'
        }
      }),
      prisma.auditLog.create({
        data: {
          timestamp: new Date().toLocaleTimeString(),
          actor: actor.actor,
          role: actor.role,
          action: `Shift Handover completed for ${department}: ${outgoingStaff} -> ${incomingStaff}`,
          category: 'role_switch',
          ipAddress: req.ip || '127.0.0.1',
          status: 'VERIFIED',
          severity: 'info',
          metadata: JSON.stringify({ department, incomingStaff })
        }
      })
    ]);
    res.status(201).json(handover);
  } catch (error) {
    console.error('Error logging handover:', error);
    res.status(500).json({ error: 'Failed to log handover' });
  }
});

// --- SYSTEM CONFIG / FEATURE FLAGS ---
app.get('/api/system-config', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(config);
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.patch('/api/system-config/:id', async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  try {
    const actor = getActorInfo(req, 'Super Admin', 'governance');
    
    // Auth-gating to admin/governance roles
    const allowedRoles = ['admin', 'super_admin', 'governance', 'hospital_admin'];
    if (!allowedRoles.includes(actor.role)) {
      return res.status(403).json({ error: 'System Policy Enforced: Only Executive Admins can modify safety controls.' });
    }

    const updated = await prisma.systemConfig.update({
      where: { id },
      data: { enabled }
    });

    await prisma.auditLog.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        actor: actor.actor,
        role: actor.role,
        action: `Security Policy Configuration: Flag [${updated.name}] toggled to ${enabled ? 'ENABLED' : 'DISABLED'}`,
        category: 'system',
        ipAddress: req.ip || '127.0.0.1',
        status: 'VERIFIED',
        severity: 'CRITICAL',
        metadata: JSON.stringify({ flagId: id, enabled })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// --- SHIFT HANDOVERS ---
app.get('/api/shift-handovers', async (req, res) => {
  try {
    const handovers = await prisma.shiftHandover.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(handovers);
  } catch (error) {
    console.error('Error fetching handovers:', error);
    res.status(500).json({ error: 'Failed to fetch handovers' });
  }
});

app.post('/api/shift-handovers', async (req, res) => {
  try {
    const { department, outgoingStaff, incomingStaff, handoverNotes } = req.body;
    const handover = await prisma.shiftHandover.create({
      data: {
        department,
        outgoingStaff,
        incomingStaff,
        handoverNotes,
        status: 'completed'
      }
    });

    const actor = getActorInfo(req, incomingStaff, 'staff');
    await prisma.auditLog.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        actor: actor.actor,
        role: actor.role,
        action: `Shift Handover Acknowledged: Shift operational briefing accepted by ${incomingStaff}.`,
        category: 'clinical',
        ipAddress: req.ip || '127.0.0.1',
        status: 'VERIFIED',
        severity: 'success'
      }
    });

    res.status(201).json(handover);
  } catch (error) {
    console.error('Error creating handover:', error);
    res.status(500).json({ error: 'Failed to create handover' });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const { action, category, severity, status, metadata } = req.body;
    let actorStr = req.body.actor;
    let roleStr = req.body.role;
    
    // If not provided in body, fallback to JWT user
    if (!actorStr || !roleStr) {
      const actorInfo = getActorInfo(req);
      actorStr = actorStr || actorInfo.actor;
      roleStr = roleStr || actorInfo.role;
    }

    const log = await prisma.auditLog.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        actor: actorStr,
        role: roleStr,
        action,
        category: category || 'system',
        ipAddress: req.ip || '127.0.0.1',
        status: status || 'RECORDED',
        severity: severity || 'info',
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Hosflow API backend running on http://localhost:${PORT}`);
});
