// Shako build: no telemetry identity. Upstream reads ~/.codex/auth.json and ~/.claude.json (the
// OpenAI user id and the Claude account uuid) and the linked T3 Connect account, hashes them, and
// sends them to ingest.t3.codes to count the computers of one person. This file keeps only the
// types that other files import; nothing here reads a file or a secret.
import * as Schema from "effect/Schema";

export const TelemetryOwnerSource = Schema.Literals(["connect", "openai", "claude", "device"]);
export type TelemetryOwnerSource = typeof TelemetryOwnerSource.Type;

export interface TelemetryOwner {
  readonly source: TelemetryOwnerSource;
  /** `hashTelemetryId` of the source's raw id. */
  readonly ownerId: string;
}
