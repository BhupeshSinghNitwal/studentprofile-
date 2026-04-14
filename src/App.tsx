/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AudioAutomation } from './audioEngine';

export default function App() {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const automationRef = useRef<AudioAutomation | null>(null);

  // Initialize Audio Automation
  useEffect(() => {
    if (mediaRef.current && !automationRef.current) {
      automationRef.current = new AudioAutomation(mediaRef.current);
      
      // Sync local state with automation for UI purposes if needed
      const checkInteraction = setInterval(() => {
        if (mediaRef.current && !mediaRef.current.muted) {
          setHasInteracted(true);
          clearInterval(checkInteraction);
        }
      }, 500);

      return () => clearInterval(checkInteraction);
    }
  }, []);

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

  // Lockdown
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



