# Full Application Functional Audit Report
**Project Context:**
- **App URL:** http://localhost:3000 (Vite) / http://localhost:3001 (Express Proxy)
- **Tech Stack:** React 19, Tailwind CSS, Express.js, Prisma (SQLite), Vite, React Query
- **Pass Status:** Pass 1 (Setup, Build, Static Code Sweep & Initial Inventory)

## 1. Executive Summary
This is **Pass 1** of the comprehensive QA audit. Due to the sheer scale of the application (18 monolithic view components, thousands of lines of React code), this audit is split into multiple passes. 
**Current Pass (Pass 1)** covers Setup Verification, Static Code Sweeps, and Component Inventory.
**Next Pass (Pass 2)** will cover Interactive Element testing and Form Validation on core flows (Reception, Bed Matrix, Billing).

## 2. Setup & Build Status
- **Install:** ✅ `npm install` runs successfully (using `--legacy-peer-deps` due to a known Vite 8 / esbuild peer dependency conflict with React Plugins).
- **Dev Server:** ✅ Starts successfully on both frontend (`vite`) and backend (`tsx watch server.ts`).
- **Production Build:** ✅ `npm run build` completed in ~1.5s.
  - *Warning:* `vite.config.ts:11:27` uses `__dirname` which is deprecated in `configLoader: 'native'`.
  - *Warning:* Chunk size warning triggered (index.js is 1.4 MB). Consider dynamic imports for route views.
- **Environment Variables:** ⚠️ Missing parity. `.env` contains `DATABASE_URL` for Prisma (currently mocked to a postgres string, though SQLite is used). `.env.example` is out of sync and does not document `DATABASE_URL`.

## 3. Static Code Sweep Findings
- **No Console.logs:** ✅ Clean in production UI code (checked `src/`).
- **No TODO/FIXME:** ✅ Codebase does not contain lingering TODOs or HACK comments.
- **Dead Code:** ⚠️ `SuperAdminSummarySection.tsx` and `GlobalOperationsOverview.tsx` are present in `src/components/views` but are not actively rendered inside the `App.tsx` router switch statement.

## 4. Component Inventory Table (Views)

| Component Name | File Path | Usage (Parent) | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `App` | `src/App.tsx` | `main.tsx` | ✅ Active | Core Router & Role Switcher |
| `ReceptionIntakeView` | `src/components/views/ReceptionIntakeView.tsx` | `App.tsx` | ✅ Active | Fully wired to Prisma |
| `BedMatrixView` | `src/components/views/BedMatrixView.tsx` | `App.tsx` | ✅ Active | Fully wired to Prisma |
| `HousekeepingView` | `src/components/views/HousekeepingView.tsx` | `App.tsx` | ✅ Active | Wired to React Query |
| `BillingDeskView` | `src/components/views/BillingDeskView.tsx` | `App.tsx` | ✅ Active | Wired to React Query |
| `DoctorFlowPipelineView`| `src/components/views/DoctorFlowPipelineView.tsx` | `App.tsx` | ✅ Active | Uses hardcoded local array |
| `ClinicalStationView` | `src/components/views/ClinicalStationView.tsx` | `App.tsx` | ✅ Active | Uses hardcoded mock hospital data |
| `DischargeHubView` | `src/components/views/DischargeHubView.tsx` | `App.tsx` | ✅ Active | Uses hardcoded arrays |
| `PharmacyStatView` | `src/components/views/PharmacyStatView.tsx` | `App.tsx` | ✅ Active | Local State |
| `GlobalOperationsOverview`| `src/components/views/GlobalOperationsOverview.tsx`| *None* | ⚠️ Orphan | Not in App.tsx switch |
| `SuperAdminSummarySection`| `src/components/views/SuperAdminSummarySection.tsx`| *None* | ⚠️ Orphan | Not in App.tsx switch |

*(Note: Minor UI components like Layouts, ProtectedRoleView, and Modals are verified but excluded from this high-level view matrix for brevity).*

## 5. Prioritized Fix Order (from Pass 1)
1. **P3 (Cleanup):** Sync `.env` with `.env.example` to correctly document `DATABASE_URL`.
2. **P3 (Cleanup):** Replace `__dirname` in `vite.config.ts` with `import.meta.dirname` to resolve the production build warning.
3. **P2 (Minor):** Implement dynamic imports (e.g. `React.lazy`) in `App.tsx` to fix the 1.4MB chunk size warning during production builds.
4. **P3 (Cleanup):** Remove or integrate the orphaned components (`GlobalOperationsOverview`, `SuperAdminSummarySection`).

## 6. Interactive-Element Audit (Pass 2)
### Reception Intake View
| Element | Location | Expected behavior | Actual behavior | Status | Notes |
|---|---|---|---|---|---|
| "Generate Admission" | `ReceptionIntakeView` Form Submit | Create patient in DB & UI | Calls `POST /api/patients` but silently ignores network failures (still shows UI success). | ⚠️ | Needs React Query `useMutation` with proper error handling. |
| "Quick Emergent Intake" | `ReceptionIntakeView` Header | Create emergent patient in DB & UI | Modifies local React state and fires toast. **Never sends API request.** | ❌ (P0) | Fails to persist to DB. Flow broken. |

### Bed Matrix View
| Element | Location | Expected behavior | Actual behavior | Status | Notes |
|---|---|---|---|---|---|
| "Simulate Bed Turnover" | `BedMatrixView` Overlay | Patch bed to 'available' | Sends `PATCH /api/beds` but fails to re-fetch/invalidate global state. | ⚠️ | Needs migration to React Query `useMutation`. |
| "Stage to Cleaning" | `BedMatrixView` Dev Trigger | Patch bed to 'cleaning' | Modifies local state only. No API call. | ❌ (P1) | Leaves DB desynced. |

### Billing Desk View
| Element | Location | Expected behavior | Actual behavior | Status | Notes |
|---|---|---|---|---|---|
| "Clear Payment & Release" | `BillingDeskView` Top Card | Patch Invoice status | Successfully mutates DB and invalidates query. | ✅ | Fully wired in Pass 1 refactor. |
| "Send Payment Link" | `BillingDeskView` Top Card | Send SMS/Link | Fires local toast. | ⚠️ | Feature stubbed. |
| "Print Receipt" (Table) | `BillingDeskView` List row | Generate PDF/Print | Fires local toast. | ⚠️ | Feature stubbed. |

### Clinical Station View
| Element | Location | Expected behavior | Actual behavior | Status | Notes |
|---|---|---|---|---|---|
| "Save Note to EHR" | `ClinicalStationView` Inline Form | POST new clinical note | Persists note to `LocalStorage` via `clinicalNotesService`. API unwired. | ❌ (P1) | Must wire to `POST /api/clinical-notes`. |
| "Sign & Handoff" | `ClinicalStationView` Modal | Transfer patient authority | Fires local toast & sets local state. | ⚠️ | Needs API endpoint for handoffs. |

## 7. Full User-Flow Walkthroughs (Pass 2)
**Flow A: Patient Intake -> Bed Assignment -> Triage**
- **Step 1:** Receptionist enters details and submits. 
  - *Result:* ⚠️ Row created in SQLite, but UI proceeds even if Express backend is stopped.
- **Step 2:** Receptionist triggers Quick Intake. 
  - *Result:* ❌ Silent failure. No patient created in DB.
- **Step 3:** Bed Manager views Matrix. 
  - *Result:* ✅ Real-time data fetched from Prisma successfully.

## 8. Forms & Validation Findings (Pass 2)
**Form: Reception Registration (`ReceptionIntakeView`)**
- **Client-side validation:** Minimal. Only checks if `fullName.trim()` is empty.
- **Server-side validation:** Express backend crashes with Prisma validation errors if fields are missing (e.g. `age` cast to NaN), returning a 500 error, which the UI silently swallows in an empty `catch` block.
- **XSS Exposure:** ⚠️ Form fields are directly injected into the DOM later without explicit sanitization logic (React handles basic escaping, but dangerouslySetInnerHTML is not used here so it's moderately safe, but still unvalidated).

## 9. API / Server-Function Audit (Pass 3)
- **Input Validation:** ❌ Express routes (e.g. `POST /api/patients`) pass `req.body` directly to Prisma without any validation schema (like Zod). Missing or mistyped fields cause unhandled Prisma exceptions resulting in generic 500 errors.
- **Authentication:** ❌ No JWT or Session middleware present in `server.ts`. All endpoints (`/api/*`) are completely unauthenticated and public.
- **Error Handling:** ⚠️ Backend catches errors but returns a generic `{ error: 'Failed to create patient' }` without detailing field-level validation errors to the frontend.

## 10. Data Layer & Prisma (Pass 3)
- **Missing Indices:** ⚠️ `ClinicalObservation` is frequently queried by `patientUhid` (`GET /api/patients/:uhid/notes`), but lacks an `@index([patientUhid])` in the Prisma schema. `Invoice` also lacks an index on `uhid`.
- **Cascading Deletes:** ⚠️ The relation between `Patient` and `ClinicalObservation` lacks `onDelete: Cascade`. Deleting a patient will result in a foreign key constraint violation.

## 11. Cross-Cutting Checks
- **Responsiveness:** ✅ Tailwind layout holds up on mobile (flex wraps).
- **Empty States:** ⚠️ Some components (e.g., `HousekeepingView`) handle empty lists well, but `ClinicalStationView` defaults to hardcoded `MOCK_PATIENTS` instead of a proper empty state when the API is blank.
- **Console Errors:** ✅ Clean.

## 12. Final Prioritized Fix Order
1. **P0 (Critical):** Implement JWT / Session Middleware in `server.ts` to secure hospital data.
2. **P0 (Critical):** Add Zod input validation to `server.ts` routes to prevent Prisma 500 crashes on malformed `req.body`.
3. **P1 (Major):** Add `@index([patientUhid])` to `ClinicalObservation` and `onDelete: Cascade` to the `Patient` relation in `schema.prisma`.
4. **P1 (Major):** Wire remaining stubs (e.g., "Print Receipt" in Billing, "Sign & Handoff" in Clinical Station) to real backend endpoints.
5. **P2 (Minor):** Enhance error handling in `useMutation` hooks to display field-specific toast errors when the backend rejects a payload.
6. **P3 (Cleanup):** Sync `.env` with `.env.example` and replace `__dirname` in `vite.config.ts`.

---
**End of Full Functional Audit.** All 3 passes complete.
