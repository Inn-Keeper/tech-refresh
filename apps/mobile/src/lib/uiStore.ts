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
