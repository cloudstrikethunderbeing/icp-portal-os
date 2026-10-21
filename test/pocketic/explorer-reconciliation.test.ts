import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

/**
 * Backend behavior lane for the accepted explorer-reconciliation changes.
 * Installs the app's own compiled wasm into PocketIC and calls the real public
 * API, so the curated catalogue and the seeded Explore ICP shortcuts are
 * exercised against the actual canister rather than a typed mock.
 *
 * The frontend suite mocks the actor entirely; this is the only place the real
 * catalogue entries and the per-principal shortcut seeding run.
 */

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  });
  ({ actor, canisterId } = installed);
  await registerCaller(actor, alice);
});

afterAll(async () => {
  await pic?.tearDown();
});

it("serves the corrected IC Explorer entry and keeps ICP Explorer distinct", async () => {
  const registry = await actor.listAppRegistry();
  const icExplorer = registry.find((entry) => entry.name === "IC Explorer");
  expect(icExplorer).toBeDefined();
  expect(icExplorer?.url).toBe("https://www.icexplorer.io/");

  const icpExplorer = registry.find((entry) => entry.name === "ICP Explorer");
  expect(icpExplorer).toBeDefined();
  expect(icpExplorer?.url).toBe("https://icpexplorer.org");
  expect(icpExplorer?.id).not.toBe(icExplorer?.id);

  // Exactly one entry per explorer name — no duplicate tile in the catalogue.
  expect(registry.filter((entry) => entry.name === "IC Explorer")).toHaveLength(
    1,
  );
  expect(registry.filter((entry) => entry.name === "ICP Explorer")).toHaveLength(
    1,
  );
});

it("marks OpenChat coming soon and AI Agent native in the catalogue", async () => {
  const registry = await actor.listAppRegistry();
  const openchat = registry.find((entry) => entry.name === "OpenChat");
  expect(openchat?.launchType).toEqual({ comingSoon: null });

  const aiAgent = registry.find((entry) => entry.name === "AI Agent");
  expect(aiAgent?.launchType).toEqual({ native: null });
});

it("seeds the Explore ICP folder with its four shortcuts for a new principal", async () => {
  const shortcuts = await actor.listShortcuts();
  const names = shortcuts.map((shortcut) => shortcut.name).sort();
  expect(names).toEqual(
    ["DFINITY", "ICP Skills", "Internet Computer", "OpenCloud"].sort(),
  );

  const items = await actor.listHomeItems();
  const explore = items.find(
    (item) => "folder" in item && item.folder.name === "Explore ICP",
  );
  expect(explore).toBeDefined();
});

it("does not duplicate the Explore ICP shortcuts on a second read", async () => {
  const first = await actor.listShortcuts();
  const second = await actor.listShortcuts();
  expect(second).toHaveLength(first.length);
  expect(first).toHaveLength(4);
});

it("preserves a caller's own shortcuts alongside the seeded ones", async () => {
  const created = await actor.createShortcut(
    "My link",
    "https://my.example.com/",
    "globe",
    { externalWeb: null },
  );
  expect(created.name).toBe("My link");

  const shortcuts = await actor.listShortcuts();
  expect(shortcuts.some((shortcut) => shortcut.name === "My link")).toBe(true);
  // The seeded Explore ICP shortcuts are still present, not replaced.
  expect(shortcuts.some((shortcut) => shortcut.name === "DFINITY")).toBe(true);
});
