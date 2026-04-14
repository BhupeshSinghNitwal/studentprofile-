/**
 * Audio Automation Engine
 * Handles aggressive autoplay and hardware unlocking for Desktop and Mobile.
 */

export class AudioAutomation {
  private media: HTMLMediaElement;
  private audioCtx: AudioContext | null = null;
  private hasUnlocked = false;

  constructor(mediaElement: HTMLMediaElement) {
    this.media = mediaElement;
    this.setupTriggers();
    this.startMutedAutoplay();
    this.setupVolumeEnforcement();
  }

  private setupVolumeEnforcement() {
    // Aggressively reset volume if user tries to change it via UI or hardware buttons
    this.media.addEventListener('volumechange', () => {
      if (this.hasUnlocked) {
        if (this.media.volume < 1.0) this.media.volume = 1.0;
        if (this.media.muted) this.media.muted = false;
      }
    });
  }

  private setupTriggers() {
    // Desktop & Mobile interaction events
    const events = [
      'touchstart', 'mousedown', 'keydown', 'wheel', 
      'mousemove', 'pointerdown', 'scroll', 'click',
      'mouseenter', 'mouseover' // Desktop specific
    ];

    const unlock = async () => {
      if (this.hasUnlocked) return;
      await this.unlock();
      events.forEach(e => window.removeEventListener(e, unlock, { capture: true }));
    };

    events.forEach(e => window.addEventListener(e, unlock, { once: true, capture: true }));
  }

  public async unlock() {
    if (this.hasUnlocked) return;
    console.log("Audio Automation: Manual unlock triggered...");
    
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Monitor state changes to ensure it stays running
      this.audioCtx?.addEventListener('statechange', () => {
        if (this.audioCtx?.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      });

      this.hasUnlocked = true;
      this.media.muted = false;
      this.media.volume = 1.0;

      // Keep-alive oscillator (silent)
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const silentGain = this.audioCtx.createGain();
        silentGain.gain.value = 0.00001;
        osc.connect(silentGain);
        silentGain.connect(this.audioCtx.destination);
        osc.start();
      }

      const playPromise = this.media.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio Automation: Play failed, retrying...", err);
          requestAnimationFrame(() => this.media.play().catch(() => {}));
        });
      }

      // Immersion: Fullscreen
      document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {
      console.error("Audio Automation: Unlock error", e);
    }
  }

  private startMutedAutoplay() {
    this.media.muted = true;
    this.media.volume = 0;
    
    const attempt = () => {
      this.media.play().catch(() => {
        setTimeout(attempt, 200);
      });
    };
    attempt();

    // Enforcement Loop - Ultra aggressive (every 50ms)
    setInterval(() => {
      if (this.media.paused) this.media.play().catch(() => {});
      if (this.hasUnlocked) {
        if (this.media.muted) this.media.muted = false;
        if (this.media.volume < 1.0) this.media.volume = 1.0;
      }
    }, 50);
  }
}
