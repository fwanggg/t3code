import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";

import * as AnalyticsService from "./AnalyticsService.ts";

// The Shako build sends no product analytics (see AnalyticsService.ts).

// The layer needs no service: no HTTP client, no file system, no config, no secret store.
const needsNothing: Layer.Layer<AnalyticsService.AnalyticsService, never, never> =
  AnalyticsService.layer;

it.effect("records, flushes and reports owners without one HTTP request", () =>
  Effect.gen(function* () {
    const requests: Array<string> = [];
    const recordingClient = HttpClient.make((request) =>
      Effect.sync(() => {
        requests.push(request.url);
        return HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }));
      }),
    );

    yield* Effect.gen(function* () {
      const analytics = yield* AnalyticsService.AnalyticsService;
      for (let index = 0; index < 50; index++) {
        yield* analytics.record("server.boot.heartbeat", { threadCount: index, projectCount: 1 });
      }
      yield* analytics.recordOwners(
        [
          { source: "claude", ownerId: "a".repeat(64) },
          { source: "openai", ownerId: "b".repeat(64) },
        ],
        "server",
      );
      yield* analytics.flush;
    }).pipe(
      Effect.provide(needsNothing),
      Effect.provideService(HttpClient.HttpClient, recordingClient),
    );

    assert.deepStrictEqual(requests, []);
  }),
);
