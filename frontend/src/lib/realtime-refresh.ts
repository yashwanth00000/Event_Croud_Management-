'use client';

import { useEffect, useRef } from 'react';

/** Periodically reload visible database-backed screens and refresh immediately on tab focus. */
export function useRealtimeRefresh(refresh: () => void | Promise<void>, intervalMs = 5000) {
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') void refreshRef.current(); };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [intervalMs]);
}
