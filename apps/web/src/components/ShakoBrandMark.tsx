import { HOOD_PATH, LOGO_BACKGROUND, LOGO_HOOD, LOGO_SIZE } from "./shakoLogoPaths";

/** The VM picker of workspace.shako.dev: this app lives at <picker>/app/. */
const SHAKO_PICKER_PATH = import.meta.env.BASE_URL.replace(/\/app\/?$/, "") || "/";

/** The Shako logo and name, in place of T3's wordmark. A click goes back to the VM picker. */
export function ShakoBrandMark() {
  return (
    <a
      href={SHAKO_PICKER_PATH}
      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium tracking-tight text-foreground"
      aria-label="Shako: your VMs"
    >
      <svg viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`} className="size-4 shrink-0" aria-hidden>
        <rect width={LOGO_SIZE} height={LOGO_SIZE} fill={LOGO_BACKGROUND} />
        <path d={HOOD_PATH} fill={LOGO_HOOD} />
      </svg>
      <span className="truncate">Shako</span>
    </a>
  );
}
