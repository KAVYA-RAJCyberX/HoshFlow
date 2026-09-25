/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * dischargeNotificationService.ts
 * Centralized Discharge Status & Turnover Notification Bus.
 * Directly alerts the Bed Manager and Nursing Station via real-time toast messages,
 * telemetry broadcasts, and sound alerts when a patient's discharge status changes to 'Ready for Cleaning'.
 */

import { RoleType } from '../types';
import { alertSoundService } from './alertSoundService';
import { auditLogService } from './auditLogService';

export interface DischargeStatusNotification {
  id: string;
  uhid: string;
  patientName: string;
  bed: string;
  ward: string;
  prevStatus: string;
  newStatus: 'Ready for Cleaning' | string;
  timestamp: string;
  fullDate: string;
  targetRoles: RoleType[];
  toastMessage: string;
  unread: boolean;
  severity: 'critical' | 'warning' | 'info' | 'success';
  source?: string;
}

type NotificationListener = (
  notifications: DischargeStatusNotification[],
  latest?: DischargeStatusNotification
) => void;

type StatusListener = (statuses: Record<string, string>) => void;
type ToastCallback = (msg: string) => void;

const STORAGE_NOTIFS_KEY = 'hosflow_discharge_notifications_v1';
const STORAGE_STATUS_KEY = 'hosflow_patient_discharge_statuses_v1';

class DischargeNotificationService {
  private notifications: DischargeStatusNotification[] = [];
  private patientStatuses: Record<string, string> = {};
  private listeners: Set<NotificationListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private globalToastCallbacks: Set<ToastCallback> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const storedNotifs = localStorage.getItem(STORAGE_NOTIFS_KEY);
      if (storedNotifs) {
        this.notifications = JSON.parse(storedNotifs);
      } else {
        // Seed initial notifications so notification drawers show realistic activity
        this.notifications = [
          {
            id: 'notif-seed-01',
            uhid: 'UHID-884145',
            patientName: 'Aarav Patil',
            bed: 'P-104',
            ward: 'Pediatric Care',
            prevStatus: 'Gate Pass Authorized',
            newStatus: 'Ready for Cleaning',
            timestamp: '11:15 AM',
            fullDate: new Date(Date.now() - 42 * 60 * 1000).toLocaleString(),
            targetRoles: ['bed_manager', 'nurse', 'housekeeping'],
            toastMessage: "🚨 [BED MANAGER & NURSING STATION ALERT] Aarav Patil (P-104, Pediatric Care) discharge status changed to 'Ready for Cleaning'. Bed turnover initiated.",
            unread: false,
            severity: 'warning',
            source: 'Ward Sister (Pediatrics)',
          },
        ];
      }

      const storedStatuses = localStorage.getItem(STORAGE_STATUS_KEY);
      if (storedStatuses) {
        this.patientStatuses = JSON.parse(storedStatuses);
      } else {
        this.patientStatuses = {
          'UHID-884102': 'Gate Pass Issued',
          'UHID-884119': 'TPA Dispute Hold',
          'UHID-884091': 'Planned Routine',
          'UHID-884145': 'Ready for Cleaning',
          'HOS-2026-1001': 'Discharge Planned',
          'HOS-2026-1002': 'Discharge Hold',
        };
      }
    } catch (err) {
      console.warn('Error loading discharge notification state:', err);
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(this.notifications.slice(0, 50)));
      localStorage.setItem(STORAGE_STATUS_KEY, JSON.stringify(this.patientStatuses));
    } catch (err) {
      console.warn('Error persisting discharge notification state:', err);
    }
  }

  public registerToastHandler(callback: ToastCallback): () => void {
    this.globalToastCallbacks.add(callback);
    return () => this.globalToastCallbacks.delete(callback);
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener({ ...this.patientStatuses });
    return () => this.statusListeners.delete(listener);
  }

  public getNotifications(): DischargeStatusNotification[] {
    return [...this.notifications];
  }

  public getPatientStatus(uhid: string): string {
    return this.patientStatuses[uhid] || 'Admitted';
  }

  public getUnreadCount(role?: RoleType): number {
    if (!role) {
      return this.notifications.filter((n) => n.unread).length;
    }
    return this.notifications.filter(
      (n) => n.unread && (n.targetRoles.includes(role) || role === 'super_admin' || role === 'hospital_admin')
    ).length;
  }

  public markAsRead(id: string) {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
    this.saveState();
    this.emitNotifications();
  }

  public markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, unread: false }));
    this.saveState();
    this.emitNotifications();
  }

  public clearAll() {
    this.notifications = [];
    this.saveState();
    this.emitNotifications();
  }

  /**
   * Primary method to transition a patient's discharge status to 'Ready for Cleaning'.
   * Dispatches alerts to Bed Manager and Nursing Station via real-time toast messages.
   */
  public notifyReadyForCleaning(
    patient: {
      uhid: string;
      name: string;
      bed: string;
      ward: string;
      prevStatus?: string;
      attending?: string;
    },
    source: string = 'Discharge Desk / Charge Nurse'
  ): string {
    const prevStatus = patient.prevStatus || this.patientStatuses[patient.uhid] || 'Admitted';
    const newStatus = 'Ready for Cleaning';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDate = now.toLocaleString();

    // Prominent toast message specifically identifying Bed Manager and Nursing Station target
    const toastMsg = `🚨 [BED MANAGER & NURSING STATION ALERT] Patient ${patient.name} (${patient.bed}, ${patient.ward}) discharge status is now 'Ready for Cleaning'. Housekeeping turnover dispatched!`;

    const newNotification: DischargeStatusNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      uhid: patient.uhid,
      patientName: patient.name,
      bed: patient.bed,
      ward: patient.ward,
      prevStatus,
      newStatus,
      timestamp: timeStr,
      fullDate,
      targetRoles: ['bed_manager', 'nurse', 'housekeeping'],
      toastMessage: toastMsg,
      unread: true,
      severity: 'warning',
      source,
    };

    // 1. Update internal state
    this.notifications = [newNotification, ...this.notifications];
    this.patientStatuses[patient.uhid] = newStatus;
    this.saveState();

    // 2. Play audio notification chime
    alertSoundService.playAlertSound(false);

    // 3. Log to audit ledger
    auditLogService.addLog({
      actor: source,
      role: 'Discharge Coordinator & Bed Flow',
      action: `Discharge Status Update: Patient [${patient.name}] (${patient.uhid}) Bed [${patient.bed}] marked 'Ready for Cleaning'. Telemetry toast alerted Bed Manager and Nursing Station. Turnover task queued.`,
      category: 'discharge',
      severity: 'warning',
      status: 'VERIFIED',
      metadata: {
        uhid: patient.uhid,
        bed: patient.bed,
        ward: patient.ward,
        prevStatus,
        newStatus,
        targetRoles: ['bed_manager', 'nurse'],
      },
    });

    // 4. Trigger all registered toast callbacks
    this.globalToastCallbacks.forEach((cb) => {
      try {
        cb(toastMsg);
      } catch (e) {
        console.error('Toast callback error:', e);
      }
    });

    // 5. Emit updates to all listeners
    this.emitNotifications(newNotification);
    this.emitStatus();

    return toastMsg;
  }

  /**
   * Set custom discharge status
   */
  public updateStatus(uhid: string, status: string) {
    this.patientStatuses[uhid] = status;
    this.saveState();
    this.emitStatus();
  }

  private emitNotifications(latest?: DischargeStatusNotification) {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.notifications], latest);
      } catch (e) {
        console.error('Notification listener error:', e);
      }
    });
  }

  private emitStatus() {
    this.statusListeners.forEach((listener) => {
      try {
        listener({ ...this.patientStatuses });
      } catch (e) {
        console.error('Status listener error:', e);
      }
    });
  }
}

export const dischargeNotificationService = new DischargeNotificationService();
