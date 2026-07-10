import { useSyncExternalStore } from "react";

// Minimal cross-screen UI state: the board's zen mode hides the native tab
// bar, which is owned by the tabs layout. A module store keeps the two in
// sync without a provider or a state library.

type Listener = () => void;

let tabBarHidden = false;
const listeners = new Set<Listener>();

export function setTabBarHidden(hidden: boolean) {
  if (tabBarHidden === hidden) return;
  tabBarHidden = hidden;
  listeners.forEach((listener) => listener());
}

export function useTabBarHidden(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tabBarHidden
  );
}

// Prep-plan hand-off from a Quest contact ("Drill these in Prep") to the Prep
// tab — same module-store pattern, mirrors the web's localStorage channel.

export type PrepPlan = { name: string; deadline: string; techs: string[] };

let prepPlan: PrepPlan | null = null;
const planListeners = new Set<Listener>();

export function setPrepPlan(plan: PrepPlan | null) {
  prepPlan = plan;
  planListeners.forEach((listener) => listener());
}

export function usePrepPlan(): PrepPlan | null {
  return useSyncExternalStore(
    (listener) => {
      planListeners.add(listener);
      return () => planListeners.delete(listener);
    },
    () => prepPlan
  );
}
