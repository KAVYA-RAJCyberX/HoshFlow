import React, { useState, useEffect } from 'react';
import { alertSoundService, UserAlertSettings } from '../../services/alertSoundService';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerToast?: (msg: string) => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  onTriggerToast,
}) => {
  const [settings, setSettings] = useState<UserAlertSettings>(alertSoundService.getSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [samplingRate, setSamplingRate] = useState('Continuous (5s stream refresh)');
  const [targetWard, setTargetWard] = useState('Ward 3 (General & Post-Op Surgical)');

  useEffect(() => {
    const unsubscribe = alertSoundService.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleToggleAudibleAlert = () => {
    const updated = !settings.emergentAudibleAlerts;
    alertSoundService.updateSettings({ emergentAudibleAlerts: updated });
    if (onTriggerToast) {
      onTriggerToast(
        updated
          ? 'Audible Alerts ENABLED for Emergent patient admissions 🔔'
          : 'Audible Alerts DISABLED (Silent Mode) 🔕'
      );
    }
  };

  const handleTestSound = () => {
    setIsPlayingTest(true);
    alertSoundService.playAlertSound(true);
    if (onTriggerToast) {
      onTriggerToast(`Testing emergent alert tone [${settings.alertTone.replace('_', ' ').toUpperCase()}]...`);
    }
    setTimeout(() => setIsPlayingTest(false), 900);
  };

  const handleToneChange = (tone: UserAlertSettings['alertTone']) => {
    alertSoundService.updateSettings({ alertTone: tone });
  };

  const handleVolumeChange = (vol: number) => {
    alertSoundService.updateSettings({ alertVolume: vol });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 font-['Inter',sans-serif]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-black/10 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-[#fcde6d]/30 text-[#756100] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">tune</span>
            </span>
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-['Plus_Jakarta_Sans']">
                User Settings &amp; Node Preferences
              </h3>
              <p className="text-[11px] text-neutral-500">Audio alerts, telemetry stream &amp; hospital configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
            aria-label="Close settings"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4 py-4 text-xs text-neutral-600">
          {/* Section 1: Browser-based Audible Alert Settings (Highlighted) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-red-50/40 border border-amber-200/80 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  settings.emergentAudibleAlerts ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {settings.emergentAudibleAlerts ? 'volume_up' : 'volume_off'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">
                      Audible Emergent Patient Alert
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      settings.emergentAudibleAlerts
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {settings.emergentAudibleAlerts ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                    Play an instant browser-based medical tone whenever a new <strong>'Emergent'</strong> (high-acuity / Code Red) patient is added or admitted to the system.
                  </p>
                </div>
              </div>

              {/* The Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.emergentAudibleAlerts}
                onClick={handleToggleAudibleAlert}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#fcde6d] focus:ring-offset-2 ${
                  settings.emergentAudibleAlerts ? 'bg-[#141416]' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.emergentAudibleAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sub-controls when audible alert is enabled */}
            {settings.emergentAudibleAlerts && (
              <div className="mt-3.5 pt-3 border-t border-amber-200/50 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1 text-[11px]">
                      Alert Tone Type
                    </label>
                    <select
                      value={settings.alertTone}
                      onChange={(e) => handleToneChange(e.target.value as any)}
                      className="w-full p-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800 text-xs focus:ring-1 focus:ring-[#fcde6d] outline-none"
                    >
                      <option value="medical_chime">Medical Harmonic Chime (Recommended)</option>
                      <option value="code_red_pulse">Code Red Dual Pulse</option>
                      <option value="telemetry_pager">Telemetry Pager Sequence</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-neutral-800 text-[11px]">Alert Volume</label>
                      <span className="font-mono text-[10px] text-neutral-500">{Math.round(settings.alertVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={settings.alertVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-amber-700">info</span>
                    Zero external sound files • Synthesized with Web Audio API
                  </span>
                  <button
                    type="button"
                    onClick={handleTestSound}
                    disabled={isPlayingTest}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      isPlayingTest
                        ? 'bg-amber-500 text-white scale-95'
                        : 'bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] text-red-600 animate-pulse">
                      spatial_audio
                    </span>
                    <span>{isPlayingTest ? 'Playing Chime...' : 'Test Alert Sound'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Hospital Node Information */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
            <span className="font-bold text-neutral-900 block text-xs">CityCare Pune - Clinical Node #04B</span>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Primary Tertiary Care Center • 250 Beds Active • Central Clinical Wing
            </p>
            <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-neutral-500">
              <span className="px-1.5 py-0.5 rounded bg-white border border-neutral-200">HL7 FHIR v4.0.1</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Postgres Stream In-Sync
              </span>
            </div>
          </div>

          {/* Section 3: Telemetry Sampling Rate */}
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-800 block text-xs">Telemetry Sampling Rate</label>
            <select
              value={samplingRate}
              onChange={(e) => setSamplingRate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-medium text-neutral-800 text-xs outline-none"
            >
              <option>Continuous (5s stream refresh)</option>
              <option>Standard (15s battery safe)</option>
              <option>Emergency Surge (1s real-time)</option>
            </select>
          </div>

          {/* Section 4: Active Ward Routing Target */}
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-800 block text-xs">Active Ward Routing Target</label>
            <select
              value={targetWard}
              onChange={(e) => setTargetWard(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-medium text-neutral-800 text-xs outline-none"
            >
              <option>Ward 3 (General &amp; Post-Op Surgical)</option>
              <option>ICU &amp; CCU (Critical Care Wing)</option>
              <option>Floor 4 (Pediatrics &amp; Neonatal)</option>
              <option>Ground (Emergency Triage &amp; Ambulatory)</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">NABH &amp; HIPAA Compliant Session</span>
            <button
              onClick={() => {
                onClose();
                if (onTriggerToast) {
                  onTriggerToast('Settings updated & synced with workstation.');
                }
              }}
              className="px-5 py-2 rounded-full bg-[#141416] hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
