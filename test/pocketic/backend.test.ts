import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

/**
 * Backend behavior lane: installs the app's own compiled wasm into PocketIC and
 * calls the real public API. This is the only place the canister's per-principal
 * workspace store is exercised; the frontend suite mocks the actor entirely.
 */

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");
const bob = createIdentity("bob");

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

it("answers empty-state reads instead of trapping", async () => {
  await expect(actor.listAppRegistry()).resolves.toBeInstanceOf(Array);
  await expect(actor.listInstalledApps()).resolves.toBeInstanceOf(Array);
  await expect(actor.listHomeItems()).resolves.toBeInstanceOf(Array);
  await expect(actor.getDock()).resolves.toBeDefined();
});

it("round-trips a home folder through the real canister", async () => {
  const folder = await actor.createHomeFolder("Work");
  expect(folder.name).toBe("Work");

  const items = await actor.listHomeItems();
  expect(
    items.some((item) => "folder" in item && item.folder.name === "Work"),
  ).toBe(true);
});

it("installs a registered app and persists the dock", async () => {
  const registry = await actor.listAppRegistry();
  expect(registry.length).toBeGreaterThan(0);
  const appId = registry[0].id;

  const installed = await actor.installApp(appId);
  expect(installed).not.toBeNull();

  const dock = await actor.setDock([appId]);
  expect(dock.appIds).toEqual([appId]);
  await expect(actor.getDock()).resolves.toEqual({ appIds: [appId] });
});

it("does not show one caller's workspace to another", async () => {
  actor.setIdentity(alice);
  await actor.createHomeFolder("Alice private");

  const bobActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );
  const bobItems = await bobActor.listHomeItems();
  expect(
    bobItems.some(
      (item) => "folder" in item && item.folder.name === "Alice private",
    ),
  ).toBe(false);
});

it("rejects an anonymous caller", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.listInstalledApps()).rejects.toThrow();
});
