// Web Audio API Synthesizer & Browser Notification for Attendance Alarm
// v2 — Alarm keras, berulang tiap 30 detik, + getaran HP (Vibration API)

class AlarmSoundManager {
  private audioCtx: AudioContext | null = null;
  // Map of alarm type => setInterval ID (untuk alarm berulang)
  private repeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /** Mainkan 1x suara alarm yang kencang (gain 0.85) */
  private playOnce(type: 'morning' | 'afternoon'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Nada alarm: 4 nada naik + repetisi (8 nada total, lebih keras)
    const morningNotes  = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 783.99, 1046.50];
    const afternoonNotes = [440.00, 554.37, 659.25, 880.00, 659.25, 880.00, 659.25, 880.00];
    const notes = type === 'morning' ? morningNotes : afternoonNotes;

    notes.forEach((freq, idx) => {
      // Nada utama — keras (gain 0.85)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(freq, now + idx * 0.18);
      gain1.gain.setValueAtTime(0, now + idx * 0.18);
      gain1.gain.linearRampToValueAtTime(0.85, now + idx * 0.18 + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 0.32);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now + idx * 0.18);
      osc1.stop(now + idx * 0.18 + 0.35);

      // Lapisan harmonis (sine) supaya tidak terlalu harsh
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now + idx * 0.18);
      gain2.gain.setValueAtTime(0, now + idx * 0.18);
      gain2.gain.linearRampToValueAtTime(0.4, now + idx * 0.18 + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 0.30);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + idx * 0.18);
      osc2.stop(now + idx * 0.18 + 0.33);
    });

    // Getarkan HP (Vibration API) — pola: 300ms vibrate, 100ms stop, 5x
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300, 100, 300, 100, 500]);
    }
  }

  /**
   * Mainkan alarm sekali dan aktifkan pengulangan tiap 30 detik
   * sampai stopAlarm(type) dipanggil.
   */
  public playAlarm(type: 'morning' | 'afternoon'): void {
    // Hentikan interval lama jika ada (hindari duplikasi)
    this.stopAlarm(type);

    // Mainkan langsung
    this.playOnce(type);

    // Ulangi setiap 30 detik
    const intervalId = setInterval(() => {
      this.playOnce(type);
      // Kirim notifikasi ulang tiap kali berbunyi
      const title = type === 'morning'
        ? '🚨 Alarm Absen Masuk! (07:30 WIB)'
        : '🔔 Alarm Absen Pulang! (16:00 WIB)';
      const body = type === 'morning'
        ? 'Kamu belum absen masuk PKL hari ini. Segera lakukan selfie absensi!'
        : 'Jam kerja PKL selesai. Segera lakukan selfie absen pulang!';
      this.sendNotification(title, body);
    }, 30_000); // setiap 30 detik

    this.repeatIntervals.set(type, intervalId);
  }

  /**
   * Hentikan alarm berulang (dipanggil saat user dismiss atau sudah absen)
   */
  public stopAlarm(type: 'morning' | 'afternoon'): void {
    const existing = this.repeatIntervals.get(type);
    if (existing !== undefined) {
      clearInterval(existing);
      this.repeatIntervals.delete(type);
    }
    // Stop vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  /** Hentikan SEMUA alarm */
  public stopAllAlarms(): void {
    this.stopAlarm('morning');
    this.stopAlarm('afternoon');
  }

  /**
   * Request dan kirim browser push notification jika didukung
   */
  public async sendNotification(title: string, body: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          requireInteraction: true, // Notifikasi tidak hilang sendiri
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            requireInteraction: true,
          });
        }
      }
    } catch (e) {
      // Ignored if notifications not allowed
    }
  }
}

export const alarmManager = new AlarmSoundManager();

