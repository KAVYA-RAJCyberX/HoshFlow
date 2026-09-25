# Hosflow End-to-End Lifecycle Journey Report

## Stage 0: Clean Slate Check
**Action:** Queried baseline counts from DB.
**DB Result:** {"beds":4,"patients":2,"invoices":4,"prescriptions":3,"clinicalNotes":0}
**Status:** PASS

## Stage 1: Reception Admit
**Action:** `POST /api/patients`
**UI Claim (Response):** `201` `{"id":"c02bc147-8ca2-414d-9fb9-7dd79d039a90","uhid":"UHID-E2E-1790378241493","name":"E2E Test Patien...`
**DB Result:** Patient UHID-E2E-1790378241493 created in Postgres.
**Status:** PASS

## Stage 2: Bed Matrix Assign
**Action:** `POST /api/turnover/allocate`
**UI Claim:** `200`
**DB Result:** Bed ICU-01 flipped to occupied, linked to UHID-E2E-1790378241493. Patient linked to Bed.
**Status:** PASS

## Stage 3: Nursing Station Kardex
**Action:** `POST /api/clinical-notes`
**DB Result:** Observation saved to DB.
**Status:** PASS

## Stage 4: Doctor Note & Prescription
**Action:** `POST /api/clinical-notes` for doctor note.
**Finding:** No endpoint exists to create Prescriptions (`POST /api/pharmacy` missing). Injected via Prisma directly.
**DB Result:** Doctor note saved. Narcotic Rx (83b18225-7db0-4bd6-bb07-f48b591067de) and Routine Rx (2c6f2d11-b4c2-4881-a363-80e7adc38b14) injected.
**Status:** PARTIAL (Note works, Rx requires direct DB injection)

## Stage 5: Pharmacy Dispense
**Action:** Attempt dispense without dual signer (Flag ON)
**Result:** `403` {"error":"System Policy Enforced: Biometric dual-signature is required for Schedule X Narcotics."}
**Action:** Attempt dispense with dual signer
**Result:** `200` {"message":"Dual-signature verified. Dispensed Inj Morphine 10mg via Pneumatic Tube.","prescription":{"id":"83b18225-7db0-4bd6-bb07-f48b591067de","uhid":"UHID-E2E-1790378241493","patientName":"E2E Test Patient","bed":"B-101","ward":"General Ward","medicationName":"Inj Morphine 10mg","dosage":"10mg","frequency":"SOS","route":"IV","doctorName":"Dr. House","urgency":"STAT","narcoticVault":true,"status":"in_transit_tube","tubeStation":null,"orderTime":"10:20 AM","dispatchTime":"4:47:21 am","authorizedBy":"Dr. House","createdAt":"2026-09-25T23:17:21.754Z","updatedAt":"2026-09-25T23:17:21.796Z"}}
**Action:** Attempt duplicate dispense
**Result:** `200` {"message":"Prescription 83b18225-7db0-4bd6-bb07-f48b591067de already dispensed (in_transit_tube)","prescription":{"id":"83b18225-7db0-4bd6-bb07-f48b591067de","uhid":"UHID-E2E-1790378241493","patientName":"E2E Test Patient","bed":"B-101","ward":"General Ward","medicationName":"Inj Morphine 10mg","dosage":"10mg","frequency":"SOS","route":"IV","doctorName":"Dr. House","urgency":"STAT","narcoticVault":true,"status":"in_transit_tube","tubeStation":null,"orderTime":"10:20 AM","dispatchTime":"4:47:21 am","authorizedBy":"Dr. House","createdAt":"2026-09-25T23:17:21.754Z","updatedAt":"2026-09-25T23:17:21.796Z"}}
**Action:** Attempt dispense non-narcotic without dual signer
**Result:** `200` {"message":"Dispensed Paracetamol 500mg via Pneumatic Tube.","prescription":{"id":"2c6f2d11-b4c2-4881-a363-80e7adc38b14","uhid":"UHID-E2E-1790378241493","patientName":"E2E Test Patient","bed":"B-101","ward":"General Ward","medicationName":"Paracetamol 500mg","dosage":"500mg","frequency":"TID","route":"PO","doctorName":"Dr. House","urgency":"Routine","narcoticVault":false,"status":"in_transit_tube","tubeStation":null,"orderTime":"10:22 AM","dispatchTime":"4:47:21 am","authorizedBy":"Pharm Bob","createdAt":"2026-09-25T23:17:21.762Z","updatedAt":"2026-09-25T23:17:21.836Z"}}
**Status:** PASS

## Stage 6: Turnover/Bed continuity
**Action:** `GET /api/beds`
**Result:** Bed ICU-01 is OCCUPIED/NOT AVAILABLE (PASS) in API.
**Status:** PASS

## Stage 7: Billing
**Finding:** No endpoint exists to create Invoices. Injected via Prisma directly.
**Action:** `PATCH /api/billing/9b2e1ad3-6916-4378-b073-798c58a4cb98` with status='cleared' and totalAmount=100
**Result:** DB totalAmount is 5000 (should be 5000, un-altered by PATCH).
**Action:** `POST /api/billing/9b2e1ad3-6916-4378-b073-798c58a4cb98/receipt` (twice)
**Result 1:** `200` Receipt No: RCP-2026-4279
**Result 2:** `200` Receipt No: RCP-2026-4279
**Status:** PARTIAL (Invoice creation injected, but PATCH and idempotency passed)

## Stage 8: Discharge
**Action:** `POST /api/patients/UHID-E2E-1790378241493/discharge`
**Result:** `200`
**DB Result:** Patient status is 'discharged', Bed status is 'cleaning'
**Status:** PASS

## Stage 9: Housekeeping
**Action:** `PATCH /api/beds/ICU-01` to available
**DB Result:** Bed status is 'available'
**Status:** PASS

## Stage 10: Governance
**Action:** `GET /api/metrics` & `GET /api/audit-logs`
**Metrics Result:** `200` Total patients: 1
**Action:** Kill switch OFF -> Dispense Narcotic without dual signer
**Result:** `200` msg: Safety policy bypass active. Dispensed Inj Fentanyl via Pneumatic Tube.
**Action:** Kill switch ON -> Dispense Narcotic without dual signer
**Result:** `403` msg: System Policy Enforced: Biometric dual-signature is required for Schedule X Narcotics.
**Status:** PASS
