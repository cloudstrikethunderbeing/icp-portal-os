# Design Brief

## Direction

Quiet OS — an ICP-native workspace shell that reads as a calm modern operating environment, not a crypto dashboard.

## Tone

Refined, airy, Apple-adjacent precision — restrained surfaces with one confident electric accent, so the OS chrome disappears behind the user's apps.

## Differentiation

Aurora glass: translucent blurred chrome (dock, sheets, folder overlays) floating over a soft layered canvas, with a single indigo→cyan accent that marks identity and active state.

## Color Palette

| Token      | OKLCH         | Role                                        |
| ---------- | ------------- | ------------------------------------------- |
| background | 0.985 0.004 250 | Cool paper canvas, layered depth          |
| foreground | 0.19 0.018 265  | Primary text, near-ink                      |
| card       | 1.0 0.002 250   | App tiles, panels, sheets                   |
| primary    | 0.55 0.19 258   | Indigo — identity, primary actions          |
| accent     | 0.72 0.14 205   | Electric cyan — highlights, active states   |
| muted      | 0.955 0.008 255 | Recessed chrome, inactive rows              |
| success    | 0.62 0.15 155   | Installed state, confirmations              |
| warning    | 0.72 0.13 70    | Coming Soon state, caution                  |

## Typography

- Display: Space Grotesk — app names, headings, numeric readouts; technical OS character
- Body: Figtree — UI labels, notes, body copy; friendly and highly legible
- Mono: JetBrains Mono — principal, canister IDs, calculator history
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-xl md:text-2xl font-semibold`, label `text-xs font-semibold tracking-widest uppercase`, body `text-sm md:text-base`

## Elevation & Depth

Four-tier shadow hierarchy (`subtle` → `elevated` → `floating` → `sheet`) plus translucent `surface-glass`/`surface-raised`/`surface-sheet` chrome; depth comes from blur and layering, never from heavy borders.

## Structural Zones

| Zone      | Background                       | Border     | Notes                                              |
| --------- | -------------------------------- | ---------- | -------------------------------------------------- |
| Header    | `surface-glass` blur             | `border-b` | Status/principal bar; sticky, safe-top padding      |
| Content   | `background` + subtle gradient   | —          | Alternating `muted/30` section bands               |
| Dock      | `surface-raised` blur            | `border-t` | Floating rounded dock, safe-bottom padding          |
| Sidebar   | `sidebar`                        | `border-r` | Desktop nav; icons + labels, active = accent tint   |
| Sheet     | `surface-sheet` blur + `shadow-sheet` | `border` | Shortcut editor / add-link form; `animate-sheet-in` |
| Directory | `background`                     | —          | Card grid; state pills tinted per launch type       |

## Spacing & Rhythm

Mobile-first 16px gutters with 24–32px section gaps; app grid uses 12px gutters; micro-spacing 4/8/12; generous negative space around the dock and folder overlays.

## Component Patterns

- Buttons: `rounded-full` pills for primary, `rounded-xl` for secondary; primary uses `bg-gradient-primary`, hover lifts with `shadow-elevated`
- Cards: `rounded-2xl` `bg-card` with `shadow-subtle`; app tiles use the `app-tile` squircle utility
- Badges: `rounded-full` pills; launch/state tinted — Installed `pill-installed`, Available `pill-available`, Coming Soon `pill-coming-soon`
- Sheets: `rounded-t-3xl` mobile bottom sheet, `rounded-3xl` desktop dialog; `surface-sheet` + `shadow-sheet`
- Inline validation: destructive text `text-destructive` with a `border-destructive` input ring; never a silent failure

## Motion

- Entrance: grid tiles `animate-fade-up` staggered 30ms; dock `animate-dock-rise`
- Hover: tiles lift `scale-[1.04]` with `transition-smooth`; buttons brighten
- Decorative: folder overlay `animate-folder-open` spring; sheets `animate-sheet-in`; toasts `animate-toast-in`
- Feedback: `transition-quick` (160ms) for press/validation state changes

## Constraints

- Mobile-first: bottom nav + safe areas; desktop: sidebar + multi-column
- Token-only styling — no raw hex, rgb, or arbitrary color classes in components
- Large touch targets (min 44px), long-press parity with right-click, visible focus rings
- No crypto-dashboard motifs: no price tickers, no neon glow, no dark-blue terminal look

## Signature Detail

The floating aurora-glass dock over a soft gradient canvas — motion choreography that makes the workspace feel like a physical OS surface.
