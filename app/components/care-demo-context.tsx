'use client';
import { createCareActions } from './care-demo-actions';

import { useEffect,useMemo,useState,type ReactNode } from 'react';
import {
  CareDemoContext,
  type CareDemoState
} from './care-demo-store';

import { LEGACY_STORAGE_KEY,STORAGE_KEY,emptyState,migrateLegacyState,normalizeCurrentState } from './care-demo-model';

export function CareDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CareDemoState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      let restored: CareDemoState | null = null;
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          restored = normalizeCurrentState(JSON.parse(stored));
        } catch {
          restored = null;
        }
        if (!restored) window.sessionStorage.removeItem(STORAGE_KEY);
      }

      if (!restored) {
        const legacy = window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          try {
            restored = migrateLegacyState(JSON.parse(legacy));
          } catch {
            restored = null;
          }
        }
      }

      if (restored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata ou migra a sessão sem apagar a origem v1 antes da gravação v2
        setState(restored);
      }
    } catch {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // sessionStorage pode estar indisponível; o protótipo continua em memória.
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Falhas de quota ou privacidade não devem interromper o fluxo demonstrativo.
      }
    }
  }, [hydrated, state]);

  const value = useMemo(() => createCareActions(state, setState, hydrated), [state, hydrated]);
  return <CareDemoContext.Provider value={value}>{children}</CareDemoContext.Provider>;
}
