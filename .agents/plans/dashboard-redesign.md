# Feature: Dashboard Redesign — New Visual Language + Homepage Link

The following plan should be complete, but validate documentation and codebase patterns before implementing.
Pay special attention to existing CSS var names, component paths, and import aliases.

## Feature Description

Apply the Interior Flow 3D marketing visual language (warm-paper palette, violet accent, Geist+Inter fonts,
card/button styles, shadow tokens) to the authenticated app shell and dashboard pages. Ensure every entry
point from the marketing homepage (`/`) routes cleanly into the app (`/app`). The result is a coherent
experience where visual language doesn't break at the marketing→app boundary.

## User Story

As a user who has just seen the marketing landing page,
I want the app dashboard to feel visually connected to what I just saw,
So that signing in doesn't feel like switching to a different product.

## Problem Statement

The marketing site (`(marketing)/`) uses its own CSS variable system (`--bg`, `--ink`, `--accent` etc.
scoped under `.marketing-v2`) with violet `#7C5BFF` primary and a warm-paper palette. The app shell
(`app/app/`) uses shadcn defaults (neutral `--primary`, `--background` etc. in `globals.css`). The
two environments look disconnected. Additionally, the `globals.css` `--brand-accent` is amber (`oklch(0.7 0.18 55)`)
while the design language calls for violet.

## Solution Statement

1. Update `globals.css` to align `--primary` / `--brand-accent` with the violet accent (`#7C5BFF` / `#9B7DFF` dark).
2. Update `AppShell`, `TopToolbar`, `LeftRail` to use consistent visual language: warm backgrounds, violet CTA,
   Geist display font for headings, refined card borders and shadows matching the marketing tokens.
3. Update `ProjectCard` to use card styling consistent with marketing section cards.
4. Ensure `TopToolbar` home link (`/`) and breadcrumb `/app` are correct (already correct — verify only).
5. The marketing `Nav` Sign in link already points to `/app` — no change needed.

## Feature Metadata

**Feature Type**: Enhancement / Design Consistency  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: `globals.css`, `AppShell`, `TopToolbar`, `LeftRail`, `ProjectCard`, `DashboardPage`  
**Dependencies**: None — pure CSS/TSX changes, no API changes

---

## CONTEXT REFERENCES

### Relevant Codebase Files — MUST READ BEFORE IMPLEMENTING

- `frontend/app/globals.css` (lines 1–80) — Current shadcn token definitions; this is what we update. Current `--primary` is neutral black. `--brand-accent` is amber.
- `frontend/app/(marketing)/marketing.css` (lines 1–66) — Marketing token definitions. Source of truth for the new visual language. Key vars: `--accent: #7C5BFF`, `--bg: #FAF7F2`, `--ink: #14141A`, `--shadow-md`, `--radius: 14px`.
- `frontend/components/shell/AppShell.tsx` — Shell layout. Uses Tailwind `bg-background`, `text-foreground`. Has `flex h-screen w-screen flex-col overflow-hidden`.
- `frontend/components/shell/TopToolbar.tsx` — Header, breadcrumb, account menu. Currently `bg-card h-14 border-b px-6`.
- `frontend/components/shell/LeftRail.tsx` — Icon sidebar. CTA uses `bg-primary text-primary-foreground`. Nav item uses `hover:bg-muted`.
- `frontend/components/projects/ProjectCard.tsx` — Card uses `rounded-xl border border-border hover:border-ring hover:shadow-md`.
- `frontend/app/app/page.tsx` — Dashboard. Headings use `font-display`. Buttons use shadcn `<Button>` variants.
- `frontend/components/marketing/v2/Nav.tsx` — Marketing nav has `Sign in → /app` link. Already correct.
- `frontend/app/(marketing)/page.tsx` (lines 26–28, 36–76) — Hero section CTA buttons: `href="#wizard"` and `href="/app"` for Sign in.
- `frontend/lib/design-tokens.ts` — Design tokens source; Tailwind reads from it. Check if spacing/radius lives here.
- `frontend/tailwind.config.ts` — Check if `fontFamily.display` is defined for Geist.

### New Files to Create

None. All changes are in existing files.

### Relevant Documentation

- Marketing CSS vars already defined in `marketing.css` — copy values into `globals.css` for app-wide parity.
- shadcn uses oklch for color tokens. Convert hex to oklch for `globals.css`. Use online converter or approximate:
  - `#7C5BFF` ≈ `oklch(0.55 0.22 280)` (violet)
  - `#9B7DFF` ≈ `oklch(0.67 0.20 280)` (lighter violet for dark mode)
  - `#FAF7F2` ≈ `oklch(0.98 0.008 85)` (warm paper)
  - `#0B0B10` ≈ `oklch(0.08 0.005 280)` (deep ink)

### Patterns to Follow

**CSS Variable Updates** — Add to existing `:root` and `.dark` blocks in `globals.css`, not inline:
```css
/* In :root */
--primary: oklch(0.55 0.22 280);          /* violet #7C5BFF */
--primary-foreground: oklch(0.98 0 0);    /* white */
--brand-accent: oklch(0.55 0.22 280);     /* same violet */
--background: oklch(0.98 0.008 85);       /* warm paper */
--card: oklch(0.99 0.005 85);             /* slightly off-white */

/* In .dark */
--primary: oklch(0.67 0.20 280);          /* #9B7DFF */
--primary-foreground: oklch(0.08 0.005 280);
--background: oklch(0.08 0.005 280);      /* deep ink */
--card: oklch(0.11 0.005 280);            /* card surface */
```

**LeftRail CTA** — already uses `bg-primary text-primary-foreground`. Updating `globals.css` --primary automatically makes the + button violet. No TSX change needed.

**TopToolbar brand mark** — add the product name with `font-display` next to the breadcrumb home icon so the dashboard feels branded:
```tsx
<Link href="/" ...>
  <Home size={16} />
  <span className="ml-1.5 font-display font-medium text-sm hidden md:inline">
    Interior Flow 3D
  </span>
</Link>
```

**ProjectCard shadow** — swap `hover:shadow-md` for a warm shadow to match marketing cards:
```tsx
// replace className hover:shadow-md with:
hover:shadow-[0_4px_16px_rgba(20,20,26,0.08)]
```

**Dashboard page "Projects" heading** — already uses `font-display`. No change needed. Confirm `font-display` is mapped to Geist in `tailwind.config.ts`.

---

## IMPLEMENTATION PLAN

### Phase 1: Token Alignment — `globals.css`

Update the root CSS tokens in `globals.css` so the app primary colour becomes violet and backgrounds become warm. This cascades into every shadcn component automatically (buttons, rings, focus outlines, LeftRail CTA).

**Tasks:**
- UPDATE `globals.css` `:root` — change `--primary`, `--primary-foreground`, `--brand-accent`, `--background`, `--card`, `--border`, `--ring`
- UPDATE `globals.css` `.dark` — same vars for dark mode (darker violet, deep-ink background)
- Keep all other shadcn vars (`--muted`, `--destructive`, etc.) unchanged

### Phase 2: Shell Polish

Minor TSX changes to `TopToolbar` and `AppShell` to match the design language.

**Tasks:**
- UPDATE `TopToolbar.tsx` — add brand name text beside Home icon (hidden on mobile)
- UPDATE `AppShell.tsx` — verify/add `font-body` class on root element so Inter is active in app
- VERIFY `LeftRail.tsx` — CTA should auto-use new violet primary; confirm no hardcoded color overrides

### Phase 3: Card Consistency

Make `ProjectCard` visually consistent with marketing section cards.

**Tasks:**
- UPDATE `ProjectCard.tsx` — replace `hover:shadow-md` with custom shadow matching marketing `--shadow-md`, add `transition-shadow duration-150`
- UPDATE `ProjectCard.tsx` — bump `rounded-xl` to `rounded-[14px]` to match `--radius: 14px` from marketing
- UPDATE `ProjectCard.tsx` — card body font: ensure project name uses `font-display` (Geist) not default Inter

### Phase 4: Homepage → App Routing Verification

Confirm every CTA that takes the user from the marketing site to the app works correctly.

**Tasks:**
- VERIFY `Nav.tsx` (marketing) — Sign in → `/app` ✓ already correct
- VERIFY `page.tsx` (marketing) — hero "Try it free" → `#wizard` (stays on landing) ✓
- VERIFY `TopToolbar.tsx` (app) — Home icon → `/` ✓ already correct, breadcrumb → `/app` ✓
- VERIFY `LeftRail.tsx` — Dashboard icon → `/app` ✓ already correct

---

## STEP-BY-STEP TASKS

### UPDATE `frontend/app/globals.css`

- **IMPLEMENT**: In `:root`, update `--primary` to `oklch(0.55 0.22 280)`, `--primary-foreground` to `oklch(0.985 0 0)`, `--brand-accent` to `oklch(0.55 0.22 280)`, `--background` to `oklch(0.98 0.008 85)`, `--card` to `oklch(0.99 0.005 85)`, `--ring` to `oklch(0.55 0.22 280 / 50%)`
- **IMPLEMENT**: In `.dark`, update `--primary` to `oklch(0.67 0.20 280)`, `--primary-foreground` to `oklch(0.08 0.005 280)`, `--background` to `oklch(0.08 0.005 280)`, `--card` to `oklch(0.11 0.008 280)`, `--ring` to `oklch(0.67 0.20 280 / 50%)`
- **GOTCHA**: `--accent` in shadcn is NOT the brand accent — it is the hover background for menu items. Do NOT change it to violet. Keep it as-is.
- **GOTCHA**: `--border` in light mode change to `oklch(0.92 0.008 85)` (warm tinted) not pure grey
- **VALIDATE**: `pnpm typecheck && pnpm lint` — no errors; visual check that buttons turn violet

### UPDATE `frontend/components/shell/TopToolbar.tsx`

- **IMPLEMENT**: Add brand name text beside Home icon: `<span className="ml-1.5 font-display font-medium text-sm hidden md:inline tracking-tight">Interior Flow 3D</span>`
- **PATTERN**: `frontend/components/marketing/v2/Nav.tsx:12` — same brand mark pattern
- **IMPORTS**: No new imports needed (Link, Home already imported)
- **VALIDATE**: Visual check breadcrumb shows brand name on md+ screens

### UPDATE `frontend/components/projects/ProjectCard.tsx`

- **IMPLEMENT**: Replace `hover:shadow-md` with `hover:shadow-[0_4px_16px_rgba(20,20,26,0.06)]`
- **IMPLEMENT**: Change `rounded-xl` to `rounded-[14px]` on the outer card div
- **IMPLEMENT**: Add `font-display` to project name: `className="text-sm font-medium font-display text-foreground ..."`
- **VALIDATE**: Visual check cards match marketing section card style

### VERIFY `frontend/tailwind.config.ts`

- **CHECK**: `fontFamily.display` mapped to Geist. If missing, add: `display: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans]`
- **PATTERN**: Check how `font-body` is defined; ensure it maps to Inter (`var(--font-inter)`)
- **VALIDATE**: `pnpm typecheck` passes

---

## TESTING STRATEGY

### Manual Validation

- Light mode: background is warm (#FAF7F2 tone), primary buttons are violet, breadcrumb shows brand name
- Dark mode: background is deep ink (#0B0B10 tone), buttons are lighter violet, card surfaces visible
- Toggle theme: smooth 200ms transition (inherits from `globals.css` or `marketing.css` transition)
- Navigate `/` → click Sign in → `/app`: visual continuity, no jarring palette switch
- `/app` dashboard: projects grid with new card style, headings in Geist display font
- All existing features (project CRUD, wizard, viewer) unaffected

### Regression Checks

- shadcn dialogs, dropdowns, tooltips still readable (check `--popover`, `--muted` vars unchanged)
- Destructive actions still red (verify `--destructive` not touched)
- 3D viewer page (`/app/projects/.../layouts/...`) unaffected (full-width, no card styling)

---

## VALIDATION COMMANDS

### Level 1: Lint + Types
```bash
cd frontend && pnpm lint && pnpm typecheck
```

### Level 2: Build Check
```bash
cd frontend && pnpm build
```

### Level 3: Manual
1. `pnpm dev` → open `http://localhost:3000`
2. Check `/` marketing page — violet CTAs, warm background
3. Click "Sign in" → `/app` — background stays warm, buttons violet
4. Dark mode toggle: deep ink background, lighter violet
5. Check `/app` project cards: rounded-14px, warm shadow on hover, Geist font on name

---

## ACCEPTANCE CRITERIA

- [ ] Primary buttons (wizard CTA, new project, + in left rail) are violet in both themes
- [ ] Dashboard background is warm paper light / deep ink dark (not pure white/black)
- [ ] Project cards use `rounded-[14px]` and warm shadow on hover
- [ ] Project card names render in Geist display font
- [ ] TopToolbar shows "Interior Flow 3D" brand name beside Home icon on md+ screens
- [ ] Theme toggle transitions backgrounds smoothly (200ms)
- [ ] Marketing `/` → app `/app` navigation feels visually continuous
- [ ] All shadcn components (dropdowns, dialogs) still readable — no broken contrast
- [ ] `pnpm lint && pnpm typecheck && pnpm build` all pass with 0 errors

---

## COMPLETION CHECKLIST

- [ ] `globals.css` tokens updated (`:root` + `.dark`)
- [ ] `TopToolbar.tsx` brand name added
- [ ] `ProjectCard.tsx` shadow + radius + font updated
- [ ] `tailwind.config.ts` `font-display` verified
- [ ] All validation commands pass
- [ ] Manual theme-switch visual verified
- [ ] Marketing → App navigation verified

---

## NOTES

- Do NOT change `--accent` (shadcn) to violet — it's menu hover bg, not brand accent.
- The `marketing.css` `.marketing-v2` vars are **scoped** and don't affect the app routes — only `globals.css` does.
- The warm background may need a small `--border` tint update so card borders are warm-grey, not cold-grey.
- If `font-display` in Tailwind already maps to `var(--font-geist-sans)` (set up in `app/layout.tsx`), no Tailwind config change needed — just verify.
- Confidence score: **8/10** — changes are additive CSS token swaps + minor TSX, no architectural risk. Main risk is oklch value precision; use browser devtools to eyeball against the marketing palette.
