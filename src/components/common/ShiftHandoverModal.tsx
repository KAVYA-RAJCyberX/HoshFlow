import React, { useState } from 'react';
import { RoleType, ViewType, PatientRecord } from '../../types';
import { CLINICAL_PERSONAS, MOCK_PATIENTS, HOSPITAL_INFO } from '../../data/mockHospitalData';
import { auditLogService } from '../../services/auditLogService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingRole: RoleType;
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface OperationalTask {
  id: string;
  title: string;
  category: 'clinical' | 'logistics' | 'safety' | 'admin';
  priority: 'STAT' | 'Urgent' | 'Routine';
  location: string;
  assigneeNotes: string;
  completed: boolean;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  incomingRole,
  onNavigate,
  onTriggerToast
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'discharges' | 'alerts'>('all');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>({});
  const [signedOff, setSignedOff] = useState(false);

  const incomingPersona = CLINICAL_PERSONAS[incomingRole] || CLINICAL_PERSONAS.doctor;

  // Determine outgoing lead name based on role
  const getOutgoingPersona = (role: RoleType) => {
    switch (role) {
      case 'doctor':
        return { name: 'Dr. Rajesh Patel, MD', designation: 'Outgoing Attending Lead (Shift 01)', handoverTime: '15:00 IST' };
      case 'nurse':
        return { name: 'Staff Nurse Sunita M., RN', designation: 'Outgoing Floor Charge Nurse', handoverTime: '15:00 IST' };
      case 'bed_manager':
        return { name: 'Vikas Jadhav', designation: 'Operations Logistics Officer (Morning)', handoverTime: '15:00 IST' };
      case 'billing':
        return { name: 'Kavita Nair', designation: 'TPA Desk Supervisor (Shift A)', handoverTime: '15:00 IST' };
      case 'pharmacy':
        return { name: 'Anita Saxena, D.Pharm', designation: 'Satellite Dispenser Lead', handoverTime: '15:00 IST' };
      case 'reception':
        return { name: 'Aniket Shinde', designation: 'Front Desk Officer (Shift 01)', handoverTime: '15:00 IST' };
      case 'housekeeping':
        return { name: 'Mahesh G., Bio-Sanitarian', designation: 'Day Shift Lead Tech', handoverTime: '15:00 IST' };
      default:
        return { name: 'Dr. K. Saxena', designation: 'Senior Medical Administrator', handoverTime: '15:00 IST' };
    }
  };

  const outgoing = getOutgoingPersona(incomingRole);

  // Role-specific operational tasks
  const getTasksForRole = (role: RoleType): OperationalTask[] => {
    switch (role) {
      case 'doctor':
        return [
          {
            id: 't-1',
            title: 'Critical ABG & Sepsis Review (Bed ICU-03 - Rohan Patel)',
            category: 'clinical',
            priority: 'STAT',
            location: 'Intensive Care Unit (ICU)',
            assigneeNotes: 'Patient showed SpO2 desaturation (91%) at 14:30. Arterial blood gas pending review.',
            completed: false
          },
          {
            id: 't-2',
            title: 'Clinical Discharge Final Sign-off (Bed A-108 - Kishore Kulkarni)',
            category: 'clinical',
            priority: 'Urgent',
            location: 'Cardio-Thoracic Stepdown',
            assigneeNotes: 'Post-CABG Day 3. Stable ambulation; complete discharge summary sheet.',
            completed: false
          },
          {
            id: 't-3',
            title: 'Evening Attending Rounds: Medical Ward A & B (Beds M-101 to M-104)',
            category: 'clinical',
            priority: 'Routine',
            location: 'Ward A & B',
            assigneeNotes: 'Check post-op surgical recovery for Kavita Deshmukh and newly admitted patients.',
            completed: false
          },
          {
            id: 't-4',
            title: 'Medication Reconciliation & Allergy Validation',
            category: 'safety',
            priority: 'Urgent',
            location: 'Electronic Health Record',
            assigneeNotes: 'Sulfa allergy flag on EHR-1003. Verify no contra-indicated antibiotics ordered.',
            completed: false
          }
        ];
      case 'nurse':
        return [
          {
            id: 'n-1',
            title: 'Complete 16:00 Vital Signs & GCS Matrix Documentation',
            category: 'clinical',
            priority: 'STAT',
            location: 'Ward A & B Floor Station',
            assigneeNotes: 'Record BP, SpO2, and pain score for all 18 beds across floor.',
            completed: false
          },
          {
            id: 'n-2',
            title: 'High-Alert IV Infusion Administration (Bed ICU-03)',
            category: 'clinical',
            priority: 'STAT',
            location: 'ICU Bay 03',
            assigneeNotes: 'IV Meropenem 1g STAT bag prepared by satellite pharmacy. Administer at 16:30.',
            completed: false
          },
          {
            id: 'n-3',
            title: 'Inspect Newly Sterilized Bed M-103 Post-Sanitization',
            category: 'safety',
            priority: 'Urgent',
            location: 'Medical Ward A',
            assigneeNotes: 'UV-C sterilization complete. Verify linen change and sterile tag before admitting patient.',
            completed: false
          },
          {
            id: 'n-4',
            title: 'Fall-Risk Protocol Validation & Sensor Check',
            category: 'safety',
            priority: 'Routine',
            location: 'Beds M-104 & A-108',
            assigneeNotes: 'Ensure yellow fall-risk wristbands attached and bed-rail alarms engaged.',
            completed: false
          }
        ];
      case 'bed_manager':
        return [
          {
            id: 'bm-1',
            title: 'Clear Housekeeping Sanitation Backlog (8 Beds In-Progress)',
            category: 'logistics',
            priority: 'Urgent',
            location: 'Central Turnover Hub',
            assigneeNotes: 'Target turnover 22 mins. Expedite bays M-103 and G-108 for pending admissions.',
            completed: false
          },
          {
            id: 'bm-2',
            title: 'Audit Immediate Emergency Buffer Capacity (6 Guaranteed Beds)',
            category: 'safety',
            priority: 'STAT',
            location: 'Emergency Trauma Wing',
            assigneeNotes: 'Maintain 4 Triage Red/Yellow beds and 2 Trauma bays vacant for incoming 108 calls.',
            completed: false
          },
          {
            id: 'bm-3',
            title: 'ICU Step-Down Bed Allocation (Devika Singhania - B-302)',
            category: 'logistics',
            priority: 'Routine',
            location: 'Post-Surg Recovery',
            assigneeNotes: 'Coordinate transfer from post-op recovery to semi-private room.',
            completed: false
          }
        ];
      case 'billing':
        return [
          {
            id: 'b-1',
            title: 'Resolve TPA Query on INV-2048 (ICICI Lombard Health)',
            category: 'admin',
            priority: 'STAT',
            location: 'Billing Desk Counter 02',
            assigneeNotes: 'TPA query on surgical consumable split. 35 mins elapsed. Underwriter awaiting reply.',
            completed: false
          },
          {
            id: 'b-2',
            title: 'Collect Outstanding Patient Co-Pay for Aarav Mehta (8,500 INR)',
            category: 'admin',
            priority: 'Urgent',
            location: 'Cashless Clearance Desk',
            assigneeNotes: 'Room rent disallowed by policy ceiling. Family briefed; obtain receipt before discharge pass.',
            completed: false
          },
          {
            id: 'b-3',
            title: 'Audit Pre-Auth Approval for Devika Singhania (Star Health)',
            category: 'admin',
            priority: 'Routine',
            location: 'TPA Portal',
            assigneeNotes: 'Approved 85,000 INR cashless claim. Print final clearance voucher.',
            completed: false
          }
        ];
      case 'reception':
        return [
          {
            id: 'r-1',
            title: 'Triage Inflow Alert: 3 Incoming 108 Emergency Ambulances',
            category: 'safety',
            priority: 'STAT',
            location: 'ER Ambulance Bay',
            assigneeNotes: '1 Acute coronary syndrome, 1 polytrauma, 1 severe respiratory distress arriving in 12 mins.',
            completed: false
          },
          {
            id: 'r-2',
            title: 'Fast-Track Bed Allocation for Kavita D. (ER Yellow UHID-8829)',
            category: 'logistics',
            priority: 'Urgent',
            location: 'Intake Desk 01',
            assigneeNotes: 'Match patient to freshly certified Bed M-101 once telemetry signals green.',
            completed: false
          },
          {
            id: 'r-3',
            title: 'Monitor Patient Self-Check-in Kiosk QR Scans',
            category: 'admin',
            priority: 'Routine',
            location: 'Central Lobby Kiosk',
            assigneeNotes: 'Verify incoming arrival passes and issue biometric visitor badges.',
            completed: false
          }
        ];
      default:
        return [
          {
            id: 'g-1',
            title: 'Operational Shift Continuity & Governance Audit',
            category: 'admin',
            priority: 'STAT',
            location: 'Executive Operations Node',
            assigneeNotes: 'Verify active staffing coverage across all 250 operational beds.',
            completed: false
          },
          {
            id: 'g-2',
            title: 'Resolve 3 Incomplete Discharges with Overdue TPA Clearance',
            category: 'logistics',
            priority: 'Urgent',
            location: 'Discharge Lounge',
            assigneeNotes: 'Average discharge velocity is currently 2h 15m. Prevent bed turnaround bottlenecks.',
            completed: false
          },
          {
            id: 'g-3',
            title: 'Verify Hospital Medical Gas Plant & O2 Pipeline Pressure',
            category: 'safety',
            priority: 'Routine',
            location: 'Central Biomedical Plant',
            assigneeNotes: 'Main line telemetry at 4.2 Bar. Inspect backup manifold tanks.',
            completed: false
          }
        ];
    }
  };

  const [tasks, setTasks] = useState<OperationalTask[]>(getTasksForRole(incomingRole));

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Incomplete discharges from MOCK_PATIENTS
  const incompleteDischarges = MOCK_PATIENTS.filter(
    (p) => p.status === 'discharge_planned' || p.status === 'discharge_hold' || (p.status === 'admitted' && p.dischargeChecklist && !p.dischargeChecklist.exitGatePassGenerated)
  ).slice(0, 4);

  // Urgent patient alerts
  const urgentPatients = MOCK_PATIENTS.filter(
    (p) => p.acuity === 'critical' || p.status === 'critical' || p.fallRisk === 'High'
  );

  const handleAcknowledgeAlert = (patientId: string) => {
    setAcknowledgedAlerts((prev) => ({ ...prev, [patientId]: true }));
    onTriggerToast(`Critical telemetry alert acknowledged for Patient ${patientId}`);
  };

  const queryClient = useQueryClient();

  const createHandoverMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      await fetch('/api/shift-handovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-handovers'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  const handleSignOffHandover = () => {
    setSignedOff(true);
    const completedCount = tasks.filter((t) => t.completed).length;
    createHandoverMutation.mutate({
      department: 'General',
      outgoingStaff: outgoing.name,
      incomingStaff: incomingPersona.name,
      handoverNotes: `Verified ${incompleteDischarges.length} incomplete discharges, ${urgentPatients.length} critical alerts, and ${completedCount}/${tasks.length} tasks reviewed.`
    });
    
    onTriggerToast(`Shift Handover accepted! Welcome to duty, ${incomingPersona.name}.`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#fcf9f3] text-[#1c1c18] rounded-[28px] max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col justify-between overflow-hidden font-['Plus_Jakarta_Sans','Inter',sans-serif]">
        
        {/* Top Header & Incoming Staff Context */}
        <div className="flex flex-col gap-3 pb-4 border-b border-[#e5e2dc]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#141416] text-[#ffd8ec] flex items-center justify-center font-bold shadow-md shrink-0">
                <span className="material-symbols-outlined text-[26px]">swap_horizontal_circle</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d] text-[#756100]">
                    Shift Handover & Operations Briefing
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">Shift 02 • Evening Turnover</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
                  Handover to {incomingPersona.name}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors shadow-2xs border border-black/5 shrink-0"
              title="Close Handover Briefing"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Outgoing & Incoming Continuity Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-white p-3 rounded-2xl border border-black/5 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold shrink-0">
                <span className="material-symbols-outlined text-[18px]">person_off</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Outgoing Staff Lead</span>
                <span className="font-semibold text-neutral-900 truncate block">{outgoing.name}</span>
                <span className="text-[10px] text-neutral-500">{outgoing.designation} • {outgoing.handoverTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t md:border-t-0 md:border-l border-neutral-100 pt-2 md:pt-0 md:pl-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Incoming Staff Member</span>
                <span className="font-bold text-neutral-900 truncate block">{incomingPersona.name}</span>
                <span className="text-[10px] text-neutral-600">{incomingPersona.designation} • <strong className="text-emerald-800">On Duty</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <strong>{tasks.filter((t) => !t.completed).length}</strong> Pending Tasks
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <strong>{incompleteDischarges.length}</strong> Incomplete Discharges
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <strong className="text-red-700">{urgentPatients.length} Urgent Alerts</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {HOSPITAL_INFO.name} ({HOSPITAL_INFO.occupancyPercent}% Occ)
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 py-3 border-b border-[#e5e2dc]/60 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Complete Briefing', count: tasks.length + incompleteDischarges.length + urgentPatients.length, icon: 'dashboard' },
            { id: 'tasks', label: 'Operational Tasks', count: tasks.length, icon: 'checklist' },
            { id: 'discharges', label: 'Incomplete Discharges', count: incompleteDischarges.length, icon: 'output' },
            { id: 'alerts', label: 'Urgent Alerts', count: urgentPatients.length, icon: 'warning' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#141416] text-white shadow-xs'
                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-black/5'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Scrollable Handover Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar max-h-[50vh]">
          
          {/* SECTION 1: Key Operational Tasks */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">checklist</span>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                    Key Operational Tasks (Role: {incomingRole.toUpperCase()})
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 font-medium">
                  {tasks.filter((t) => t.completed).length} of {tasks.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      task.completed
                        ? 'bg-neutral-100/80 border-neutral-200 opacity-70'
                        : 'bg-white border-black/5 shadow-2xs hover:border-black/20'
                    }`}
                  >
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                        task.completed ? 'bg-emerald-600 text-white' : 'border-2 border-neutral-300 hover:border-black'
                      }`}
                    >
                      {task.completed && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className={`text-xs font-bold ${task.completed ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            task.priority === 'STAT'
                              ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                              : task.priority === 'Urgent'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">{task.location}</span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                        {task.assigneeNotes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Incomplete Discharges */}
          {(activeTab === 'all' || activeTab === 'discharges') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-purple-600">output</span>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                    Incomplete Discharges Requiring Handover Action
                  </h3>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('discharge_hub');
                  }}
                  className="text-xs text-purple-700 hover:underline font-bold flex items-center gap-0.5"
                >
                  <span>Open Discharge Hub</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incompleteDischarges.map((patient) => {
                  const checklist = patient.dischargeChecklist;
                  return (
                    <div key={patient.id} className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-2xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-900 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-purple-200">
                            {patient.bedId}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-neutral-900">{patient.name}</h4>
                            <p className="text-[11px] text-neutral-500 font-mono">{patient.uhid} • {patient.ward}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          patient.status === 'discharge_hold'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {patient.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-xl border border-neutral-100">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">Bottleneck / Hold Reason</span>
                        <p className="text-[11px] font-medium text-neutral-800 truncate">
                          {patient.tpaInsurance?.queryNote || 'Pending final nursing bag & pharmacy medication discharge packet.'}
                        </p>
                      </div>

                      {/* Checklist Milestone Indicators */}
                      {checklist && (
                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <span className={`flex items-center gap-1 font-semibold ${checklist.clinicalSignOff ? 'text-emerald-700' : 'text-neutral-400'}`}>
                            <span className="material-symbols-outlined text-[13px]">{checklist.clinicalSignOff ? 'check_circle' : 'pending'}</span>
                            Clinical
                          </span>
                          <span className={`flex items-center gap-1 font-semibold ${checklist.pharmacyBag ? 'text-emerald-700' : 'text-neutral-400'}`}>
                            <span className="material-symbols-outlined text-[13px]">{checklist.pharmacyBag ? 'check_circle' : 'pending'}</span>
                            Pharmacy
                          </span>
                          <span className={`flex items-center gap-1 font-semibold ${checklist.billingClearance ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                            <span className="material-symbols-outlined text-[13px]">{checklist.billingClearance ? 'check_circle' : 'error'}</span>
                            TPA Billing
                          </span>
                          <span className={`flex items-center gap-1 font-semibold ${checklist.exitGatePassGenerated ? 'text-emerald-700' : 'text-neutral-400'}`}>
                            <span className="material-symbols-outlined text-[13px]">{checklist.exitGatePassGenerated ? 'check_circle' : 'pending'}</span>
                            Gate Pass
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">Attending: {patient.attendingDoctor}</span>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('discharge_hub');
                          }}
                          className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-[10px] font-bold transition-colors"
                        >
                          Resolve & Pass →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: Urgent Patient Alerts */}
          {(activeTab === 'all' || activeTab === 'alerts') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-red-600">e911_emergency</span>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                    Urgent Patient Alerts & High-Risk Ward Bays
                  </h3>
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                  Requires Active Monitoring
                </span>
              </div>

              <div className="space-y-2.5">
                {urgentPatients.map((patient) => {
                  const isAck = acknowledgedAlerts[patient.id];
                  return (
                    <div
                      key={patient.id}
                      className="bg-white rounded-2xl p-4 border border-red-200 shadow-2xs space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 font-bold font-mono text-sm flex items-center justify-center shrink-0 border border-red-300">
                          {patient.bedId}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-900">{patient.name}</span>
                            <span className="text-[11px] font-mono text-neutral-500">({patient.age}y/{patient.gender})</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 uppercase animate-pulse">
                              {patient.acuity}
                            </span>
                            {patient.fallRisk === 'High' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                High Fall Risk
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                            {patient.diagnosis}
                          </p>

                          {/* Critical Vitals strip */}
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono mt-1 text-neutral-700">
                            <span>BP: <strong>{patient.vitals.bp}</strong></span>
                            <span>Pulse: <strong className={patient.vitals.pulse > 100 ? 'text-red-700 font-bold' : ''}>{patient.vitals.pulse} bpm</strong></span>
                            <span>SpO2: <strong className={patient.vitals.spO2 < 95 ? 'text-red-700 font-bold' : 'text-emerald-700'}>{patient.vitals.spO2}%</strong></span>
                            <span>Temp: <strong>{patient.vitals.temp}°F</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate('clinical_rounds');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors"
                        >
                          View Vitals & Chart
                        </button>
                        <button
                          onClick={() => handleAcknowledgeAlert(patient.id)}
                          disabled={isAck}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            isAck
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isAck ? 'check' : 'notifications_active'}
                          </span>
                          <span>{isAck ? 'Acknowledged' : 'Acknowledge Alert'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer: Digital Handover Sign-off & Confirmation */}
        <div className="pt-4 border-t border-[#e5e2dc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
            <span className="text-xs text-neutral-600">
              NABH & HIPAA Shift Continuity Verified • Logged to Audit Ledger
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold border border-black/10 transition-colors"
            >
              Review Later
            </button>

            <button
              onClick={handleSignOffHandover}
              disabled={signedOff}
              className="px-5 py-2.5 rounded-full bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px] text-[#ffd8ec]">signature</span>
              <span>Acknowledge & Accept Handover</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
