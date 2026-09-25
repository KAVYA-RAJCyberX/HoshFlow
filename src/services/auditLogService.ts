import { useState, useEffect } from 'react';
import { AuditLogEntry, AuditCategory, AuditStatus, AuditSeverity } from '../types';

const STORAGE_KEY = 'hosflow_clinical_audit_log';

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-8801',
    timestamp: '11:48:12',
    fullDate: '2026-09-25 11:48:12',
    actor: 'Dr. Anand Joshi',
    role: 'Doctor Lead',
    action: 'Signed Clinical Discharge Summary for UHID-884102 (Priya Sen). Prescribed 5-day post-op oral antibiotics.',
    category: 'clinical',
    ipAddress: '10.20.4.12',
    status: 'VERIFIED',
    severity: 'success',
  },
  {
    id: 'AUD-8802',
    timestamp: '11:45:00',
    fullDate: '2026-09-25 11:45:00',
    actor: 'Pooja Kadam',
    role: 'Reception Desk Lead',
    action: 'Role-switch: Transferred active workstation session from [Doctor Lead] to [Emergency Reception Intake].',
    category: 'role_switch',
    ipAddress: '10.20.1.10',
    status: 'RECORDED',
    severity: 'info',
  },
  {
    id: 'AUD-8803',
    timestamp: '11:42:05',
    fullDate: '2026-09-25 11:42:05',
    actor: 'Sunita Nair, RN',
    role: 'Nursing Sister',
    action: 'Administered IV Ceftriaxone 1g to Bed B-302. Vitals stable: SpO2 99%, HR 74 bpm.',
    category: 'clinical',
    ipAddress: '10.20.4.18',
    status: 'VERIFIED',
    severity: 'info',
  },
  {
    id: 'AUD-8804',
    timestamp: '11:39:18',
    fullDate: '2026-09-25 11:39:18',
    actor: 'Pooja Kadam',
    role: 'Reception Intake',
    action: 'Patient Admission: Admitted Smt. Anjali Joshi (UH-9402) into Bay 204. Generated ABHA/QR Check-in Pass.',
    category: 'patient_admission',
    ipAddress: '10.20.1.10',
    status: 'VERIFIED',
    severity: 'success',
  },
  {
    id: 'AUD-8805',
    timestamp: '11:35:50',
    fullDate: '2026-09-25 11:35:50',
    actor: 'K. Ramanathan',
    role: 'Chief Pharmacist',
    action: 'Narcotic Schedule X Safe Access: Fentanyl 50mcg ampoule dispensed for OT-2 Cardiac Suite.',
    category: 'pharmacy',
    ipAddress: '10.20.8.02',
    status: 'DUAL_SIGNED',
    severity: 'warning',
  },
  {
    id: 'AUD-8806',
    timestamp: '11:30:22',
    fullDate: '2026-09-25 11:30:22',
    actor: 'Dr. Vikram Malhotra',
    role: 'Medical Superintendent',
    action: 'Role-switch: Transferred active workstation session from [Bed Flow Director] to [Executive Admin Directorate].',
    category: 'role_switch',
    ipAddress: '10.20.2.04',
    status: 'RECORDED',
    severity: 'info',
  },
  {
    id: 'AUD-8807',
    timestamp: '11:21:18',
    fullDate: '2026-09-25 11:21:18',
    actor: 'Meena Kadam',
    role: 'Billing Lead',
    action: 'Approved Cashless Claim ₹85,000 via Star Health Insurance API Gateway for UH-9402.',
    category: 'billing',
    ipAddress: '10.20.12.44',
    status: 'CLEARED',
    severity: 'success',
  },
  {
    id: 'AUD-8808',
    timestamp: '11:15:04',
    fullDate: '2026-09-25 11:15:04',
    actor: 'Ramesh Kumar',
    role: 'Housekeeping Lead',
    action: 'Bed S-202 sterilization terminal sign-off: UV-C sanitized & linen replaced. Bay marked READY.',
    category: 'housekeeping',
    ipAddress: '10.20.5.88',
    status: 'VERIFIED',
    severity: 'info',
  },
  {
    id: 'AUD-8809',
    timestamp: '11:05:40',
    fullDate: '2026-09-25 11:05:40',
    actor: 'System Telemetry',
    role: 'Auto-Daemon',
    action: 'Liquid Medical Oxygen (LMO) sensor telemetry sync: 8,200L normal tank pressure (4.2 bar).',
    category: 'system',
    ipAddress: '127.0.0.1',
    status: 'RECORDED',
    severity: 'info',
  },
  {
    id: 'AUD-8810',
    timestamp: '10:52:19',
    fullDate: '2026-09-25 10:52:19',
    actor: 'Dr. Rajeshwari Sen',
    role: 'IT Governance Officer',
    action: 'Role-switch: Authenticated governance console access from [Hospital Admin] to [System Governance & Security].',
    category: 'role_switch',
    ipAddress: '10.20.0.01',
    status: 'VERIFIED',
    severity: 'info',
  }
];

class AuditLogService {
  private logs: AuditLogEntry[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.fetchData();
  }

  private async fetchData() {
    try {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        this.logs = await res.json();
        this.notify();
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    }
  }

  private persist() {
    // No-op, now handled by fetch
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Audit listener error:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  public addLog(entry: {
    actor: string;
    role: string;
    action: string;
    category: AuditCategory;
    ipAddress?: string;
    status?: AuditStatus;
    severity?: AuditSeverity;
    metadata?: Record<string, any>;
  }): AuditLogEntry {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // "11:48:12"
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

    const newLog: AuditLogEntry = {
      id: `AUD-${Math.floor(8900 + Math.random() * 9000)}`,
      timestamp: timeStr,
      fullDate: dateStr,
      actor: entry.actor,
      role: entry.role,
      action: entry.action,
      category: entry.category,
      ipAddress: entry.ipAddress || '10.20.4.' + (10 + Math.floor(Math.random() * 80)),
      status: entry.status || 'VERIFIED',
      severity: entry.severity || (entry.category === 'role_switch' ? 'info' : 'success'),
      metadata: entry.metadata,
    };

    // Prepend to maintain newest-first order
    this.logs = [newLog, ...this.logs.slice(0, 249)];
    this.notify();
    
    const token = localStorage.getItem('hosflow_jwt') || '';
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...entry,
        ipAddress: newLog.ipAddress,
        status: newLog.status,
        severity: newLog.severity
      })
    }).catch(console.error);
    
    return newLog;
  }

  public logRoleSwitch(
    actor: string,
    previousRole: string,
    newRole: string,
    clientIp?: string
  ): AuditLogEntry {
    const formatRoleName = (r: string) =>
      r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return this.addLog({
      actor: actor || 'Authorized Staff',
      role: formatRoleName(newRole),
      action: `Role-switch: Transferred active workstation console from [${formatRoleName(
        previousRole
      )}] to [${formatRoleName(newRole)}]. Access tokens regenerated.`,
      category: 'role_switch',
      ipAddress: clientIp || '10.20.3.15',
      status: 'RECORDED',
      severity: 'info',
    });
  }

  public clearLogs() {
    this.logs = [];
    this.persist();
  }

  public resetToDefault() {
    this.logs = [...INITIAL_AUDIT_LOGS];
    this.persist();
  }

  public exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hosflow-audit-digest-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public exportCSV() {
    const headers = ['ID', 'Timestamp', 'Full Date', 'Actor', 'Role', 'Category', 'Action', 'IP Address', 'Status', 'Severity'];
    const rows = this.logs.map((log) => [
      log.id,
      log.timestamp,
      log.fullDate,
      `"${log.actor.replace(/"/g, '""')}"`,
      `"${log.role.replace(/"/g, '""')}"`,
      log.category,
      `"${log.action.replace(/"/g, '""')}"`,
      log.ipAddress,
      log.status,
      log.severity,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hosflow-audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export const auditLogService = new AuditLogService();

/**
 * Custom React hook to subscribe to audit logs in real-time
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => auditLogService.getLogs());

  useEffect(() => {
    const unsubscribe = auditLogService.subscribe(() => {
      setLogs(auditLogService.getLogs());
    });
    return unsubscribe;
  }, []);

  return {
    logs,
    addLog: auditLogService.addLog.bind(auditLogService),
    logRoleSwitch: auditLogService.logRoleSwitch.bind(auditLogService),
    clearLogs: auditLogService.clearLogs.bind(auditLogService),
    resetToDefault: auditLogService.resetToDefault.bind(auditLogService),
    exportJSON: auditLogService.exportJSON.bind(auditLogService),
    exportCSV: auditLogService.exportCSV.bind(auditLogService),
  };
}
