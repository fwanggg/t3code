import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { useEffect, useEffectEvent } from "react";

import { connectPairing } from "./connection/onboarding";
import { useEnvironments } from "./state/environments";
import { useAtomCommand } from "./state/use-atom-command";

// The bridge to the Shako workspace (github.com/fwanggg/shako, shako/docs/build.md). The workspace shows this app in a
// frame of the same origin. It sends {type: "shako:pair", host, credential} for each of the user's VMs that this
// app must pair, and this app tells it which VMs it has, and their connection phase.

interface PairMessage {
  readonly type: "shako:pair";
  readonly host: string;
  readonly credential: string;
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

function postToWorkspace(message: object) {
  window.parent.postMessage(message, window.location.origin);
}

export function ShakoBridge() {
  const { isReady, environments } = useEnvironments();
  const pair = useAtomCommand(connectPairing, { reportFailure: false });
  const inFrame = window.parent !== window;
  const report = environments
    .map((environment) => ({ host: environment.displayUrl, phase: environment.connection.phase }))
    .filter((environment) => environment.host !== null);
  const reportKey = JSON.stringify(report);

  const onMessage = useEffectEvent(async (event: MessageEvent) => {
    if (event.origin !== window.location.origin || !isPairMessage(event.data)) return;
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
