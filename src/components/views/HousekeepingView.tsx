import React, { useState } from 'react';
import { ViewType } from '../../types';
import { BedItem } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface HousekeepingViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface CleaningTask {
  id: string;
  bedId: string;
  ward: string;
  sanitizationTier: 'Standard Linen & Sanitize' | 'Terminal Disinfection (ICU)' | 'UV-C Automated Cycle' | 'Bio-hazard Protocol';
  assignedStaff: string;
  progress: number;
  estMinutesLeft: number;
  status: 'in_progress' | 'ready_for_check' | 'terminal_hold';
  reportedAt: string;
}

export const HousekeepingView: React.FC<HousekeepingViewProps> = ({ onNavigate, onTriggerToast }) => {
  const [voiceActive, setVoiceActive] = useState(false);
  const queryClient = useQueryClient();

  // Fetch beds in cleaning status
  const { data: beds = [], isLoading } = useQuery<BedItem[]>({
    queryKey: ['housekeeping_beds'],
    queryFn: async () => {
      const res = await fetch('/api/beds');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  const tasks: CleaningTask[] = beds
    .filter((bed) => bed.status === 'cleaning')
    .map((bed) => ({
      id: `TASK-${bed.id}`,
      bedId: bed.id,
      ward: bed.ward,
      sanitizationTier: bed.wardCategory === 'icu' ? 'Terminal Disinfection (ICU)' as const : 'Standard Linen & Sanitize' as const,
      assignedStaff: bed.assignedHousekeeper || 'Unassigned',
      progress: bed.cleaningProgress || 0,
      estMinutesLeft: bed.cleaningEstMinutesLeft || 0,
      status: (bed.cleaningProgress ?? 0) >= 90 ? 'ready_for_check' as const : 'in_progress' as const,
      reportedAt: bed.updatedAt ? new Date(bed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown',
    }));

  const updateBedMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await fetch(`/api/beds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update bed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping_beds'] });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    }
  });

  const handleMarkCleaned = (taskId: string, bedId: string) => {
    updateBedMutation.mutate({
      id: bedId,
      data: {
        status: 'available',
        cleaningProgress: 100,
        cleaningEstMinutesLeft: 0,
        lastSanitized: new Date().toISOString()
      }
    });
    onTriggerToast(`Bed ${bedId} sanitized and marked READY in Bed Matrix.`);
  };

  const handleSimulateVoice = () => {
    setVoiceActive(true);
    setTimeout(() => {
      setVoiceActive(false);
      onTriggerToast('Voice command recognized: "Bed B-302 turnover completed. Releasing to Admissions."');
      handleMarkCleaned('TASK-101', 'B-302');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141416] text-white p-6 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fcde6d]/20 text-[#fcde6d]">
              Turnover Velocity Engine
            </span>
            <span className="text-white/40">•</span>
            <span className="text-xs text-neutral-400">Shift 02 • 14 Porters & Sanitation Technicians Active</span>
          </div>
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-white">
            Housekeeping & Bed Turnover Hub
          </h1>
          <p className="text-sm text-neutral-400">
            Real-time terminal cleaning queues, UV-C robot dispatch, and instant voice-activated bed release.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('bed_matrix')}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">hotel</span>
            View Bed Matrix
          </button>
          <button
            onClick={() => onTriggerToast('UV-C Robot Beta-1 dispatched to Floor 3 corridor.')}
            className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>
            Dispatch UV-C Robot
          </button>
        </div>
      </div>

      {/* Voice Bed Release Action Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 rounded-3xl border border-amber-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            voiceActive ? 'bg-red-500 text-white animate-pulse shadow-lg scale-110' : 'bg-amber-500 text-white'
          }`}>
            <span className="material-symbols-outlined text-2xl">{voiceActive ? 'mic' : 'mic_none'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">Hands-Free Bed Status Voice Terminal</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                Marathi / English NLP
              </span>
            </div>
            <p className="text-xs text-neutral-600">
              {voiceActive ? 'Listening... Speak bed code (e.g., "Bed 302 Sanitized")' : 'Tap to speak bed clearance or release code directly without touching screen.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSimulateVoice}
            disabled={voiceActive}
            className="px-5 py-2.5 rounded-2xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">mic</span>
            {voiceActive ? 'Recording Audio...' : 'Simulate Voice Clearance'}
          </button>
        </div>
      </div>

      {/* Housekeeping Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Active Turnover Tasks</span>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-['Plus_Jakarta_Sans']">{tasks.length} Beds</div>
          <span className="text-[11px] text-neutral-500 font-medium mt-1 inline-block">2 ICU Terminal Disinfections</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Avg Turnover Time</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-['Plus_Jakarta_Sans']">22.4 min</div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">7.6m faster than target</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Beds Ready for Audit</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1 font-['Plus_Jakarta_Sans']">
            {tasks.filter((t) => t.status === 'ready_for_check').length}
          </div>
          <span className="text-[11px] text-[#756100] font-semibold mt-1 inline-block">Nursing Sister Sign-off</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Linen & Bio Roster</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1 font-['Plus_Jakarta_Sans']">100% Stocked</div>
          <span className="text-[11px] text-neutral-500 font-medium mt-1 inline-block">Laundry Pod 3 On Schedule</span>
        </div>
      </div>

      {/* Cleaning Task Cards */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Active Bed Turnover & Sanitization Queue</h2>
            <p className="text-xs text-neutral-500">Live tracker linked to Admissions & Nursing allocations.</p>
          </div>
          <button
            onClick={() => onTriggerToast('Refreshing live RFID porter telemetry...')}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Telemetry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-2xl border border-neutral-200 bg-[#fdfcf9] hover:border-amber-300 transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-900 font-bold text-lg font-mono">
                    {task.bedId}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">{task.ward}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                        {task.sanitizationTier}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-xs">person</span>
                      Assigned: <strong className="text-neutral-700">{task.assignedStaff}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-neutral-500">Queued: {task.reportedAt}</span>
                  <div className="text-xs font-bold text-amber-700 mt-0.5">
                    {task.estMinutesLeft === 0 ? 'Ready for Check' : `~${task.estMinutesLeft} min remaining`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1">
                  <span>Cleaning & Disinfection Progress</span>
                  <span className="font-bold">{task.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      task.progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <button
                  onClick={() => onTriggerToast(`Sent alert to porter ${task.assignedStaff} on Floor Walkie-Talkie.`)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">volume_up</span>
                  Page Porter
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkCleaned(task.id, task.bedId)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Mark Clean & Release Bed
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Housekeeping Staff & Porter Matrix */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
        <h2 className="text-base font-bold text-neutral-900 mb-4">Floor Porter & Bio-Sanitation Shift Roster</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'Ramesh Jadhav', zone: 'Floor 3 (Post-Surg)', completed: 8, status: 'Active at B-302' },
            { name: 'Sunil Shinde', zone: 'Floor 2 (ICU & Critical)', completed: 5, status: 'Terminal Disinfecting' },
            { name: 'Kavita Waghmare', zone: 'Floor 1 (Pediatrics/Obs)', completed: 11, status: 'Standby at Lounge' },
          ].map((porter, i) => (
            <div key={i} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-neutral-300 flex items-center justify-center font-bold text-neutral-700">
                  {porter.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">{porter.name}</h4>
                  <span className="text-[11px] text-neutral-500 block">{porter.zone}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">{porter.status}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-neutral-900 block">{porter.completed}</span>
                <span className="text-[10px] text-neutral-500 uppercase">Turnovers</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
