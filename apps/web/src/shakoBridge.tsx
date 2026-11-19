import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { useEffect, useEffectEvent } from "react";

import { environmentCatalog } from "./connection/catalog";
import { connectPairing } from "./connection/onboarding";
import { setShakoDevboxNames } from "./shakoDevboxes";
import { useEnvironments } from "./state/environments";
import { useAtomCommand } from "./state/use-atom-command";

// The bridge to the Shako workspace (github.com/fwanggg/shako, shako/docs/build.md), which shows this app in a frame
// of the same origin. It asks to pair a VM (shako:pair), to forget one (shako:unpair), and gives VM names (shako:names).
// This app answers each request, and reports its saved VMs with their connection phase (shako:environments).

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

interface NamesMessage {
  readonly type: "shako:names";
  readonly names: Record<string, string>;
}

function isNamesMessage(data: unknown): data is NamesMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === "shako:names" && typeof message.names === "object" && message.names !== null
  );
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

export function ShakoBridge() {
  const { isReady, environments } = useEnvironments();
  const pair = useAtomCommand(connectPairing, { reportFailure: false });
  const remove = useAtomCommand(environmentCatalog.remove, { reportFailure: false });
  const inFrame = window.parent !== window;
  const report = environments
    .map((environment) => ({ host: environment.displayUrl, phase: environment.connection.phase }))
    .filter((environment) => environment.host !== null);
  const reportKey = JSON.stringify(report);

  const onMessage = useEffectEvent(async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (isNamesMessage(event.data)) {
      setShakoDevboxNames(event.data.names);
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

  return null;
}
