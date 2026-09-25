import React, { useState, useEffect, useMemo } from 'react';
import { ViewType } from '../../types';
import {
  hospitalManagementService,
  HospitalRecord,
  DoctorRecord,
  StaffRecord,
  PatientEntity,
  DepartmentRecord,
} from '../../services/hospitalManagementService';
import { GlobalOperationsOverview } from './GlobalOperationsOverview';
import { SuperAdminSummarySection } from './SuperAdminSummarySection';
import { downloadHospitalCSV } from '../../utils/csvExport';

interface SuperAdminPortalViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const SuperAdminPortalView: React.FC<SuperAdminPortalViewProps> = ({
  onNavigate,
  onTriggerToast,
}) => {
  // Top Tabs - Dedicated 'Global Operations Overview' and 'Hospital Management'
  const [activeTab, setActiveTab] = useState<'global_operations' | 'hospital_management' | 'hospital_admin_workspace' | 'schema_and_api'>('global_operations');
  
  // Hospital Admin Workspace Sub-tab
  const [adminSubTab, setAdminSubTab] = useState<'doctors' | 'staff' | 'patients' | 'departments'>('doctors');

  // Architecture Sub-tab
  const [archSubTab, setArchSubTab] = useState<'er_model' | 'sql_ddl' | 'prisma' | 'rest_api'>('er_model');

  // Reactive State from service
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('HOSP-001');

  // Search & Filter state
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // MODAL STATES
  // 1. Hospital Modals
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalRecord | null>(null);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [targetHospitalForAdmin, setTargetHospitalForAdmin] = useState<HospitalRecord | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', phone: '' });

  const [hospitalFormData, setHospitalFormData] = useState<{
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
    tier: HospitalRecord['tier'];
    accreditation: string;
    totalBeds: number;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    campus: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    contactPhone: '+91 20 6000 0000',
    emergencyHotline: '108',
    contactEmail: 'admin@hospital.org',
    tier: 'TIER_1_QUATERNARY',
    accreditation: 'NABH Digital Certified',
    totalBeds: 200,
    isActive: true,
  });

  // Edit Hospital form state
  const [editHospitalForm, setEditHospitalForm] = useState<{
    name: string;
    campus: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    contactPhone: string;
    emergencyHotline: string;
    contactEmail: string;
    tier: HospitalRecord['tier'];
    accreditation: string;
    totalBeds: number;
    isActive: boolean;
  }>({
    name: '',
    campus: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    contactPhone: '',
    emergencyHotline: '',
    contactEmail: '',
    tier: 'TIER_1_QUATERNARY',
    accreditation: '',
    totalBeds: 150,
    isActive: true,
  });

  // 2. Doctor Modals
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    specialty: 'Cardiology',
    medicalLicense: 'MCI-2026-',
    qualification: 'MD, DM',
    department: 'Interventional Cardiology',
    opdRoom: 'Room 301',
    opdTiming: 'Mon-Fri 09:00 - 13:00',
    consultationFee: 1000,
    contactPhone: '+91 98000 11111',
    email: '',
    status: 'ACTIVE' as const,
  });

  // 3. Staff Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    roleType: 'Staff Nurse' as const,
    department: 'Intensive Critical Care Pod',
    assignedShift: 'Morning' as const,
    contactPhone: '+91 98000 22222',
    email: '',
    status: 'ON_DUTY' as const,
    assignedWard: 'Ward 3',
  });

  // 4. Patient Modals
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<PatientEntity | null>(null);
  const [patientFormData, setPatientFormData] = useState({
    uhid: `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    age: 45,
    gender: 'Male' as const,
    bloodGroup: 'B+ve',
    department: 'General & Internal Medicine',
    attendingDoctor: 'Dr. Ananya Rao',
    admitDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: 'Admitted' as const,
    acuity: 'Moderate' as const,
    roomBed: 'Bed W3-08',
    contactPhone: '+91 98000 33333',
    emergencyContact: 'Family Contact (+91 98000 33334)',
    insuranceProvider: 'Star Health Allied Insurance',
  });

  // 5. Department Modals
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    code: 'ICU-2',
    name: 'Neonatal & Pediatric ICU',
    deptType: 'ICU' as const,
    headOfDept: 'Dr. Preeti Deshpande',
    floorLocation: 'Tower B Floor 1',
    bedCapacity: 20,
    occupiedBeds: 12,
    emergencyContact: 'Ext 112',
    isOperational: true,
  });

  // 6. API Tester State
  const [apiTestResponse, setApiTestResponse] = useState<string | null>(null);
  const [apiTestingEndpoint, setApiTestingEndpoint] = useState<string>('');

  // Sync state with HospitalManagementService
  useEffect(() => {
    const sync = () => {
      const allH = hospitalManagementService.getAllHospitals();
      setHospitals(allH);
      if (!allH.some((h) => h.id === selectedHospitalId)) {
        setSelectedHospitalId(allH[0]?.id || 'HOSP-001');
      }
    };
    sync();
    const unsub = hospitalManagementService.subscribe(sync);
    return () => unsub();
  }, [selectedHospitalId]);

  // Network Analytics calculation
  const networkAnalytics = useMemo(() => {
    return hospitalManagementService.getNetworkAnalytics();
  }, [hospitals]);

  // Selected hospital data
  const currentHospital = useMemo(() => {
    return hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
  }, [hospitals, selectedHospitalId]);

  const doctorsList = useMemo(() => {
    return hospitalManagementService.getDoctors(selectedHospitalId);
  }, [selectedHospitalId, hospitals]);

  const staffList = useMemo(() => {
    return hospitalManagementService.getStaff(selectedHospitalId);
  }, [selectedHospitalId, hospitals]);

  const patientsList = useMemo(() => {
    return hospitalManagementService.getPatients(selectedHospitalId);
  }, [selectedHospitalId, hospitals]);

  const departmentsList = useMemo(() => {
    return hospitalManagementService.getDepartments(selectedHospitalId);
  }, [selectedHospitalId, hospitals]);

  // System-wide clinical staff and doctor records for executive reporting
  const allDoctors = useMemo(() => {
    return hospitalManagementService.getAllDoctors();
  }, [hospitals]);

  const allStaff = useMemo(() => {
    return hospitalManagementService.getAllStaff();
  }, [hospitals]);

  // CSV Export Handlers
  const handleExportAllHospitals = () => {
    if (hospitals.length === 0) {
      onTriggerToast('No registered hospitals to export.');
      return;
    }
    downloadHospitalCSV(hospitals, 'enterprise_hospitals_audit_full');
    onTriggerToast(`Exported all ${hospitals.length} registered hospital records as CSV.`);
  };

  const handleExportFilteredHospitals = () => {
    if (filteredHospitals.length === 0) {
      onTriggerToast('No matching hospitals in current filter to export.');
      return;
    }
    downloadHospitalCSV(filteredHospitals, 'enterprise_hospitals_audit_filtered');
    onTriggerToast(`Exported ${filteredHospitals.length} filtered hospital records as CSV.`);
  };

  // Filtering
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchSearch =
        h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        h.code.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        h.city.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        h.campus.toLowerCase().includes(hospitalSearch.toLowerCase());
      
      const matchStatus =
        hospitalStatusFilter === 'all' ||
        (hospitalStatusFilter === 'active' && h.isActive) ||
        (hospitalStatusFilter === 'deactivated' && !h.isActive);

      return matchSearch && matchStatus;
    });
  }, [hospitals, hospitalSearch, hospitalStatusFilter]);

  const filteredDoctors = doctorsList.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.medicalLicense.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchDept = selectedDeptFilter === 'ALL' || d.department.includes(selectedDeptFilter);
    return matchSearch && matchDept;
  });

  const filteredStaff = staffList.filter((s) => {
    return s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.roleType.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(staffSearch.toLowerCase());
  });

  const filteredPatients = patientsList.filter((p) => {
    return p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.uhid.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.attendingDoctor.toLowerCase().includes(patientSearch.toLowerCase());
  });

  /* -------------------------------------------------------------------------- */
  /* HOSPITAL CRUD ACTIONS                                                      */
  /* -------------------------------------------------------------------------- */

  const handleRegisterHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalFormData.name.trim() || !hospitalFormData.code.trim()) {
      onTriggerToast('Please enter hospital name and code.');
      return;
    }
    const created = hospitalManagementService.registerHospital({
      code: hospitalFormData.code.toUpperCase(),
      name: hospitalFormData.name,
      campus: hospitalFormData.campus,
      address: hospitalFormData.address,
      city: hospitalFormData.city,
      state: hospitalFormData.state,
      postalCode: hospitalFormData.postalCode,
      contactPhone: hospitalFormData.contactPhone,
      emergencyHotline: hospitalFormData.emergencyHotline,
      contactEmail: hospitalFormData.contactEmail,
      tier: hospitalFormData.tier,
      accreditation: hospitalFormData.accreditation,
      totalBeds: Number(hospitalFormData.totalBeds),
      isActive: hospitalFormData.isActive,
    });
    setShowAddHospitalModal(false);
    setSelectedHospitalId(created.id);
    onTriggerToast(`Hospital [${created.name}] successfully registered into system.`);
  };

  const handleOpenEditHospital = (hosp: HospitalRecord) => {
    setEditingHospital(hosp);
    setEditHospitalForm({
      name: hosp.name,
      campus: hosp.campus,
      address: hosp.address,
      city: hosp.city,
      state: hosp.state,
      postalCode: hosp.postalCode,
      contactPhone: hosp.contactPhone,
      emergencyHotline: hosp.emergencyHotline,
      contactEmail: hosp.contactEmail,
      tier: hosp.tier,
      accreditation: hosp.accreditation,
      totalBeds: hosp.totalBeds,
      isActive: hosp.isActive,
    });
  };

  const handleUpdateHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;
    hospitalManagementService.updateHospital(editingHospital.id, {
      name: editHospitalForm.name,
      campus: editHospitalForm.campus,
      address: editHospitalForm.address,
      city: editHospitalForm.city,
      state: editHospitalForm.state,
      postalCode: editHospitalForm.postalCode,
      contactPhone: editHospitalForm.contactPhone,
      emergencyHotline: editHospitalForm.emergencyHotline,
      contactEmail: editHospitalForm.contactEmail,
      totalBeds: Number(editHospitalForm.totalBeds),
      tier: editHospitalForm.tier,
      accreditation: editHospitalForm.accreditation,
      isActive: editHospitalForm.isActive,
    });
    setEditingHospital(null);
    onTriggerToast(`Hospital records updated for ${editHospitalForm.name}.`);
  };

  const handleToggleDeactivateHospital = (hosp: HospitalRecord) => {
    const isNowActive = hospitalManagementService.toggleHospitalActive(hosp.id);
    if (!isNowActive) {
      onTriggerToast(`Hospital [${hosp.name}] has been DEACTIVATED. New patient intakes suspended.`);
    } else {
      onTriggerToast(`Hospital [${hosp.name}] has been REACTIVATED and operational.`);
    }
  };

  const handleDeleteHospital = (hosp: HospitalRecord) => {
    if (hospitals.length <= 1) {
      onTriggerToast('Cannot delete the only registered hospital.');
      return;
    }
    const confirmed = window.confirm(`Permanently decommission and delete hospital: ${hosp.name}?`);
    if (confirmed) {
      hospitalManagementService.deleteHospital(hosp.id);
      onTriggerToast(`Hospital ${hosp.name} decommissioned from network.`);
    }
  };

  const handleAssignAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHospitalForAdmin) return;
    hospitalManagementService.assignHospitalAdmin(targetHospitalForAdmin.id, {
      name: adminFormData.name,
      email: adminFormData.email,
      phone: adminFormData.phone,
    });
    setShowAssignAdminModal(false);
    setTargetHospitalForAdmin(null);
    onTriggerToast(`Assigned ${adminFormData.name} as Hospital Admin for ${targetHospitalForAdmin.name}.`);
  };

  const handleRevokeAdmin = (hosp: HospitalRecord) => {
    const confirmed = window.confirm(`Revoke Hospital Admin privileges for ${hosp.hospitalAdminName}?`);
    if (confirmed) {
      hospitalManagementService.revokeHospitalAdmin(hosp.id);
      onTriggerToast(`Admin credentials revoked for ${hosp.name}.`);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* DOCTOR CRUD ACTIONS                                                        */
  /* -------------------------------------------------------------------------- */

  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.name.trim()) return;
    const doc = hospitalManagementService.addDoctor({
      hospitalId: selectedHospitalId,
      name: doctorFormData.name,
      specialty: doctorFormData.specialty,
      medicalLicense: doctorFormData.medicalLicense,
      qualification: doctorFormData.qualification,
      department: doctorFormData.department,
      opdRoom: doctorFormData.opdRoom,
      opdTiming: doctorFormData.opdTiming,
      consultationFee: Number(doctorFormData.consultationFee),
      contactPhone: doctorFormData.contactPhone,
      email: doctorFormData.email || `${doctorFormData.name.toLowerCase().replace(/[^a-z]/g, '')}@hospital.com`,
      status: doctorFormData.status,
    });
    setShowAddDoctorModal(false);
    onTriggerToast(`Doctor ${doc.name} successfully registered in ${doc.department}.`);
  };

  const handleDeleteDoctor = (id: string, name: string) => {
    hospitalManagementService.deleteDoctor(id);
    onTriggerToast(`Doctor ${name} removed from roster.`);
  };

  /* -------------------------------------------------------------------------- */
  /* STAFF CRUD ACTIONS                                                         */
  /* -------------------------------------------------------------------------- */

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name.trim()) return;
    const stf = hospitalManagementService.addStaff({
      hospitalId: selectedHospitalId,
      name: staffFormData.name,
      roleType: staffFormData.roleType,
      department: staffFormData.department,
      assignedShift: staffFormData.assignedShift,
      contactPhone: staffFormData.contactPhone,
      email: staffFormData.email || `${staffFormData.name.toLowerCase().replace(/[^a-z]/g, '')}@hospital.com`,
      status: staffFormData.status,
      assignedWard: staffFormData.assignedWard,
    });
    setShowAddStaffModal(false);
    onTriggerToast(`Staff member ${stf.name} onboarded.`);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    hospitalManagementService.deleteStaff(id);
    onTriggerToast(`Staff member ${name} record removed.`);
  };

  /* -------------------------------------------------------------------------- */
  /* PATIENT CRUD ACTIONS                                                       */
  /* -------------------------------------------------------------------------- */

  const handleRegisterPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientFormData.name.trim()) return;
    const pat = hospitalManagementService.registerPatient({
      hospitalId: selectedHospitalId,
      uhid: patientFormData.uhid,
      name: patientFormData.name,
      age: Number(patientFormData.age),
      gender: patientFormData.gender,
      bloodGroup: patientFormData.bloodGroup,
      department: patientFormData.department,
      attendingDoctor: patientFormData.attendingDoctor,
      admitDate: patientFormData.admitDate,
      status: patientFormData.status,
      acuity: patientFormData.acuity,
      roomBed: patientFormData.roomBed,
      contactPhone: patientFormData.contactPhone,
      emergencyContact: patientFormData.emergencyContact,
      insuranceProvider: patientFormData.insuranceProvider,
    });
    setShowAddPatientModal(false);
    setPatientFormData({
      uhid: `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      age: 45,
      gender: 'Male',
      bloodGroup: 'B+ve',
      department: 'General & Internal Medicine',
      attendingDoctor: 'Dr. Ananya Rao',
      admitDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Admitted',
      acuity: 'Moderate',
      roomBed: 'Bed W3-08',
      contactPhone: '+91 98000 33333',
      emergencyContact: 'Family Contact (+91 98000 33334)',
      insuranceProvider: 'Star Health Allied Insurance',
    });
    onTriggerToast(`Patient ${pat.name} admitted with UHID: ${pat.uhid}.`);
  };

  const handleDeletePatient = (id: string, name: string) => {
    hospitalManagementService.deletePatient(id);
    onTriggerToast(`Patient ${name} discharged / record archived.`);
  };

  /* -------------------------------------------------------------------------- */
  /* DEPARTMENT CRUD ACTIONS                                                    */
  /* -------------------------------------------------------------------------- */

  const handleAddDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.name.trim()) return;
    const dept = hospitalManagementService.addDepartment({
      hospitalId: selectedHospitalId,
      code: deptFormData.code.toUpperCase(),
      name: deptFormData.name,
      deptType: deptFormData.deptType,
      headOfDept: deptFormData.headOfDept,
      floorLocation: deptFormData.floorLocation,
      bedCapacity: Number(deptFormData.bedCapacity),
      occupiedBeds: Number(deptFormData.occupiedBeds),
      emergencyContact: deptFormData.emergencyContact,
      isOperational: deptFormData.isOperational,
    });
    setShowAddDeptModal(false);
    onTriggerToast(`Department ${dept.name} provisioned for ${currentHospital?.name}.`);
  };

  const handleDeleteDept = (id: string, name: string) => {
    hospitalManagementService.deleteDepartment(id);
    onTriggerToast(`Department ${name} decommissioned.`);
  };

  // Mock API Tester Runner
  const handleTestApiCall = (endpoint: string, method: string) => {
    setApiTestingEndpoint(endpoint);
    setApiTestResponse('Executing mock HTTP request against Express API route...');
    setTimeout(() => {
      if (endpoint.includes('/super-admin/analytics')) {
        setApiTestResponse(JSON.stringify({
          success: true,
          status: 200,
          timestamp: new Date().toISOString(),
          networkOverview: networkAnalytics,
        }, null, 2));
      } else if (endpoint.includes('/hospitals') && method === 'GET') {
        setApiTestResponse(JSON.stringify({
          success: true,
          status: 200,
          totalHospitals: hospitals.length,
          hospitals: hospitals.map((h) => ({ id: h.id, code: h.code, name: h.name, city: h.city, beds: h.totalBeds, isActive: h.isActive, admin: h.hospitalAdminName || 'None' })),
        }, null, 2));
      } else if (endpoint.includes('/doctors')) {
        setApiTestResponse(JSON.stringify({
          success: true,
          status: 200,
          hospitalId: selectedHospitalId,
          doctorsCount: doctorsList.length,
          sample: doctorsList.slice(0, 2),
        }, null, 2));
      } else {
        setApiTestResponse(JSON.stringify({
          success: true,
          status: 200,
          message: `Endpoint ${endpoint} responding correctly with 12ms latency. JWT Verified.`,
        }, null, 2));
      }
    }, 400);
  };

  return (
    <div className="space-y-6 pb-16 font-['Inter',sans-serif]">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Super Admin Multi-Hospital Console
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Tenancy Isolation Container • RBAC Level 5</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Super Admin Enterprise Hospital Network
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Register new hospitals, edit or deactivate hospital instances, inspect D3 aggregated network analytics, assign hospital administrators, and supervise clinical operations.
          </p>
        </div>

        {/* Global Controls & Hospital Switcher */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Active Hospital Context Selector */}
          <div className="bg-white/10 px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px] text-[#fcde6d]">domain</span>
            <select
              value={selectedHospitalId}
              onChange={(e) => {
                setSelectedHospitalId(e.target.value);
                hospitalManagementService.setActiveHospitalId(e.target.value);
                onTriggerToast(`Switched active hospital context to: ${hospitals.find(h => h.id === e.target.value)?.name}`);
              }}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#141416] text-white">
                  {h.name} ({h.city}) {!h.isActive ? '[DEACTIVATED]' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate('executive_admin')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">local_hospital</span>
            Hospital Admin Cockpit
          </button>

          <button
            onClick={() => onNavigate('governance')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">security</span>
            Security Ledger
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUMMARY SECTION: KEY NETWORK INDICATORS (RECHARTS VISUAL IMPACT)     */}
      {/* Displays: 'Total Hospitals Managed', 'System-wide Average Bed Occupancy', 'Total Active Clinical Staff' */}
      {/* ===================================================================== */}
      <SuperAdminSummarySection
        hospitals={hospitals}
        allDoctors={allDoctors}
        allStaff={allStaff}
        onTriggerToast={onTriggerToast}
        onFilterStatus={(status) => {
          setHospitalStatusFilter(status);
          setActiveTab('hospital_management');
        }}
      />

      {/* Main Module Tabs: Exactly including 'Global Operations Overview' and 'Hospital Management' */}
      <div className="bg-white p-1.5 rounded-2xl border border-black/5 shadow-2xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('global_operations')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'global_operations'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">dashboard</span>
          Global Operations Overview
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#fcde6d] text-[#221b00] font-extrabold">
            D3 Demo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('hospital_management')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'hospital_management'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">domain_add</span>
          Hospital Management ({hospitals.length})
        </button>

        <button
          onClick={() => setActiveTab('hospital_admin_workspace')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'hospital_admin_workspace'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">admin_panel_settings</span>
          Hospital Admin Dashboard ({currentHospital?.code})
        </button>

        <button
          onClick={() => setActiveTab('schema_and_api')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'schema_and_api'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">schema</span>
          ER Database Schema &amp; REST APIs
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. GLOBAL OPERATIONS OVERVIEW (D3 AGGREGATED DASHBOARD)              */}
      {/* ===================================================================== */}
      {activeTab === 'global_operations' && (
        <GlobalOperationsOverview
          onTriggerToast={onTriggerToast}
          onNavigateHospitalAdmin={(hospitalId) => {
            setSelectedHospitalId(hospitalId);
            hospitalManagementService.setActiveHospitalId(hospitalId);
            setActiveTab('hospital_admin_workspace');
            onTriggerToast(`Navigated to Hospital Admin Dashboard for ${hospitals.find(h => h.id === hospitalId)?.name}`);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* 2. DEDICATED HOSPITAL MANAGEMENT TAB (SUPER ADMIN CRUD & DEACTIVATE)  */}
      {/* ===================================================================== */}
      {activeTab === 'hospital_management' && (
        <div className="space-y-5">
          {/* Header Strip with Filter Pills & New Hospital Action */}
          <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search hospitals by name, code, or city..."
                  value={hospitalSearch}
                  onChange={(e) => setHospitalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#fcde6d]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setHospitalStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    hospitalStatusFilter === 'all'
                      ? 'bg-[#141416] text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All ({hospitals.length})
                </button>
                <button
                  onClick={() => setHospitalStatusFilter('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    hospitalStatusFilter === 'active'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Active ({hospitals.filter((h) => h.isActive).length})
                </button>
                <button
                  onClick={() => setHospitalStatusFilter('deactivated')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    hospitalStatusFilter === 'deactivated'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Deactivated ({hospitals.filter((h) => !h.isActive).length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {/* CSV Export for Offline Reporting & Compliance Audits */}
              <button
                onClick={handleExportFilteredHospitals}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-neutral-300 shadow-2xs cursor-pointer"
                title="Export current registered hospital list as CSV file for offline reporting and compliance audits"
              >
                <span className="material-symbols-outlined text-[18px] text-neutral-700">file_download</span>
                Export CSV ({filteredHospitals.length})
              </button>

              <button
                onClick={() => setShowAddHospitalModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add New Hospital
              </button>
            </div>
          </div>

          {/* Hospital Management Table */}
          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Hospital Network Instances &amp; Status Control
                </h3>
                <p className="text-xs text-neutral-500">
                  Manage hospital credentials, edit institutional parameters, assign administrators, or deactivate instances from active clinical routing.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-neutral-500">
                  Showing {filteredHospitals.length} of {hospitals.length} records
                </span>
                <button
                  onClick={handleExportAllHospitals}
                  className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold border border-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export complete master registry of all hospitals to CSV"
                >
                  <span className="material-symbols-outlined text-[15px] text-neutral-500">download</span>
                  Export All ({hospitals.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Hospital Instance</th>
                    <th className="py-3 px-4">Location &amp; Campus</th>
                    <th className="py-3 px-4">Operating Status</th>
                    <th className="py-3 px-4">Beds &amp; Tier</th>
                    <th className="py-3 px-4">Assigned Admin</th>
                    <th className="py-3 px-4 text-right">Actions &amp; Deactivation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredHospitals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No hospital records found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredHospitals.map((hosp) => (
                      <tr key={hosp.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-neutral-400 font-bold">{hosp.code}</span>
                            <span className="font-bold text-neutral-900 text-sm">{hosp.name}</span>
                            <span className="text-[11px] text-neutral-500">{hosp.contactEmail}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-neutral-700">
                          <div className="font-medium">{hosp.campus}</div>
                          <span className="text-[11px] text-neutral-500">{hosp.city}, {hosp.state}</span>
                          <div className="text-[10px] text-neutral-400 font-mono">Hotline: {hosp.emergencyHotline}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {hosp.isActive ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1.5 w-fit border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1.5 w-fit border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              DEACTIVATED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900 font-mono">
                            {hosp.totalBeds} Beds ({hosp.occupiedBeds} In-Use)
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 uppercase">{hosp.tier}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {hosp.hospitalAdminName ? (
                            <div>
                              <span className="font-bold text-neutral-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                                {hosp.hospitalAdminName}
                              </span>
                              <div className="text-[10px] text-neutral-400">{hosp.hospitalAdminEmail}</div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Deactivate / Reactivate Toggle Button */}
                            <button
                              onClick={() => handleToggleDeactivateHospital(hosp)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs ${
                                hosp.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                              title={hosp.isActive ? 'Deactivate hospital instance' : 'Reactivate hospital instance'}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {hosp.isActive ? 'pause_circle' : 'play_circle'}
                              </span>
                              {hosp.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Edit Hospital Button */}
                            <button
                              onClick={() => handleOpenEditHospital(hosp)}
                              className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[11px] flex items-center gap-1"
                              title="Edit Hospital Configuration"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              Edit
                            </button>

                            {/* Assign Admin Button */}
                            <button
                              onClick={() => {
                                setTargetHospitalForAdmin(hosp);
                                setAdminFormData({
                                  name: hosp.hospitalAdminName || '',
                                  email: hosp.hospitalAdminEmail || '',
                                  phone: hosp.hospitalAdminPhone || '',
                                });
                                setShowAssignAdminModal(true);
                              }}
                              className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                              title="Assign Admin"
                            >
                              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                            </button>

                            {/* Delete Hospital Button */}
                            <button
                              onClick={() => handleDeleteHospital(hosp)}
                              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                              title="Decommission & Delete"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. HOSPITAL ADMIN DASHBOARD & WORKSPACE                               */}
      {/* ===================================================================== */}
      {activeTab === 'hospital_admin_workspace' && (
        <div className="space-y-6">
          {/* Hospital Header Summary */}
          <div className="bg-[#faf8f4] p-5 rounded-3xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#141416] text-white text-[11px] font-bold font-mono">
                  {currentHospital?.code}
                </span>
                <h3 className="text-xl font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {currentHospital?.name} - Admin Portal
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Admin: <strong>{currentHospital?.hospitalAdminName || 'Direct Super Admin Oversight'}</strong> • {currentHospital?.campus} • Hotline: {currentHospital?.emergencyHotline}
              </p>
            </div>

            {/* Sub-tabs for Doctors, Staff, Patients, Departments */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-black/5 shadow-2xs">
              <button
                onClick={() => setAdminSubTab('doctors')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'doctors'
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Doctors ({doctorsList.length})
              </button>
              <button
                onClick={() => setAdminSubTab('staff')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'staff'
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Nurses &amp; Staff ({staffList.length})
              </button>
              <button
                onClick={() => setAdminSubTab('patients')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'patients'
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Patients ({patientsList.length})
              </button>
              <button
                onClick={() => setAdminSubTab('departments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminSubTab === 'departments'
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Departments ({departmentsList.length})
              </button>
            </div>
          </div>

          {/* 3A. DOCTORS MANAGEMENT */}
          {adminSubTab === 'doctors' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search doctors by name, license number, or specialty..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#fcde6d]"
                  />
                </div>

                <button
                  onClick={() => setShowAddDoctorModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Add Doctor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDoctors.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-3xl p-5 border border-black/5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-neutral-400">{doc.medicalLicense}</span>
                          <h4 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">{doc.name}</h4>
                          <p className="text-xs text-neutral-600 font-medium">{doc.specialty}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {doc.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-neutral-600">
                        <div>Dept: <strong>{doc.department}</strong></div>
                        <div>OPD: {doc.opdRoom} ({doc.opdTiming})</div>
                        <div>Consultation: <strong>₹{doc.consultationFee}</strong></div>
                        <div className="font-mono text-[11px] text-neutral-400">{doc.contactPhone}</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-semibold">{doc.activePatientsCount} Active Patients</span>
                      <button
                        onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                        title="Delete Doctor"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3B. NURSES & STAFF MANAGEMENT */}
          {adminSubTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search nurses & staff by name or role..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#fcde6d]"
                  />
                </div>

                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  Add Nurse / Staff
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Staff Name</th>
                        <th className="py-3 px-4">Role Category</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Assigned Shift</th>
                        <th className="py-3 px-4">Ward Location</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredStaff.map((stf) => (
                        <tr key={stf.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-neutral-900">{stf.name}</td>
                          <td className="py-3.5 px-4 font-semibold text-neutral-700">{stf.roleType}</td>
                          <td className="py-3.5 px-4 text-neutral-600">{stf.department}</td>
                          <td className="py-3.5 px-4 font-bold text-neutral-800">{stf.assignedShift}</td>
                          <td className="py-3.5 px-4 text-neutral-600">{stf.assignedWard}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {stf.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteStaff(stf.id, stf.name)}
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 inline-flex items-center justify-center"
                              title="Delete staff record"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3C. PATIENTS MANAGEMENT */}
          {adminSubTab === 'patients' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search patients by UHID, name, or doctor..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#fcde6d]"
                  />
                </div>

                <button
                  onClick={() => setShowAddPatientModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  Register Patient
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">UHID &amp; Patient Name</th>
                        <th className="py-3 px-4">Age / Gender / Blood</th>
                        <th className="py-3 px-4">Department &amp; Bed</th>
                        <th className="py-3 px-4">Attending Doctor</th>
                        <th className="py-3 px-4">Acuity Status</th>
                        <th className="py-3 px-4">Insurance TPA</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredPatients.map((pat) => (
                        <tr key={pat.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-[10px] text-neutral-400 font-bold">{pat.uhid}</span>
                              <span className="font-bold text-neutral-900 text-sm">{pat.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-700">
                            {pat.age} yrs • {pat.gender} • <strong className="text-red-700">{pat.bloodGroup}</strong>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-neutral-800">{pat.department}</div>
                            <span className="text-[11px] text-neutral-500">{pat.roomBed}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-neutral-900">{pat.attendingDoctor}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pat.acuity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {pat.acuity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600 text-[11px]">{pat.insuranceProvider}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedPatientForDetail(pat)}
                                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-[11px]"
                              >
                                Records ({pat.medicalRecords.length})
                              </button>
                              <button
                                onClick={() => handleDeletePatient(pat.id, pat.name)}
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                                title="Discharge / Archive"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3D. DEPARTMENTS MANAGEMENT */}
          {adminSubTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-black/5 shadow-2xs">
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm font-['Plus_Jakarta_Sans']">
                    Clinical Departments &amp; Speciality Wings
                  </h4>
                  <p className="text-xs text-neutral-500">Manage ICU pods, Outpatient departments, and Surgical complexes.</p>
                </div>
                <button
                  onClick={() => setShowAddDeptModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#141416] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[17px]">add</span>
                  Add Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentsList.map((dept) => (
                  <div key={dept.id} className="bg-white rounded-3xl p-5 border border-black/5 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                          {dept.code}
                        </span>
                        <h4 className="text-base font-bold text-neutral-900 mt-1 font-['Plus_Jakarta_Sans']">
                          {dept.name}
                        </h4>
                        <p className="text-xs text-neutral-500">{dept.floorLocation}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        OPERATIONAL
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-neutral-600">
                      <div>Head of Dept: <strong>{dept.headOfDept}</strong></div>
                      <div>Beds Capacity: <strong>{dept.occupiedBeds} / {dept.bedCapacity}</strong></div>
                      <div>Emergency Contact: <strong>{dept.emergencyContact}</strong></div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">Type: {dept.deptType}</span>
                      <button
                        onClick={() => handleDeleteDept(dept.id, dept.name)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. ER DATABASE SCHEMA & REST API SCAFFOLDING EXPLORER                 */}
      {/* ===================================================================== */}
      {activeTab === 'schema_and_api' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-2xs flex items-center gap-2">
            {[
              { id: 'er_model', label: 'Interactive ER Model (Visual)' },
              { id: 'sql_ddl', label: 'PostgreSQL / MySQL DDL' },
              { id: 'prisma', label: 'Prisma ORM Schema' },
              { id: 'rest_api', label: 'REST API Endpoints Tester' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setArchSubTab(sub.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  archSubTab === sub.id
                    ? 'bg-[#141416] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* 4A. VISUAL ER MODEL */}
          {archSubTab === 'er_model' && (
            <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Hospital Management System Entity-Relationship (ER) Architecture
                </h3>
                <p className="text-xs text-neutral-500">
                  Strict multi-tenant isolation keyed by <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">hospital_id</code> foreign key across clinical and operational tables.
                </p>
              </div>

              {/* ER Entities Bento Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Entity 1: Hospitals */}
                <div className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-700">
                    <span className="font-mono font-bold text-xs text-[#fcde6d]">1. hospitals</span>
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Core Tenant</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-300">
                    <li><strong className="text-emerald-400">id</strong> UUID [PK]</li>
                    <li>code VARCHAR(32) [UQ]</li>
                    <li>name VARCHAR(255)</li>
                    <li>campus VARCHAR(255)</li>
                    <li>city VARCHAR(100)</li>
                    <li>tier hospital_tier</li>
                    <li>total_beds INT</li>
                    <li>is_active BOOLEAN</li>
                  </ul>
                </div>

                {/* Entity 2: Users & Admins */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-purple-900">2. users (RBAC)</span>
                    <span className="text-[10px] uppercase font-bold text-purple-700">Auth</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-purple-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li>email VARCHAR(255) [UQ]</li>
                    <li>role user_role [ENUM]</li>
                    <li>full_name VARCHAR(255)</li>
                    <li>password_hash VARCHAR(255)</li>
                  </ul>
                </div>

                {/* Entity 3: Doctors */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-blue-900">3. doctors</span>
                    <span className="text-[10px] uppercase font-bold text-blue-700">Clinicians</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-blue-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-purple-600">user_id</strong> UUID [FK, UQ]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li><strong className="text-amber-600">department_id</strong> UUID [FK]</li>
                    <li>medical_license VARCHAR [UQ]</li>
                    <li>specialty VARCHAR(128)</li>
                    <li>opd_room VARCHAR(32)</li>
                  </ul>
                </div>

                {/* Entity 4: Patients */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-emerald-900">4. patients</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Clinical</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-emerald-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li>uhid VARCHAR(64) [UQ]</li>
                    <li>first_name VARCHAR</li>
                    <li>blood_group VARCHAR(8)</li>
                    <li>insurance_provider VARCHAR</li>
                  </ul>
                </div>

                {/* Entity 5: Departments */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-amber-900">5. departments</span>
                    <span className="text-[10px] uppercase font-bold text-amber-700">Facility</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-amber-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li>code VARCHAR(32)</li>
                    <li>name VARCHAR(255)</li>
                    <li>dept_type department_type</li>
                    <li>bed_capacity INT</li>
                  </ul>
                </div>

                {/* Entity 6: Staff Shifts */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-indigo-900">6. staff_shifts</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-700">Scheduling</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-indigo-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li><strong className="text-purple-600">user_id</strong> UUID [FK]</li>
                    <li>shift_date DATE</li>
                    <li>shift_type shift_type</li>
                    <li>station_bay VARCHAR</li>
                  </ul>
                </div>

                {/* Entity 7: Operating Theatres */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-xs text-red-900">7. operating_theatres</span>
                    <span className="text-[10px] uppercase font-bold text-red-700">Surgeries</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-red-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li>name VARCHAR(64)</li>
                    <li>current_status ot_status</li>
                    <li>lead_surgeon_id UUID</li>
                    <li>turnover_minutes INT</li>
                  </ul>
                </div>

                {/* Entity 8: Equipment Fleet */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="font-mono font-bold text-teal-900 text-xs">8. equipment_bookings</span>
                    <span className="text-[10px] uppercase font-bold text-teal-700">Biomedical</span>
                  </div>
                  <ul className="text-[11px] font-mono space-y-1 mt-2 text-neutral-600">
                    <li><strong className="text-teal-600">id</strong> UUID [PK]</li>
                    <li><strong className="text-blue-600">hospital_id</strong> UUID [FK]</li>
                    <li>equipment_id UUID [FK]</li>
                    <li>patient_id UUID [FK]</li>
                    <li>booked_from TIMESTAMP</li>
                    <li>status VARCHAR(32)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 4B. SQL DDL */}
          {archSubTab === 'sql_ddl' && (
            <div className="bg-[#141416] text-white rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[#fcde6d] font-bold">src/schema/hospital_management_er_schema.sql</span>
                <button
                  onClick={() => onTriggerToast('SQL DDL copied to clipboard.')}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px]"
                >
                  Copy DDL
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] text-neutral-300 leading-relaxed max-h-[500px]">
{`-- FULL-STACK HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Multi-Tenant Database Schema (PostgreSQL / MySQL)

CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    campus VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    tier hospital_tier DEFAULT 'TIER_1_QUATERNARY',
    total_beds INT NOT NULL DEFAULT 150,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL
);

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    medical_license_number VARCHAR(64) UNIQUE NOT NULL,
    specialty VARCHAR(128) NOT NULL,
    consultation_fee NUMERIC(10, 2) DEFAULT 800.00
);

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    uhid VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    blood_group VARCHAR(8) NOT NULL,
    CONSTRAINT uq_patient_hospital_uhid UNIQUE(hospital_id, uhid)
);`}
              </pre>
            </div>
          )}

          {/* 4C. PRISMA */}
          {archSubTab === 'prisma' && (
            <div className="bg-[#141416] text-white rounded-3xl p-6 border border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-[#fcde6d] font-bold">src/schema/schema.prisma</span>
                <button
                  onClick={() => onTriggerToast('Prisma schema copied to clipboard.')}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px]"
                >
                  Copy Schema
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] text-neutral-300 leading-relaxed max-h-[500px]">
{`datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Hospital {
  id               String       @id @default(uuid())
  code             String       @unique
  name             String
  campus           String
  city             String
  totalBeds        Int          @default(150)
  isActive         Boolean      @default(true)
  users            User[]
  departments      Department[]
  doctors          Doctor[]
  staff            Staff[]
  patients         Patient[]
  operatingTheatres OperatingTheatre[]
}

model Doctor {
  id                  String       @id @default(uuid())
  userId              String       @unique
  user                User         @relation(fields: [userId], references: [id])
  hospitalId          String
  hospital            Hospital     @relation(fields: [hospitalId], references: [id])
  medicalLicenseNumber String      @unique
  specialty           String
}`}
              </pre>
            </div>
          )}

          {/* 4D. REST API ENDPOINTS TESTER */}
          {archSubTab === 'rest_api' && (
            <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Full-Stack REST API Endpoints Explorer &amp; Tester
                </h3>
                <p className="text-xs text-neutral-500">
                  Modular API routes implemented in <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">src/api/hospitalApiRoutes.ts</code>. Click test to execute simulated API requests.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/v1/super-admin/analytics', desc: 'Overall statistics across all hospitals' },
                  { method: 'GET', path: '/api/v1/super-admin/hospitals', desc: 'List multi-tenant hospital registry' },
                  { method: 'POST', path: '/api/v1/super-admin/hospitals', desc: 'Register a new hospital with isolated tenancy' },
                  { method: 'POST', path: '/api/v1/super-admin/hospitals/:id/admins', desc: 'Assign hospital admin credentials' },
                  { method: 'GET', path: `/api/v1/hospitals/${selectedHospitalId}/doctors`, desc: 'List and filter doctors for active hospital' },
                  { method: 'GET', path: `/api/v1/hospitals/${selectedHospitalId}/resources/shifts`, desc: 'Hospital staff shift scheduling roster' },
                  { method: 'GET', path: `/api/v1/hospitals/${selectedHospitalId}/resources/operating-theatres`, desc: 'OT complex availability & surgery queues' },
                ].map((ep) => (
                  <div key={`${ep.method}-${ep.path}`} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        ep.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">{ep.path}</span>
                      <span className="text-neutral-500 hidden md:inline">• {ep.desc}</span>
                    </div>

                    <button
                      onClick={() => handleTestApiCall(ep.path, ep.method)}
                      className="px-3 py-1.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs self-start sm:self-auto shadow-2xs"
                    >
                      Run Test Request
                    </button>
                  </div>
                ))}
              </div>

              {/* API Response Display */}
              {apiTestResponse && (
                <div className="mt-4 p-4 rounded-2xl bg-[#141416] text-white font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-white/10">
                    <span>Response from: <strong>{apiTestingEndpoint}</strong></span>
                    <button
                      onClick={() => setApiTestResponse(null)}
                      className="text-neutral-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="text-emerald-400 overflow-x-auto text-[11px] max-h-[300px]">
                    {apiTestResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}

      {/* 1. Register Hospital Modal */}
      {showAddHospitalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">domain_add</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Register New Hospital</h3>
              </div>
              <button
                onClick={() => setShowAddHospitalModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterHospitalSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-neutral-700 font-bold mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manipal Super Speciality Hospital"
                    value={hospitalFormData.name}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="MP-DEL-04"
                    value={hospitalFormData.code}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Campus Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dwarka Central Wing"
                    value={hospitalFormData.campus}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, campus: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={hospitalFormData.city}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={hospitalFormData.totalBeds}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, totalBeds: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Accreditation Tier</label>
                  <select
                    value={hospitalFormData.tier}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, tier: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="TIER_1_QUATERNARY">Tier 1 Quaternary</option>
                    <option value="TIER_2_TERTIARY">Tier 2 Tertiary</option>
                    <option value="SECONDARY_CARE">Secondary Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Official Contact Email</label>
                <input
                  type="email"
                  value={hospitalFormData.contactEmail}
                  onChange={(e) => setHospitalFormData({ ...hospitalFormData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddHospitalModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Provision Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Hospital Modal */}
      {editingHospital && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">edit_square</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Edit Hospital: {editingHospital.code}
                </h3>
              </div>
              <button
                onClick={() => setEditingHospital(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateHospitalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={editHospitalForm.name}
                  onChange={(e) => setEditHospitalForm({ ...editHospitalForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Campus</label>
                  <input
                    type="text"
                    value={editHospitalForm.campus}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, campus: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={editHospitalForm.city}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={editHospitalForm.totalBeds}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, totalBeds: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Tier</label>
                  <select
                    value={editHospitalForm.tier}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, tier: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="TIER_1_QUATERNARY">Tier 1 Quaternary</option>
                    <option value="TIER_2_TERTIARY">Tier 2 Tertiary</option>
                    <option value="SECONDARY_CARE">Secondary Care</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Emergency Hotline</label>
                  <input
                    type="text"
                    value={editHospitalForm.emergencyHotline}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, emergencyHotline: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editHospitalForm.contactEmail}
                    onChange={(e) => setEditHospitalForm({ ...editHospitalForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Status toggle inside edit form */}
              <div className="p-3 rounded-2xl bg-neutral-50 flex items-center justify-between border border-neutral-200">
                <div>
                  <span className="font-bold text-neutral-800 block">Operational Status</span>
                  <span className="text-[11px] text-neutral-500">
                    {editHospitalForm.isActive ? 'Active and open for admissions' : 'Deactivated / Offline'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditHospitalForm({ ...editHospitalForm, isActive: !editHospitalForm.isActive })}
                  className={`px-3 py-1 rounded-xl font-bold text-xs ${
                    editHospitalForm.isActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {editHospitalForm.isActive ? 'Active' : 'Deactivated'}
                </button>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Assign Hospital Admin Modal */}
      {showAssignAdminModal && targetHospitalForAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">manage_accounts</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Assign Hospital Admin
                </h3>
              </div>
              <button
                onClick={() => setShowAssignAdminModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Assign administrative custody and directorate permissions for: <strong>{targetHospitalForAdmin.name}</strong>.
            </p>

            <form onSubmit={handleAssignAdminSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Vikram Malhotra"
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@hospital.com"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={adminFormData.phone}
                  onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAssignAdminModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Authorize Hospital Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">person_add</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Add Attending Doctor</h3>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh K. Varma"
                    value={doctorFormData.name}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Medical License *</label>
                  <input
                    type="text"
                    required
                    placeholder="MCI-2026-44120"
                    value={doctorFormData.medicalLicense}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, medicalLicense: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Specialty</label>
                  <input
                    type="text"
                    required
                    value={doctorFormData.specialty}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, specialty: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Department</label>
                  <select
                    value={doctorFormData.department}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">OPD Room</label>
                  <input
                    type="text"
                    value={doctorFormData.opdRoom}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, opdRoom: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Timing</label>
                  <input
                    type="text"
                    value={doctorFormData.opdTiming}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, opdTiming: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    value={doctorFormData.consultationFee}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, consultationFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Nurse / Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">group_add</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Add Staff Member</h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Staff Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sister Kavita Patil"
                    value={staffFormData.name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Role Category</label>
                  <select
                    value={staffFormData.roleType}
                    onChange={(e) => setStaffFormData({ ...staffFormData, roleType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Head Nurse">Head Nurse</option>
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="ICU Specialist Nurse">ICU Specialist Nurse</option>
                    <option value="Radiology Tech">Radiology Tech</option>
                    <option value="Biomedical Tech">Biomedical Tech</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Admin Coordinator">Admin Coordinator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    value={staffFormData.department}
                    onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Shift</label>
                  <select
                    value={staffFormData.assignedShift}
                    onChange={(e) => setStaffFormData({ ...staffFormData, assignedShift: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="On-Call">On-Call</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Patient Registration Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">how_to_reg</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Register Inpatient</h3>
              </div>
              <button
                onClick={() => setShowAddPatientModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterPatientSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh D. Joshi"
                    value={patientFormData.name}
                    onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Generated UHID</label>
                  <input
                    type="text"
                    readOnly
                    value={patientFormData.uhid}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-100 font-mono font-bold text-neutral-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Age</label>
                  <input
                    type="number"
                    value={patientFormData.age}
                    onChange={(e) => setPatientFormData({ ...patientFormData, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Gender</label>
                  <select
                    value={patientFormData.gender}
                    onChange={(e) => setPatientFormData({ ...patientFormData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Blood Group</label>
                  <select
                    value={patientFormData.bloodGroup}
                    onChange={(e) => setPatientFormData({ ...patientFormData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="A+ve">A+ve</option>
                    <option value="A-ve">A-ve</option>
                    <option value="B+ve">B+ve</option>
                    <option value="B-ve">B-ve</option>
                    <option value="O+ve">O+ve</option>
                    <option value="O-ve">O-ve</option>
                    <option value="AB+ve">AB+ve</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    value={patientFormData.department}
                    onChange={(e) => setPatientFormData({ ...patientFormData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Attending Doctor</label>
                  <input
                    type="text"
                    value={patientFormData.attendingDoctor}
                    onChange={(e) => setPatientFormData({ ...patientFormData, attendingDoctor: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Assigned Bed</label>
                  <input
                    type="text"
                    value={patientFormData.roomBed}
                    onChange={(e) => setPatientFormData({ ...patientFormData, roomBed: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Acuity Status</label>
                  <select
                    value={patientFormData.acuity}
                    onChange={(e) => setPatientFormData({ ...patientFormData, acuity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Complete Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Patient Details & Medical Records Modal */}
      {selectedPatientForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-black/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="font-mono text-xs text-neutral-400 font-bold">{selectedPatientForDetail.uhid}</span>
                <h3 className="text-lg font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {selectedPatientForDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPatientForDetail(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-50">
                <span className="text-neutral-400 block text-[10px]">Attending</span>
                <span className="font-bold text-neutral-900">{selectedPatientForDetail.attendingDoctor}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50">
                <span className="text-neutral-400 block text-[10px]">Ward / Bed</span>
                <span className="font-bold text-neutral-900">{selectedPatientForDetail.roomBed}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50">
                <span className="text-neutral-400 block text-[10px]">Blood Group</span>
                <span className="font-bold text-red-700">{selectedPatientForDetail.bloodGroup}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50">
                <span className="text-neutral-400 block text-[10px]">Acuity</span>
                <span className="font-bold text-emerald-800">{selectedPatientForDetail.acuity}</span>
              </div>
            </div>

            {/* Medical Records History */}
            <div className="space-y-3">
              <h4 className="font-bold text-neutral-900 text-sm font-['Plus_Jakarta_Sans']">
                Clinical Progress &amp; Medical Records History
              </h4>
              <div className="space-y-2">
                {selectedPatientForDetail.medicalRecords.map((mr) => (
                  <div key={mr.id} className="p-3.5 rounded-2xl bg-[#faf8f4] border border-black/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                      <span>{mr.date} • Recorded by <strong>{mr.doctor}</strong></span>
                      <span className="font-mono">{mr.id}</span>
                    </div>
                    <div className="font-bold text-neutral-900">{mr.title}</div>
                    <div className="text-neutral-700">{mr.diagnosis}</div>
                    <p className="text-neutral-500 italic mt-1">{mr.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">apartment</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Add Hospital Department</h3>
              </div>
              <button
                onClick={() => setShowAddDeptModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddDeptSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-neutral-700 font-bold mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oncology & Chemotherapy"
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={deptFormData.code}
                    onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Head of Department</label>
                  <input
                    type="text"
                    required
                    value={deptFormData.headOfDept}
                    onChange={(e) => setDeptFormData({ ...deptFormData, headOfDept: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={deptFormData.bedCapacity}
                    onChange={(e) => setDeptFormData({ ...deptFormData, bedCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Provision Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
