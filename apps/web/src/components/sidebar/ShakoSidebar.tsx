import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  askShakoToConnect,
  shakoDevboxName,
  toggleShakoDevboxFolded,
  useShakoDevboxNames,
  useShakoFoldedDevboxes,
} from "../../shakoDevboxes";
import { useEnvironments } from "../../state/environments";

// The parts of the sidebar that the Shako workspace's Build view adds (shako/docs/build.md in github.com/fwanggg/shako).

/** The main action at the top of the sidebar: the same place and look as Create VM in the workspace's VMs view. */
export function ShakoConnectVmButton() {
  return (
    <div className="px-2 pt-2">
      <button
        type="button"
        onClick={askShakoToConnect}
        className="flex h-8 w-full items-center justify-center gap-1.5 border border-border bg-secondary text-sm font-medium text-foreground hover:bg-accent"
      >
        <PlusIcon className="size-4" aria-hidden />
        Connect VM
      </button>
    </div>
  );
}

export interface ShakoDevboxGroup {
  readonly environmentId: string;
  readonly name: string;
  readonly folded: boolean;
  readonly threads: readonly EnvironmentThreadShell[];
}

/** The active threads in one group for each devbox, in the order of the environments. */
export function useShakoDevboxGroups(
  threads: readonly EnvironmentThreadShell[],
): ShakoDevboxGroup[] {
  const { environments } = useEnvironments();
  const names = useShakoDevboxNames();
  const folded = useShakoFoldedDevboxes();
  return environments.map((environment) => ({
    environmentId: environment.environmentId,
    name: shakoDevboxName(names, environment.displayUrl, environment.label),
    folded: folded.has(environment.environmentId),
    threads: threads.filter((thread) => thread.environmentId === environment.environmentId),
  }));
}

/** The header of a devbox's group: its name, and its thread count while it is folded. A click folds or opens it. */
export function ShakoDevboxHeader({ group }: { readonly group: ShakoDevboxGroup }) {
  return (
    <button
      type="button"
      aria-expanded={!group.folded}
      onClick={() => toggleShakoDevboxFolded(group.environmentId)}
      className="mt-2 flex h-7 w-full items-center gap-2 px-2 text-left text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{group.name}</span>
      {group.folded ? <span className="font-normal">{group.threads.length}</span> : null}
      <ChevronDownIcon
        className={cn("size-3.5 transition-transform", group.folded && "-rotate-90")}
      />
    </button>
  );
}
