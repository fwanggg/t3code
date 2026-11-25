import { HOOD_PATH, LOGO_BACKGROUND, LOGO_HOOD, LOGO_SIZE } from "./shakoLogoPaths";

/** The Build view of workspace.shako.dev: this app lives at <build>/app/. */
const SHAKO_PICKER_PATH = import.meta.env.BASE_URL.replace(/\/app\/?$/, "") || "/";

/** The Shako logo and name, in place of T3's wordmark. A click goes back to the VM picker. */
export function ShakoBrandMark() {
  return (
    <a
      href={SHAKO_PICKER_PATH}
      // In the workspace's Build view this app is in a frame: the link opens the workspace, not a page in the frame.
      target="_top"
      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium tracking-tight text-foreground"
      // oxlint-disable-next-line t3code/no-untranslated-copy -- Shako build: English only, so a rebase does not touch the catalogs
      aria-label="Shako: your VMs"
    >
      <svg viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`} className="size-4 shrink-0" aria-hidden>
        <rect width={LOGO_SIZE} height={LOGO_SIZE} fill={LOGO_BACKGROUND} />
        <path d={HOOD_PATH} fill={LOGO_HOOD} />
      </svg>
      {/* oxlint-disable-next-line t3code/no-untranslated-copy -- Shako build: English only, so a rebase does not touch the catalogs */}
      <span className="truncate">Shako</span>
    </a>
  );
}
