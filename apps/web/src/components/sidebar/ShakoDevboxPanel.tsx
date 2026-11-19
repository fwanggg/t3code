import { askShakoToDisconnect, type ShakoUse, useShakoDevbox } from "../../shakoDevbox";

const GIB = 1024 ** 3;

function Use({ label, use }: { readonly label: string; readonly use: ShakoUse | null }) {
  const title = use
    ? `${label}: ${(use.used / GIB).toFixed(1)} GB of ${(use.total / GIB).toFixed(1)} GB used`
    : `${label}: not known`;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5" role="img" aria-label={title}>
      <span className="text-muted-foreground">{label}</span>
      <span className="h-1 min-w-0 flex-1 bg-muted">
        <span
          className={use && use.pct >= 90 ? "block h-full bg-warning" : "block h-full bg-primary"}
          style={{ width: `${Math.min(use?.pct ?? 0, 100)}%` }}
        />
      </span>
      <span className="w-8 text-right tabular-nums">{use ? `${use.pct}%` : "–"}</span>
    </div>
  );
}

/**
 * The devbox of the Shako workspace's Build view, at the top of the sidebar: its name and tenant, its RAM and disk use,
 * and Disconnect, which returns to the workspace's list of devboxes.
 */
export function ShakoDevboxPanel() {
  const devbox = useShakoDevbox();
  if (!devbox) return null;
  return (
    <div className="mx-2 mt-2 flex flex-col gap-1.5 border border-border px-2.5 py-2 text-xs">
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={askShakoToDisconnect}
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
        >
          Disconnect
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Use label="RAM" use={devbox.ram} />
        <Use label="Disk" use={devbox.disk} />
      </div>
    </div>
  );
}
