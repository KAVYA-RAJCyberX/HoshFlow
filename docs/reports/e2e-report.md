# Hosflow End-to-End Lifecycle Journey Report

## Stage 0: Clean Slate Check
**Action:** Queried baseline counts from DB.
**DB Result:** {"beds":4,"patients":2,"invoices":4,"prescriptions":3,"clinicalNotes":0}
**Status:** PASS

## Stage 1: Reception Admit
**Action:** `POST /api/patients`
**UI Claim (Response):** `201` `{"id":"14f03c4d-52c2-4150-9c05-31db301a55c4","uhid":"UHID-E2E-1790379835641","name":"E2E Test Patien...`
**DB Result:** Patient UHID-E2E-1790379835641 created in Postgres.
**Status:** PASS

## Stage 2: Bed Matrix Assign
**Action:** `POST /api/turnover/allocate`
**UI Claim:** `200`
**DB Result:** Bed ICU-01 flipped to occupied, linked to UHID-E2E-1790379835641. Patient linked to Bed.
**Status:** PASS

## Stage 3: Nursing Station Kardex
**Action:** `POST /api/clinical-notes`
**DB Result:** Observation saved to DB.
**Status:** PASS

## Stage 4: Doctor Note & Prescription
**Action:** `POST /api/clinical-notes` for doctor note.
**Action:** `POST /api/pharmacy` for Narcotic and Routine Rx
**DB Result:** Doctor note saved. Narcotic Rx (00cb694f-4573-4817-ade3-a41aac6d6a2b) and Routine Rx (6dfb8cab-4885-446f-a4e0-52c0b9b988dc) created via API.
**Status:** PASS

## Stage 5: Pharmacy Dispense
**Action:** Attempt dispense without dual signer (Flag ON)
**Result:** `403` {"error":"System Policy Enforced: Biometric dual-signature is required for Schedule X Narcotics."}
**Action:** Attempt dispense with dual signer
**Result:** `200` {"message":"Dual-signature verified. Dispensed Inj Morphine 10mg via Pneumatic Tube.","prescription":{"id":"00cb694f-4573-4817-ade3-a41aac6d6a2b","uhid":"UHID-E2E-1790379835641","patientName":"E2E Test Patient","bed":"Unknown","ward":"General Ward","medicationName":"Inj Morphine 10mg","dosage":"10mg","frequency":"SOS","route":"IV","doctorName":"Dr. House","urgency":"STAT","narcoticVault":true,"status":"in_transit_tube","tubeStation":null,"orderTime":"05:13 am","dispatchTime":"5:13:55 am","authorizedBy":"Dr. House","createdAt":"2026-09-25T23:43:55.886Z","updatedAt":"2026-09-25T23:43:55.934Z"}}
**Action:** Attempt duplicate dispense
**Result:** `200` {"message":"Prescription 00cb694f-4573-4817-ade3-a41aac6d6a2b already dispensed (in_transit_tube)","prescription":{"id":"00cb694f-4573-4817-ade3-a41aac6d6a2b","uhid":"UHID-E2E-1790379835641","patientName":"E2E Test Patient","bed":"Unknown","ward":"General Ward","medicationName":"Inj Morphine 10mg","dosage":"10mg","frequency":"SOS","route":"IV","doctorName":"Dr. House","urgency":"STAT","narcoticVault":true,"status":"in_transit_tube","tubeStation":null,"orderTime":"05:13 am","dispatchTime":"5:13:55 am","authorizedBy":"Dr. House","createdAt":"2026-09-25T23:43:55.886Z","updatedAt":"2026-09-25T23:43:55.934Z"}}
**Action:** Attempt dispense non-narcotic without dual signer
**Result:** `200` {"message":"Dispensed Paracetamol 500mg via Pneumatic Tube.","prescription":{"id":"6dfb8cab-4885-446f-a4e0-52c0b9b988dc","uhid":"UHID-E2E-1790379835641","patientName":"E2E Test Patient","bed":"Unknown","ward":"General Ward","medicationName":"Paracetamol 500mg","dosage":"500mg","frequency":"TID","route":"PO","doctorName":"Dr. House","urgency":"Routine","narcoticVault":false,"status":"in_transit_tube","tubeStation":null,"orderTime":"05:13 am","dispatchTime":"5:13:55 am","authorizedBy":"Pharm Bob","createdAt":"2026-09-25T23:43:55.903Z","updatedAt":"2026-09-25T23:43:55.961Z"}}
**Status:** PASS

## Stage 6: Turnover/Bed continuity
**Action:** `GET /api/beds`
**Result:** Bed ICU-01 is OCCUPIED/NOT AVAILABLE (PASS) in API.
**Status:** PASS

## Stage 7: Billing
**Action:** `POST /api/invoices` for Patient Billing
**Action:** `PATCH /api/billing/b6a7c9c1-0676-437d-8a13-90df248db069` with status='cleared' and totalAmount=100
**Result:** DB totalAmount is 5000 (should be 5000, un-altered by PATCH).
**Action:** `POST /api/billing/b6a7c9c1-0676-437d-8a13-90df248db069/receipt` (twice)
**Result 1:** `200` Receipt No: RCP-2026-8545
**Result 2:** `200` Receipt No: RCP-2026-8545
**Status:** PASS

## Stage 8: Discharge
**Action:** `POST /api/patients/UHID-E2E-1790379835641/discharge`
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
