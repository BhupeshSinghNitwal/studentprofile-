/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Initialize Media Session and Wake Lock
  useEffect(() => {
    if (!hasInteracted) return;

    // Screen Wake Lock Logic
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
        });
      } catch (err) {
        // Silently fail if wake lock is blocked by permissions policy
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Media Session Hijack
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ' ',
        artist: ' ',
        album: ' ',
        artwork: [
          { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', sizes: '1x1', type: 'image/png' }
        ]
      });

      const noop = () => {
        if (mediaRef.current) {
          mediaRef.current.play().catch(() => {});
        }
      };

      const actions: MediaSessionAction[] = [
        'play', 'pause', 'stop', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'
      ];

      actions.forEach(action => {
        try {
          navigator.mediaSession.setActionHandler(action, noop);
        } catch (e) {}
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release().catch(() => {});
        } catch (e) {}
      }
    };
  }, [hasInteracted]);


  // Aggressive Volume Management & Control Hijacking
  useEffect(() => {
    if (!hasInteracted || !mediaRef.current) return;

    const media = mediaRef.current;

    // Force Play and Aggressive Volume Ramp
    const playMedia = async () => {
      if (!media) return;
      try {
        // Try to play muted first (Browsers allow this automatically)
        media.muted = true;
        media.volume = 0;
        await media.play();
        
        // If we have already interacted, unmute immediately
        if (hasInteracted) {
          media.muted = false;
          media.volume = 1.0;
        }
      } catch (err) {
        // Retry on failure
        setTimeout(playMedia, 50);
      }
    };
    playMedia();

    // Check if playing every 500ms
    const interval = setInterval(() => {
      if (media.paused) {
        media.play().catch(() => {});
      }
    }, 500);

    // Absolute State Enforcement Loop (Unbreakable Lock)
    let animationFrameId: number;
    const enforceState = () => {
      if (hasInteracted) {
        if (media.muted) media.muted = false;
        if (media.volume < 1.0) media.volume = 1.0;
      }
      
      if (media.paused) {
        media.play().catch(() => {});
      }
      
      // Keep Media Session state as "playing"
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      
      animationFrameId = requestAnimationFrame(enforceState);
    };
    animationFrameId = requestAnimationFrame(enforceState);

    // Monitor volumechange event as secondary enforcement
    const handleVolumeChange = () => {
      if (hasInteracted) {
        media.volume = 1.0;
        media.muted = false;
      }
    };
    media.addEventListener('volumechange', handleVolumeChange);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
      media.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [hasInteracted]);

  // Navigation Interception (Back Button)
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);

    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);

  // Lockdown Interactions
  useEffect(() => {
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
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
      window.removeEventListener('beforeunload', preventUnload);
    };
  }, []);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      if (mediaRef.current) {
        mediaRef.current.muted = false;
        mediaRef.current.volume = 1.0;
        mediaRef.current.play().catch(() => {});
      }
      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch (e) {}
    }
  };

  // Hair-trigger interaction detection (closest thing to autoplay)
  useEffect(() => {
    if (hasInteracted) return;

    const trigger = () => handleInteraction();

    // Listen to literally any action the user might take
    const events = ['click', 'touchstart', 'mousemove', 'keydown', 'scroll', 'wheel', 'pointerdown'];
    
    events.forEach(event => {
      document.addEventListener(event, trigger, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trigger);
      });
    };
  }, [hasInteracted]);

  return (
    <div 
      id="void-viewport"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className="fixed inset-0 bg-black cursor-none select-none touch-none overflow-hidden flex items-center justify-center"
      style={{ 
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Hidden Video Element used for Audio - Positioned off-screen but "visible" to prevent throttling */}
      <video
        ref={mediaRef}
        id="media-source"
        src="video.mp4"
        loop
        preload="auto"
        playsInline
        autoPlay
        muted={true}
        disablePictureInPicture
        controlsList="nodownload"
        style={{ 
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1
        }}
      />
      
      {/* The screen remains completely black */}
    </div>
  );
}



