import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppState } from "./AppState";
import { clearState, DEFAULT_STATE, loadState, saveState } from "./AppState";
import { derive } from "./derive";
import type { Derived } from "./derive";

interface Store {
  state: AppState;
  derived: Derived;
  set: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  setMany: (patch: Partial<AppState>) => void;
  reset: () => void;
  /** Hard delete of all locally stored data. */
  wipe: () => void;
  /** JSON export of the full state. */
  exportJson: () => string;
  importJson: (json: string) => boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const set = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setMany = useCallback((patch: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...DEFAULT_STATE, onboarded: true });
  }, []);

  const wipe = useCallback(() => {
    clearState();
    setState(DEFAULT_STATE);
  }, []);

  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importJson = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as Partial<AppState>;
      if (typeof parsed !== "object" || parsed === null) return false;
      setState({ ...DEFAULT_STATE, ...parsed });
      return true;
    } catch {
      return false;
    }
  }, []);

  const derived = useMemo(() => derive(state), [state]);

  const value = useMemo<Store>(
    () => ({ state, derived, set, setMany, reset, wipe, exportJson, importJson }),
    [state, derived, set, setMany, reset, wipe, exportJson, importJson]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
