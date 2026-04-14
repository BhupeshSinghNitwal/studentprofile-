/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AudioAutomation } from './audioEngine';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2 } from 'lucide-react';

export default function App() {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const automationRef = useRef<AudioAutomation | null>(null);

  // Initialize Audio Automation
  useEffect(() => {
    if (mediaRef.current && !automationRef.current) {
      automationRef.current = new AudioAutomation(mediaRef.current);
      
      const checkInteraction = setInterval(() => {
        if (mediaRef.current && !mediaRef.current.muted) {
          setHasInteracted(true);
          clearInterval(checkInteraction);
        }
      }, 500);

      return () => clearInterval(checkInteraction);
    }
  }, []);

  const handleManualUnlock = () => {
    if (automationRef.current) {
      automationRef.current.unlock();
      setHasInteracted(true);
    }
  };

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

      <AnimatePresence>
        {!hasInteracted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onClick={handleManualUnlock}
            className="group relative flex flex-col items-center gap-4 cursor-pointer z-50"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full group-hover:bg-white/40 transition-all duration-700" />
              <div className="relative w-20 h-20 border border-white/10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover:border-white/30 transition-all duration-500">
                <Volume2 className="w-8 h-8 text-white/40 group-hover:text-white transition-colors duration-500" />
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-[1px] bg-white/5 group-hover:w-24 transition-all duration-700" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}



