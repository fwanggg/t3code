import { useSyncExternalStore } from "react";

// The Shako workspace's names of its devboxes (github.com/fwanggg/shako, shako/docs/build.md), and which devbox groups
// the user folded in the sidebar. The bridge (shakoBridge.tsx) gets the names from the workspace: T3 knows each
// devbox by the address of its server.

export const inShakoFrame = typeof window !== "undefined" && window.parent !== window;

const sameHost = (a: string, b: string) =>
  a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

let names: Readonly<Record<string, string>> = {};
const listeners = new Set<() => void>();
const FOLDED_KEY = "shako:folded-devboxes";

function readFolded(): ReadonlySet<string> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(FOLDED_KEY) ?? "[]");
    return new Set(
      Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [],
    );
  } catch {
    return new Set();
  }
}

let folded = inShakoFrame ? readFolded() : new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setShakoDevboxNames(next: Record<string, string>) {
  names = next;
  emit();
}

export function toggleShakoDevboxFolded(environmentId: string) {
  const next = new Set(folded);
  if (next.has(environmentId)) next.delete(environmentId);
  else next.add(environmentId);
  folded = next;
  try {
    window.localStorage.setItem(FOLDED_KEY, JSON.stringify([...next]));
  } catch (error) {
    console.error("shako: cannot keep the folded devboxes in this browser:", error);
  }
  emit();
}

export function useShakoDevboxNames() {
  return useSyncExternalStore(subscribe, () => names);
}

export function useShakoFoldedDevboxes() {
  return useSyncExternalStore(subscribe, () => folded);
}

/** The workspace's name of the devbox at this address, else T3's own label. */
export function shakoDevboxName(
  devboxNames: Readonly<Record<string, string>>,
  host: string | null,
  label: string,
) {
  if (host === null) return label;
  const match = Object.entries(devboxNames).find(([known]) => sameHost(known, host));
  return match ? match[1] : label;
}

// The row of each devbox (ShakoDevboxToolbar): its search text and its project filter, by environment id.
export interface ShakoDevboxView {
  readonly query: string;
  readonly projectId: string | null;
}

const NO_VIEW: ShakoDevboxView = { query: "", projectId: null };
let views: Readonly<Record<string, ShakoDevboxView>> = {};

export function setShakoDevboxView(environmentId: string, change: Partial<ShakoDevboxView>) {
  views = { ...views, [environmentId]: { ...(views[environmentId] ?? NO_VIEW), ...change } };
  emit();
}

export function useShakoDevboxViews() {
  return useSyncExternalStore(subscribe, () => views);
}

export function shakoDevboxView(
  all: Readonly<Record<string, ShakoDevboxView>>,
  environmentId: string,
) {
  return all[environmentId] ?? NO_VIEW;
}

// The devbox whose Add project button opened the command palette: the palette adds the project there.
let addProjectEnvironmentId: string | null = null;

export function readShakoAddProjectEnvironment(): string | null {
  return addProjectEnvironmentId;
}

export function setShakoAddProjectEnvironment(environmentId: string) {
  addProjectEnvironmentId = environmentId;
}

export function askShakoToConnect() {
  window.parent.postMessage({ type: "shako:open-connect" }, window.location.origin);
}
