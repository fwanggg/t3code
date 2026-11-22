import {
  ClaudeSettings,
  CodexSettings,
  type ExecutionEnvironmentPlatformOs,
  type ServerProvider,
  type ServerSettings,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const decodeClaudeSettings = Schema.decodeUnknownOption(ClaudeSettings);
const decodeCodexSettings = Schema.decodeUnknownOption(CodexSettings);
const SAFE_SHELL_BINARY_PATTERN = /^[A-Za-z0-9_./:\\-]+$/;

function quoteProviderBinary(
  binaryPath: string,
  fallback: string,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  if (
    SAFE_SHELL_BINARY_PATTERN.test(binaryPath) &&
    (platform === "windows" || !binaryPath.includes("\\"))
  ) {
    return binaryPath;
  }
  if (platform === "windows") return `& '${binaryPath.replaceAll("'", "''")}'`;
  if (platform === "darwin" || platform === "linux") {
    if (binaryPath.startsWith("~/") || binaryPath.startsWith("~\\")) {
      return `~/'${binaryPath.slice(2).replaceAll("'", `'"'"'`)}'`;
    }
    return `'${binaryPath.replaceAll("'", `'"'"'`)}'`;
  }
  return fallback;
}

export function getOnboardingProviderState(provider: ServerProvider | undefined) {
  if (provider === undefined) return "checking";
  if (!provider.enabled || provider.status === "disabled") return "disabled";
  if (!provider.installed && provider.status === "warning" && provider.auth.status === "unknown")
    return "checking";
  if (!provider.installed) return "install";
  if (provider.auth.status === "unauthenticated") return "signIn";
  if (provider.status === "ready") return "ready";
  return "attention";
}

// These need no Node/npm and install where provider maintenance recognizes native binaries.
const NATIVE_INSTALL_COMMANDS = {
  claudeAgent: {
    windows: "irm https://claude.ai/install.ps1 | iex",
    posix: "curl -fsSL https://claude.ai/install.sh | bash",
  },
  codex: {
    windows: "irm https://chatgpt.com/codex/install.ps1 | iex",
    posix: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
  },
} as const;

export function resolveOnboardingProviderInstallCommand(
  driver: keyof typeof NATIVE_INSTALL_COMMANDS,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  const commands = NATIVE_INSTALL_COMMANDS[driver];
  return platform === "windows" ? commands.windows : commands.posix;
}

/**
 * The agents (other than Claude and Codex) that sign in with a command in a terminal: the program,
 * its arguments, and the step after the command when the command alone does not sign in. Pi has no
 * login command: /login in Pi signs in, and the command ends only when Pi ends.
 */
const TERMINAL_SIGN_IN = {
  kiro: { binary: "kiro-cli", args: "login --use-device-flow", nextStep: null },
  opencode: { binary: "opencode", args: "auth login", nextStep: null },
  pi: {
    binary: "pi",
    args: "",
    nextStep: "In Pi, type /login and sign in. Then press Ctrl+D to close Pi.",
  },
} as const;

/** What to do in the terminal after the sign-in command starts, or null when the command is all. */
export function terminalSignInNextStep(driver: string): string | null {
  return TERMINAL_SIGN_IN[driver as keyof typeof TERMINAL_SIGN_IN]?.nextStep ?? null;
}

/** True when the welcome page can sign in this agent with a command in a terminal. */
export function hasTerminalSignIn(driver: string): boolean {
  return driver === "claudeAgent" || driver === "codex" || driver in TERMINAL_SIGN_IN;
}

export function resolveOnboardingProviderLoginCommand(
  provider: ServerProvider,
  settings: ServerSettings,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  const instance = settings.providerInstances[provider.instanceId];

  if (provider.driver === "claudeAgent") {
    const config = decodeClaudeSettings(instance?.config ?? {});
    const binaryPath = Option.isSome(config) ? config.value.binaryPath : "claude";
    return `${quoteProviderBinary(binaryPath, "claude", platform)} auth login`;
  }

  // Shako build: T3 runs in a VM and the browser is on another computer. A login that waits for the
  // browser on localhost in the VM cannot finish, so each command uses the sign-in that shows a link
  // and a code (or asks for a pasted code).
  if (provider.driver === "codex") {
    const config = decodeCodexSettings(instance?.config ?? {});
    const binaryPath = Option.isSome(config) ? config.value.binaryPath : "codex";
    return `${quoteProviderBinary(binaryPath, "codex", platform)} login --device-auth`;
  }

  const terminal = TERMINAL_SIGN_IN[provider.driver as keyof typeof TERMINAL_SIGN_IN];
  if (terminal !== undefined) {
    const configured = (instance?.config as { readonly binaryPath?: unknown } | undefined)
      ?.binaryPath;
    const binaryPath =
      typeof configured === "string" && configured.trim() ? configured : terminal.binary;
    const command = quoteProviderBinary(binaryPath, terminal.binary, platform);
    return terminal.args ? `${command} ${terminal.args}` : command;
  }

  return provider.driver;
}
