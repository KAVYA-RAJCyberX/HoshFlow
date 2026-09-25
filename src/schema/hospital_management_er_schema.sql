-- ============================================================================
-- FULL-STACK HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Multi-Tenant Database Schema (ER Model - PostgreSQL / MySQL Compatible)
-- ============================================================================
-- Architecture: Modular Multi-Hospital Tenancy
-- Description: Supports Super Admin network governance, per-hospital isolation,
--              role-based access control (RBAC), clinical operations, and resource scheduling.
-- ============================================================================

-- EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'HOSPITAL_ADMIN',
    'DOCTOR',
    'NURSE',
    'STAFF',
    'BED_MANAGER',
    'BILLING',
    'PHARMACY'
);

CREATE TYPE hospital_tier AS ENUM ('TIER_1_QUATERNARY', 'TIER_2_TERTIARY', 'SECONDARY_CARE', 'CLINIC');
CREATE TYPE department_type AS ENUM ('ICU', 'OPD', 'EMERGENCY', 'SURGICAL', 'CARDIOLOGY', 'PEDIATRICS', 'ONCOLOGY', 'RADIOLOGY', 'GENERAL_WARD');
CREATE TYPE shift_type AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'ON_CALL');
CREATE TYPE patient_acuity AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EMERGENT');
CREATE TYPE admission_status AS ENUM ('ADMITTED', 'UNDER_OBSERVATION', 'DISCHARGE_PLANNED', 'DISCHARGED', 'TRANSFERRED');
CREATE TYPE ot_status AS ENUM ('READY_FOR_CASE', 'SURGERY_IN_PROGRESS', 'STERILIZING_TURNOVER', 'MAINTENANCE');
CREATE TYPE equipment_status AS ENUM ('AVAILABLE', 'BOOKED', 'IN_USE', 'CALIBRATION', 'MAINTENANCE');

-- ----------------------------------------------------------------------------
-- 1. HOSPITALS (Multi-Tenant Core Table)
-- ----------------------------------------------------------------------------
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,               -- e.g. "HC-PUNE-01"
    name VARCHAR(255) NOT NULL,
    campus VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    emergency_hotline VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    tier hospital_tier DEFAULT 'TIER_1_QUATERNARY',
    accreditation VARCHAR(100) DEFAULT 'NABH & JCI Accredited',
    total_beds INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for multi-tenant lookup performance
CREATE INDEX idx_hospitals_code ON hospitals(code);
CREATE INDEX idx_hospitals_active ON hospitals(is_active);

-- ----------------------------------------------------------------------------
-- 2. USERS & AUTHENTICATION (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE, -- NULL for global SUPER_ADMIN
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone_number VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_hospital_role ON users(hospital_id, role);

-- ----------------------------------------------------------------------------
-- 3. DEPARTMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    dept_type department_type NOT NULL,
    head_of_department_id UUID REFERENCES users(id) ON DELETE SET NULL,
    floor_location VARCHAR(100) NOT NULL,
    bed_capacity INT NOT NULL DEFAULT 20,
    emergency_contact VARCHAR(50),
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_hospital_code UNIQUE(hospital_id, code)
);

CREATE INDEX idx_departments_hospital ON departments(hospital_id);

-- ----------------------------------------------------------------------------
-- 4. DOCTORS (Extended Clinical Profile)
-- ----------------------------------------------------------------------------
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    medical_license_number VARCHAR(64) UNIQUE NOT NULL,
    specialty VARCHAR(128) NOT NULL,
    qualification VARCHAR(255) NOT NULL,            -- e.g. "MD, DM (Cardiology), FACC"
    opd_room_number VARCHAR(32) NOT NULL,
    opd_timing VARCHAR(128) NOT NULL,               -- e.g. "Mon-Fri 09:00 - 14:00"
    consultation_fee NUMERIC(10, 2) DEFAULT 800.00,
    max_daily_patients INT DEFAULT 30,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_hospital_dept ON doctors(hospital_id, department_id);

-- ----------------------------------------------------------------------------
-- 5. NURSES & PARAMEDICAL STAFF
-- ----------------------------------------------------------------------------
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    staff_category VARCHAR(64) NOT NULL,            -- 'Nurse', 'Head Nurse', 'Technician', 'Pharmacist', 'Admin'
    registration_council_id VARCHAR(64),
    assigned_shift shift_type DEFAULT 'MORNING',
    floor_wing VARCHAR(64),
    status VARCHAR(32) DEFAULT 'ON_DUTY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_hospital_dept ON staff(hospital_id, department_id);

-- ----------------------------------------------------------------------------
-- 6. PATIENTS
-- ----------------------------------------------------------------------------
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    uhid VARCHAR(64) NOT NULL,                      -- Unique Hospital Identification Number
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(16) NOT NULL,
    blood_group VARCHAR(8) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    emergency_contact_name VARCHAR(128),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    national_id VARCHAR(64),
    insurance_provider VARCHAR(128),
    insurance_policy_number VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_patient_hospital_uhid UNIQUE(hospital_id, uhid)
);

CREATE INDEX idx_patients_uhid ON patients(uhid);
CREATE INDEX idx_patients_hospital ON patients(hospital_id);

-- ----------------------------------------------------------------------------
-- 7. PATIENT ADMISSIONS & CLINICAL STATUS
-- ----------------------------------------------------------------------------
CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    attending_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    bed_number VARCHAR(32) NOT NULL,
    admit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE,
    status admission_status DEFAULT 'ADMITTED',
    acuity patient_acuity DEFAULT 'MODERATE',
    primary_diagnosis TEXT NOT NULL,
    icd10_code VARCHAR(16),
    discharge_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admissions_hospital_status ON admissions(hospital_id, status);

-- ----------------------------------------------------------------------------
-- 8. APPOINTMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason_for_visit TEXT,
    status VARCHAR(32) DEFAULT 'SCHEDULED',         -- 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    token_number INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. RESOURCE SCHEDULING: OPERATING THEATRES (OT)
-- ----------------------------------------------------------------------------
CREATE TABLE operating_theatres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,                      -- e.g. "OT-1 (Cardio-Thoracic Hybrid)"
    suite_type VARCHAR(64) NOT NULL,                -- e.g. "Cardiac", "Neuro", "Ortho", "Robotic"
    floor_wing VARCHAR(64) NOT NULL,
    current_status ot_status DEFAULT 'READY_FOR_CASE',
    turnover_time_minutes INT DEFAULT 25,
    hepa_filter_air_cycles INT DEFAULT 28,
    lead_surgeon_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    active_case_summary VARCHAR(255),
    estimated_case_finish TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operating_theatre_id UUID NOT NULL REFERENCES operating_theatres(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    lead_surgeon_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    anesthesiologist_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    procedure_name VARCHAR(255) NOT NULL,
    urgency_level VARCHAR(32) DEFAULT 'ELECTIVE',   -- 'ELECTIVE', 'URGENT', 'EMERGENCY_CODE_RED'
    status VARCHAR(32) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. RESOURCE SCHEDULING: BIOMEDICAL EQUIPMENT FLEET & BOOKINGS
-- ----------------------------------------------------------------------------
CREATE TABLE hospital_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    equipment_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,                     -- e.g. "Siemens 3T MRI Magnetom Vida"
    category VARCHAR(64) NOT NULL,                  -- 'Radiology', 'ICU Life Support', 'Surgical Robotic', 'Cardiology'
    current_location VARCHAR(128) NOT NULL,
    status equipment_status DEFAULT 'AVAILABLE',
    serial_number VARCHAR(128) UNIQUE NOT NULL,
    last_calibration_date DATE,
    next_calibration_due DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES hospital_equipment(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    booked_from TIMESTAMP WITH TIME ZONE NOT NULL,
    booked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose TEXT NOT NULL,
    allocated_room_or_ot VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 11. RESOURCE SCHEDULING: STAFF ROSTER & SHIFTS
-- ----------------------------------------------------------------------------
CREATE TABLE staff_shift_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_type shift_type NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    station_bay VARCHAR(64),
    is_covered BOOLEAN DEFAULT TRUE,
    supervisor_sign_off BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_shift UNIQUE (user_id, shift_date, shift_type)
);

CREATE INDEX idx_staff_shifts_date_dept ON staff_shift_schedules(hospital_id, shift_date, department_id);

-- ----------------------------------------------------------------------------
-- 12. AUDIT TRAIL & SYSTEM COMPLIANCE
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(128) NOT NULL,
    resource_affected VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45),
    status VARCHAR(32) DEFAULT 'VERIFIED',
    severity VARCHAR(16) DEFAULT 'info',
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_hospital_created ON audit_logs(hospital_id, created_at DESC);
