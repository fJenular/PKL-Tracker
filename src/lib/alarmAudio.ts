// Web Audio API Synthesizer & Browser Notification for Attendance Alarm

class AlarmSoundManager {
  private audioCtx: AudioContext | null = null;

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

  /**
   * Mainkan bunyi alarm nada harmonik
   */
  public playAlarm(type: 'morning' | 'afternoon'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies:
    // Morning reminder: C5 -> E5 -> G5 -> C6 (Nada cerah bangun & siap absen)
    // Afternoon reminder: A4 -> C#5 -> E5 -> A5 (Nada selesai kerja / pulang)
    const notes = type === 'morning'
      ? [523.25, 659.25, 783.99, 1046.50]
      : [440.00, 554.37, 659.25, 880.00];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.4);
    });

    // Ringan kedua setelah jeda singkat (efek dual-bell chime)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.8 + idx * 0.15);

      gain.gain.setValueAtTime(0, now + 0.8 + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.8 + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.8 + idx * 0.15);
      osc.stop(now + 0.8 + idx * 0.15 + 0.45);
    });
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
          icon: '/assets/logo.png',
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/assets/logo.png',
          });
        }
      }
    } catch (e) {
      // Ignored if notifications not allowed
    }
  }
}

export const alarmManager = new AlarmSoundManager();
