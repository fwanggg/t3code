import { useAtomValue } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { environmentCatalog } from "./connection/catalog";
import { connectPairing } from "./connection/onboarding";
import { setShakoDevbox, type ShakoDevbox } from "./shakoDevbox";
import type { AppRouter } from "./router";
import { useEnvironments } from "./state/environments";
import { environmentProjects } from "./state/projects";
import { environmentShell } from "./state/shell";
import { environmentThreadShells } from "./state/threads";
import { useAtomCommand } from "./state/use-atom-command";

// The bridge to the Shako workspace (github.com/fwanggg/shako, shako/docs/build.md), which shows this app in a frame
// of the same origin. It asks to pair a VM (shako:pair), to forget one (shako:unpair), and sends the connected devbox
// (shako:devbox). This app answers each request and reports its saved VMs (shako:environments).

interface PairMessage {
  readonly type: "shako:pair";
  readonly host: string;
  readonly credential: string;
}

interface UnpairMessage {
  readonly type: "shako:unpair";
  readonly host: string;
}

function isUnpairMessage(data: unknown): data is UnpairMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return message.type === "shako:unpair" && typeof message.host === "string";
}

function readDevboxMessage(data: unknown): ShakoDevbox | null | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const message = data as Record<string, unknown>;
  if (message.type !== "shako:devbox") return undefined;
  return (message.devbox as ShakoDevbox | null) ?? null;
}

function isPairMessage(data: unknown): data is PairMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === "shako:pair" &&
    typeof message.host === "string" &&
    typeof message.credential === "string"
  );
}

const sameHost = (a: string, b: string) =>
  a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

function postToWorkspace(message: object) {
  window.parent.postMessage(message, window.location.origin);
}

// The hosted build has no primary computer, so T3 never opens its welcome page by itself
// (resolveHostedFirstRunDecision). The bridge opens it for a devbox with no project and no thread: after a pairing,
// and at a page load on T3's main page.
const FAILED_PHASES: ReadonlySet<string> = new Set(["error", "blocked", "unsupported"]);

interface FirstVisit {
  readonly environmentId: EnvironmentId;
  /** True after a pairing: open the welcome page from any route. False at a page load: only from the main page. */
  readonly fromPairing: boolean;
}

/** Wait for the threads and projects of the devbox (its shell is live), then decide once. */
function ShakoFirstVisit({
  visit,
  router,
  onDone,
}: {
  readonly visit: FirstVisit;
  readonly router: AppRouter;
  readonly onDone: () => void;
}) {
  const { environmentId, fromPairing } = visit;
  const live = useAtomValue(environmentShell.stateValueAtom(environmentId)).status === "live";
  const { environments } = useEnvironments();
  const phase = environments.find((e) => e.environmentId === environmentId)?.connection.phase;
  const projects = useAtomValue(environmentProjects.projectsAtom);
  const threads = useAtomValue(environmentThreadShells.threadShellsAtom);
  const fresh =
    !projects.some((project) => project.environmentId === environmentId) &&
    !threads.some((thread) => thread.environmentId === environmentId);
  const decided = useRef(false);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- opens the welcome page once the devbox sent its threads and projects
  useEffect(() => {
    if (decided.current) return;
    if (phase !== undefined && FAILED_PHASES.has(phase)) {
      decided.current = true;
      console.warn(
        `shako: ${environmentId} cannot connect (${phase}); T3 shows the connection state`,
      );
      onDone();
      return;
    }
    if (!live) return;
    decided.current = true;
    const onMainPage = router.state.location.pathname === "/";
    if (fresh && (fromPairing || onMainPage)) {
      void router.navigate({ to: "/welcome", hash: `agents:${environmentId}`, replace: true });
    }
    onDone();
  }, [live, phase, fresh, fromPairing, environmentId, router, onDone]);

  return null;
}

export function ShakoBridge({ router }: { readonly router: AppRouter }) {
  const { isReady, environments } = useEnvironments();
  const [visit, setVisit] = useState<FirstVisit | null>(null);
  // The page-load check runs once: after it, or after a pairing, only a new pairing opens the welcome page.
  const [loadChecked, setLoadChecked] = useState(false);
  const endVisit = () => {
    setVisit(null);
    setLoadChecked(true);
  };
  const pair = useAtomCommand(connectPairing, { reportFailure: false });
  const remove = useAtomCommand(environmentCatalog.remove, { reportFailure: false });
  const inFrame = window.parent !== window;
  const report = environments
    .map((environment) => ({ host: environment.displayUrl, phase: environment.connection.phase }))
    .filter((environment) => environment.host !== null);
  const reportKey = JSON.stringify(report);

  const onMessage = useEffectEvent(async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const devbox = readDevboxMessage(event.data);
    if (devbox !== undefined) {
      setShakoDevbox(devbox);
      return;
    }
    if (isUnpairMessage(event.data)) {
      const host = event.data.host;
      const environment = environments.find(
        (e) => e.displayUrl !== null && sameHost(e.displayUrl, host),
      );
      const result = environment ? await remove(environment.environmentId) : null;
      postToWorkspace({
        type: "shako:unpaired",
        host,
        error:
          result === null || result._tag === "Success"
            ? null
            : String(squashAtomCommandFailure(result)),
      });
      return;
    }
    if (!isPairMessage(event.data)) return;
    const result = await pair({ host: event.data.host, pairingCode: event.data.credential });
    if (result._tag === "Success") {
      // T3's main page at once: never a thread or a page of the devbox before. Then the welcome page, if new.
      void router.navigate({ to: "/", replace: true });
      setVisit({ environmentId: result.value, fromPairing: true });
    }
    postToWorkspace({
      type: "shako:paired",
      host: event.data.host,
      error: result._tag === "Success" ? null : String(squashAtomCommandFailure(result)),
    });
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- the workspace frame listens for pairing requests from its parent page
  useEffect(() => {
    if (!inFrame) return;
    const listener = (event: MessageEvent) => void onMessage(event);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [inFrame]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- the parent page needs the saved VMs to know which to pair
  useEffect(() => {
    if (inFrame && isReady)
      postToWorkspace({ type: "shako:environments", environments: JSON.parse(reportKey) });
  }, [inFrame, isReady, reportKey]);

  // At a page load, a connected devbox with no project and no thread gets the welcome page.
  const [only] = environments;
  const loadVisit: FirstVisit | null =
    inFrame && isReady && !loadChecked && environments.length === 1 && only
      ? { environmentId: only.environmentId, fromPairing: false }
      : null;
  const current = visit ?? loadVisit;

  return current === null ? null : (
    <ShakoFirstVisit
      key={`${current.environmentId}:${current.fromPairing}`}
      visit={current}
      router={router}
      onDone={endVisit}
    />
  );
}
