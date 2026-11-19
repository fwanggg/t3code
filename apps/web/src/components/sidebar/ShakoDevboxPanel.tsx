import { XIcon } from "lucide-react";

import { askShakoToDisconnect, type ShakoUse, useShakoDevbox } from "../../shakoDevbox";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const GIB = 1024 ** 3;

function Use({ label, use }: { readonly label: string; readonly use: ShakoUse | null }) {
  const amount = use
    ? `${(use.used / GIB).toFixed(1)} of ${(use.total / GIB).toFixed(0)} GB`
    : "not known";
  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-1.5"
      role="img"
      aria-label={`${label}: ${amount}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="block h-1 min-w-0 flex-1 bg-border">
        <span
          className={use && use.pct >= 90 ? "block h-full bg-warning" : "block h-full bg-primary"}
          style={{ width: `${Math.min(use?.pct ?? 0, 100)}%` }}
        />
      </span>
      <span className="tabular-nums">{use ? `${use.pct}%` : "–"}</span>
    </span>
  );
}

/**
 * The devbox of the Shako workspace's Build view, in the top row of the sidebar, right of the collapse button. Two
 * lines: its name and tenant with Disconnect (back to the workspace's list of devboxes), then its RAM and disk use.
 */
export function ShakoDevboxPanel() {
  const devbox = useShakoDevbox();
  if (!devbox) return null;
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-xs leading-none">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={
            devbox.state === "awake"
              ? "size-1.5 shrink-0 rounded-full bg-success"
              : "size-1.5 shrink-0 rounded-full bg-muted-foreground"
          }
          aria-label={devbox.state}
        />
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{devbox.name}</span>
        <span className="min-w-0 truncate text-muted-foreground">{devbox.tenant}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={askShakoToDisconnect}
                aria-label={`Disconnect ${devbox.name}`}
                className="ml-auto flex size-5 shrink-0 items-center justify-center text-error hover:bg-error-surface"
              />
            }
          >
            <XIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipPopup side="bottom">Disconnect</TooltipPopup>
        </Tooltip>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <Use label="RAM" use={devbox.ram} />
        <Use label="Disk" use={devbox.disk} />
      </div>
    </div>
  );
}
