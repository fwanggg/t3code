import { createMemoryHistory } from "@tanstack/react-router";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
// The route loads ChatView lazily, and its first transform (React Compiler over ~4k lines)
// takes 6-11s; importing it here keeps that out of the test's timeout.
import "~/components/ChatView";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { render } from "../../test/render";

// The socket is the only fake layer; see test/appScenarios.renders.tsx.
vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

vi.mock(import("~/rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

it("a photo chosen on a phone attaches after the picker takes focus and the composer folds", async () => {
  const thread = threadWithHistory("thread-phone-photo", 1);
  // The server config loads once per file, so a file-upload server needs a file of its own.
  using _environment = installFakeEnvironment([thread], {
    fileAttachments: { maxUploadBytes: 1_000_000 },
  });
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  await page.viewport(390, 844);
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${thread.id}`] }),
  );
  await router.load();
  await using _app = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });
  const editor = page.getByTestId("composer-editor");
  await userEvent.click(editor);
  const attach = page.getByRole("button", { name: "Attach files" });
  await expect.element(attach).toBeVisible();
  const picker = document.querySelector<HTMLInputElement>('form input[type="file"]');
  if (!picker) throw new Error("The composer has no file picker.");

  // iOS's photo picker takes focus from the editor, so the composer folds while it is open.
  (document.activeElement as HTMLElement | null)?.blur();
  await expect.element(attach).not.toBeInTheDocument();
  const chosen = new DataTransfer();
  chosen.items.add(new File([PNG], "photo.png", { type: "image/png" }));
  picker.files = chosen.files;
  picker.dispatchEvent(new Event("change", { bubbles: true }));

  // Without a bound the poll runs to the test deadline and reports a bare timeout.
  await expect
    .element(page.getByRole("img", { name: "photo.png" }), { timeout: 5_000 })
    .toBeVisible();
});
