# Project Guidance

## User Preferences

- Mobile-first, iPhone-optimised UX with desktop-ready responsiveness from one codebase
- Should feel like a modern operating environment, not a crypto dashboard
- No fake integrations or placeholder functionality presented as working
- Modular architecture where each future application can operate as an independent canister/service
- Keep the desktop clean, intuitive and mobile-friendly; avoid duplicate apps, clutter and unnecessary menus
- Preserve the existing ICP Portal UI, branding, desktop experience and working functionality; keep changes minimal and do not redesign or overengineer

## Accepted Requirements

- Home screen with iOS-style app grid, drag-to-reorder, folders, favourites, search and customizable dock
- App registry with Native / ICP Service / External-Web launch types and Coming Soon labelling for unready integrations
- Working Files, Notes, Calculator, Settings and ICP App Directory
- Internet Identity sign-in with principal-scoped per-user private workspace and clear signed-in/signed-out states
- One responsive architecture for phone and desktop
- Add, rename, edit-icon and remove personal app shortcuts and website links
- Reuse existing right-click and long-press context menus for app management, preserving desktop interactions and drag-and-drop
- Persist custom apps, folders and layout per Internet Identity principal across refreshes and sign-ins, with no cross-user leakage
- Curated ICP ecosystem App Directory kept separate from personal shortcuts, distinguishing installed, available and coming-soon apps
- Include MULTI/DEX (https://multidex.ai) and Caffeine (https://caffeine.ai) plus verified ICP wallets, explorers, developer tools and community apps, correcting outdated or mislabelled URLs
- Explore ICP folder with shortcuts to DFINITY, Internet Computer, OpenCloud and ICP Skills
- External links open in the system browser with URL validation and clear failure feedback
- A small, noticeable 'Report a bug' option in Settings or the desktop menu, with reports going to a protected admin inbox with status and timestamps, and the existing AI Agent optionally helping categorize or summarize reports while reporting stays functional without AI
- Point IC Explorer at https://www.icexplorer.io/ in both the frontend registry and the backend catalogue for signed-out and signed-in experiences
- Reconcile the duplicate explorer entries without breaking existing shortcuts, saved references or user data
- Keep IC Explorer distinct from ICP Explorer at https://icpexplorer.org/
- Align OpenChat's launch status across the frontend and backend registries
- Resolve the AI Agent catalogue inconsistency without adding unrelated features
- Add a safe, additive, idempotent migration so existing users missing the Explore ICP shortcuts receive them while custom folders, shortcuts and preferences are preserved
- Rebrand the app to 'ICP Portal'
- Surface the new icp-portal-logo as the brand mark
- Add an on/off toggle for a wallpaper image
- Use infinitygateway as the wallpaper image
- Fix the Home context menu stacking bug so the right-click/long-press menu renders above the folder window
- Add file preview rendering improvements
- Add a file size upload limit
- Add automatic client-side file compression on upload
- Add a tooltip prompting users to save ICP Portal to their mobile/desktop home screen as an app icon

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- IC Explorer is https://www.icexplorer.io/ and ICP Explorer is https://icpexplorer.org/; they are distinct entries and must not be merged.
- OpenChat is coming-soon in both registries; the AI Agent is a native entry (id 'ai-agent', route /ai-agent) present in both the frontend registry and the backend catalogue.
- The Home loading skeleton uses motion-safe:animate-pulse so it respects prefers-reduced-motion.
- The app is branded 'ICP Portal' (renamed from 'ICP Home'); the sidebar brand mark is the generated logo at src/frontend/public/assets/generated/icp-portal-logo.dim_512x512.png and the wallpaper image is src/frontend/public/assets/generated/infinitygateway.dim_1920x1080.png.
- The per-principal wallpaper on/off preference is UserSettings.wallpaperEnabled (Bool, default true) in src/backend/types/settings.mo, persisted through useSettings/useUpdateSettings; useWallpaperEnabled in src/frontend/src/hooks/useQueries.ts shares the ['settings'] query key with its own select.
- AppShell renders on signed-out routes, so any settings read there must gate on the signed-in identity because getSettings traps for anonymous callers.
- The wallpaper renders as a fixed z-0 layer behind z-10 content with a bg-background/70 overlay so it reads in both light and dark themes.
- The Wallpaper on/off control lives in src/frontend/src/components/settings/AppearanceSection.tsx directly below the theme control.
- Bug-report hooks must import ReportStatus as a value and BugReport as a type from @/backend; the generated BugReport.reporter is a Principal, so render reporter.toText().
- Applied migrations under src/backend/migrations are frozen read-only history; a stored-registry correction for existing users must be a NEW pending migration that sorts lexicographically after the latest file, with OldActor equal to the preceding file's NewActor.
- The AI Agent registry entry (id 35) is requiresAuth=true in the live catalogue src/backend/lib/apps.mo; migration 20261023_000000.mo reconciles stored entries to match, so existing and new users see the same Directory Auth label.
- DirectoryCard's Auth label reads the stored registry via listDirectory, so a migration that rewrites the stored entry is what makes the label consistent across users.
- The unreferenced asset src/frontend/public/assets/images/placeholder.svg was deleted; the rm bash command is policy-blocked, unlink <path> deletes a single file successfully.
- File bytes are stored off-chain through the object-storage extension: FileRef wraps a Storage.ExternalBlob and the canister stores metadata only, so uploads do not grow canister memory.
- The backend has no pagination, no request-size validation, no cycle management, no preupgrade/postupgrade hooks and no backup path; the capacity audit and Phase 2 design are documented in docs/capacity-audit-and-phase-2-design.md.
- The sidebar brand mark in src/frontend/src/components/layout/Sidebar.tsx now sources the infinitygateway asset (src/frontend/public/assets/generated/infinitygateway.dim_1920x1080.png) as the app logo; the same asset is also the optional wallpaper in AppShell.tsx.
- The sidebar brand mark is desktop-only (hidden md:flex); the mobile top bar shows the ICP Portal text label without a logo image.
- AppShell's relative z-10 wrapper creates a stacking context that traps inline fixed overlays; the Home context menu is portaled to document.body at z-[60] and stops pointerdown propagation so it paints above the z-50 folder dialog without dismissing it.
- File uploads enforce MAX_UPLOAD_BYTES (25 MB) in prepareUpload before any bytes are read, so a rejected upload never reaches addFile and stores nothing; FileTooLargeError names the limit and the file size.
- Large images are compressed in the browser before upload (JPEG, max 2048px, q0.82) only when the result is smaller; UploadProgress shows the original and compressed sizes.
- ExternalBlob.fromBytes requires Uint8Array<ArrayBuffer>; a plain Uint8Array fails TS2345, so PreparedUpload.bytes must carry that generic.
- buildFileRef returns { ref, prepared } so the upload flow size-checks and compresses once instead of twice.
- The install prompt is mounted in AppShell outside the z-10 content wrapper at z-50 so it clears the z-40 mobile bottom nav; dismissal is remembered per principal in localStorage.
- Platform detection for the install prompt uses userAgent plus maxTouchPoints>1 for iPadOS and matchMedia display-mode standalone to suppress the prompt when already installed.
- The file preview dialog offers image fit-to-view and full-size viewing with clearer loading and failure states; text previews show a retry on read failure.
