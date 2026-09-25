/**
 * alertSoundService.ts
 * Browser-based audio notification engine for hospital emergency events using Web Audio API.
 * Provides user configuration persistence and tone generation without external asset dependencies.
 */

export interface UserAlertSettings {
  emergentAudibleAlerts: boolean;
  alertVolume: number; // 0.0 - 1.0
  alertTone: 'medical_chime' | 'code_red_pulse' | 'telemetry_pager';
  visualAlertBanner: boolean;
}

const STORAGE_KEY = 'hosflow_user_settings';

const DEFAULT_SETTINGS: UserAlertSettings = {
  emergentAudibleAlerts: true,
  alertVolume: 0.75,
  alertTone: 'medical_chime',
  visualAlertBanner: true,
};

type SettingsChangeListener = (settings: UserAlertSettings) => void;

class AlertSoundService {
  private settings: UserAlertSettings;
  private audioCtx: AudioContext | null = null;
  private listeners: Set<SettingsChangeListener> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): UserAlertSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback to default
    }
    return { ...DEFAULT_SETTINGS };
  }

  public getSettings(): UserAlertSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<UserAlertSettings>): UserAlertSettings {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Unable to persist settings to localStorage', e);
    }
    this.listeners.forEach((listener) => listener(this.settings));
    return this.settings;
  }

  public subscribe(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.settings);
    return () => this.listeners.delete(listener);
  }

  private getAudioContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
      return null;
    }
  }

  /**
   * Generates a multi-tone harmonic hospital medical chime
   */
  private playMedicalChime(ctx: AudioContext, masterGain: GainNode) {
    const now = ctx.currentTime;
    // Chime notes: F#5 (739.99 Hz), A5 (880 Hz), C#6 (1108.73 Hz), E6 (1318.51 Hz)
    const frequencies = [740, 880, 1108, 1318];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      // Volume envelope with clear attack and smooth chime tail
      noteGain.gain.setValueAtTime(0, now + idx * 0.11);
      noteGain.gain.linearRampToValueAtTime(0.35, now + idx * 0.11 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.55);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.6);
    });
  }

  /**
   * Generates urgent alternating code red dual-tone emergency pulse
   */
  private playCodeRedPulse(ctx: AudioContext, masterGain: GainNode) {
    const now = ctx.currentTime;
    const pulses = [
      { freq: 880, start: 0, dur: 0.16 },
      { freq: 660, start: 0.18, dur: 0.16 },
      { freq: 880, start: 0.38, dur: 0.16 },
      { freq: 660, start: 0.56, dur: 0.22 },
    ];

    pulses.forEach((p) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p.freq, now + p.start);

      noteGain.gain.setValueAtTime(0, now + p.start);
      noteGain.gain.linearRampToValueAtTime(0.4, now + p.start + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.005, now + p.start + p.dur);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + p.start);
      osc.stop(now + p.start + p.dur + 0.05);
    });
  }

  /**
   * Generates crisp electronic hospital telemetry pager sequence
   */
  private playTelemetryPager(ctx: AudioContext, masterGain: GainNode) {
    const now = ctx.currentTime;
    const beeps = [0, 0.12, 0.24, 0.45, 0.57];

    beeps.forEach((start) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now + start); // C6

      noteGain.gain.setValueAtTime(0, now + start);
      noteGain.gain.linearRampToValueAtTime(0.3, now + start + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.08);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + 0.09);
    });
  }

  /**
   * Play the synthesized emergent sound if enabled in settings
   * @param forcePlay if true, ignores the emergentAudibleAlerts toggle (useful for test buttons)
   */
  public playAlertSound(forcePlay: boolean = false): boolean {
    if (!forcePlay && !this.settings.emergentAudibleAlerts) {
      return false;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    try {
      const masterGain = ctx.createGain();
      const vol = Math.max(0.05, Math.min(1.0, this.settings.alertVolume));
      masterGain.gain.setValueAtTime(vol, ctx.currentTime);
      masterGain.connect(ctx.destination);

      switch (this.settings.alertTone) {
        case 'code_red_pulse':
          this.playCodeRedPulse(ctx, masterGain);
          break;
        case 'telemetry_pager':
          this.playTelemetryPager(ctx, masterGain);
          break;
        case 'medical_chime':
        default:
          this.playMedicalChime(ctx, masterGain);
          break;
      }
      return true;
    } catch (err) {
      console.warn('Audio playback error', err);
      return false;
    }
  }

  /**
   * Convenience method to trigger emergent patient alert
   */
  public notifyEmergentPatient(patientDetails?: { name: string; uhid: string; complaint?: string }): {
    soundPlayed: boolean;
    bannerTitle: string;
    bannerBody: string;
  } {
    const soundPlayed = this.playAlertSound(false);

    const bannerTitle = '🚨 CODE RED / EMERGENT PATIENT INTAKE';
    const bannerBody = patientDetails
      ? `High-Acuity Emergent Admission: ${patientDetails.name} (${patientDetails.uhid}) - Emergency Triage initiated.`
      : 'A new Emergent triage patient has been admitted to the hospital.';

    return {
      soundPlayed,
      bannerTitle,
      bannerBody,
    };
  }
}

export const alertSoundService = new AlertSoundService();
