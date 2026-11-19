import { useSyncExternalStore } from "react";

// The devbox that the Shako workspace's Build view connected (github.com/fwanggg/shako, shako/docs/build.md). The
// workspace shows this app in a frame and sends the devbox's facts (shakoBridge.tsx). One devbox at a time.

export const inShakoFrame = typeof window !== "undefined" && window.parent !== window;

export interface ShakoUse {
  readonly pct: number;
  readonly used: number;
  readonly total: number;
}

export interface ShakoDevbox {
  readonly name: string;
  readonly tenant: string;
  readonly state: string;
  readonly ram: ShakoUse | null;
  readonly disk: ShakoUse | null;
}

let devbox: ShakoDevbox | null = null;
const listeners = new Set<() => void>();

export function setShakoDevbox(next: ShakoDevbox | null) {
  devbox = next;
  for (const listener of listeners) listener();
}

export function useShakoDevbox() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => devbox,
  );
}

export function askShakoToDisconnect() {
  window.parent.postMessage({ type: "shako:disconnect" }, window.location.origin);
}
