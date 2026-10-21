import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

/**
 * Backend behavior lane for the accepted AI Agent sign-in reconciliation.
 * Installs the app's own compiled wasm into PocketIC and calls the real public
 * API, so the stored per-principal registry entry and the live catalogue are
 * compared against the actual canister rather than a typed mock.
 *
 * The frontend suite mocks the actor entirely; this is the only place the real
 * catalogue and the seeded per-principal registry run. The migration's
 * reconciliation of an existing user's stale entry is exercised by the
 * companion upgrade test when a previous revision is available.
 */

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

const AI_AGENT_ID = 35n;

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

it("stores the AI Agent entry with the same sign-in requirement as the catalogue", async () => {
  const catalogue = await actor.listAppRegistry();
  const catalogueEntry = catalogue.find((entry) => entry.id === AI_AGENT_ID);
  expect(catalogueEntry).toBeDefined();
  expect(catalogueEntry?.name).toBe("AI Agent");
  expect(catalogueEntry?.requiresAuth).toBe(true);

  // The per-principal stored registry entry must agree with the live catalogue.
  const stored = await actor.getAppRegistryEntry(AI_AGENT_ID);
  expect(stored).toHaveLength(1);
  expect(stored[0].requiresAuth).toBe(true);
  expect(stored[0].requiresAuth).toBe(catalogueEntry?.requiresAuth);
});

it("reports the same Auth requirement through the Directory entry", async () => {
  const directory = await actor.listDirectory([]);
  const aiAgent = directory.find((entry) => entry.app.id === AI_AGENT_ID);
  expect(aiAgent).toBeDefined();
  expect(aiAgent?.app.requiresAuth).toBe(true);

  const single = await actor.getDirectoryEntry(AI_AGENT_ID);
  expect(single).toHaveLength(1);
  expect(single[0].app.requiresAuth).toBe(true);
});

it("keeps the AI Agent a native app that is not coming soon", async () => {
  const stored = await actor.getAppRegistryEntry(AI_AGENT_ID);
  expect(stored).toHaveLength(1);
  expect(stored[0].launchType).toEqual({ native: null });
  expect(stored[0].url).toBe("");
});

it("reports the same sign-in requirement for a second, independently seeded user", async () => {
  const bob = createIdentity("bob");
  const bobActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const bobStored = await bobActor.getAppRegistryEntry(AI_AGENT_ID);
  expect(bobStored).toHaveLength(1);
  expect(bobStored[0].requiresAuth).toBe(true);

  const aliceStored = await actor.getAppRegistryEntry(AI_AGENT_ID);
  expect(aliceStored[0].requiresAuth).toBe(bobStored[0].requiresAuth);
});
