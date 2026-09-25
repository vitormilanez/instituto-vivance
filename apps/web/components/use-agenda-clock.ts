"use client";

import { useEffect, useState } from "react";

// Advance the server instant using elapsed time, without trusting the device's
// timezone or wall clock. A refreshed server instant resets the anchor.
export function useAgendaClock(serverTime: string) {
  const [tick, setTick] = useState(serverTime);
  useEffect(() => {
    const anchor = performance.now();
    const update = () => setTick(new Date(Date.parse(serverTime) + performance.now() - anchor).toISOString());
    const interval = window.setInterval(update, 15_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [serverTime]);
  return Date.parse(tick) > Date.parse(serverTime) ? tick : serverTime;
}
