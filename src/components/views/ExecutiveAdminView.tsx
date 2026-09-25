import React, { useState, useEffect } from 'react';
import { ViewType } from '../../types';
import {
  hospitalManagementService,
  StaffShiftItem,
  EquipmentItem,
  OperatingTheatreItem,
} from '../../services/hospitalManagementService';

interface ExecutiveAdminViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const ExecutiveAdminView: React.FC<ExecutiveAdminViewProps> = ({
  onNavigate,
  onTriggerToast,
}) => {
  // Top-level Navigation Mode
  const [activeTab, setActiveTab] = useState<'cockpit' | 'resource_scheduling'>('resource_scheduling');
  const [resourceSubTab, setResourceSubTab] = useState<'shifts' | 'equipment' | 'operating_theatres'>('shifts');

  // Existing Cockpit State
  const [bloodAlertAcknowledged, setBloodAlertAcknowledged] = useState(false);
  const [approvals, setApprovals] = useState([
    {
      id: 'APP-801',
      title: 'Emergency Blood Bank O-ve Cross-Match Release',
      dept: 'OT Complex / Cardio-Thoracic',
      doctor: 'Dr. Rohini Mehta',
      urgency: 'Immediate Emergency',
      status: 'pending',
    },
    {
      id: 'APP-802',
      title: 'Stryker Orthopedic Hip Revision Implant Clearance (₹1,45,000)',
      dept: 'Orthopedics & Joint Replacement',
      doctor: 'Dr. Anand Joshi',
      urgency: 'Scheduled Today 2:30 PM',
      status: 'pending',
    },
    {
      id: 'APP-803',
      title: 'Inter-Hospital ECMO Transfer from Ruby Hall Clinic',
      dept: 'ICU Critical Care Pod 1',
      doctor: 'Dr. Kulkarni',
      urgency: 'Critical Protocol',
      status: 'pending',
    },
  ]);

  // Resource Scheduling Reactive Data
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [theatres, setTheatres] = useState<OperatingTheatreItem[]>([]);

  // Shift Filters & Modals
  const [shiftDeptFilter, setShiftDeptFilter] = useState('ALL');
  const [shiftTypeFilter, setShiftTypeFilter] = useState('ALL');
  const [showAssignShiftModal, setShowAssignShiftModal] = useState(false);
  const [newShiftData, setNewShiftData] = useState({
    staffName: '',
    role: 'Staff Nurse',
    department: 'Intensive Critical Care Pod',
    shiftDate: new Date().toISOString().split('T')[0],
    shiftType: 'Morning' as const,
    startTime: '07:00',
    endTime: '15:30',
    stationBay: 'Ward Nursing Station',
    minRequiredStaff: 4,
    currentStaffCount: 4,
  });

  // Equipment Booking Modal
  const [showBookEquipmentModal, setShowBookEquipmentModal] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [equipBookingForm, setEquipBookingForm] = useState({
    patientUhid: 'UHID-2026-9041',
    procedure: 'Contrast Enhanced Diagnostics',
    allocatedRoom: 'Main OT Suite 1',
    requestedBy: 'Dr. Ananya Rao',
    startTime: '11:00 AM',
    endTime: '12:30 PM',
  });

  // OT Booking Modal
  const [showScheduleOtModal, setShowScheduleOtModal] = useState(false);
  const [selectedOtId, setSelectedOtId] = useState<string>('');
  const [otScheduleForm, setOtScheduleForm] = useState({
    leadSurgeon: 'Dr. Rohini Mehta',
    anesthesiologist: 'Dr. S. K. Roy',
    procedure: 'Minimally Invasive Valve Repair',
    patientUhid: 'UHID-2026-8812',
    urgencyLevel: 'URGENT' as const,
    estimatedFinish: '03:45 PM',
  });

  // Load reactive state
  useEffect(() => {
    const syncData = () => {
      setShifts(hospitalManagementService.getShifts());
      setEquipmentList(hospitalManagementService.getEquipment());
      setTheatres(hospitalManagementService.getOperatingTheatres());
    };
    syncData();
    const unsub = hospitalManagementService.subscribe(syncData);
    return () => unsub();
  }, []);

  const handleApprove = (id: string, title: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    onTriggerToast(`Approved: ${title}. Digital DSC signed by Medical Superintendent.`);
  };

  // Shift assignment handler
  const handleAssignShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftData.staffName.trim()) {
      onTriggerToast('Please enter staff name.');
      return;
    }
    const created = hospitalManagementService.assignShift({
      hospitalId: hospitalManagementService.getActiveHospitalId(),
      staffName: newShiftData.staffName,
      role: newShiftData.role,
      department: newShiftData.department,
      shiftDate: newShiftData.shiftDate,
      shiftType: newShiftData.shiftType,
      startTime: newShiftData.startTime,
      endTime: newShiftData.endTime,
      stationBay: newShiftData.stationBay,
      isCovered: true,
      minRequiredStaff: newShiftData.minRequiredStaff,
      currentStaffCount: newShiftData.currentStaffCount,
    });
    setShowAssignShiftModal(false);
    setNewShiftData({
      staffName: '',
      role: 'Staff Nurse',
      department: 'Intensive Critical Care Pod',
      shiftDate: new Date().toISOString().split('T')[0],
      shiftType: 'Morning',
      startTime: '07:00',
      endTime: '15:30',
      stationBay: 'Ward Nursing Station',
      minRequiredStaff: 4,
      currentStaffCount: 4,
    });
    onTriggerToast(`Shift scheduled: ${created.staffName} assigned to ${created.department} (${created.shiftType}).`);
  };

  const handleDeleteShift = (id: string, name: string) => {
    hospitalManagementService.deleteShift(id);
    onTriggerToast(`Removed shift assignment for ${name}.`);
  };

  // Equipment Booking Handlers
  const handleOpenBookEquipment = (equip: EquipmentItem) => {
    setSelectedEquipmentId(equip.id);
    setShowBookEquipmentModal(true);
  };

  const handleBookEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = hospitalManagementService.bookEquipment(selectedEquipmentId, equipBookingForm);
    if (success) {
      setShowBookEquipmentModal(false);
      onTriggerToast(`Equipment booked successfully for case ${equipBookingForm.patientUhid}.`);
    }
  };

  const handleReleaseEquipment = (equipId: string, name: string) => {
    hospitalManagementService.releaseEquipment(equipId);
    onTriggerToast(`Released ${name}. Equipment is now AVAILABLE in biomedical pool.`);
  };

  const handleToggleMaintenance = (equipId: string, currentStatus: EquipmentItem['status'], name: string) => {
    const nextStatus = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    hospitalManagementService.setEquipmentStatus(equipId, nextStatus);
    onTriggerToast(`${name} status updated to: ${nextStatus}.`);
  };

  // OT Handlers
  const handleOpenScheduleOt = (ot: OperatingTheatreItem) => {
    setSelectedOtId(ot.id);
    setShowScheduleOtModal(true);
  };

  const handleScheduleOtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = hospitalManagementService.scheduleOtSurgery(selectedOtId, otScheduleForm);
    if (success) {
      setShowScheduleOtModal(false);
      onTriggerToast(`OT case scheduled: ${otScheduleForm.procedure} under ${otScheduleForm.leadSurgeon}.`);
    }
  };

  const handleCycleOt = (otId: string, otName: string) => {
    hospitalManagementService.cycleOtTurnover(otId);
    onTriggerToast(`Turnover cycle triggered for ${otName}. HEPA airflow sterilization in progress.`);
  };

  // Filtered shifts
  const filteredShifts = shifts.filter((s) => {
    if (shiftDeptFilter !== 'ALL' && !s.department.toLowerCase().includes(shiftDeptFilter.toLowerCase())) {
      return false;
    }
    if (shiftTypeFilter !== 'ALL' && s.shiftType.toLowerCase() !== shiftTypeFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 font-['Inter',sans-serif]">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/20 text-[#fcde6d]">
              Executive Directorate
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">NABH Accredited • CityCare Multispeciality Pune</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Executive Admin &amp; Hospital Resource Scheduling
          </h1>
          <p className="text-sm text-neutral-400">
            Offline Demo: Management of clinical staff shifts, biomedical equipment fleet, operating theatre availability, and executive clearances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => onNavigate('super_admin_panel')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">hub</span>
            Super Admin Hub
          </button>
          <button
            onClick={() => onNavigate('governance')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">security</span>
            Governance &amp; Audit
          </button>
          <button
            onClick={() => onTriggerToast('NABH Daily Quality & Patient Safety Report generated (PDF).')}
            className="px-5 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export NABH Digest
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="bg-white p-1.5 rounded-2xl border border-black/5 shadow-2xs flex items-center gap-1 max-w-xl">
        <button
          onClick={() => setActiveTab('resource_scheduling')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'resource_scheduling'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          Resource Scheduling Hub
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fcde6d] text-[#221b00]">
            Demo Roster
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cockpit')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'cockpit'
              ? 'bg-[#141416] text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          Executive Cockpit &amp; Clearances
          {approvals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {approvals.length}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. RESOURCE SCHEDULING MODULE                                         */}
      {/* ===================================================================== */}
      {activeTab === 'resource_scheduling' && (
        <div className="space-y-6">
          {/* Sub Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-black/5 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResourceSubTab('shifts')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  resourceSubTab === 'shifts'
                    ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">groups</span>
                Hospital Staff Shifts ({shifts.length})
              </button>

              <button
                onClick={() => setResourceSubTab('equipment')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  resourceSubTab === 'equipment'
                    ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">biomedical</span>
                Equipment Bookings ({equipmentList.length})
              </button>

              <button
                onClick={() => setResourceSubTab('operating_theatres')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  resourceSubTab === 'operating_theatres'
                    ? 'bg-[#fcde6d] text-[#221b00] shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">surgical</span>
                Operating Theatres ({theatres.length})
              </button>
            </div>

            {/* Quick Action Button depending on subtab */}
            {resourceSubTab === 'shifts' && (
              <button
                onClick={() => setShowAssignShiftModal(true)}
                className="px-4 py-2 rounded-xl bg-[#141416] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[17px]">person_add</span>
                Assign Staff Shift
              </button>
            )}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* SUB-TAB 1: HOSPITAL STAFF SHIFTS                                  */}
          {/* ----------------------------------------------------------------- */}
          {resourceSubTab === 'shifts' && (
            <div className="space-y-4">
              {/* Staffing KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                    <span>Total Shifts Scheduled</span>
                    <span className="material-symbols-outlined text-blue-600">badge</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">{shifts.length} Roster Slots</div>
                  <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">100% Shift Coverage Validated</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                    <span>Morning Shift Status</span>
                    <span className="material-symbols-outlined text-amber-500">wb_sunny</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">
                    {shifts.filter((s) => s.shiftType === 'Morning').length} Staff on Floor
                  </div>
                  <span className="text-xs text-neutral-500 mt-1 inline-block">07:00 - 15:30 Window</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                    <span>ICU Nurse-to-Patient</span>
                    <span className="material-symbols-outlined text-purple-600">monitor_heart</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">1 : 1.1 Roster</div>
                  <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">NABH Standard Compliant</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                    <span>Emergency On-Call Pool</span>
                    <span className="material-symbols-outlined text-rose-600">emergency</span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">6 Clinicians Standby</div>
                  <span className="text-xs text-rose-600 font-bold mt-1 inline-block">Code Red Rapid Response</span>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-neutral-600">Filter Department:</span>
                  {['ALL', 'Critical Care', 'Emergency', 'General', 'Cardiology'].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setShiftDeptFilter(dept)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        shiftDeptFilter === dept
                          ? 'bg-[#141416] text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-600">Shift Slot:</span>
                  {['ALL', 'Morning', 'Evening', 'Night'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setShiftTypeFilter(st)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        shiftTypeFilter === st
                          ? 'bg-purple-900 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shifts Roster Table */}
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                      Active Shift Rosters &amp; Station Assignments
                    </h3>
                    <p className="text-xs text-neutral-500">Demo supervision of physician duty hours, nursing staffing ratios, and ward coverage.</p>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">Date: {new Date().toISOString().split('T')[0]}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role &amp; Specialty</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Shift &amp; Hours</th>
                        <th className="py-3 px-4">Assigned Station / Bay</th>
                        <th className="py-3 px-4">Coverage Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredShifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-neutral-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-[11px]">
                                {shift.staffName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </div>
                              <span>{shift.staffName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-700 font-medium">{shift.role}</td>
                          <td className="py-3.5 px-4 text-neutral-600">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold text-[10px]">
                              {shift.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-900">{shift.shiftType}</span>
                              <span className="text-[11px] text-neutral-500 font-mono">{shift.startTime} - {shift.endTime}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-700 font-medium">{shift.stationBay}</td>
                          <td className="py-3.5 px-4">
                            {shift.currentStaffCount < shift.minRequiredStaff ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                Staff Gap ({shift.currentStaffCount}/{shift.minRequiredStaff})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                Fully Covered
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onTriggerToast(`Supervisor check-in confirmed for ${shift.staffName}.`)}
                                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px]"
                                title="Sign-off shift handover"
                              >
                                Sign-off
                              </button>
                              <button
                                onClick={() => handleDeleteShift(shift.id, shift.staffName)}
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                                title="Cancel shift"
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

          {/* ----------------------------------------------------------------- */}
          {/* SUB-TAB 2: BIOMEDICAL EQUIPMENT BOOKINGS & INVENTORY              */}
          {/* ----------------------------------------------------------------- */}
          {resourceSubTab === 'equipment' && (
            <div className="space-y-4">
              {/* Equipment Fleet Status KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase">Total Critical Assets</span>
                  <div className="text-2xl font-bold text-neutral-900 mt-1">{equipmentList.length} Units</div>
                  <span className="text-xs text-neutral-500">Fleet Value: ₹48.2 Cr</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Available Ready</span>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {equipmentList.filter((e) => e.status === 'AVAILABLE').length} Units
                  </div>
                  <span className="text-xs text-emerald-700">Immediate Allocation</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">In-Use / Booked</span>
                  <div className="text-2xl font-bold text-amber-700 mt-1">
                    {equipmentList.filter((e) => e.status === 'IN_USE' || e.status === 'BOOKED').length} Units
                  </div>
                  <span className="text-xs text-amber-700">High Clinical Demand</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Calibration / Maintenance</span>
                  <div className="text-2xl font-bold text-rose-700 mt-1">
                    {equipmentList.filter((e) => e.status === 'CALIBRATION' || e.status === 'MAINTENANCE').length} Units
                  </div>
                  <span className="text-xs text-neutral-500">Biomedical Engineer Assigned</span>
                </div>
              </div>

              {/* Equipment Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipmentList.map((item) => {
                  const isAvailable = item.status === 'AVAILABLE';
                  const isInUse = item.status === 'IN_USE';
                  const isBooked = item.status === 'BOOKED';

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl p-5 border border-black/5 shadow-2xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                              {item.category}
                            </span>
                            <h4 className="text-base font-bold text-neutral-900 mt-1.5 font-['Plus_Jakarta_Sans'] leading-snug">
                              {item.name}
                            </h4>
                          </div>
                          {isAvailable && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 shrink-0">
                              AVAILABLE
                            </span>
                          )}
                          {isInUse && (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping"></span>
                              IN USE
                            </span>
                          )}
                          {isBooked && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200 shrink-0">
                              BOOKED
                            </span>
                          )}
                          {(item.status === 'CALIBRATION' || item.status === 'MAINTENANCE') && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200 shrink-0">
                              {item.status}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-neutral-600">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-neutral-400">location_on</span>
                            <span>Location: <strong>{item.location}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-neutral-400">fingerprint</span>
                            <span className="font-mono text-[11px]">Serial: {item.serialNumber}</span>
                          </div>
                        </div>

                        {/* Active Booking Details Box if in-use or booked */}
                        {item.currentBooking && (
                          <div className="mt-3.5 p-3 rounded-2xl bg-[#faf8f4] border border-black/5 text-xs space-y-1">
                            <div className="flex items-center justify-between text-neutral-700 font-semibold">
                              <span>Patient: <strong>{item.currentBooking.patientUhid}</strong></span>
                              <span className="text-[11px] font-mono text-purple-700">{item.currentBooking.startTime} - {item.currentBooking.endTime}</span>
                            </div>
                            <p className="text-neutral-900 font-bold">{item.currentBooking.procedure}</p>
                            <p className="text-neutral-500 text-[11px]">
                              Req: {item.currentBooking.requestedBy} • {item.currentBooking.allocatedRoom}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        {isAvailable ? (
                          <button
                            onClick={() => handleOpenBookEquipment(item)}
                            className="w-full py-2 px-3 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">event</span>
                            Reserve for Case
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReleaseEquipment(item.id, item.name)}
                            className="py-2 px-3 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold transition-colors flex-1"
                          >
                            Release Asset
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleMaintenance(item.id, item.status, item.name)}
                          className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold"
                          title="Toggle Calibration / Service"
                        >
                          <span className="material-symbols-outlined text-[16px]">build</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUB-TAB 3: OPERATING THEATRE (OT) AVAILABILITY                    */}
          {/* ----------------------------------------------------------------- */}
          {resourceSubTab === 'operating_theatres' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                    Central Operating Theatre (OT) Surgical Complex
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Live telemetry across 8 surgical suites with laminar airflow status and terminal sterilization turnover countdowns.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {theatres.filter((o) => o.status === 'READY_FOR_CASE').length} Suites Ready
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    {theatres.filter((o) => o.status === 'SURGERY_IN_PROGRESS').length} In Progress
                  </span>
                </div>
              </div>

              {/* OT Suites Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {theatres.map((ot) => {
                  const isReady = ot.status === 'READY_FOR_CASE';
                  const isOperating = ot.status === 'SURGERY_IN_PROGRESS';
                  const isSterilizing = ot.status === 'STERILIZING_TURNOVER';

                  return (
                    <div
                      key={ot.id}
                      className={`rounded-3xl p-5 border shadow-2xs flex flex-col justify-between space-y-4 transition-all ${
                        isOperating
                          ? 'bg-purple-50/50 border-purple-200'
                          : isSterilizing
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-white border-black/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold font-mono text-neutral-500">{ot.id}</span>
                          {isReady && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                              READY FOR CASE
                            </span>
                          )}
                          {isOperating && (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              IN SURGERY
                            </span>
                          )}
                          {isSterilizing && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] animate-spin">autorenew</span>
                              STERILIZING
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">{ot.name}</h4>
                        <p className="text-xs text-neutral-500">{ot.suiteType} • {ot.floorWing}</p>

                        {/* In Progress Details */}
                        {isOperating && (
                          <div className="mt-3 p-3 rounded-2xl bg-white border border-purple-200 text-xs space-y-1.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 uppercase">
                              {ot.urgencyLevel}
                            </span>
                            <div className="font-bold text-neutral-900 mt-1">{ot.procedure}</div>
                            <div className="text-[11px] text-neutral-600">Surgeon: <strong>{ot.leadSurgeon}</strong></div>
                            <div className="text-[11px] text-neutral-600">Anesthesiologist: {ot.anesthesiologist}</div>
                            <div className="text-[11px] text-purple-700 font-semibold pt-1 border-t border-purple-100">
                              Est. Finish: {ot.estimatedFinish}
                            </div>
                          </div>
                        )}

                        {/* Sterilizing status */}
                        {isSterilizing && (
                          <div className="mt-3 p-3 rounded-2xl bg-white border border-amber-200 text-xs space-y-1">
                            <div className="text-amber-900 font-bold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">air</span>
                              HEPA Cycle Turnover Active
                            </div>
                            <p className="text-neutral-500 text-[11px]">Turnaround Time: ~{ot.turnoverMinutes} minutes</p>
                          </div>
                        )}
                      </div>

                      {/* OT Control Buttons */}
                      <div className="pt-3 border-t border-neutral-200 flex items-center gap-2">
                        {isReady ? (
                          <button
                            onClick={() => handleOpenScheduleOt(ot)}
                            className="w-full py-2 px-3 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">add_circle</span>
                            Schedule Case
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCycleOt(ot.id, ot.name)}
                            className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">autorenew</span>
                            {isOperating ? 'Finish Case & Sterilize' : 'Mark Ready for Next Case'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. EXECUTIVE COCKPIT & CLEARANCES TAB                                 */}
      {/* ===================================================================== */}
      {activeTab === 'cockpit' && (
        <div className="space-y-6">
          {/* Hospital Critical Reserves Bento Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* LMO Oxygen */}
            <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Liquid Med Oxygen (LMO)</span>
                  <span className="material-symbols-outlined text-blue-600">air</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">8,200 Litres</div>
                <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mt-3">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
              <div className="text-xs text-neutral-600 mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span>Tank Runway: <strong>4.2 Days</strong></span>
                <span className="text-emerald-700 font-bold">Stable 4.6 Bar</span>
              </div>
            </div>

            {/* Blood Bank Reserves */}
            <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Blood Bank Reserves</span>
                  <span className="material-symbols-outlined text-red-600">bloodtype</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">42 Units PRBC</div>
                <span className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                  O-Negative Low (Only 2 Units Left)
                </span>
              </div>
              <div className="text-xs text-neutral-600 mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setBloodAlertAcknowledged(true);
                    onTriggerToast('Auto-request dispatched to Red Cross Blood Bank Camp Pune for 6 units O-ve.');
                  }}
                  className="text-red-700 font-bold hover:underline"
                >
                  {bloodAlertAcknowledged ? 'Requested from Red Cross' : 'Request O-ve Restock'}
                </button>
                <span className="text-neutral-500">Platelets: 18u</span>
              </div>
            </div>

            {/* Staffing & Acuity */}
            <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">ICU Staffing Ratio</span>
                  <span className="material-symbols-outlined text-emerald-600">badge</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">1 : 1.2 Nurse Ratio</div>
                <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">NABH Standard Compliant</span>
              </div>
              <div className="text-xs text-neutral-600 mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span>On Duty: <strong>142 Nurses</strong></span>
                <span><strong>38 Doctors</strong></span>
              </div>
            </div>

            {/* OT Complex Utilization */}
            <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">OT Complex Utilization</span>
                  <span className="material-symbols-outlined text-purple-600">surgical</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 mt-2 font-['Plus_Jakarta_Sans']">6 / 8 Operating</div>
                <span className="text-xs text-neutral-600 mt-1 inline-block">OT-3 &amp; OT-7 Sanitizing Turnover</span>
              </div>
              <div className="text-xs text-neutral-600 mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span>Next Case: <strong>12:45 PM</strong></span>
                <span className="text-purple-700 font-bold">Orthopedic</span>
              </div>
            </div>
          </div>

          {/* Executive Approvals Queue */}
          <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Medical Superintendent Executive Approvals</h2>
                <p className="text-xs text-neutral-500">Dual clinical authorization for high-risk protocols, rare implants, and urgent transfers.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                {approvals.length} Pending Actions
              </span>
            </div>

            <div className="space-y-3">
              {approvals.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase">
                        {item.urgency}
                      </span>
                      <h3 className="font-bold text-sm text-neutral-900">{item.title}</h3>
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">
                      Department: <strong className="text-neutral-800">{item.dept}</strong> • Requested by: <strong className="text-neutral-800">{item.doctor}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onTriggerToast(`Requested clinical case conference for ${item.title}.`)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold"
                    >
                      Review Case Notes
                    </button>
                    <button
                      onClick={() => handleApprove(item.id, item.title)}
                      className="px-4 py-1.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Sign Digital Clearance
                    </button>
                  </div>
                </div>
              ))}
              {approvals.length === 0 && (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  All executive clearances completed. No pending requests.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}

      {/* 1. Assign Staff Shift Modal */}
      {showAssignShiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">badge</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">Assign Staff Shift</h3>
              </div>
              <button
                onClick={() => setShowAssignShiftModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignShiftSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Staff Member Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sister Aarti Sharma, RN"
                  value={newShiftData.staffName}
                  onChange={(e) => setNewShiftData({ ...newShiftData, staffName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#fcde6d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Staff Role</label>
                  <select
                    value={newShiftData.role}
                    onChange={(e) => setNewShiftData({ ...newShiftData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Head Nurse">Head Nurse</option>
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="ICU Specialist Nurse">ICU Specialist Nurse</option>
                    <option value="Attending Physician">Attending Physician</option>
                    <option value="Senior Resident">Senior Resident</option>
                    <option value="Biomedical Tech">Biomedical Tech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Department</label>
                  <select
                    value={newShiftData.department}
                    onChange={(e) => setNewShiftData({ ...newShiftData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Intensive Critical Care Pod">Intensive Critical Care Pod</option>
                    <option value="Emergency & Acute Trauma Care">Emergency &amp; Acute Trauma Care</option>
                    <option value="General & Internal Medicine">General &amp; Internal Medicine</option>
                    <option value="Interventional Cardiology">Interventional Cardiology</option>
                    <option value="Orthopedics & Joint Replacement">Orthopedics &amp; Joint Replacement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Shift Slot</label>
                  <select
                    value={newShiftData.shiftType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      let start = '07:00';
                      let end = '15:30';
                      if (type === 'Evening') {
                        start = '15:00';
                        end = '23:30';
                      } else if (type === 'Night') {
                        start = '23:00';
                        end = '07:30';
                      }
                      setNewShiftData({ ...newShiftData, shiftType: type, startTime: start, endTime: end });
                    }}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="On-Call">On-Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Start Time</label>
                  <input
                    type="text"
                    value={newShiftData.startTime}
                    onChange={(e) => setNewShiftData({ ...newShiftData, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">End Time</label>
                  <input
                    type="text"
                    value={newShiftData.endTime}
                    onChange={(e) => setNewShiftData({ ...newShiftData, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Station / Nursing Bay Assignment</label>
                <input
                  type="text"
                  placeholder="e.g. ICU Pod A (Beds 1-6)"
                  value={newShiftData.stationBay}
                  onChange={(e) => setNewShiftData({ ...newShiftData, stationBay: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAssignShiftModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Save Shift Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Book Equipment Modal */}
      {showBookEquipmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">biomedical</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Book Biomedical Equipment
                </h3>
              </div>
              <button
                onClick={() => setShowBookEquipmentModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleBookEquipmentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Patient UHID *</label>
                <input
                  type="text"
                  required
                  value={equipBookingForm.patientUhid}
                  onChange={(e) => setEquipBookingForm({ ...equipBookingForm, patientUhid: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Clinical Procedure Name *</label>
                <input
                  type="text"
                  required
                  value={equipBookingForm.procedure}
                  onChange={(e) => setEquipBookingForm({ ...equipBookingForm, procedure: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Allocated OT / Room</label>
                  <input
                    type="text"
                    required
                    value={equipBookingForm.allocatedRoom}
                    onChange={(e) => setEquipBookingForm({ ...equipBookingForm, allocatedRoom: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Requesting Clinician</label>
                  <input
                    type="text"
                    required
                    value={equipBookingForm.requestedBy}
                    onChange={(e) => setEquipBookingForm({ ...equipBookingForm, requestedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Start Time</label>
                  <input
                    type="text"
                    value={equipBookingForm.startTime}
                    onChange={(e) => setEquipBookingForm({ ...equipBookingForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">End Time</label>
                  <input
                    type="text"
                    value={equipBookingForm.endTime}
                    onChange={(e) => setEquipBookingForm({ ...equipBookingForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowBookEquipmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Confirm Equipment Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Schedule OT Surgery Modal */}
      {showScheduleOtModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">surgical</span>
                <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  Schedule Operating Theatre Surgery
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleOtModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleScheduleOtSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Surgical Procedure *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Off-Pump CABG 3-Vessel / Joint Revision"
                  value={otScheduleForm.procedure}
                  onChange={(e) => setOtScheduleForm({ ...otScheduleForm, procedure: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Lead Surgeon *</label>
                  <input
                    type="text"
                    required
                    value={otScheduleForm.leadSurgeon}
                    onChange={(e) => setOtScheduleForm({ ...otScheduleForm, leadSurgeon: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Anesthesiologist</label>
                  <input
                    type="text"
                    required
                    value={otScheduleForm.anesthesiologist}
                    onChange={(e) => setOtScheduleForm({ ...otScheduleForm, anesthesiologist: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Patient UHID</label>
                  <input
                    type="text"
                    required
                    value={otScheduleForm.patientUhid}
                    onChange={(e) => setOtScheduleForm({ ...otScheduleForm, patientUhid: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Urgency</label>
                  <select
                    value={otScheduleForm.urgencyLevel}
                    onChange={(e) => setOtScheduleForm({ ...otScheduleForm, urgencyLevel: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-xl bg-white outline-none"
                  >
                    <option value="ELECTIVE">Elective</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CODE_RED_EMERGENCY">Code Red Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Est. Finish</label>
                  <input
                    type="text"
                    value={otScheduleForm.estimatedFinish}
                    onChange={(e) => setOtScheduleForm({ ...otScheduleForm, estimatedFinish: e.target.value })}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleOtModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-semibold hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141416] text-white font-bold hover:bg-neutral-800 shadow-2xs"
                >
                  Schedule Surgical Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
