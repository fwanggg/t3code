import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import type { EnvironmentId } from "@t3tools/contracts";
import {
  ChevronDownIcon,
  FolderPlusIcon,
  ListFilterIcon,
  PlusIcon,
  SearchIcon,
  SquarePenIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { openCommandPalette } from "../../commandPaletteBus";
import { useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useScratchProject } from "../../hooks/useScratchProject";
import {
  askShakoToConnect,
  setShakoAddProjectEnvironment,
  setShakoDevboxView,
  shakoDevboxName,
  shakoDevboxView,
  toggleShakoDevboxFolded,
  useShakoDevboxNames,
  useShakoDevboxViews,
  useShakoFoldedDevboxes,
} from "../../shakoDevboxes";
import { useProjects } from "../../state/entities";
import { useEnvironments } from "../../state/environments";
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../ui/menu";

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
  readonly environmentId: EnvironmentId;
  readonly name: string;
  readonly folded: boolean;
  readonly threads: readonly EnvironmentThreadShell[];
}

/**
 * The active threads in one group for each devbox, in the order of the environments, with the devbox's search and
 * project filter applied.
 */
export function useShakoDevboxGroups(
  threads: readonly EnvironmentThreadShell[],
): ShakoDevboxGroup[] {
  const { environments } = useEnvironments();
  const names = useShakoDevboxNames();
  const folded = useShakoFoldedDevboxes();
  const views = useShakoDevboxViews();
  return environments.map((environment) => {
    const view = shakoDevboxView(views, environment.environmentId);
    const query = view.query.trim().toLowerCase();
    return {
      environmentId: environment.environmentId,
      name: shakoDevboxName(names, environment.displayUrl, environment.label),
      folded: folded.has(environment.environmentId),
      threads: threads.filter(
        (thread) =>
          thread.environmentId === environment.environmentId &&
          (view.projectId === null || thread.projectId === view.projectId) &&
          (query === "" || thread.title.toLowerCase().includes(query)),
      ),
    };
  });
}

/**
 * The row of one devbox, as T3's own row is for one server: search its threads, show one of its projects, add a
 * project to it, start a thread on it.
 */
export function ShakoDevboxToolbar({ environmentId }: { readonly environmentId: EnvironmentId }) {
  const view = shakoDevboxView(useShakoDevboxViews(), environmentId);
  const projects = useProjects().filter(
    (project) => project.environmentId === environmentId && !project.isScratch,
  );
  const handleNewThread = useNewThreadHandler();
  const { startScratchThread } = useScratchProject();
  const iconButton =
    "flex size-7 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground";
  const newThread = () => {
    const project = projects.find((candidate) => candidate.id === view.projectId);
    if (project) void handleNewThread({ environmentId, projectId: project.id });
    else void startScratchThread(environmentId);
  };
  return (
    <div className="flex items-center gap-1 px-2 pb-1">
      <label className="flex h-7 min-w-0 flex-1 items-center gap-2 px-2 text-sm text-muted-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
        <SearchIcon className="size-4 shrink-0" />
        <input
          type="search"
          value={view.query}
          onChange={(event) =>
            setShakoDevboxView(environmentId, { query: event.currentTarget.value })
          }
          placeholder="Search"
          aria-label="Search the threads of this devbox"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              className={cn(iconButton, view.projectId !== null && "text-foreground")}
              aria-label="Show one project"
            />
          }
        >
          <ListFilterIcon className="size-4" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuRadioGroup
            value={view.projectId ?? ""}
            onValueChange={(value) =>
              setShakoDevboxView(environmentId, {
                projectId: value === "" ? null : String(value),
              })
            }
          >
            <MenuRadioItem value="">All projects</MenuRadioItem>
            {projects.map((project) => (
              <MenuRadioItem key={project.id} value={project.id}>
                {project.title}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      <button
        type="button"
        className={iconButton}
        aria-label="Add a project to this devbox"
        onClick={() => {
          setShakoAddProjectEnvironment(environmentId);
          openCommandPalette({ open: "add-project" });
        }}
      >
        <FolderPlusIcon className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label="New thread on this devbox"
        onClick={newThread}
      >
        <SquarePenIcon className="size-4" />
      </button>
    </div>
  );
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
