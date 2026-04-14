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

  private async unlock() {
    console.log("Audio Automation: Unlocking hardware...");
    
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.hasUnlocked = true;
      this.media.muted = false;
      this.media.volume = 1.0;

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

    // Enforcement Loop
    setInterval(() => {
      if (this.media.paused) this.media.play().catch(() => {});
      if (this.hasUnlocked) {
        if (this.media.muted) this.media.muted = false;
        if (this.media.volume < 1.0) this.media.volume = 1.0;
      }
    }, 250);
  }
}
