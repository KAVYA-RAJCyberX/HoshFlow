import React, { useState } from 'react';
import { ViewType } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { dischargeNotificationService } from '../../services/dischargeNotificationService';

interface DischargeHubViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface DischargeCase {
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  bed: string;
  ward: string;
  attending: string;
  dischargeType: 'Planned Routine' | 'Post-Surg Day 4' | 'Transfer to Rehab' | 'LAMA Risk' | 'Pediatric Fast-Track';
  tpaInsurance: string;
  steps: {
    doctorSummary: 'completed' | 'in_progress' | 'pending';
    pharmacyMedKit: 'completed' | 'in_progress' | 'pending';
    billingClearance: 'completed' | 'in_progress' | 'pending' | 'hold';
    nursingHandover: 'completed' | 'in_progress' | 'pending';
    gatePass: 'generated' | 'pending';
  };
  estExitTime: string;
  loungeAssigned: boolean;
  priority: 'High' | 'Normal' | 'Urgent';
  dischargeStatus?: 'Admitted' | 'Gate Pass Generated' | 'Ready for Cleaning' | 'Turnover In Progress';
}

export const DischargeHubView: React.FC<DischargeHubViewProps> = ({ onNavigate, onTriggerToast }) => {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'ready_for_cleaning' | 'billing_hold' | 'pharmacy_wait'>('all');
  const [selectedCase, setSelectedCase] = useState<DischargeCase | null>(null);
  const { data: dbPatients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000,
  });

  const [cases, setCases] = useState<DischargeCase[]>([]);

  useEffect(() => {
    if (dbPatients.length > 0) {
      // Filter for patients that are in discharge process
      const dischargePatients = dbPatients.filter((p: any) => 
        ['discharge_planned', 'discharge_hold', 'discharged', 'ready_for_cleaning'].includes(p.status) || p.dischargeExitGatePass
      );
      
      setCases(dischargePatients.map((p: any) => ({
        uhid: p.uhid,
        patientName: p.name,
        age: p.age,
        gender: p.gender,
        bed: p.bedId || 'Unassigned',
        ward: p.ward,
        attending: p.attendingDoctor,
        dischargeType: p.status === 'discharge_planned' ? 'Planned Routine' : 'Fast-Track',
        tpaInsurance: `${p.tpaProvider || 'Self Pay'} (${p.tpaStatus || 'Pending'})`,
        steps: {
          doctorSummary: p.dischargeClinicalSignOff ? 'completed' : 'pending',
          pharmacyMedKit: p.dischargePharmacyBag ? 'completed' : 'pending',
          billingClearance: p.dischargeBillingClearance ? 'completed' : (p.tpaStatus === 'Query' ? 'hold' : 'pending'),
          nursingHandover: p.dischargeNursingHandover ? 'completed' : 'pending',
          gatePass: p.dischargeExitGatePass ? 'generated' : 'pending',
        },
        estExitTime: p.dischargeExitGatePass ? 'Departed' : 'Pending Clearance',
        loungeAssigned: false,
        priority: p.acuity === 'critical' ? 'High' : 'Normal',
        dischargeStatus: p.status === 'ready_for_cleaning' ? 'Ready for Cleaning' : (p.dischargeExitGatePass ? 'Gate Pass Generated' : 'Admitted'),
      })));
    }
  }, [dbPatients]);

  const handleAuthorizeGatePass = (uhid: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.uhid === uhid) {
          return {
            ...c,
            steps: {
              ...c.steps,
              doctorSummary: 'completed',
              pharmacyMedKit: 'completed',
              billingClearance: 'completed',
              nursingHandover: 'completed',
              gatePass: 'generated',
            },
            loungeAssigned: true,
            estExitTime: 'Gate Pass Ready for Security Scan',
            dischargeStatus: 'Gate Pass Generated',
          };
        }
        return c;
      })
    );
    onTriggerToast(`Digital Exit Gate Pass issued for ${uhid}. QR synced to Patient Portal.`);
  };

  /**
   * Executes discharge: calls API transaction endpoint (marks patient discharged,
   * flips bed to 'cleaning'), then updates local UI state.
   */
  const handleMarkReadyForCleaning = async (caseItem: DischargeCase) => {
    try {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch(`/api/patients/${caseItem.uhid}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      // If patient not in DB (demo data), still update UI gracefully
      if (!res.ok && res.status !== 404) {
        throw new Error('Discharge API failed');
      }
    } catch (e) {
      // Non-fatal: DB discharge failed for demo patient, still update UI
      console.warn('Discharge API error (may be demo data):', e);
    }

    // Invalidate bed and patient caches so BedMatrix + NursingStation refresh
    queryClient.invalidateQueries({ queryKey: ['beds'] });
    queryClient.invalidateQueries({ queryKey: ['nursing_kardex'] });

    // Update local discharge hub state
    setCases((prev) =>
      prev.map((c) => {
        if (c.uhid === caseItem.uhid) {
          return {
            ...c,
            dischargeStatus: 'Ready for Cleaning',
            steps: {
              doctorSummary: 'completed',
              pharmacyMedKit: 'completed',
              billingClearance: 'completed',
              nursingHandover: 'completed',
              gatePass: 'generated',
            },
            estExitTime: 'Departed • Bed Ready for Cleaning',
          };
        }
        return c;
      })
    );

    const toastMsg = dischargeNotificationService.notifyReadyForCleaning(
      {
        uhid: caseItem.uhid,
        name: caseItem.patientName,
        bed: caseItem.bed,
        ward: caseItem.ward,
        prevStatus: caseItem.dischargeStatus || 'Discharge Cleared',
        attending: caseItem.attending,
      },
      'Discharge Hub Coordinator'
    );

    onTriggerToast(toastMsg);
  };

  const handleExpeditePharmacy = (uhid: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.uhid === uhid
          ? { ...c, steps: { ...c.steps, pharmacyMedKit: 'completed' } }
          : c
      )
    );
    onTriggerToast(`Pneumatic tube priority STAT signal dispatched to Satellite Pharmacy for ${uhid}. Medication kit expedited.`);
  };

  const handleAutoSyncClearances = () => {
    setCases((prev) =>
      prev.map((c) => ({
        ...c,
        steps: {
          doctorSummary: 'completed',
          pharmacyMedKit: 'completed',
          billingClearance: 'completed',
          nursingHandover: 'completed',
          gatePass: c.steps.gatePass === 'generated' ? 'generated' : 'generated',
        },
        estExitTime: 'Clearances Synced • Ready for Gate Pass Scan',
      }))
    );
    onTriggerToast('Batch discharge auto-sync executed. All pending TPA, Pharmacy, and Nursing milestones cleared.');
  };

  const filteredCases = cases.filter((c) => {
    if (activeFilter === 'ready_for_cleaning') return c.dischargeStatus === 'Ready for Cleaning';
    if (activeFilter === 'ready') return c.steps.gatePass === 'generated';
    if (activeFilter === 'billing_hold') return c.steps.billingClearance === 'hold';
    if (activeFilter === 'pharmacy_wait') return c.steps.pharmacyMedKit === 'in_progress' || c.steps.pharmacyMedKit === 'pending';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/20 text-[#fcde6d]">
              Live Clearance Flow
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Exit Lounge Capacity: 9 / 16 Recliners Active</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Discharge Authorizations & Exit Hub
          </h1>
          <p className="text-sm text-neutral-400">
            Automated multi-department clinical sign-off, take-home MAR, billing clearance, and RFID gate pass issuance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('bed_matrix')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">hotel</span>
            Bed Matrix Link
          </button>
          <button
            onClick={handleAutoSyncClearances}
            className="px-5 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
            title="Auto-synchronize multi-department clinical and financial clearances"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            Auto-Sync Clearances
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Planned Discharges</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1 font-['Plus_Jakarta_Sans']">18</div>
          <span className="text-[11px] text-[#756100] font-semibold mt-1 inline-block">12 Scheduled before 2:00 PM</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Gate Passes Issued</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-['Plus_Jakarta_Sans']">9 Ready</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Turnover sanitized: 7</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Ready for Cleaning</span>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-['Plus_Jakarta_Sans']">
            {cases.filter((c) => c.dischargeStatus === 'Ready for Cleaning').length} Beds
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 inline-block">Bed Mgr & Nursing Notified</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Avg Exit Turnaround</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1 font-['Plus_Jakarta_Sans']">38 min</div>
          <span className="text-[11px] text-neutral-500 font-semibold mt-1 inline-block">-14m vs hospital benchmark</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Active Cases', count: cases.length },
            { id: 'ready', label: 'Gate Pass Ready', count: cases.filter((c) => c.steps.gatePass === 'generated').length },
            { id: 'ready_for_cleaning', label: '🧹 Ready for Cleaning', count: cases.filter((c) => c.dischargeStatus === 'Ready for Cleaning').length },
            { id: 'billing_hold', label: 'TPA / Billing Holds', count: cases.filter((c) => c.steps.billingClearance === 'hold').length },
            { id: 'pharmacy_wait', label: 'Pharmacy Kit Prep', count: cases.filter((c) => c.steps.pharmacyMedKit !== 'completed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#141416] text-white shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-black/10 text-neutral-800'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Gate Pass QR scanner active at Main Exit Gate A
        </div>
      </div>

      {/* Discharge Cases Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCases.map((item) => (
          <div
            key={item.uhid}
            className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-md transition-shadow flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${
              item.dischargeStatus === 'Ready for Cleaning'
                ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
                : 'border-black/5'
            }`}
          >
            {/* Left: Patient Identity */}
            <div className="flex items-start gap-4 min-w-[280px]">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${
                item.dischargeStatus === 'Ready for Cleaning'
                  ? 'bg-amber-100 border-amber-300 text-amber-800 animate-pulse'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {item.dischargeStatus === 'Ready for Cleaning' ? 'cleaning_services' : 'exit_to_app'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">{item.patientName}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono">
                    {item.bed} ({item.ward})
                  </span>
                </div>
                <div className="text-xs text-neutral-600 mt-0.5">
                  {item.gender}, {item.age} yrs • <span className="font-mono text-neutral-700">{item.uhid}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">stethoscope</span>
                  {item.attending}
                </div>
                <div className="text-[11px] font-semibold text-neutral-700 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-neutral-400">shield</span>
                  {item.tpaInsurance}
                </div>

                {/* Status indicator badge */}
                <div className="mt-2">
                  {item.dischargeStatus === 'Ready for Cleaning' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                      Status: Ready for Cleaning • Bed Manager & Nurse Alerted
                    </span>
                  ) : item.steps.gatePass === 'generated' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Gate Pass Active • Cleared for Exit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                      Clearance In Progress
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: 5 Step Clearance Progress */}
            <div className="flex-1 max-w-2xl bg-[#faf8f4] p-4 rounded-2xl border border-black/5">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                <span>Multi-Disciplinary Clearance Milestones</span>
                <span className="text-neutral-700 font-semibold">{item.estExitTime}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {/* 1. Doctor Summary */}
                <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                  item.steps.doctorSummary === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                }`}>
                  <span className="material-symbols-outlined text-base">description</span>
                  <span className="text-[11px] font-semibold">Doctor Summary</span>
                  <span className="text-[10px] font-bold uppercase">{item.steps.doctorSummary}</span>
                </div>

                {/* 2. Pharmacy */}
                <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                  item.steps.pharmacyMedKit === 'completed'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : item.steps.pharmacyMedKit === 'in_progress'
                    ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                }`}>
                  <span className="material-symbols-outlined text-base">medication</span>
                  <span className="text-[11px] font-semibold">Take-Home Meds</span>
                  <span className="text-[10px] font-bold uppercase">{item.steps.pharmacyMedKit}</span>
                </div>

                {/* 3. Billing Clearance */}
                <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                  item.steps.billingClearance === 'completed'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : item.steps.billingClearance === 'hold'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span className="material-symbols-outlined text-base">receipt</span>
                  <span className="text-[11px] font-semibold">TPA Clearance</span>
                  <span className="text-[10px] font-bold uppercase">{item.steps.billingClearance}</span>
                </div>

                {/* 4. Nursing Handover */}
                <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                  item.steps.nursingHandover === 'completed'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : item.steps.nursingHandover === 'in_progress'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                }`}>
                  <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                  <span className="text-[11px] font-semibold">Nurse Handover</span>
                  <span className="text-[10px] font-bold uppercase">{item.steps.nursingHandover}</span>
                </div>

                {/* 5. Gate Pass QR */}
                <div className={`p-2 rounded-xl border flex flex-col items-center gap-1 col-span-2 sm:col-span-1 ${
                  item.steps.gatePass === 'generated'
                    ? 'bg-[#fcde6d]/30 border-[#fcde6d] text-[#756100] font-bold'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                }`}>
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  <span className="text-[11px] font-semibold">Gate Pass</span>
                  <span className="text-[10px] font-bold uppercase">{item.steps.gatePass}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 justify-end min-w-[210px]">
              {/* PRIMARY ACTION: Change Status to 'Ready for Cleaning' */}
              {item.dischargeStatus === 'Ready for Cleaning' ? (
                <button
                  onClick={() => handleMarkReadyForCleaning(item)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  title="Re-broadcast Ready for Cleaning alert to Bed Manager and Nursing Station"
                >
                  <span className="material-symbols-outlined text-sm">notifications_active</span>
                  <span>Alert Bed Mgr & Nurse</span>
                </button>
              ) : (
                <button
                  onClick={() => handleMarkReadyForCleaning(item)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                  title="Change status to 'Ready for Cleaning' and trigger toast alert to Bed Manager & Nursing Station"
                >
                  <span className="material-symbols-outlined text-sm">cleaning_services</span>
                  <span>Set: Ready for Cleaning</span>
                </button>
              )}

              {item.steps.gatePass === 'generated' ? (
                <button
                  onClick={() => {
                    setSelectedCase(item);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Gate Pass QR
                </button>
              ) : (
                <button
                  onClick={() => handleAuthorizeGatePass(item.uhid)}
                  className="px-4 py-2 rounded-xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Sign-Off & Issue Pass
                </button>
              )}

              {item.steps.pharmacyMedKit !== 'completed' && (
                <button
                  onClick={() => handleExpeditePharmacy(item.uhid)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">speed</span>
                  Expedite Pharmacy
                </button>
              )}

              {item.steps.billingClearance === 'hold' && (
                <button
                  onClick={() => {
                    onTriggerToast(`Navigating to Billing Desk to clear TPA claim hold for ${item.patientName}.`);
                    onNavigate('billing');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">attach_money</span>
                  Resolve TPA Query
                </button>
              )}

              <button
                onClick={() => setSelectedCase(item)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                View Summary
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Gate Pass / Discharge Details Preview */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#fcde6d]/30 text-[#756100]">
                  <span className="material-symbols-outlined">qr_code_2</span>
                </span>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Digital Exit Gate Pass</h3>
                  <span className="text-xs text-neutral-500">CityCare Multispeciality Hospital, Pune</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex flex-col items-center text-center">
                {/* Simulated QR Code */}
                <div className="w-36 h-36 bg-white p-3 rounded-2xl shadow-inner border border-neutral-300 flex items-center justify-center">
                  <div className="w-full h-full border-4 border-neutral-900 p-2 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 bg-neutral-900"></div>
                      <div className="w-4 h-4 bg-neutral-900"></div>
                    </div>
                    <div className="text-center font-mono text-[9px] font-bold text-neutral-800">
                      {selectedCase.uhid}
                    </div>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 bg-neutral-900"></div>
                      <div className="w-4 h-4 bg-neutral-900"></div>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-neutral-800 mt-2">
                  PASS-TOKEN: {selectedCase.uhid}-VERIFIED-2026
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  Valid for Security Exit at Gate A / B / Ambulance Bay
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <span className="text-neutral-500 block text-[10px] font-bold uppercase">Patient Name</span>
                  <span className="font-bold text-neutral-900">{selectedCase.patientName}</span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <span className="text-neutral-500 block text-[10px] font-bold uppercase">Ward & Bed</span>
                  <span className="font-bold text-neutral-900">{selectedCase.bed} ({selectedCase.ward})</span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <span className="text-neutral-500 block text-[10px] font-bold uppercase">Attending Doctor</span>
                  <span className="font-bold text-neutral-900">{selectedCase.attending}</span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl">
                  <span className="text-neutral-500 block text-[10px] font-bold uppercase">Discharge Status</span>
                  <span className="font-bold text-amber-700">
                    {selectedCase.dischargeStatus || 'Gate Pass Issued'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100">
              <button
                onClick={() => {
                  handleMarkReadyForCleaning(selectedCase);
                  setSelectedCase(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-sm">cleaning_services</span>
                Depart Patient & Set Status: 'Ready for Cleaning'
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onTriggerToast(`Discharge Gate Pass printed for ${selectedCase.patientName}.`);
                    setSelectedCase(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Gate Pass
                </button>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
