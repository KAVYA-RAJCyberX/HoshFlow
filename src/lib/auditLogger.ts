import { api } from './api';

export type AuditCategory = 
  | 'role_switch' 
  | 'auth' 
  | 'patient_admission' 
  | 'clinical' 
  | 'pharmacy' 
  | 'billing' 
  | 'housekeeping'
  | 'discharge'
  | 'system';

export type AuditStatus = 'VERIFIED' | 'DUAL_SIGNED' | 'CLEARED' | 'RECORDED' | 'ALERT';
export type AuditSeverity = 'info' | 'warning' | 'critical' | 'success';

interface AuditLogPayload {
  actor: string;
  role: string;
  action: string;
  category: AuditCategory;
  status: AuditStatus;
  severity: AuditSeverity;
  metadata?: Record<string, any>;
}

/**
 * Replaces the local mock auditLogService with a permanent API ledger POST.
 */
export const logAuditAction = async (payload: AuditLogPayload) => {
  try {
    await api.post('/audit-logs', payload);
  } catch (error) {
    console.error('CRITICAL: Failed to write to audit ledger', error);
  }
};
