import React, { useState, useEffect } from 'react';
import { BedItem, ViewType } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditLogService } from '../../services/auditLogService';
import { clinicalNotesService } from '../../services/clinicalNotesService';

interface BedMatrixViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

export interface BedTurnoverEvent {
  id: string;
  bedId: string;
  ward: string;
  hardwareType: string;
  prevStatus: 'cleaning';
  newStatus: 'available';
  timestamp: string;
  sanitizerTech: string;
  uvcDosage: string;
  atpScore: string;
  airPressure: string;
  suggestedPatient: string;
}

export const BedMatrixView: React.FC<BedMatrixViewProps> = ({
  onNavigate,
  onTriggerToast
}) => {
  const [selectedWardTab, setSelectedWardTab] = useState<'all' | 'med_a' | 'med_b' | 'surgical' | 'icu' | 'pediatrics' | 'emergency'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<BedItem | null>(null);
  const [admittedSuccess, setAdmittedSuccess] = useState(false);

  const queryClient = useQueryClient();

  const { data: bedsData = [], isLoading } = useQuery<BedItem[]>({
    queryKey: ['beds'],
    queryFn: async () => {
      const res = await fetch('/api/beds');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  const beds: BedItem[] = bedsData;

  useEffect(() => {
    if (beds.length > 0 && !selectedBed) {
      setSelectedBed(beds[0]);
    }
  }, [beds, selectedBed]);

  // Real-time bed status update overlay state & animation state
  const [activeTurnoverEvent, setActiveTurnoverEvent] = useState<BedTurnoverEvent | null>(null);
  const [animatingBedId, setAnimatingBedId] = useState<string | null>(null);
  const [recentTurnoverHistory, setRecentTurnoverHistory] = useState<BedTurnoverEvent[]>([]);
  const [autoSimulationActive, setAutoSimulationActive] = useState(false);

  // Trigger status transition from 'cleaning' to 'available' with animation & overlay
  const handleTransitionBedToAvailable = (targetBedId?: string) => {
    // Find a bed that is currently cleaning
    const bedToUpdate = targetBedId 
      ? beds.find((b) => b.id === targetBedId)
      : beds.find((b) => b.status === 'cleaning');

    if (!bedToUpdate) {
      // If no bed is currently cleaning, convert one to cleaning first and then to available, or inform user
      onTriggerToast('No bed currently in "Cleaning" state. Re-staging Bed M-103 to Cleaning for live demo...');
      updateBedMutation.mutate({
        id: 'M-103',
        data: { status: 'cleaning', cleaningProgress: 75, cleaningEstMinutesLeft: 5 }
      });
      setTimeout(() => {
        handleTransitionBedToAvailable('M-103');
      }, 700);
      return;
    }

    const eventTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const turnoverEvent: BedTurnoverEvent = {
      id: `turnover-${Date.now()}`,
      bedId: bedToUpdate.id,
      ward: bedToUpdate.ward,
      hardwareType: bedToUpdate.hardwareType,
      prevStatus: 'cleaning',
      newStatus: 'available',
      timestamp: eventTime,
      sanitizerTech: bedToUpdate.assignedHousekeeper || 'Ramesh Kumar (Sanitation Lead)',
      uvcDosage: '4.2 J/cm² (UV-C 254nm Robot)',
      atpScore: '< 8 RLU (Ultra-Clean Cleanroom Pass)',
      airPressure: bedToUpdate.tempAndPressure || '+12 Pa Balanced',
      suggestedPatient: bedToUpdate.suggestedAllocation || 'Kavita D. (ER Triage Yellow • UHID 8829)'
    };

    // 1. Trigger animated state on the specific bed card
    setAnimatingBedId(bedToUpdate.id);

    // 2. Update beds state: status becomes available, progress 100%
    updateBedMutation.mutate({
      id: bedToUpdate.id,
      data: {
        status: 'available',
        cleaningProgress: 100,
        cleaningEstMinutesLeft: 0,
        lastSanitized: new Date().toISOString()
      }
    });

    // 3. Show the Real-Time Update Overlay
    setActiveTurnoverEvent(turnoverEvent);
    setRecentTurnoverHistory((prev) => [turnoverEvent, ...prev.slice(0, 4)]);

    // 4. Log to audit ledger
    auditLogService.addLog({
      actor: turnoverEvent.sanitizerTech,
      role: 'Housekeeping Sanitation Telemetry',
      action: `Real-Time Bed Status Change: Bed [${bedToUpdate.id}] transitioned from [Cleaning] to [Available]. Disinfection UV-C verified at 4.2 J/cm².`,
      category: 'housekeeping',
      severity: 'success',
      status: 'VERIFIED'
    });

    onTriggerToast(`⚡ Real-Time Update: Bed ${bedToUpdate.id} is now AVAILABLE!`);

    // Remove intense pulse animation after 8 seconds but keep card available
    setTimeout(() => {
      setAnimatingBedId((current) => (current === bedToUpdate.id ? null : current));
    }, 8000);
  };

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
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    }
  });

  // Re-stage a bed to 'cleaning' to allow endless testing of the real-time turnover animation
  const handleStageBedToCleaning = (bedId: string) => {
    updateBedMutation.mutate({
      id: bedId,
      data: {
        status: 'cleaning',
        cleaningProgress: 60,
        cleaningEstMinutesLeft: 8,
        lastSanitized: 'Chemical strip & disinfect in-progress'
      }
    });
    onTriggerToast(`Bed ${bedId} staged to "Cleaning". You can now trigger live turnover to "Available".`);
  };

  // Optional background simulator tick
  useEffect(() => {
    if (!autoSimulationActive) return;
    const timer = setInterval(() => {
      const cleaningBed = beds.find((b) => b.status === 'cleaning');
      if (cleaningBed) {
        handleTransitionBedToAvailable(cleaningBed.id);
      } else {
        // stage one
        handleStageBedToCleaning('M-103');
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [autoSimulationActive, beds]);

  const filteredBeds = beds.filter((bed) => {
    if (selectedWardTab !== 'all' && bed.wardCategory !== selectedWardTab) return false;
    if (selectedStatusFilter === 'all') return true;
    if (selectedStatusFilter === 'available') return bed.status === 'available';
    if (selectedStatusFilter === 'occupied') return bed.status === 'occupied' || bed.status === 'critical';
    if (selectedStatusFilter === 'cleaning') return bed.status === 'cleaning';
    if (selectedStatusFilter === 'reserved') return bed.status === 'ready';
    if (selectedStatusFilter === 'maintenance') return bed.status === 'maintenance';
    return true;
  });

  const availableCount = beds.filter((b) => b.status === 'available').length;
  const occupiedCount = beds.filter((b) => b.status === 'occupied' || b.status === 'critical').length;
  const cleaningCount = beds.filter((b) => b.status === 'cleaning').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-neutral-500 font-bold">
        <span className="material-symbols-outlined animate-spin mr-2">sync</span>
        Loading Bed Matrix Data...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-10 space-y-6 relative">
      
      {/* ========================================================================= */}
      {/* REAL-TIME BED STATUS UPDATE OVERLAY (Animated Telemetry Banner) */}
      {/* ========================================================================= */}
      {activeTurnoverEvent && (
        <div className="sticky top-20 z-40 w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-neutral-900 to-black text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-emerald-500/80">
            {/* Ambient Animated Glow Effect */}
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute left-1/3 -bottom-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              
              {/* Left: Signal Header & Status Transition Graphic */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Pulsing Sonar Node */}
                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shrink-0">
                  <span className="absolute -inset-1 rounded-2xl bg-emerald-500/30 animate-ping opacity-75"></span>
                  <span className="material-symbols-outlined text-[30px] animate-bounce">
                    hotel
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500 text-black shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping"></span>
                      Real-Time Bed Status Overlay
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      Telemetry Sync • {activeTurnoverEvent.timestamp}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                      Certified Sanitization Complete
                    </span>
                  </div>

                  {/* Dynamic Status Transition Pill Animation */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      Bed {activeTurnoverEvent.bedId}
                    </h2>
                    
                    {/* From 'Cleaning' to 'Available' Visual Flow */}
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                      {/* Previous Status Pill */}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold line-through opacity-80">
                        <span className="material-symbols-outlined text-[13px]">cleaning_services</span>
                        Cleaning
                      </span>

                      {/* Animated Transition Arrow */}
                      <div className="flex items-center text-emerald-400 animate-pulse font-bold px-1">
                        <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                      </div>

                      {/* New Status Pill */}
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500 text-black font-extrabold shadow-sm animate-pulse">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        AVAILABLE NOW
                      </span>
                    </div>

                    <span className="text-xs text-neutral-300 hidden md:inline">
                      • {activeTurnoverEvent.ward}
                    </span>
                  </div>

                  {/* Sanitization & Telemetry Sub-badges */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300 mt-2 font-mono">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      UV-C 254nm Robot: {activeTurnoverEvent.uvcDosage}
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span>ATP Bio-swab: {activeTurnoverEvent.atpScore}</span>
                    <span className="text-neutral-500">•</span>
                    <span>Air Flow: {activeTurnoverEvent.airPressure}</span>
                  </div>
                </div>
              </div>

              {/* Right: Fast Admission Actions & Dismiss */}
              <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center shrink-0">
                <button
                  onClick={() => {
                    const bedObj = beds.find((b) => b.id === activeTurnoverEvent.bedId);
                    if (bedObj) setSelectedBed(bedObj);
                    setAdmittedSuccess(true);
                    onTriggerToast(`Instant match: ${activeTurnoverEvent.suggestedPatient} allocated to Bed ${activeTurnoverEvent.bedId}!`);
                  }}
                  className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[17px]">person_add</span>
                  <span>Admit Suggested Patient</span>
                </button>

                <button
                  onClick={() => {
                    const bedObj = beds.find((b) => b.id === activeTurnoverEvent.bedId);
                    if (bedObj) setSelectedBed(bedObj);
                    onTriggerToast(`Focusing inspect panel on ${activeTurnoverEvent.bedId}`);
                  }}
                  className="px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Inspect Bay</span>
                </button>

                <button
                  onClick={() => setActiveTurnoverEvent(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
                  title="Dismiss Overlay"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Top Header & Fast Action Triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              Pune Central • Wing 3 & 4
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
            <span className="text-xs text-[#705d00] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#705d00] animate-pulse"></span>
              Live Telemetry Active
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Bed Matrix & Turnover Hub</h1>
            <span className="text-xs text-neutral-500 hidden sm:inline">• Live Status Sensor Feed</span>
          </div>
        </div>

        {/* Action Controls & Simulation Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-Time Turnover Trigger Button (Simulates Cleaning -> Available with Animation) */}
          <button
            onClick={() => handleTransitionBedToAvailable()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 animate-pulse"
            title="Simulate real-time status change from Cleaning to Available"
          >
            <span className="material-symbols-outlined text-[17px]">bolt</span>
            <span>Simulate Bed Turnover (Cleaning → Available)</span>
          </button>

          {/* Auto-Simulation Toggle */}
          <button
            onClick={() => {
              setAutoSimulationActive(!autoSimulationActive);
              onTriggerToast(
                !autoSimulationActive
                  ? 'Real-Time Auto-Turnover Telemetry Stream activated!'
                  : 'Auto-Turnover simulation paused.'
              );
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all border ${
              autoSimulationActive
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-white hover:bg-neutral-100 text-neutral-800 border-black/5 shadow-xs'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {autoSimulationActive ? 'sync' : 'sync_disabled'}
            </span>
            <span>{autoSimulationActive ? 'Auto Stream: ON' : 'Auto Stream'}</span>
          </button>

          <button 
            onClick={() => {
              onNavigate('housekeeping');
              onTriggerToast('Opening Housekeeping Sanitization Dispatch console...');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold shadow-sm border border-black/5 transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">cleaning_services</span>
            <span>Dispatch Sanitization</span>
          </button>

          <button 
            onClick={() => {
              onNavigate('reception');
              onTriggerToast('Opening Fast-Track Patient Intake & Admission desk...');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-semibold shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            <span>Admit Patient</span>
          </button>
        </div>
      </div>

      {/* Ward Navigation Tabs (Soft Pill Rail) */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 no-scrollbar">
        <div className="flex items-center gap-1.5 bg-[#f0eee8] p-1.5 rounded-full shadow-sm">
          {[
            { id: 'all', label: 'All Wards (250 Beds)' },
            { id: 'med_a', label: 'Medical Ward A' },
            { id: 'med_b', label: 'Medical Ward B' },
            { id: 'surgical', label: 'Surgical Ward' },
            { id: 'icu', label: 'ICU & CCU' },
            { id: 'pediatrics', label: 'Pediatrics' },
            { id: 'emergency', label: 'Emergency' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedWardTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedWardTab === tab.id
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black hover:bg-[#e5e2dc]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="hidden xl:flex items-center gap-2 text-xs text-neutral-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{cleaningCount} Bay(s) Sanitizing • {availableCount} Available</span>
        </div>
      </div>

      {/* Status Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 px-4 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Status:</span>
          {[
            { id: 'all', label: `All (${beds.length})`, color: '' },
            { id: 'available', label: `Available (${availableCount})`, dot: 'bg-emerald-600' },
            { id: 'occupied', label: `Occupied (${occupiedCount})`, dot: 'bg-neutral-600' },
            { id: 'cleaning', label: `Cleaning (${cleaningCount})`, dot: 'bg-amber-500' },
            { id: 'reserved', label: 'Reserved (4)', dot: 'bg-purple-600' },
            { id: 'maintenance', label: 'Maintenance (2)', dot: 'bg-red-600' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedStatusFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                selectedStatusFilter === chip.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`}></span>}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
        
        {/* Quick Staging Action for testing */}
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <button
            onClick={() => handleStageBedToCleaning('M-103')}
            className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition-colors"
            title="Set Bed M-103 back to Cleaning so you can test live transition to Available again"
          >
            Re-stage M-103 to Cleaning
          </button>
          <span className="text-neutral-300">|</span>
          <span>Sort: Acuity Score</span>
          <span className="material-symbols-outlined text-[16px]">sort</span>
        </div>
      </div>

      {/* 3 High-Level Metric Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Capacity */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">Total Hospital Capacity</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-neutral-900">250</span>
                <span className="text-xs text-neutral-500">Beds Active</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">single_bed</span>
            </div>
          </div>
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-neutral-800">82% Overall Occupancy</span>
              <span className="text-emerald-700 font-bold">{availableCount} Beds Free</span>
            </div>
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
              <div className="bg-black h-full rounded-full" style={{ width: '82%' }}></div>
              <div className="bg-[#ffe16f] h-full" style={{ width: '18%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 2: Housekeeping Turnover */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">Housekeeping Turnover</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-neutral-900">22</span>
                <span className="text-xs text-neutral-500">mins avg turnover</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
            </div>
          </div>
          <div className="mt-4 pt-2 space-y-1.5">
            <div className="flex items-center justify-between py-1 px-2.5 bg-neutral-50 rounded-xl text-xs">
              <span className="font-medium text-neutral-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Cleaning In-Progress
              </span>
              <span className="font-bold text-neutral-900">{cleaningCount} beds</span>
            </div>
            <div className="flex items-center justify-between py-1 px-2.5 bg-neutral-50 rounded-xl text-xs">
              <span className="font-medium text-neutral-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Sanitized & Available
              </span>
              <span className="font-bold text-emerald-800">{availableCount} beds</span>
            </div>
          </div>
        </div>

        {/* Card 3: Admission Buffer */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">Immediate Admission Buffer</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-neutral-900">6 Beds</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">Guaranteed</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">emergency</span>
            </div>
          </div>
          <div className="mt-4 pt-2 flex items-center gap-2">
            <div className="flex-1 bg-neutral-50 rounded-xl p-2 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Triage Red/Yellow</span>
              <p className="text-sm font-bold text-neutral-900">4 Beds</p>
            </div>
            <div className="flex-1 bg-neutral-50 rounded-xl p-2 text-center">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Trauma Care Bay</span>
              <p className="text-sm font-bold text-neutral-900">2 Beds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 8 Cols (Bays Grid) + Right 4 Cols (Bay Detail Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Interactive Ward Bay Grids */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBeds.map((bed) => {
              const isSelected = selectedBed?.id === bed.id;
              const isAnimating = animatingBedId === bed.id;

              return (
                <div
                  key={bed.id}
                  onClick={() => setSelectedBed(bed)}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer group hover:-translate-y-0.5 relative overflow-hidden ${
                    isAnimating
                      ? 'ring-4 ring-emerald-500 border-emerald-500 shadow-2xl bg-emerald-50/30 scale-[1.02] duration-500'
                      : isSelected
                      ? 'ring-2 ring-black border-transparent shadow-md'
                      : 'border-black/5 hover:border-black/20'
                  }`}
                >
                  {/* ANIMATION RIBBON ON STATUS TRANSITION FROM CLEANING TO AVAILABLE */}
                  {isAnimating && (
                    <div className="mb-2 py-1 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[11px] font-bold flex items-center justify-between shadow-md animate-bounce">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span>
                        <span>STATUS UPDATED: NOW AVAILABLE</span>
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-white/20 px-1.5 py-0.2 rounded-full">
                        Live Telemetry
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-neutral-900 tracking-tight">{bed.id}</span>
                      
                      {/* Status Badge with Live Transition Animation */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize flex items-center gap-1 transition-all ${
                        bed.status === 'available' ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300' :
                        bed.status === 'cleaning' ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300' :
                        bed.status === 'ready' ? 'bg-purple-100 text-purple-900' :
                        bed.status === 'critical' ? 'bg-red-100 text-red-900 animate-pulse' :
                        bed.status === 'maintenance' ? 'bg-red-50 text-red-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          bed.status === 'available' ? 'bg-emerald-600' :
                          bed.status === 'cleaning' ? 'bg-amber-600 animate-pulse' :
                          bed.status === 'ready' ? 'bg-purple-600' :
                          bed.status === 'critical' ? 'bg-red-600' :
                          'bg-neutral-600'
                        }`}></span>
                        {bed.status}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">{bed.ward}</span>
                  </div>

                  <div className="space-y-0.5 text-xs text-neutral-600">
                    <p className="font-semibold text-neutral-900">
                      {bed.patientName || bed.hardwareType}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {bed.attendingStaff || bed.assignedHousekeeper || bed.lastSanitized}
                    </p>
                  </div>

                  {/* Cleaning In-Progress Bar & Direct 'Complete Sanitization' Action */}
                  {bed.status === 'cleaning' && (
                    <div className="mt-3 p-2 bg-amber-50/80 rounded-xl border border-amber-200/60">
                      <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${bed.cleaningProgress || 65}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-amber-900 font-medium mt-1.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                          Cleaning active (~{bed.cleaningEstMinutesLeft || 5}m left)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTransitionBedToAvailable(bed.id);
                          }}
                          className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-transform active:scale-95 flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">check</span>
                          <span>Mark Available</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sanitized & Available Tag */}
                  {bed.status === 'available' && (
                    <div className="mt-2.5 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center justify-between border border-emerald-200/60">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                        <span>Terminal UV-C Passed</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase">Ready</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-mono text-[10px]">{bed.tempAndPressure}</span>
                    <span className="font-semibold text-black group-hover:underline flex items-center gap-0.5">
                      Inspect Bay →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Persistent Bed Detail & Turnover Log Drawer */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          {selectedBed && (<>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Selected Bay File</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-xl font-bold text-neutral-900">{selectedBed.id}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                    selectedBed.status === 'available' ? 'bg-emerald-100 text-emerald-900' :
                    selectedBed.status === 'cleaning' ? 'bg-amber-100 text-amber-900' :
                    'bg-neutral-100 text-neutral-800'
                  }`}>
                    {selectedBed.status}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">{selectedBed.ward}</span>
              </div>
              <button 
                onClick={() => onTriggerToast(`Calibrating bed ${selectedBed.id} sensor telemetry...`)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </button>
            </div>

            {/* Quick Trigger if currently Cleaning */}
            {selectedBed.status === 'cleaning' && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">Sanitization In Progress</span>
                  <span className="text-xs font-medium text-amber-800">Stage 3 of 3 • Terminal UV-C</span>
                </div>
                <button
                  onClick={() => handleTransitionBedToAvailable(selectedBed.id)}
                  className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  <span>Set Available</span>
                </button>
              </div>
            )}

            {/* Hardware & Ambient Telemetry Bar */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-50 rounded-2xl text-xs">
              <div className="p-2 bg-white rounded-xl">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Hardware</span>
                <span className="font-semibold text-neutral-900 truncate block">{selectedBed.hardwareType}</span>
              </div>
              <div className="p-2 bg-white rounded-xl">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">Ambient Press.</span>
                <span className="font-semibold text-neutral-900 truncate block">{selectedBed.tempAndPressure}</span>
              </div>
            </div>

            {/* Suggested Patient Match */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-amber-800 shrink-0">person_pin</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Suggested Intake</span>
                  <span className="text-xs font-medium text-neutral-900 truncate">
                    {selectedBed.suggestedAllocation || 'Kavita D. (ER Yellow • UHID 8829)'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAdmittedSuccess(true);
                  onTriggerToast(`Patient matched and assigned to ${selectedBed.id}!`);
                }}
                className="px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-semibold hover:bg-neutral-800 shrink-0"
              >
                Match
              </button>
            </div>

            {/* Sanitization Log Timeline */}
            <div className="p-3.5 bg-neutral-50 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">history_toggle_off</span>
                  Sanitization Log
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-bold">22 min Cycle</span>
              </div>

              <div className="space-y-2 text-xs text-neutral-600 pl-2 border-l-2 border-neutral-300">
                <div className="relative pl-3">
                  <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-neutral-400"></div>
                  <div className="flex justify-between font-semibold text-neutral-800">
                    <span>Patient Discharged</span>
                    <span className="text-[10px] text-neutral-400">14:15</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">Handover confirmed by Sr. Nirmala</p>
                </div>

                <div className="relative pl-3">
                  <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-neutral-400"></div>
                  <div className="flex justify-between font-semibold text-neutral-800">
                    <span>Strip & Disinfect</span>
                    <span className="text-[10px] text-neutral-400">14:25</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">Terminal disinfectant sprayed • Linen renewed</p>
                </div>

                <div className="relative pl-3">
                  <div className="absolute -left-[11px] top-1 w-2 h-2 rounded-full bg-emerald-600"></div>
                  <div className="flex justify-between font-semibold text-emerald-800">
                    <span>UV-C Robot Passed (254nm)</span>
                    <span className="text-[10px] font-bold text-emerald-800">14:40</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 font-medium">UV-C telemetry 4.2 J/cm² verified</p>
                </div>
              </div>
            </div>

            {/* Verification Staff */}
            <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-[10px]">
                  RK
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-neutral-900">Ramesh Kumar</span>
                  <span className="text-[10px] text-neutral-500">Sanitation Lead • Ward A & B</span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">Verified</span>
            </div>

            {/* Prominent Action Bar */}
            <div className="space-y-2 pt-1">
              {(selectedBed.patientName || selectedBed.status === 'occupied') && (
                <button
                  onClick={() => {
                    const patName = selectedBed.patientName || 'Aarav Mehta';
                    const patUhid = selectedBed.patientUhid || 'HOS-2026-1001';
                    clinicalNotesService.openNotesPanel({
                      id: patUhid,
                      uhid: patUhid,
                      name: patName,
                      age: 54,
                      gender: 'Male',
                      ward: selectedBed.ward,
                      bedId: selectedBed.id,
                      diagnosis: selectedBed.hardwareType || 'Post-Op Bedside Monitoring',
                      acuity: (selectedBed.patientAcuity as any) || 'moderate',
                    });
                    onTriggerToast(`Opened Clinical Notes side-panel for ${patName} (${selectedBed.id}).`);
                  }}
                  className="w-full py-2 rounded-full bg-[#141416] hover:bg-neutral-800 text-[#fcde6d] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  title="Open Clinical Notes & Bedside Observations"
                >
                  <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                  <span>Clinical Notes • {selectedBed.patientName || 'Patient Chart'}</span>
                </button>
              )}

              <button 
                onClick={() => {
                  setAdmittedSuccess(true);
                  onTriggerToast(`Admission authorized for ${selectedBed.id}. Door keycard issued.`);
                }}
                className="w-full py-2.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[17px]">verified</span>
                <span>{admittedSuccess ? 'Admission Confirmed' : 'Authorize Admission'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onTriggerToast(`Emergency Override triggered for ${selectedBed.id}!`)}
                  className="flex-1 py-2 rounded-full bg-[#fcde6d] text-[#221b00] hover:brightness-95 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">bolt</span>
                  <span>Emergency Override</span>
                </button>
                <button 
                  onClick={() => onTriggerToast(`Audit report generated for ${selectedBed.id}.`)}
                  className="py-2 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  <span>Log</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mini Gas Plant Telemetry Widget */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-neutral-700">air</span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Medical Gas Plant</span>
                <span className="font-semibold text-neutral-900">O2 Line Pressure: 4.2 Bar</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">Optimal</span>
          </div>

          {/* Recent Turnover Telemetry Feed */}
          {recentTurnoverHistory.length > 0 && (
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Recent Bed Turnovers
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">Live Stream</span>
              </div>
              <div className="space-y-1.5">
                {recentTurnoverHistory.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-emerald-50/50 text-[11px]">
                    <span className="font-bold text-emerald-900">Bed {ev.bedId} ({ev.ward})</span>
                    <span className="text-neutral-500 font-mono text-[10px]">{ev.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
};
