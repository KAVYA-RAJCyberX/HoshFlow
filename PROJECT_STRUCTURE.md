# Hosflow Project Structure & Audit Guide

Welcome to **Hosflow** – the Clinical OS and Hospital Flow Intelligence platform. This document serves as a guide to the repository, explaining exactly what lives where and how the different architectural layers interact.

## 📂 Root Directory Overview

| Directory / File | Purpose |
|------------------|---------|
| `src/` | **Frontend React Application**. Contains the UI, state management, API hooks, and components. |
| `server.ts` | **Backend Express Server**. The main entry point for the REST API serving the frontend. Handles business logic, database queries, and Gemini integrations. |
| `prisma/` | **Database Layer**. Contains `schema.prisma` mapping out the PostgreSQL database tables (e.g., Users, Patients, Encounters, Invoices) and seed scripts. |
| `docs/` | **Project Documentation**. Contains system diagrams and technical audit reports. |
| `tests/` | **End-to-End Tests**. Playwright tests used for validating critical hospital workflows. |
| `scripts/` | Internal helper scripts. |
| `.agents/` | **Antigravity Customizations**. Local workspace tools, skills (like Archify for diagrams), and rules specific to this repository. |

---

## 🏗️ `src/` - The Frontend (React/Vite)

The `src` directory powers the user interface of Hosflow. It is structured to separate views, data fetching, and reusable components cleanly.

```text
src/
├── components/       # Reusable UI elements
│   ├── views/        # The core hospital screens (e.g. BillingDeskView, DischargeHubView)
│   ├── ui/           # Generic building blocks (Buttons, Modals, Badges)
│   └── shared/       # Domain-specific components (PatientCard, StatusBadge)
├── api/              # Functions that directly call the backend /api routes
├── hooks/            # Custom React hooks (e.g., useMutation wrappers, data fetching logic)
├── types/            # TypeScript interfaces modeling the frontend state (Invoice, Patient)
├── services/         # Client-side business logic and utility services
├── utils/            # Helper formatting functions (dates, currency, strings)
├── App.tsx           # The root component managing routing and overall layout
└── main.tsx          # React application mount point
```

### 📺 Key Views (`src/components/views/`)
- **`LoginPortalView.tsx`**: System entry point handling JWT authentication.
- **`PatientPortalView.tsx` / `PatientSelfCheckInView.tsx`**: Patient-facing interfaces.
- **`ReceptionIntakeView.tsx`**: Registration and ward bed assignment.
- **`ClinicalStationView.tsx`**: Doctor & Nurse operations (vitals, diagnostics orders).
- **`BillingDeskView.tsx`**: Invoice generation, TPA claim processing, and co-pay collection.
- **`DischargeHubView.tsx`**: Gate pass issuance and physical discharge tracking.
- **`HousekeepingView.tsx`**: Real-time bed cleaning and turnover management.
- **`ExecutiveAdminView.tsx` / `SystemGovernanceView.tsx`**: High-level operational analytics and audit logs.

---

## ⚙️ `server.ts` - The Backend API

The backend is built as a single file `server.ts` running Express.js. It connects the frontend to the Prisma Postgres database and external services like Gemini.

- **`/api/auth/*`**: Login and JWT issuance.
- **`/api/patients/*`**: Patient registration, encounters, and vital signs.
- **`/api/invoices/*`**: Financial ledgers and TPA claim statuses.
- **`/api/beds/*`**: Real-time status for the Housekeeping/Bed Matrix.
- **`/api/analytics/*`**: Aggregation endpoints for the executive dashboards.
- **`/api/gemini/*`**: AI integration for clinical notes summarization and coding.

---

## 📚 `docs/` - Documentation & Diagrams

To keep the root clean, all reports and visual diagrams have been organized here:

- **`docs/diagrams/`**: Contains generated Archify diagrams. 
  - *e.g., `hosflow-full-app-workflow.html` (The massive end-to-end patient journey map).*
  - *e.g., `hosflow-architecture-rendered.html` (System components and database connections).*
- **`docs/reports/`**: Contains recent system audit and end-to-end testing reports.
  - *e.g., `full_functional_audit_report.md` (Tracks fake data migrations to real DB).*
  - *e.g., `e2e_backend_audit_report.md` (Tracks API endpoint validation).*

---

## 🚀 How to Run the App

- **Run Frontend**: `npm run dev` (Starts Vite on port 3000)
- **Run Backend**: `npm run backend` (Starts Express server on port 3001 using `tsx`)
- **Run Tests**: `npx playwright test`
- **Database Studio**: `npx prisma studio` (Visual editor for Postgres)
