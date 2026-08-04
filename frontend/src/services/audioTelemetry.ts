// Audio Telemetry Speech Synthesis Service using Web Speech API

class AudioTelemetryService {
  private isMuted: boolean = false;
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      const saved = localStorage.getItem('droneroute-audio-muted');
      this.isMuted = saved === 'true';
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('droneroute-audio-muted', String(this.isMuted));
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    } else if (!this.isMuted) {
      this.speak("Audio telemetry enabled.");
    }
    return this.isMuted;
  }

  public speak(text: string, priority: 'normal' | 'high' = 'normal') {
    if (this.isMuted || !this.synth) return;

    if (priority === 'high') {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    const voices = this.synth.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    this.synth.speak(utterance);
  }

  public announceMissionStart(distanceKm: number, flightTimeMin: number, batteryPct: number) {
    const text = `Mission initialized. Route distance: ${distanceKm.toFixed(1)} kilometers. Estimated flight time: ${flightTimeMin.toFixed(1)} minutes using ${batteryPct.toFixed(0)} percent battery.`;
    this.speak(text, 'high');
  }

  public announceHazardInjected() {
    const text = `Warning. Mid-flight airspace hazard detected. Genetic algorithm initiating dynamic re-routing.`;
    this.speak(text, 'high');
  }

  public announceReRouteSuccess(newDistKm: number) {
    const text = `Re-routing complete. Alternate path established. ${newDistKm.toFixed(1)} kilometers remaining.`;
    this.speak(text, 'high');
  }

  public announceMissionComplete(batteryRemainingPct: number) {
    const text = `Delivery mission complete. Landing at destination. Remaining battery: ${batteryRemainingPct.toFixed(0)} percent.`;
    this.speak(text, 'normal');
  }
}

export const audioTelemetry = new AudioTelemetryService();
