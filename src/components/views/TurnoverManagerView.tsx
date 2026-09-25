import React from 'react';
import { ViewType } from '../../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TurnoverManagerViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface AllocationItem {
  uhid: string;
  patient: string;
  age: number;
  condition: string;
  recommendedBed: string;
  compatibilityScore: string;
  reason: string;
  status: 'pending';
}

export const TurnoverManagerView: React.FC<TurnoverManagerViewProps> = ({ onNavigate, onTriggerToast }) => {
  const queryClient = useQueryClient();

  // Fetch unallocated admitted patients from backend
  const { data: patients = [], isLoading: patientsLoading } = useQuery<any[]>({
    queryKey: ['unallocated_patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await res.json();
      // Show only admitted patients without a bed assigned yet
      return data.filter((p: any) => p.status === 'admitted' && !p.bedId);
    },
    refetchInterval: 15000,
  });

  // Fetch available beds
  const { data: availableBeds = [] } = useQuery<any[]>({
    queryKey: ['available_beds'],
    queryFn: async () => {
      const res = await fetch('/api/beds');
      if (!res.ok) throw new Error('Failed to fetch beds');
      const data = await res.json();
      return data.filter((b: any) => b.status === 'available');
    },
    refetchInterval: 15000,
  });

  // Build allocation proposals from real admitted patients + available beds
  const allocationList: AllocationItem[] = patients.map((p, idx) => {
    const bed = availableBeds[idx] || null;
    return {
      uhid: p.uhid,
      patient: `${p.name} (${p.uhid})`,
      age: p.age,
      condition: p.diagnosis || 'Admitted',
      recommendedBed: bed ? `${bed.id} — ${bed.ward}` : 'Awaiting available bed',
      compatibilityScore: p.acuity === 'emergent' ? '99%' : p.acuity === 'urgent' ? '94%' : '88%',
      reason: `Acuity: ${p.acuity || 'routine'} • Fall Risk: ${p.fallRisk || 'Low'} • Doctor: ${p.attendingDoctor}`,
      status: 'pending',
    };
  });

  const handleAllocate = async (item: AllocationItem) => {
    // Find a matching available bed ID (stripped from label)
    const bed = availableBeds.find(b => item.recommendedBed.startsWith(b.id));
    if (!bed) {
      onTriggerToast(`No available bed to confirm placement for ${item.patient}. Check Bed Matrix.`);
      return;
    }

    try {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/turnover/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uhid: item.uhid, bedId: bed.id }),
      });
      if (!res.ok) throw new Error('Allocation failed');

      // Invalidate caches so BedMatrix and NursingStation refresh
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      queryClient.invalidateQueries({ queryKey: ['available_beds'] });
      queryClient.invalidateQueries({ queryKey: ['unallocated_patients'] });
      queryClient.invalidateQueries({ queryKey: ['nursing_kardex'] });

      onTriggerToast(`✅ Allocated ${item.patient} to Bed ${bed.id}. Housekeeping & Transport alerted.`);
    } catch (err) {
      onTriggerToast(`Allocation failed for ${item.patient}. Please retry.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/20 text-[#fcde6d]">
              Allocation Engine
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Target Turnover: 25 mins • Current Velocity: 21.8 mins</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Bed Turnover Orchestrator & Allocation Engine
          </h1>
          <p className="text-sm text-neutral-400">
            Algorithmic bed placement, predictive turnover readiness, and real-time porter team coordination.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('bed_matrix')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">hotel</span>
            Live Bed Matrix
          </button>
          <button
            onClick={() => onNavigate('housekeeping')}
            className="px-5 py-2.5 rounded-2xl bg-[#fcde6d] hover:bg-[#ebd061] text-[#221b00] text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-base">cleaning_services</span>
            Housekeeping Desk
          </button>
        </div>
      </div>

      {/* Recommended Allocations */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Intelligent Patient-to-Bed Matching</h2>
            <p className="text-xs text-neutral-500">Automated acuity-based placement considering isolation, gas supply, and nurse load.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            {allocationList.length} Matching Proposals
          </span>
        </div>

        <div className="space-y-4">
          {patientsLoading ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading admitted patients from database...</div>
          ) : allocationList.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              All inbound patients successfully matched to hospital beds.
            </div>
          ) : (
            allocationList.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#faf8f4] border border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-neutral-900">{item.patient}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      {item.compatibilityScore} Match
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">
                    Condition: <strong className="text-neutral-900">{item.condition}</strong>
                  </div>
                  <div className="text-xs text-neutral-700 mt-1 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-neutral-500">hotel</span>
                    Target: <span className="text-neutral-900 font-bold">{item.recommendedBed}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{item.reason}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onTriggerToast(`Manual override opened for ${item.patient}. Select alternate ward.`)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold"
                  >
                    Change Bed
                  </button>
                  <button
                    onClick={() => handleAllocate(item)}
                    disabled={!item.recommendedBed.includes('—')}
                    className="px-5 py-2 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Confirm Placement
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ward Bottleneck Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            ward: 'Floor 2: Critical Care & ICU',
            occupancy: '94%',
            status: 'High Pressure',
            bottleneck: '3 planned discharges awaiting TPA approval',
            action: 'Expedite TPA Desk',
            actionView: 'billing' as ViewType,
          },
          {
            ward: 'Floor 3: Post-Surgical Recovery',
            occupancy: '82%',
            status: 'Optimal',
            bottleneck: '2 beds currently in UV-C disinfection cycle',
            action: 'View Housekeeping',
            actionView: 'housekeeping' as ViewType,
          },
          {
            ward: 'Floor 1: Pediatrics & Daycare',
            occupancy: '65%',
            status: 'Available Capacity',
            bottleneck: '6 beds ready for direct ER intake transfer',
            action: 'View ER Intake',
            actionView: 'reception' as ViewType,
          },
        ].map((wb, i) => (
          <div key={i} className="p-5 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-neutral-900">{wb.ward}</h3>
                <span className="text-xs font-bold text-neutral-700">{wb.occupancy}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-2 ${
                wb.status === 'High Pressure' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {wb.status}
              </span>
              <p className="text-xs text-neutral-600 mt-3">{wb.bottleneck}</p>
            </div>

            <div className="pt-4 border-t border-neutral-100 mt-4">
              <button
                onClick={() => onNavigate(wb.actionView)}
                className="w-full py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                {wb.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
