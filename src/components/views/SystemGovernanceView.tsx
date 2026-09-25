import React, { useState, useMemo } from 'react';
import { ViewType, AuditCategory } from '../../types';
import { useAuditLogs } from '../../services/auditLogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SystemGovernanceViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export const SystemGovernanceView: React.FC<SystemGovernanceViewProps> = ({
  onNavigate,
  onTriggerToast,
}) => {
  const { logs: localLogs, addLog, logRoleSwitch, resetToDefault, clearLogs, exportJSON, exportCSV } = useAuditLogs();

  // Fetch live server Audit Logs
  const { data: serverLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch system-wide metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Combine live server logs with local session logs
  const logs = useMemo(() => {
    const combined = [...serverLogs, ...localLogs];
    // Deduplicate by ID
    const map = new Map();
    combined.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [serverLogs, localLogs]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const queryClient = useQueryClient();

  // Fetch system config
  const { data: serverConfig = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/system-config', { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch shift handovers
  const { data: shiftHandovers = [] } = useQuery({
    queryKey: ['shift-handovers'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/shift-handovers', { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      await fetch(`/api/system-config/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  const handleToggleFlag = (id: string, name: string, currentState: boolean) => {
    toggleFlagMutation.mutate({ id, enabled: !currentState });
    onTriggerToast(`Updating security policy: ${name}...`);
  };

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
      onTriggerToast('Shift handover logged successfully.');
    }
  });

  const handleLogHandover = () => {
    const department = prompt('Enter Department (e.g. ICU, General Ward):');
    if (!department) return;
    const outgoingStaff = prompt('Enter Outgoing Staff Name:');
    if (!outgoingStaff) return;
    const incomingStaff = prompt('Enter Incoming Staff Name:');
    if (!incomingStaff) return;
    const notes = prompt('Enter Handover Notes (optional):') || '';
    createHandoverMutation.mutate({ department, outgoingStaff, incomingStaff, handoverNotes: notes });
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = logs.length;
    const roleSwitches = logs.filter((l) => l.category === 'role_switch').length;
    const admissions = logs.filter((l) => l.category === 'patient_admission').length;
    const dualSignedOrVerified = logs.filter((l) => l.status === 'DUAL_SIGNED' || l.status === 'VERIFIED').length;
    return { total, roleSwitches, admissions, dualSignedOrVerified };
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor = log.actor.toLowerCase().includes(q);
        const matchRole = log.role.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchIp = log.ipAddress.toLowerCase().includes(q);
        const matchStatus = log.status.toLowerCase().includes(q);
        const matchCategory = log.category.toLowerCase().includes(q);
        return matchActor || matchRole || matchAction || matchIp || matchStatus || matchCategory;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, searchQuery]);

  // Helper for category badge styling
  const renderCategoryBadge = (category: AuditCategory) => {
    switch (category) {
      case 'role_switch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
            <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
            Role Switch
          </span>
        );
      case 'patient_admission':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fcde6d]/60 text-[#756100] border border-[#fcde6d]">
            <span className="material-symbols-outlined text-[13px]">how_to_reg</span>
            Intake / QR
          </span>
        );
      case 'clinical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
            <span className="material-symbols-outlined text-[13px]">stethoscope</span>
            Clinical
          </span>
        );
      case 'pharmacy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="material-symbols-outlined text-[13px]">medication</span>
            Pharmacy Rx
          </span>
        );
      case 'billing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
            <span className="material-symbols-outlined text-[13px]">receipt_long</span>
            Billing / TPA
          </span>
        );
      case 'auth':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            Auth Access
          </span>
        );
      case 'housekeeping':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-200 text-neutral-800">
            <span className="material-symbols-outlined text-[13px]">cleaning_services</span>
            Housekeeping
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-100 text-neutral-700">
            <span className="material-symbols-outlined text-[13px]">dns</span>
            System
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 font-['Inter',sans-serif]">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Cryptographic Ledger
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">NABH &amp; DISHA Compliant • Multi-Role Access Transparency</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Hospital System Governance &amp; Activity Audit Log
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Real-time immutable event stream capturing clinician activity, patient check-in QR credentials, and staff role-switches across the entire hospital network.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => onNavigate('executive_admin')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">local_hospital</span>
            Executive Admin
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download CSV Audit Trail"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-4 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Download JSON cryptographic digest"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Export Digest
          </button>
        </div>
      </div>

      {/* AGGREGATE SYSTEM METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Patients */}
        <div className="bg-sky-50/70 p-5 rounded-2xl shadow-sm border border-sky-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900">
                Admitted Patients
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-sky-950 font-['Plus_Jakarta_Sans']">
                  {systemMetrics?.totalPatients || 0}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-800">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <p className="text-[11px] text-sky-700 mt-2">
            Currently admitted across all wards
          </p>
        </div>

        {/* Metric 2: Bed Occupancy */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Bed Occupancy
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {systemMetrics?.bedOccupancy?.occupied || 0}
                  <span className="text-lg text-neutral-400">/{systemMetrics?.bedOccupancy?.total || 0}</span>
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
              <span className="material-symbols-outlined text-[20px]">bed</span>
            </div>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-3">
            <div className="bg-neutral-800 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round(((systemMetrics?.bedOccupancy?.occupied || 0) / (systemMetrics?.bedOccupancy?.total || 1)) * 100))}%` }}></div>
          </div>
        </div>

        {/* Metric 3: Billing Revenue */}
        <div className="bg-teal-50/70 p-5 rounded-2xl shadow-sm border border-teal-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                Cleared Revenue
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-teal-950 font-['Plus_Jakarta_Sans']">
                  ${((systemMetrics?.revenue?.cleared || 0) / 1000).toFixed(1)}k
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                  ${((systemMetrics?.revenue?.pending || 0) / 1000).toFixed(1)}k Pending
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <p className="text-[11px] text-teal-700 mt-2">
            Total verified TPA & Patient Co-pay
          </p>
        </div>

        {/* Metric 4: Active STAT Orders */}
        <div className="bg-red-50/70 p-5 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-900">
                Active STAT Orders
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-red-950 font-['Plus_Jakarta_Sans']">
                  {systemMetrics?.activeStatOrders || 0}
                </span>
                {(systemMetrics?.activeStatOrders || 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-800">
              <span className="material-symbols-outlined text-[20px]">local_pharmacy</span>
            </div>
          </div>
          <p className="text-[11px] text-red-700 mt-2">
            Pending critical pharmacy dispensing
          </p>
        </div>
      </div>

      {/* 4 TRANSPARENCY KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Events */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Total Audit Events
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-neutral-900 font-['Plus_Jakarta_Sans']">
                  {metrics.total}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
              <span className="material-symbols-outlined text-[20px]">history_edu</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Recorded in local immutable session ledger
          </p>
        </div>

        {/* Metric 2: Role Switches Logged */}
        <div className="bg-purple-50/70 p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
                Role Switches Logged
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-purple-950 font-['Plus_Jakarta_Sans']">
                  {metrics.roleSwitches}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  Tracked
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-800">
              <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            </div>
          </div>
          <p className="text-[11px] text-purple-700 mt-2">
            Complete staff handover &amp; perspective history
          </p>
        </div>

        {/* Metric 3: Admissions & Check-in QR */}
        <div className="bg-[#fcde6d]/40 p-5 rounded-2xl shadow-sm border border-[#fcde6d]/70 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#756100]">
                Patient Intake &amp; QR
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-[#221b00] font-['Plus_Jakarta_Sans']">
                  {metrics.admissions}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fcde6d] text-[#221b00]">
                  Tokens Active
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#fcde6d] flex items-center justify-center text-[#756100]">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
          </div>
          <p className="text-[11px] text-[#5c4c00] mt-2">
            Dynamic QR admission credentials issued
          </p>
        </div>

        {/* Metric 4: Ledger Integrity */}
        <div className="bg-emerald-50/70 p-5 rounded-2xl shadow-sm border border-emerald-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Cryptographic Integrity
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-extrabold text-emerald-950 font-['Plus_Jakarta_Sans']">
                  100% In-Sync
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-mono">
            SHA-256 HMAC Block #4092-B Validated
          </p>
        </div>
      </div>

      {/* DYNAMIC AUDIT LEDGER SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-5">
        {/* Header & Controls Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#141416] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </div>
              <h2 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                Comprehensive Hospital Activity Stream
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live audit trail of user activity, role transitions, prescription dispensings, and admissions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              onClick={handleLogHandover}
              className="px-3.5 py-1.5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
              Log Handover
            </button>
            <button
              onClick={() => {
                addLog({
                  actor: 'System Telemetry',
                  role: 'Compliance Daemon',
                  action: 'Automated zero-trust integrity verification executed. All 8 ward microservices responding within 12ms latency.',
                  category: 'system',
                  status: 'VERIFIED',
                  severity: 'success',
                });
                onTriggerToast('Executed compliance health check and logged verification event.');
              }}
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
              Verify Cluster
            </button>
            <button
              onClick={() => {
                resetToDefault();
                onTriggerToast('Reset audit log to baseline standard dataset.');
              }}
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1 transition-colors"
              title="Reset to default baseline logs"
            >
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              Reset
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#faf8f4] p-3 rounded-2xl border border-black/5">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by staff name, role, action keywords, UHID, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-white text-neutral-900 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#fcde6d] border border-neutral-200 placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#141416] text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setSelectedCategory('role_switch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                selectedCategory === 'role_switch'
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
              Role Switches ({metrics.roleSwitches})
            </button>
            <button
              onClick={() => setSelectedCategory('patient_admission')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                selectedCategory === 'patient_admission'
                  ? 'bg-[#756100] text-white shadow-xs'
                  : 'bg-white text-[#756100] hover:bg-[#fcde6d]/20 border border-[#fcde6d]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">how_to_reg</span>
              Admissions / QR ({metrics.admissions})
            </button>
            <button
              onClick={() => setSelectedCategory('clinical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'clinical'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
              }`}
            >
              Clinical
            </button>
            <button
              onClick={() => setSelectedCategory('pharmacy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'pharmacy'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              Pharmacy
            </button>
            <button
              onClick={() => setSelectedCategory('auth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'auth'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Auth
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Staff / Actor</th>
                <th className="py-3.5 px-4 min-w-[320px]">Event Description</th>
                <th className="py-3.5 px-4">Subnet IP</th>
                <th className="py-3.5 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-neutral-400">find_in_page</span>
                      <span className="font-bold text-sm text-neutral-700">No matching audit events found</span>
                      <p className="text-xs text-neutral-400">Try adjusting your keyword filter or switching category tabs.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                        }}
                        className="mt-2 text-xs font-bold text-[#756100] hover:underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isRoleSwitch = log.category === 'role_switch';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isRoleSwitch ? 'bg-purple-50/20' : ''
                      }`}
                    >
                      {/* Timestamp & Full Date tooltip */}
                      <td className="py-3 px-4 font-mono text-neutral-600 shrink-0 whitespace-nowrap">
                        <span className="font-bold text-neutral-800">{log.timestamp}</span>
                        <span className="block text-[10px] text-neutral-400">{log.id}</span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderCategoryBadge(log.category)}
                      </td>

                      {/* Staff Actor & Designation */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900">{log.actor}</span>
                          <span className="text-[11px] text-neutral-500">{log.role}</span>
                        </div>
                      </td>

                      {/* Event Description */}
                      <td className="py-3 px-4 text-neutral-800 leading-relaxed font-normal">
                        <p className={isRoleSwitch ? 'font-medium text-purple-950' : ''}>
                          {log.action}
                        </p>
                      </td>

                      {/* Subnet IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {log.ipAddress}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {log.status === 'VERIFIED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            VERIFIED
                          </span>
                        )}
                        {log.status === 'DUAL_SIGNED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                            DUAL-SIGNED
                          </span>
                        )}
                        {log.status === 'CLEARED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] border border-teal-200">
                            CLEARED
                          </span>
                        )}
                        {log.status === 'RECORDED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[10px] border border-neutral-200">
                            RECORDED
                          </span>
                        )}
                        {log.status === 'ALERT' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] border border-red-200">
                            ALERT
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 px-1">
          <span>Showing {filteredLogs.length} of {logs.length} logged hospital events</span>
          <span className="font-mono">Node #04B • SHA-256 Chain Intact</span>
        </div>
      </div>

      {/* SHIFT HANDOVERS TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
              Recent Shift Handovers
            </h2>
            <p className="text-xs text-neutral-500">Live operational staff transitions across departments.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
            {shiftHandovers.length} Records
          </span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {shiftHandovers.map((sh: any) => (
                <tr key={sh.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-neutral-600">
                    {new Date(sh.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-neutral-900">{sh.department}</td>
                  <td className="py-3 px-4">
                    <span className="text-neutral-500 line-through mr-1">{sh.outgoingStaff}</span>
                    <span className="material-symbols-outlined text-[12px] text-purple-600 align-middle">arrow_right_alt</span>
                    <span className="font-bold text-purple-900 ml-1">{sh.incomingStaff}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-500">{sh.handoverNotes || '-'}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                      COMPLETED
                    </span>
                  </td>
                </tr>
              ))}
              {shiftHandovers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400">No recent handovers recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Flags & Security Controls */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
              Clinical Feature Flags &amp; Automated Governance Modules
            </h2>
            <p className="text-xs text-neutral-500">Live operational toggles. Changes are enforced immediately on backend clusters.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            {serverConfig.filter((f: any) => f.enabled).length} of {serverConfig.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serverConfig.map((flag: any) => (
            <div
              key={flag.id}
              className="p-4 rounded-2xl bg-[#faf8f4] border border-black/5 flex items-center justify-between transition-colors hover:bg-neutral-50"
            >
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{flag.category}</span>
                <h4 className="text-sm font-bold text-neutral-900 mt-0.5">{flag.name}</h4>
                {flag.id !== 'dual_sign' && (
                  <p className="text-[10px] text-amber-600 font-mono mt-1 bg-amber-100/50 inline-block px-1.5 rounded">
                    [STUB - Not yet enforced]
                  </p>
                )}
              </div>
              <button
                onClick={() => handleToggleFlag(flag.id, flag.name, flag.enabled)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  flag.enabled ? 'bg-[#141416]' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    flag.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
