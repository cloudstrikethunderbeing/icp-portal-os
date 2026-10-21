# ICP Portal — Capacity Audit & Phase 2 Technical Design

Status: analysis and design only. This document implements nothing. It records the
two confirmed Phase 1 fixes, audits the current architecture against the actual
source in this repository, and designs a future storage/subscription model and a
read-only Personal AI Gateway.

Every statement below is grounded in a file that exists in this repository. Where
the source and configuration cannot settle a question, the document says so
explicitly and lists it under **Unverified limits**. No capacity figure, price or
quota is invented.

---

## 1. Confirmed fixes completed

### 1.1 AI Agent `requiresAuth` alignment

The AI Agent is a native catalogue entry (id `35`, route `/ai-agent`). Its
sign-in requirement had drifted between the live catalogue and the reconciliation
migration:

- **Live catalogue** — `src/backend/lib/apps.mo` (the `catalogue()` function,
  id `35`) declares `requiresAuth = true`.
- **Reconciliation migration** — `src/backend/migrations/20261021_000000.mo`
  (`reconcileRegistry`, the `id = 35` insert) declared `requiresAuth = false`.

Because the per-principal registry is seeded once at `AppsLib.initState()` and
then reconciled by migration, existing users could hold an AI Agent entry with a
different sign-in requirement than new users. The fix aligns them:

- `src/backend/migrations/20261023_000000.mo` adds an additive, idempotent
  `reconcileAiAgentAuth` step. It rewrites the stored `id = 35` entry to
  `requiresAuth = true` **only** when the entry is present and still carries the
  stale `false`; every other field of that entry and every other stored registry
  entry, installed app, folder, shortcut, dock entry and user preference is left
  untouched. Running it again changes nothing.
- The live catalogue in `apps.mo` already declares `requiresAuth = true`, so new
  users and reconciled existing users now agree.

The migration is self-contained (imports only `mo:core/...` and the
`caffeineai-authorization` package), sorts lexicographically after the latest
applied file, and preserves the `OldActor`/`NewActor` shapes unchanged.

### 1.2 Removal of the unused placeholder image

`src/frontend/public/assets/images/placeholder.svg` had no intended use. It has
been removed from the source tree; the `assets/images/` directory is now empty
and no source file references a placeholder asset. (The file still exists under
`.old/`, which is the previous build's output directory and is not part of the
shipped source.)

### 1.3 AI Agent remains an honest preview

No simulated responses were added and no AI functionality was implemented. The
AI Agent is still labelled as a preview:

- `src/frontend/src/components/ai/AgentNotice.tsx` renders the heading
  **"Preview — not yet functional"** and a **"Coming soon"** badge, and states
  that the agent "is not connected to any AI service yet, so it will not answer
  your messages or take any action."
- `src/frontend/src/pages/AiAgentPage.tsx` keeps only local message state:
  `handleSend` appends the user's message and never produces an agent reply.
- `src/frontend/src/components/ai/CapabilityPreview.tsx` is a read-only list of
  intended capabilities, explicitly described as "None of these are active yet."

---

## 2. Current capacity, storage architecture and known limits

### 2.1 Backend shape

The backend is a single Motoko canister (`src/backend/main.mo`). It declares
seven stable actor fields:

| Field | Type | Scope |
| --- | --- | --- |
| `accessControlState` | `AccessControl.AccessControlState` | workspace-wide roles |
| `filesStates` | `Map.Map<Principal, FilesLib.State>` | per-principal |
| `notesStates` | `Map.Map<Principal, NotesLib.State>` | per-principal |
| `appsStates` | `Map.Map<Principal, AppsLib.State>` | per-principal |
| `settingsStates` | `Map.Map<Principal, SettingsLib.State>` | per-principal |
| `calcStates` | `Map.Map<Principal, CalculatorLib.State>` | per-principal |
| `reportsState` | `ReportsLib.State` | workspace-wide |

Each per-principal map is keyed by the caller's Internet Identity principal, so a
caller only ever reads or writes its own records. The canister includes
`MixinAuthorization`, `MixinObjectStorage`, the six domain APIs, `Directory`,
`ApiDoc`, and `Expose` (the OQL entity set).

**There are no `preupgrade`/`postupgrade` hooks, no `ExperimentalCycles` usage,
and no cycle or memory management code anywhere in `src/backend/`.** State
persistence relies entirely on enhanced orthogonal persistence plus the
mops-managed migration chain (`[canisters.backend.migrations]` in `mops.toml`,
`chain = "src/backend/migrations"`, `check-limit = 1`).

### 2.2 Internet Identity sign-ins and concurrent users

- Sign-in is Internet Identity, handled by `@caffeineai/core-infrastructure` on
  the frontend and `MixinAuthorization` on the backend. The first authenticated
  user to log in becomes admin; no token or secret is required.
- The backend has **no per-user session state and no connection registry**. A
  sign-in is a principal; the canister only ever sees a caller principal on a
  message. There is therefore no in-canister "concurrent user" counter to read.
- The relevant platform limits are the Internet Computer's own: per-message
  instruction limits, per-canister memory limits, and the subnet's message
  throughput. **None of these are configured or asserted anywhere in this
  repository**, and none can be read from the source.

**Conclusion:** the source proves the *architecture* is stateless with respect to
concurrency (no per-session state, no locks, no shared mutable session table), so
concurrent sign-ins do not contend on canister state. The source does **not**
prove any supportable concurrent-user count. See Section 3.

### 2.3 Backend heap and stable storage

- All per-user data lives in `mo:core` `Map` collections inside the actor's
  stable state. With enhanced orthogonal persistence these are persisted without
  a `stable` keyword and without explicit serialization.
- The canister's heap and stable memory are the same address space under enhanced
  persistence; growth is driven by the number and size of stored records.
- **No explicit memory ceiling, page limit or `--max-stable-pages` setting is
  declared in `mops.toml`.** The `[moc] args` list contains no memory flag. The
  effective ceiling is therefore the platform default for the canister, which is
  not stated in this repository.

### 2.4 Cycle consumption and resource constraints

- **There is no cycle management in the backend.** No `ExperimentalCycles`, no
  `Cycles.add`, no top-up logic, no cycle balance read.
- Cycle consumption is therefore driven by ordinary message execution and by
  stable-memory growth, and is managed entirely by the platform, not by this
  codebase.
- The canister's cycle balance, freezing threshold and controller settings are
  **not present in the repository** and cannot be verified from source.

### 2.5 Per-user data growth

Each per-principal state is a small set of `Map`s. The record shapes are:

- **Files** (`src/backend/lib/files.mo`, `State`): `folders : Map<Nat, Folder>`,
  `files : Map<Nat, FileEntry>`, plus two `Nat` counters. A `FileEntry` stores a
  `FileRef` — **metadata only** (see 2.6).
- **Notes** (`src/backend/lib/notes.mo`, `State`): `notes : Map<Nat, Note>`,
  `folders : Map<Nat, NoteFolder>`, plus two counters. A `Note` carries a `Text`
  body and an `attachments : [FileRef]` array (metadata only).
- **Apps** (`src/backend/lib/apps.mo`, `State`): `registry : Map<Nat,
  AppRegistryEntry>` (seeded from the ~36-entry catalogue), `shortcuts :
  Map<Nat, Shortcut>`, `installed : Map<Nat, InstalledApp>`, `folders :
  Map<Nat, HomeFolder>`, a `Dock`, and four counters.
- **Settings** (`src/backend/lib/settings.mo`, `State`): `settings :
  Map<Principal, UserSettings>` — one small record per principal.
- **Calculator** (`src/backend/lib/calculator.mo`, `State`): `history :
  Map<Nat, CalcEntry>` plus a counter. History grows without bound until the user
  calls `clearCalcHistory`.
- **Reports** (`src/backend/lib/reports.mo`, `State`): `reports :
  Map<Id, BugReport>` plus a counter — workspace-wide, not per-principal.

**Growth characteristics:** the dominant per-user growth is the number of notes
(their `Text` bodies), the number of calculator history entries, and the number
of file/folder metadata records. The registry is a fixed ~36-entry seed per
principal, so it is a constant per-user cost. **No per-user quota, cap or
truncation exists anywhere in the source** — every collection grows until the
user deletes records or the canister runs out of memory.

### 2.6 The Files app: uploads, storage location and size

This is the most important capacity question, and the source answers it clearly:

- **The Files app does support uploads.** `src/frontend/src/components/files/upload.ts`
  exposes `buildFileRef(file, onProgress)`, which reads the browser `File` into
  bytes and wraps them in an `ExternalBlob` via
  `ExternalBlob.fromBytes(bytes, file.type, file.name)` from
  `@caffeineai/object-storage`.
- **File bytes are stored off-chain, not in the canister.** The backend stores
  only a `FileRef` (`src/backend/types/common.mo`):
  `{ blob : Storage.ExternalBlob; filename : Text; mimeType : ?Text; sizeBytes :
  ?Nat }`. `Storage.ExternalBlob` is a reference to the platform object-storage
  gateway; the bytes never enter canister memory or stable storage.
- **The backend never receives file bytes.** `addFile` in
  `src/backend/mixins/files-api.mo` takes a `Types.FileRef` and stores it; the
  object-storage gateway handles the actual upload. `MixinObjectStorage()` in
  `main.mo` provides the platform certificate endpoint the gateway requires.
- **Maximum file size:** the source declares **no** maximum. `buildFileRef` does
  not check `file.size`, and `addFile` does not validate `sizeBytes`. The only
  bound is whatever the platform object-storage gateway enforces, which is not
  stated in this repository.
- **Where file data lives:** off-chain in the object-storage gateway. The
  canister holds only the reference and the metadata (`filename`, `mimeType`,
  `sizeBytes`). Downloads go through `downloadFile(blob, filename)` in the same
  frontend module, which calls `blob.getBytes()`.

**Consequence:** file uploads do **not** grow canister memory or stable storage.
They grow the gateway's storage, which is a separate resource with its own
(unstated) limits. The canister cost of a file is one small `FileEntry` record.

### 2.7 Maximum request and payload sizes, pagination

- **No pagination exists anywhere.** `listFolder`, `searchFiles`, `listNotes`,
  `listNotes`-folders, `listCalcHistory`, `listBugReports`, `listAppRegistry`,
  `listInstalledApps`, `listShortcuts` and `listHomeItems` all return the **full**
  collection as an array. There is no limit, offset, cursor or page parameter.
- **No request-size validation exists.** `createNote`, `updateNote`,
  `addFile`, `createShortcut`, `submitBugReport` and `updateSettings` accept
  `Text` fields with no length check.
- The practical ceiling on any single response is the Internet Computer's
  per-message size limit, which is a platform constant not declared in this
  repository.

**Risk:** a user with a very large note collection, calculator history or file
listing will receive the entire collection in one response. Because there is no
pagination, the response size grows linearly with the user's data and can
eventually exceed the platform's message limit, at which point the call fails
rather than returning a partial page.

### 2.8 Backup, recovery, deletion and data isolation

- **Backup / recovery:** there is **no** backup, export, snapshot or restore
  mechanism in the source. Recovery depends entirely on the platform's canister
  state and the migration chain. The migration chain is one-way (enhanced
  migration); there is no down-migration.
- **Deletion:** deletion is per-record and immediate. `deleteFile`,
  `deleteFolder` (which deletes the whole subtree), `deleteNote`,
  `deleteNoteFolder` (which unfiles affected notes), `deleteHomeFolder` (which
  returns contained apps to the home screen), `removeShortcut` and
  `clearCalcHistory` all remove records from the caller's own state. **Deleting a
  `FileEntry` does not delete the underlying object-storage blob** — the
  reference is dropped but the off-chain bytes are not reclaimed by any code in
  this repository.
- **Data isolation:** isolation is structural. Every per-user endpoint resolves
  the caller's own state through a `*CallerState` helper that traps for anonymous
  callers and keys the map by the caller principal. A caller cannot address
  another principal's state because no endpoint accepts a target principal. The
  OQL entities reinforce this: `file`, `folder`, `note`, `noteFolder`,
  `installedApp`, `homeFolder`, `userSettings` and `calcEntry` are all
  `.ownedBy("owner").scopedPerUser()`, so a scoped query returns only the
  caller's rows. `appRegistry` is `.public_()` (a shared read-only catalogue) and
  `bugReport` is `.controllerOnly()` (admin/agent only).

### 2.9 OQL `Expose` entities and their authorization scopes

`src/backend/main.mo` composes the entity list from three modules. The scopes are:

| Entity | Source | Scope |
| --- | --- | --- |
| `file` | `mixins/files.mo` | `scopedPerUser` (owner = outer map key) |
| `folder` | `mixins/files.mo` | `scopedPerUser` |
| `note` | `mixins/notes.mo` | `scopedPerUser` |
| `noteFolder` | `mixins/notes.mo` | `scopedPerUser` |
| `appRegistry` | `mixins/workspace.mo` | `public_` |
| `installedApp` | `mixins/workspace.mo` | `scopedPerUser` |
| `homeFolder` | `mixins/workspace.mo` | `scopedPerUser` |
| `userSettings` | `mixins/workspace.mo` | `scopedPerUser` |
| `calcEntry` | `mixins/workspace.mo` | `scopedPerUser` |
| `bugReport` | `mixins/workspace.mo` | `controllerOnly` |

The `Expose` mixin adds only the OQL query methods (`schema` / `execute`); it
does not change the existing state or `shared` methods.

---

## 3. Unverified limits requiring runtime measurement

The following cannot be established from the source or configuration in this
repository. Each states what measurement would settle it.

1. **Supportable concurrent-user count.** The source proves the architecture is
   stateless per session, but not how many concurrent sign-ins or messages the
   canister and its subnet sustain. *Measurement:* load-test the deployed
   canister with concurrent `listHomeItems` / `getSettings` calls and observe
   latency and rejections.
2. **Canister memory ceiling and current usage.** No memory flag is set and no
   usage is recorded. *Measurement:* read the canister's memory metrics from the
   IC dashboard / `dfx canister status` for the deployed canister.
3. **Cycle balance, burn rate and freezing threshold.** Not in the repository.
   *Measurement:* read the canister's cycle balance and monitor the burn rate
   over a representative period.
4. **Object-storage gateway limits.** The maximum file size, total gateway
   storage and per-request upload ceiling are enforced by the platform gateway,
   not by this code. *Measurement:* probe the gateway with progressively larger
   uploads and read the platform's documented limits.
5. **Per-message size limit in practice.** The platform constant is not declared
   here. *Measurement:* attempt a response near the limit (for example a user
   with a very large note collection) and observe where the call fails.
6. **Realistic per-user data volumes.** No telemetry exists. *Measurement:*
   instrument or sample actual note counts, calculator history lengths and file
   counts across the tester group.
7. **Migration execution time at scale.** The migration chain runs on upgrade;
   its cost scales with the number of principals and records. *Measurement:*
   time an upgrade against a production-sized state.
8. **Whether the off-chain blobs of deleted files are ever reclaimed.**
   *Measurement:* delete a file and observe whether the gateway storage is
   reclaimed.

**No supportable user count is asserted anywhere in this document.**

---

## 4. Immediate risks to the existing tester rollout

Grounded in the implementation:

1. **Unbounded per-user growth with no quota.** Notes, calculator history and
   file/folder metadata grow without limit. A single heavy tester can consume a
   disproportionate share of canister memory, and there is no mechanism to cap
   it.
2. **No pagination on any list endpoint.** As a tester's data grows, list
   responses grow linearly and can eventually exceed the platform message limit,
   failing the call outright rather than degrading gracefully.
3. **No request-size validation.** A very large note body or shortcut URL is
   accepted and stored; there is no length guard.
4. **No cycle monitoring or top-up.** If the canister runs low on cycles, nothing
   in this codebase warns or tops it up. The canister would stop serving.
5. **Deleted file blobs are not reclaimed.** Dropping a `FileEntry` leaves the
   off-chain bytes in the gateway; repeated upload/delete cycles grow gateway
   storage without bound.
6. **No backup or export path.** There is no way to export a user's workspace or
   restore it after loss; recovery depends entirely on platform state.
7. **Migration cost grows with the tester group.** Each upgrade runs the
   migration chain over every principal's state; the cost is not measured.

---

## 5. Recommended capacity safeguards for future growth

Each recommendation is classified as one of: **confirmed technical limit**,
**current configured limit**, **recommended product limit**, or **unknown
requiring runtime measurement**. It also notes where the limit would be enforced.

| Safeguard | Classification | Enforcement point |
| --- | --- | --- |
| Canister memory ceiling | unknown requiring runtime measurement | platform (canister settings) |
| Cycle balance / freezing threshold | unknown requiring runtime measurement | platform (canister settings) |
| Object-storage max file size | unknown requiring runtime measurement | platform gateway |
| Per-message response size | confirmed technical limit (platform constant) | platform |
| Pagination on list endpoints | recommended product limit | backend (new `limit`/`offset` params) |
| Max note body length | recommended product limit | backend (`createNote`/`updateNote`) |
| Max notes per user | recommended product limit | backend |
| Max calculator history entries | recommended product limit | backend (`addCalcEntry`) |
| Max shortcuts / installed apps per user | recommended product limit | backend |
| Max file size accepted by the app | recommended product limit | backend (`addFile`) + frontend pre-check |
| Total storage per user | recommended product limit | backend (sum of `sizeBytes`) |
| Total service storage | recommended product limit | backend + platform monitoring |
| Request frequency / abuse limits | recommended product limit | backend (per-principal counters) |
| AI request / token limits | recommended product limit | backend (Phase 2 gateway) |

**Which limits can be configured without redeployment:** none of the
application-level limits above can be changed without a code change today,
because they do not exist. To make them configurable without redeployment, the
backend would need a small controller-writable configuration record (for example
a `limits` record in stable state) that the guards read. The platform-level
limits (memory, cycles, gateway) are configured through canister settings and
platform configuration, not through this codebase.

**Which depend on platform constraints:** the canister memory ceiling, cycle
balance and freezing threshold, the object-storage gateway limits, and the
per-message size limit are all platform-owned and cannot be raised by application
code.

**Recommended immediate safeguards (no new product surface):**

- Add pagination parameters to the list endpoints, defaulting to a bounded page.
- Add a maximum length to note bodies and shortcut URLs.
- Add a per-user cap on calculator history entries (trim oldest on insert).
- Add a maximum accepted file size in `addFile` and a matching frontend
  pre-check.
- Add a cycle-balance monitor (read-only) so the operator is warned before the
  canister freezes.

---

## 6. Phase 2 Personal AI Gateway design

### 6.1 Goal and scope

ICP Portal is a personal, AI-powered desktop for discovering, understanding and
using the Internet Computer ecosystem. It is **not** a standalone chatbot. The
AI should help users:

- understand ICP concepts and services;
- discover relevant applications and resources;
- navigate directly to useful destinations;
- receive assistance using their own authorized workspace context;
- eventually connect applications through permissioned workflows.

The initial MVP is **read-only**. It answers questions and returns links and
app-launch options. It performs no writes and no sensitive or irreversible
action. Any future sensitive action requires explicit user confirmation.

### 6.2 Reuse of the existing architecture

The design reuses what already exists rather than adding a parallel stack:

- **OQL interface and `Expose` mixin.** The canister already exposes `schema()`
  and `execute()` through `Expose`, with per-entity authorization scopes
  (Section 2.9). The gateway reads workspace context through this same surface.
- **`useBackendSchema`, `useExecuteQuery`, `useExecuteMutation`.** These hooks in
  `src/frontend/src/hooks/useQueries.ts` already wrap `actor.schema()` and
  `actor.execute(qJson)`. The AI Agent UI can call the gateway and, where the
  gateway returns a query, reuse these hooks unchanged.
- **Internet Identity authentication.** Sign-in is already wired through
  `@caffeineai/core-infrastructure` and `MixinAuthorization`. The gateway
  inherits the caller principal.
- **Principal-scoped persistence.** Every per-user record is already keyed by the
  caller principal, so workspace context is naturally scoped to the caller.
- **App registry.** The curated catalogue (`appRegistry`, `.public_()`) already
  provides the discoverable app list with names, descriptions, URLs and launch
  types. The gateway uses it to answer "where do I go for X?".
- **Existing AI Agent UI.** `AiAgentPage.tsx`, `AgentComposer.tsx`,
  `MessageList.tsx`, `AgentNotice.tsx` and `CapabilityPreview.tsx` already provide
  the entry point, composer, transcript and honest status banner. The MVP wires
  the composer to the gateway and replaces the "not yet functional" notice with a
  live status.

### 6.3 Minimum backend changes

The minimum backend change is a single new mixin that performs the outbound call
to the AI provider and returns the answer. It must:

1. Accept a user message plus a bounded, caller-scoped context payload.
2. Reject anonymous callers (same `Sign in required` guard as every other
   endpoint).
3. Build the provider request server-side, attaching the provider credential from
   a canister-held secret — **never** from the frontend.
4. Perform the outbound HTTPS call and return the model's text plus any
   structured links.
5. Enforce a per-principal rate limit and a per-request token/size bound.

No new storage is required for the MVP beyond an optional per-principal usage
counter (for rate limiting and future cost attribution). The existing `Expose`
entities are unchanged.

### 6.4 External AI service dependency

The MVP depends on one external AI provider reachable over HTTPS from the
canister. The provider's base URL, endpoint path, request shape and response
shape must be verified against the provider's current documentation before
implementation, and the endpoint must be probed for canister compatibility
(response size within the outcall byte ceiling, stable response across
replicas). **No provider is named or assumed here**, because the choice is a
deployment decision and no provider has been verified in this repository.

### 6.5 Secure request flow (credentials never in the frontend)

```
User types a message in AgentComposer
        │
        ▼
Frontend calls backend gateway method (caller = user principal)
        │
        ▼
Backend gateway:
  1. rejects anonymous callers
  2. checks the per-principal rate limit
  3. assembles a MINIMAL context payload:
       - the user's message
       - a bounded slice of the caller's own workspace context
         (read through the existing per-principal state / OQL scopes)
       - the curated app registry entries relevant to the question
  4. attaches the provider credential from canister-held config
  5. performs the outbound HTTPS call
  6. returns { answer, links[], appSuggestions[] }
        │
        ▼
Frontend renders the answer with actionable links and app-launch options
```

The provider credential lives only in the canister (a controller-managed secret
or platform-provided environment configuration). It is never sent to, stored in,
or readable by the frontend.

### 6.6 Data flow and minimization of personal data

- **What leaves the canister:** only the user's message and the bounded context
  slice the gateway explicitly assembles. The gateway must send the **minimum**
  context needed to answer — for example, note titles rather than full bodies,
  and only the caller's own records.
- **What never leaves:** the caller's principal, other users' data, the
  credential, and any record the caller has not authorized.
- **Scoping:** because every per-user entity is `.scopedPerUser()`, a query run
  on behalf of the caller can only ever return the caller's own rows. The gateway
  cannot accidentally include another user's data.
- **Documentation:** the data flow above is the authoritative description of what
  is sent to the provider and must be surfaced to the user in the AI Agent UI.

### 6.7 Verified vs curated vs unverified information

The gateway must distinguish three classes of answer and label them:

1. **Verified Portal data** — facts read from the caller's own workspace through
   the OQL surface (their notes, files, settings, calculator history). These are
   authoritative for that user.
2. **Curated ecosystem information** — the `appRegistry` catalogue, which is
   maintained in `apps.mo` and carries accurate names, descriptions and URLs.
   These are curated but not user-verified.
3. **Unverified information** — anything the model produces from its own
   knowledge. This must be labelled as unverified and must never be presented as
   a Portal fact.

The gateway must **not** fabricate answers, application capabilities, links or
completed actions. If it cannot ground an answer in verified or curated data, it
must say so.

### 6.8 Usage attribution, cost tracking and per-user quotas

- **Usage attribution:** each gateway call is made with the caller's principal,
  so usage is naturally attributable per user. A per-principal counter (requests,
  input tokens, output tokens) can be incremented on each call.
- **Cost tracking:** the counter can be multiplied by the provider's per-token
  price to estimate cost per user. The price is a provider fact, not invented
  here.
- **Per-user quotas:** the same counter enforces a per-user request/token budget.
  Exceeding it returns a clear "usage limit reached" state rather than a silent
  failure.
- **Integration point:** the counter lives in a new per-principal map (or a small
  record) in stable state, read and written by the gateway mixin. It does not
  affect the existing entities.

### 6.9 Rate limits, error handling, service-failure behaviour and cost controls

- **Rate limits:** a per-principal request limit (for example N requests per
  rolling window) enforced in the gateway before the outbound call. The exact N
  is a product decision, not asserted here.
- **Error handling:** the gateway returns a typed result — success with an
  answer, or a failure variant (rate-limited, provider-unavailable,
  context-too-large, invalid-input). The frontend renders each as a distinct
  state.
- **Service-failure behaviour:** if the provider is unreachable or returns an
  error, the gateway returns a clear "AI service unavailable" state. The rest of
  the Portal continues to work; the AI Agent degrades to its preview notice.
- **Cost controls:** a per-request input-token cap, a per-request output-token
  cap, a per-user daily budget, and a global daily budget. All are enforced
  server-side before or during the call.

### 6.10 MVP experience

One simple AI entry point inside the existing desktop:

- **Conversational input** — the existing `AgentComposer`.
- **Suggested prompts** — a small set of starter questions (for example "What is
  the Internet Computer?", "Where can I swap tokens?", "Summarize my notes").
- **Answers with actionable links and app-launch options** — the answer renders
  links and, where the answer names a catalogue app, an "Open" action that
  launches it through the existing registry.
- **Contextual help** — for ICP discovery and the user's own authorized
  workspace.
- **Clear states** — loading, error, unavailable-service and empty states, each
  distinct and honest.

No additional dashboard, separate AI product, complex agent framework or
unnecessary UI layer is added.

### 6.11 Security and trust requirements

- Authorization and per-principal isolation are enforced on the backend, exactly
  as they are today.
- Personal data sent to the provider is minimized and documented.
- Verified, curated and unverified information are distinguished (Section 6.7).
- The MVP is read-only; no writes, no sensitive actions.
- Any future sensitive or irreversible action requires explicit user
  confirmation before it happens.

---

## 7. Proposed future quota and subscription model

This section proposes **configurable limits** and a **simple** subscription
structure, and separates measured costs from estimates and proposed limits. No
price or quota is invented.

### 7.1 Configurable limits

| Limit | Recommended shape | Enforced by | Configurable without redeployment? |
| --- | --- | --- | --- |
| Maximum file size | per-upload byte cap | backend (`addFile`) + frontend pre-check | only if read from a config record |
| Total storage per user | sum of `sizeBytes` across the user's files | backend | only if read from a config record |
| Total service storage | aggregate across all users | backend + platform monitoring | only if read from a config record |
| AI requests per user | count per rolling window | backend gateway | only if read from a config record |
| AI input context size | max context bytes/tokens per request | backend gateway | only if read from a config record |
| AI output tokens | max output tokens per request | backend gateway | only if read from a config record |
| AI usage per user over time | cumulative tokens/requests | backend gateway | only if read from a config record |
| Request frequency / abuse | per-principal rate limit | backend | only if read from a config record |
| Provider spending | global daily budget | backend gateway | only if read from a config record |

**To make these configurable without redeployment**, the backend needs a small
controller-writable configuration record in stable state that the guards read.
Today no such record exists, so every limit would require a code change.

**Platform-dependent limits** (cannot be raised by application code): canister
memory ceiling, cycle balance and freezing threshold, object-storage gateway
limits, and the per-message size limit.

### 7.2 Measured costs vs estimates vs proposed limits

- **Measured costs:** none are available in this repository. There is no
  telemetry, no cycle accounting and no provider usage record. Any cost figure
  would be an estimate.
- **Estimates:** the cost drivers are (a) canister cycles for message execution
  and stable-memory growth, (b) object-storage gateway storage for uploaded
  files, and (c) AI provider tokens per request. Each requires runtime
  measurement (Section 3) before it can be quantified.
- **Proposed limits:** the limits in 7.1 are proposals, not measurements. They
  should be set after the measurements in Section 3 are taken.

### 7.3 Subscription structure (only if justified by cost)

A subscription structure is justified **only if** the measured costs show that
free usage is not sustainable. The recommended structure is deliberately simple:

- **Free / tester tier** — the current experience, with the safeguards in
  Section 5 applied. Existing testers keep their data.
- **Paid tier(s)** — higher storage and AI usage limits, introduced only once the
  cost analysis supports them.

### 7.4 Transition without data loss

Because all per-user data is keyed by the Internet Identity principal and lives
in the same per-principal maps, a tier change is a change to the user's **limits
record**, not to their data. A free tester who upgrades to a paid tier keeps
every note, file reference, shortcut, folder, setting and calculator entry
unchanged; only the enforced caps change. No migration of user data is required
to move between tiers.

---

## 8. Prioritized next steps

### Immediate necessities

1. **Apply the two Phase 1 fixes** (Section 1) — the `requiresAuth` alignment
   migration and the placeholder removal. *(Done in this task.)*
2. **Add pagination** to the list endpoints, defaulting to a bounded page.
3. **Add input-length guards** to note bodies and shortcut URLs.
4. **Add a per-user cap** on calculator history entries.
5. **Add a maximum accepted file size** in `addFile` and a matching frontend
   pre-check.
6. **Add a read-only cycle-balance monitor** so the operator is warned before the
   canister freezes.
7. **Take the runtime measurements** in Section 3 to replace unknowns with
   evidence.

### Future enhancements

8. **Introduce a controller-writable limits/config record** so quotas can change
   without redeployment.
9. **Implement the Phase 2 read-only AI gateway** (Section 6), starting with the
   minimum backend mixin and the existing AI Agent UI.
10. **Add usage attribution and cost tracking** per principal.
11. **Add a backup/export path** for user workspaces.
12. **Reclaim off-chain blobs** on file deletion.
13. **Introduce subscription tiers** only if the measured cost analysis justifies
    them (Section 7).

---

*This document is analysis and design only. It implements no AI functionality,
subscriptions, payment processing, quotas or new upload functionality, and it
modifies no application source file.*
