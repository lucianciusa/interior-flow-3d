# Feature: Phase 5 — Design System & Marketing

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Phase 5 transforms the v1 codebase from a working prototype into a polished, branded product. It locks the design system (spacing, type, motion, button hierarchy), introduces full light/dark theming via `next-themes`, replaces the current ad‑hoc page chrome with a floating‑panel app shell, ships a marketing landing page with an autoplay 3D hero loop, seeds a curated template gallery for the empty dashboard, adds illustrated empty states everywhere, and wires soft Pro affordances (lock icons on premium items, quota badge, contextual upgrade modal — no billing).

This phase is **pure presentation + onboarding**. No layout-generation logic changes. No new generation features. No catalog growth (that is Phase 6). It must not break Pydantic contracts, the LLM prompt, the slot resolver, the placement pipeline, RLS, or any existing route.

## User Story

As a first-time visitor or returning designer
I want a landing page that demonstrates the product in motion and an app that looks intentional and consistent in light or dark
So that I trust the tool enough to invest a real project in it instead of bouncing after the first wizard screen.

## Problem Statement

The v1 codebase ships Phase 4 functionality behind a prototype-grade UI:

- Marketing page is a static text block with a "Hero preview" placeholder div — no autoplay 3D, no real demo of what the product does.
- App pages use hard-coded `neutral-*` Tailwind classes; there is no design token layer, no dark mode, no documented spacing scale, and no `cn()` utility outside isolated components.
- Page chrome is an `mx-auto max-w-5xl` container per route — no shared shell, no left rail, no top toolbar, no right inspector. The viewport is not edge-to-edge on the result page either.
- Empty states are small dashed boxes (e.g. `EmptyProjects.tsx`) with one CTA and no illustration; there is no curated template gallery to onboard a brand-new account.
- There is no concept of premium catalog items, no quota indication, and no upgrade modal.
- Tailwind `darkMode: "class"` is set in config but never used; `globals.css` is empty of tokens.

Result: the product feels like a demo, not a SaaS. Lighthouse, axe, and a designer eye all flag issues immediately.

## Solution Statement

1. **Design tokens (foundation)**
   - Add `frontend/lib/design-tokens.ts` exporting spacing, type, motion, radius, shadow, and z-index tokens.
   - Wire CSS custom properties for both themes in `globals.css` (HSL values, shadcn convention) — `--background`, `--foreground`, `--primary`, `--brand-accent`, `--border`, `--ring`, etc.
   - Extend `tailwind.config.ts` to consume those tokens (theme.extend.colors uses `hsl(var(--…))`, spacing scale restricted to 4/8/12/16/24/32/48/64, fontFamily reads `--font-display` and `--font-body`, motion durations 150/200/250 ms).
   - Add `Geist Sans` (display) + `Inter` (body) via `next/font` in `app/layout.tsx`.
   - Add `next-themes` `ThemeProvider` in `app/providers.tsx` (attribute=class, default=system, persist=localStorage). Theme persistence-per-user is achieved by syncing to a `profiles.theme` column when authed (deferred — `next-themes` localStorage suffices for v1; document the deferral).

2. **App shell**
   - New `components/shell/AppShell.tsx` with three slots: left rail (icon-only nav), top toolbar (logo, breadcrumb, theme toggle, quota badge, account menu), collapsible right inspector (children render area for page-specific panels).
   - A new shared `app/app/layout.tsx` mounts `AppShell` for every authed page. Existing pages render their content **inside** the shell instead of providing their own `<main mx-auto max-w-5xl>` chrome.
   - Result page goes edge-to-edge: viewer fills viewport, sidebar becomes the right inspector (floating panel `top-16 right-4 bottom-4 w-80`), CameraPresets becomes a floating top‑left toolbar.

3. **Marketing landing**
   - `(marketing)/page.tsx` becomes hero + how-it-works + what's-included + footer.
   - Hero is an autoplay 3D loop: a `MarketingHero` client component dynamically imports a stripped-down R3F scene (`components/marketing/HeroScene.tsx`) with `Canvas dpr={[1, 2]}` rendering a hard-coded sample layout (one of the demo seeds), an auto-rotating camera (`OrbitControls autoRotate autoRotateSpeed=0.4 enableZoom={false} enablePan={false}`), `<Bounds fit clip observe margin=1.05>` for framing, and `useReducedMotion` to fall back to a static rendered image when the user prefers reduced motion. No marketing GLB downloads above the fold beyond the existing primitive Furniture path.
   - Below-fold: 3-step "How it works" card row, 3-card "What's included" (rooms, styles, catalog), pricing teaser footer ("Pro coming soon — free during beta"), CTA "Try it free, no signup" → `/app/new`.

4. **Curated template gallery**
   - Add `backend/app/data/templates.json` with 5–10 hand-built template entries: each entry is `{ id, name, room_type, style, dims, layout (full Layout JSON), thumbnail_url }`.
   - Add `GET /templates` route (anonymous, public, cached) in `backend/app/routers/templates.py` returning the templates list.
   - Frontend `components/projects/TemplateGallery.tsx` is shown on the empty dashboard (`useListProjects().data?.length === 0`) instead of (or alongside) `EmptyProjects`. Cards link to `/app/new?template={id}` which pre-fills the wizard from the template payload.
   - Wizard reads the template (TanStack Query against `/templates`), seeds the store, and the user can either accept or tweak before generating.

5. **Empty state illustrations**
   - Add `components/ui/illustrations/*.svg` (inline SVG components, monochrome with `currentColor`, theme-aware): `EmptyProjects.svg`, `EmptyRooms.svg`, `EmptyLayouts.svg`.
   - Replace text-only empty states across dashboard, project page, room page with `EmptyState` shared primitive (`components/ui/empty-state.tsx`) accepting `{ illustration, title, description, cta }`.

6. **Soft Pro affordances**
   - Add `is_premium: boolean` (default false) field to `CatalogItem` Pydantic model + `CatalogItem` TS type. Mark a small set (e.g. 3) of v1 catalog items as `is_premium: true` (pure flag flip in `data/catalog.json`; no behaviour change in placement).
   - In any item picker (current `SwapPopover`, future Phase 6 catalog browsers): premium items render with a lock icon overlay + tooltip and are non-selectable for free users.
   - Quota badge in top toolbar reads from a client-side counter (`lib/stores/quota.ts` Zustand store, persisted via `sessionStorage`) that increments on each `useGenerateLayout` success for unauthenticated users. Authenticated users render "Free plan" instead of a number. Anchor: real enforcement comes from the rate-limit middleware in Phase 6; this is presentational signal only and must say so in the upgrade modal copy.
   - `components/ui/UpgradeModal.tsx` opens when (a) user clicks a locked item, or (b) anon quota reaches the configured cap. Copy: "Pro coming soon — join the waitlist." CTA captures email via Supabase RPC `notify_pro_waitlist(email)` if implemented; otherwise links to a `mailto:`. Default to the simpler `mailto:` for v1; document the RPC option as deferred.

7. **Validation**
   - Lighthouse ≥ 80 (mobile + desktop) on `/` and on a saved layout page (use a stub fixture) — captured manually pre-merge.
   - axe-core smoke test in CI for `/`, `/app`, and a saved layout page (Playwright + `@axe-core/playwright`).
   - Design system audit script (`scripts/audit-design-tokens.ts`) walks all `*.tsx` under `frontend/` and fails if it finds: a `p-1`/`p-2`/`p-3`/`p-5`/`p-7`/`p-9` (off-scale spacing), a hard-coded `text-neutral-…`/`bg-white`/`bg-black` (should be tokenised), or `style={{ color: '#…' }}` outside the resolved-palette branch.

## Feature Metadata

**Feature Type**: Enhancement (UI/UX polish + new marketing surface + new data: templates).
**Estimated Complexity**: High (touches every authed page, introduces tokens + theming + a new shell, adds a marketing 3D scene, adds a backend route, adds a Pydantic field across the wire — small per-task complexity but broad blast radius).
**Primary Systems Affected**:
- `frontend/app/**` (every page chrome rewrite)
- `frontend/components/shell/**` (new)
- `frontend/components/ui/**` (new EmptyState, UpgradeModal, ThemeToggle, Lock icon)
- `frontend/components/marketing/**` (new HeroScene)
- `frontend/components/projects/TemplateGallery.tsx` (new)
- `frontend/lib/design-tokens.ts` (new)
- `frontend/lib/stores/quota.ts` (new)
- `frontend/tailwind.config.ts`
- `frontend/app/globals.css`
- `frontend/app/providers.tsx`, `frontend/app/layout.tsx`, `frontend/app/app/layout.tsx` (new)
- `backend/app/routers/templates.py` (new), `backend/app/data/templates.json` (new)
- `backend/app/models/catalog.py` (`is_premium` field)
- `backend/app/data/catalog.json` (flag flips)
**Dependencies**:
- New runtime: `next-themes`, `@next/font` (Geist family — `geist` package on npm), `framer-motion` (already feasible; check before adding), `lucide-react` (icons).
- New dev: `@axe-core/playwright`, `@playwright/test` (Phase 5 introduces frontend Playwright for the first time — install at minimum for axe smoke).
- No backend Python deps added.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `CLAUDE.md` — project-wide rules. The "Design system" subsection at the bottom of "Code Patterns" enumerates the spacing scale (4/8/12/16/24/32/48/64), type pairing (Geist + Inter), button hierarchy, motion (150–250 ms), brand-accent reservation rule. **Phase 5 is the implementation of these rules.**
- `.claude/PRD.md` §F15 (Marketing & onboarding), §F16 (Design system), §F17 (Soft Pro affordances), §11 Phase 5 deliverables (lines 830–844). Single source of truth for behaviour.
- `.claude/reference/components.md` §1 (Server vs Client Components), §2 (file conventions, no barrel files), §6 (R3F patterns — `dpr={[1,2]}`, `<Suspense>`, no `Vector3` literals, memoize geometry, `useGLTF.preload`), §9 (Tailwind ordering, no arbitrary values, `cn()`), §10 (a11y, focus rings, prefers-reduced-motion, WebGL fallback), §11 (loading/error/empty states — three explicit states, never spinners over old content).
- `frontend/app/layout.tsx` — root HTML/body. Currently hard-codes `bg-white text-neutral-900`. Replace with token classes (`bg-background text-foreground`) and inject font CSS variables from `next/font`.
- `frontend/app/providers.tsx` — currently `QueryClientProvider` + `AuthProvider`. Wrap a `ThemeProvider` from `next-themes` outside both.
- `frontend/app/globals.css` — currently empty Tailwind imports. Add `:root` and `.dark` CSS variable blocks (HSL channels, e.g. `--background: 0 0% 100%;`).
- `frontend/tailwind.config.ts` — currently `darkMode: "class"` and empty `extend`. Add the full token-driven `extend` block (colors via `hsl(var(--…))`, font families, motion durations, spacing whitelist).
- `frontend/app/(marketing)/page.tsx` — current static landing page. Replace with the new hero + below-fold sections.
- `frontend/app/app/page.tsx` — dashboard. Wrap rendering in the new `AppShell`; replace anon split with shell-aware variant; render `TemplateGallery` in the empty branch.
- `frontend/app/app/projects/[projectId]/page.tsx` and `…/rooms/[roomId]/page.tsx` — both follow an identical pattern (`<main mx-auto max-w-5xl>`); both must move into the shell. Use both as the spec for the migration loop.
- `frontend/app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx` and `frontend/components/result/ResultView.tsx` (lines 56–108) — current result page. Make it edge-to-edge inside the shell; move sidebar into a floating right inspector; keep `Suspense` + `dynamic(Scene)` exactly as-is (do not break R3F SSR boundary).
- `frontend/components/sidebar/ResultSidebar.tsx` — sidebar component. Restyle to read tokens (`bg-card`, `text-foreground`, etc.) but **do not** change the prop API; it is shared by saved/live/share modes (note `STYLE_LABELS`/`PREF_LABELS` only cover the 3 v1 styles — Phase 5 must not assume more, that is Phase 7).
- `frontend/components/projects/EmptyProjects.tsx` — current empty state. Replace with the shared `EmptyState` primitive driven by an SVG illustration.
- `frontend/components/auth/AuthProvider.tsx` and `frontend/lib/stores/auth.ts` — auth gating pattern; the shell must show a different top-toolbar slot for authed vs anon (theme toggle always visible; quota badge only when relevant; account menu only when authed).
- `frontend/lib/api.ts` — TanStack Query factories. Add `templatesQuery` and `useListTemplates`. Mirror the existing `catalogQuery` pattern (1-hour staleTime, public — no auth header required).
- `frontend/components/viewer/Scene.tsx` — current full Scene. The marketing hero must reuse `Furniture.tsx` and `Room.tsx` but **not** import `CameraController3D` or `OrbitControls` user-controllable props; instead use `OrbitControls autoRotate autoRotateSpeed={0.4} enableZoom={false} enablePan={false}` plus `Bounds fit clip observe`.
- `frontend/components/viewer/Furniture.tsx` and `Room.tsx` — already render `primitive:*` model ids. The marketing hero must run on `primitive:*` only (no GLB downloads above the fold).
- `frontend/components/swap/SwapPopover.tsx` — first consumer of the lock-icon affordance. Replace its catalog item rendering with one that respects `item.is_premium`.
- `backend/app/routers/catalog.py` — `_load_catalog()` is `@lru_cache`d. Add the new template router; mirror the LRU-cached static-JSON pattern.
- `backend/app/models/catalog.py` — Pydantic `CatalogItem`. Add `is_premium: bool = False` (default false; preserves backward compat for catalog rows that omit it).
- `backend/app/main.py` — FastAPI app + router includes. Add `templates.router`.
- `backend/app/data/catalog.json` — current 10-item catalog. Append `"is_premium": true` to a few items (do NOT mass-edit; pick 3 deliberately).
- `backend/tests/test_routes_generate.py`, `backend/tests/test_llm_mock.py`, `backend/tests/test_routes_layouts.py` — existing patterns for FastAPI route testing. New `test_routes_templates.py` mirrors these.

### New Files to Create

Frontend
- `frontend/lib/design-tokens.ts` — typed token export (spacing scale, motion durations, z-index, radii).
- `frontend/lib/utils.ts` — verify `cn()` exists (it is referenced in components.md §9 and the existing codebase). If missing, create it: `import { clsx, type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge"; export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }`.
- `frontend/components/shell/AppShell.tsx`
- `frontend/components/shell/LeftRail.tsx`
- `frontend/components/shell/TopToolbar.tsx`
- `frontend/components/shell/RightInspector.tsx` (collapsible container; takes `children`)
- `frontend/components/shell/ThemeToggle.tsx` (uses `next-themes` `useTheme` hook; renders `<Sun>`/`<Moon>` from `lucide-react`)
- `frontend/components/shell/QuotaBadge.tsx`
- `frontend/components/shell/AccountMenu.tsx` (Radix DropdownMenu; sign-out, theme submenu fallback)
- `frontend/components/marketing/HeroScene.tsx` (R3F autoplay; `"use client"`, dynamic-imported by hero page)
- `frontend/components/marketing/MarketingHero.tsx` (wrapper that reads `useReducedMotion`)
- `frontend/components/marketing/HowItWorks.tsx`
- `frontend/components/marketing/WhatsIncluded.tsx`
- `frontend/components/marketing/PricingTeaser.tsx`
- `frontend/components/projects/TemplateGallery.tsx`
- `frontend/components/projects/TemplateCard.tsx`
- `frontend/components/ui/empty-state.tsx`
- `frontend/components/ui/illustrations/EmptyProjects.tsx` (inline SVG, `currentColor`)
- `frontend/components/ui/illustrations/EmptyRooms.tsx`
- `frontend/components/ui/illustrations/EmptyLayouts.tsx`
- `frontend/components/ui/UpgradeModal.tsx` (Radix Dialog)
- `frontend/components/ui/LockBadge.tsx` (lock icon + tooltip)
- `frontend/lib/stores/quota.ts` (Zustand persist via sessionStorage)
- `frontend/app/app/layout.tsx` (Server Component; wraps `<AppShell>` around `{children}`)
- `frontend/app/(marketing)/layout.tsx` (Server Component; minimal marketing chrome — top nav + footer; **no AppShell**, **no left rail**)
- `frontend/scripts/audit-design-tokens.ts` (Node script; walks `frontend/**/*.tsx`, regex audit; exits non-zero on violation)
- `frontend/tests/a11y.spec.ts` (Playwright + axe smoke for `/`, `/app`, saved layout)

Backend
- `backend/app/routers/templates.py`
- `backend/app/data/templates.json` (start with 3 entries — minimal, can grow before launch)
- `backend/tests/test_routes_templates.py`
- `backend/tests/test_catalog_premium.py` (asserts `is_premium` defaults false, asserts at least one premium item flagged in v1 catalog, asserts schema export still strict)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [next-themes — App Router setup](https://github.com/pacocoursey/next-themes#with-app)
  - Specific section: `ThemeProvider` placement; `attribute="class"`; `disableTransitionOnChange`; SSR mismatch handling with `suppressHydrationWarning` on `<html>`.
  - Why: Theme provider must wrap providers without breaking SSR; `<html suppressHydrationWarning>` is required.
- [next/font — Geist + Inter via local/google fonts](https://nextjs.org/docs/app/api-reference/components/font)
  - Specific section: `variable` prop; injecting CSS variables; multi-font composition.
  - Why: We expose two CSS variables (`--font-display`, `--font-body`); Tailwind reads them via `theme.extend.fontFamily`.
- [shadcn/ui — Theming via CSS variables](https://ui.shadcn.com/docs/theming)
  - Specific section: HSL token convention (`--background: 0 0% 100%`); `.dark` overrides; Tailwind `colors: { background: "hsl(var(--background))" }`.
  - Why: We follow this convention so future shadcn primitives drop in clean.
- [Tailwind CSS — Customizing colors with CSS variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
  - Specific section: `hsl(var(--…) / <alpha-value>)`.
  - Why: Required for opacity modifiers (`bg-primary/20`) to work on token-backed colors.
- [drei — `<Bounds>` and `<OrbitControls autoRotate>`](https://github.com/pmndrs/drei#bounds)
  - Why: Marketing hero uses `Bounds fit clip observe margin=1.05` and `OrbitControls autoRotate autoRotateSpeed=0.4`. Verify exact prop names (`autoRotate` vs `autorotate`) before shipping.
- [framer-motion — `useReducedMotion`](https://www.framer.com/motion/use-reduced-motion/)
  - Why: Hero scene falls back to a static frame if the user prefers reduced motion (a11y requirement from components.md §10).
- [Radix UI — Dialog & DropdownMenu](https://www.radix-ui.com/primitives/docs/components/dialog)
  - Why: `UpgradeModal` is a Radix Dialog; `AccountMenu` is a Radix DropdownMenu; these are not in `components/ui/` yet — install via `npx shadcn-ui@latest add dialog dropdown-menu` if not present.
- [@axe-core/playwright](https://playwright.dev/docs/accessibility-testing)
  - Why: Phase 5 ships a11y smoke; this is the canonical recipe.
- [Lighthouse CI — performance budget](https://github.com/GoogleChrome/lighthouse-ci)
  - Why: Validation step requires Lighthouse ≥ 80 on `/` + a saved layout. Manual run for v1 is acceptable; CI integration is optional.

### Patterns to Follow

**Naming Conventions** (extracted from `CLAUDE.md` and existing files):
- Files: `PascalCase.tsx` for components, `kebab-case.ts` for libs (existing example: `slot-mappings.ts`, `design-tokens.ts`).
- Components: `PascalCase` default export. One component per file. No barrel files.
- Tokens in `design-tokens.ts`: `SCREAMING_SNAKE_CASE` for the `as const` constants (mirrors `STYLES` in `StyleStep.tsx` per components.md §3 sample).
- Tailwind tokens: kebab-case CSS variable names matching shadcn convention (`--background`, `--brand-accent`).
- Catalog JSON keys: snake_case. The new field is `is_premium` (snake_case in JSON, mirrored to TS as `is_premium` to keep one-to-one).

**Server vs Client component placement** (from components.md §1):
- `app/app/layout.tsx` is a **Server Component**; it imports `AppShell` which is `"use client"` because it uses `useTheme`, the Zustand quota store, and Radix dropdowns.
- `(marketing)/page.tsx` is a Server Component; `MarketingHero` is `"use client"` because R3F + `useReducedMotion`.
- `EmptyState` is a Server Component (pure props in, JSX out).
- Push `"use client"` to leaves wherever possible. **Do not** mark `app/app/layout.tsx` as client.

**Token consumption (Tailwind classes)**:
- Right: `className={cn("rounded-lg border border-border bg-card p-4 text-foreground hover:bg-muted transition-colors duration-200")}`.
- Wrong: `className="rounded-lg border border-neutral-200 bg-white p-4 text-neutral-900"` (off-token; the audit script must fail this).
- Brand accent: reserved for active wizard step + the single primary CTA per screen. Use `bg-primary text-primary-foreground` for the primary; never two `bg-primary` buttons in the same viewport.

**Error / loading / empty** (components.md §11):
- Each new view (`TemplateGallery`, marketing hero) MUST distinguish loading / error / empty / loaded. The hero falls back to a static gradient + framed image on `error` or `prefers-reduced-motion`.
- Skeleton loaders, never spinners. Existing pages still use `text-sm text-neutral-500` "Loading…" — Phase 5 replaces those with `<Skeleton>` from shadcn (install via `npx shadcn-ui@latest add skeleton`).

**TanStack Query** (components.md §5, mirror `lib/api.ts` `catalogQuery`):
```ts
export const templatesQuery = () => ({
  queryKey: ["templates"] as const,
  queryFn: () => publicFetch<{ items: Template[] }>("/templates"),
  staleTime: 60 * 60 * 1000,
});
export function useListTemplates() {
  return useQuery(templatesQuery());
}
```
Templates are public; do **not** route them through `authedFetch`. Add a sibling `publicFetch` if not present, or call `fetch` directly inside the queryFn (whichever the existing `lib/api.ts` already does for `/catalog`).

**R3F hero (components.md §6)**:
- One `<Canvas>` only. `dpr={[1, 2]}`. `<Suspense fallback={null}>`. `Bounds fit clip observe margin={1.05}`. `OrbitControls makeDefault autoRotate autoRotateSpeed={0.4} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.1}`. No `Vector3`/`Euler` literals — array form. Memoize any inline geometry/material.
- The hero scene uses the **same** `Furniture` and `Room` components. Do not fork them.
- `useGLTF.preload` is irrelevant for `primitive:*` models — skip.
- The hero must NOT render in the marketing route's server component — wrap in `next/dynamic(() => import('./HeroScene'), { ssr: false })`.

**Pydantic field addition (catalog)**:
```python
class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    footprint: Footprint
    clearance: Clearance
    allowedSlotKinds: list[str]
    model: str
    is_premium: bool = False
```
Default is critical — existing `catalog.json` rows omit the field; without a default, Pydantic strict mode rejects them. Write a test that loads the unmodified catalog and asserts `is_premium=False` for all not-flagged rows, then asserts the 3 flagged rows return `True`.

**FastAPI router (mirror `routers/catalog.py`)**:
```python
@lru_cache(maxsize=1)
def _load_templates() -> TemplatesResponse:
    path = Path(__file__).parent.parent / "data" / "templates.json"
    raw = json.loads(path.read_text())
    return TemplatesResponse(items=[Template.model_validate(t) for t in raw])

@router.get("", response_model=TemplatesResponse, status_code=200)
async def get_templates() -> TemplatesResponse:
    return _load_templates()
```
No auth dependency. No rate limit (templates are presentational).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — design tokens + theming

Land tokens, fonts, theme provider, and the audit script first. Without these, every later component will accumulate off-token classes that the audit will reject in bulk.

**Tasks:**
- Add `next-themes`, `geist`, `lucide-react`, `framer-motion` to `frontend/package.json`.
- Create `frontend/lib/design-tokens.ts` and verify/create `frontend/lib/utils.ts` with `cn()`.
- Write `:root` + `.dark` CSS variable blocks in `globals.css` (HSL channels — shadcn convention).
- Extend `tailwind.config.ts` to consume tokens, restrict spacing scale, register font families and motion durations.
- Mount `next/font/google` `Inter` and `next/font/local` (or `geist` package) `Geist` in `app/layout.tsx`; expose `--font-display`/`--font-body` via `className` on `<html>`.
- Wrap `Providers` with `next-themes` `ThemeProvider`.
- Add `<html suppressHydrationWarning>` to root.
- Land `scripts/audit-design-tokens.ts` and a `pnpm audit:tokens` script entry. Make it pass on the existing tree (this requires deferring the strict mode of the audit until after the migration — start it in advisory mode with a `--strict` flag that CI will flip on at the end of Phase 5).

### Phase 2: App shell

Build the floating-panel shell once, then migrate every authed page into it.

**Tasks:**
- Create `components/shell/{AppShell,LeftRail,TopToolbar,RightInspector,ThemeToggle,QuotaBadge,AccountMenu}.tsx`.
- Create `frontend/lib/stores/quota.ts` (Zustand `persist` middleware over `sessionStorage`).
- Create `app/app/layout.tsx` (Server Component) that wraps `AppShell` around children. The `AppShell` receives an `inspector?: ReactNode` slot via React Context (set by individual pages with `useInspectorSlot(node)` hook) so pages can inject their right-rail content without prop drilling through `layout.tsx`.
- Migrate `app/app/page.tsx`, `app/app/projects/[projectId]/page.tsx`, `app/app/projects/[projectId]/rooms/[roomId]/page.tsx`, and `app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx` to render inside the shell. Strip `mx-auto max-w-5xl p-6` containers — those become the shell's job.
- Move `ResultView`'s sidebar into the right inspector slot; make the viewer fill the remaining space; reposition `CameraPresets` and the existing "Replace this item" floating button accordingly. The result page becomes edge-to-edge.
- The sign-in screen (`app/app/page.tsx` `!session` branch) renders **inside** the shell with the left rail collapsed/empty and top toolbar showing only the brand + theme toggle. Or — alternative — keep an unshelled sign-in page; document the choice with a one-line comment and stick with one.
- Keep `(marketing)` outside the shell. Add `app/(marketing)/layout.tsx` for a minimal top-nav + footer chrome.

### Phase 3: Marketing landing

Replace the placeholder with the real product surface.

**Tasks:**
- Build `MarketingHero` (`useReducedMotion`-aware wrapper) + `HeroScene` (R3F).
- Hard-code one curated demo Layout JSON inline in `HeroScene.tsx` (or import from `lib/marketing-fixtures.ts` — preferred). Use a Layout already shipped in `docs/demo-seeds.md` for fidelity.
- Add `HowItWorks`, `WhatsIncluded`, `PricingTeaser` below-fold.
- New `(marketing)/page.tsx` composes them. CTA points to `/app/new` (existing route).
- `next/dynamic(() => import('./HeroScene'), { ssr: false })` to keep R3F off the server.
- Verify the marketing bundle size: nothing from `app/app/**`, no `.glb` (we are on `primitive:*`). Use `next build` analysis.

### Phase 4: Curated template gallery

Wire the new endpoint and surface it on the empty dashboard.

**Tasks:**
- Add `Template` Pydantic model and `templates.json` (start 3 entries — handpick living-room, bedroom-style, dining-style — note bedroom/dining are still v1-roomtype `living_room` until Phase 6, so for Phase 5 keep all template `room_type` to `living_room`).
- Add `routers/templates.py`, register in `main.py`.
- Add `useListTemplates` to `lib/api.ts` and the matching `Template` TS type to `lib/types.ts`.
- Build `TemplateGallery` and `TemplateCard`.
- Render `TemplateGallery` in the empty branch of the dashboard (replacing the bare empty box, **not** removing `EmptyProjects` — keep both: the gallery sits above an "Or start fresh" `EmptyState` CTA).
- Make `TemplateCard` link to `/app/new?template={id}`.
- Add wizard support: in `WizardShell` (or `app/app/new/page.tsx`'s `Suspense` boundary), read `template` query param via `useSearchParams`, fetch the template, seed the wizard store. Mirror the existing `SeedReader` pattern in `app/app/new/page.tsx` lines 9–19.
- Backend test `test_routes_templates.py`: GET returns the seed list; assert exact length and shape; assert no auth header required; assert response is cached (LRU + ETag if you wire it).

### Phase 5: Empty states

Replace bare boxes everywhere.

**Tasks:**
- Build `<EmptyState>` primitive in `components/ui/empty-state.tsx`.
- Author 3 inline-SVG illustrations (`EmptyProjects`, `EmptyRooms`, `EmptyLayouts`) — hand-drawn vector, single-color via `currentColor`, ~120×120, no embedded raster.
- Replace `EmptyProjects.tsx` body, the empty branch of the project page (`No rooms yet.`), and the empty branch of the room page (`LayoutVariantGrid`'s empty fallback if any).
- Each `EmptyState` carries one CTA. No competing primaries on the page.

### Phase 6: Soft Pro affordances

Lock icons + quota badge + upgrade modal. No backend behaviour change.

**Tasks:**
- Add `is_premium: bool = False` to `CatalogItem` (Pydantic) and `is_premium?: boolean` to TS `CatalogItem`.
- Flip 3 catalog rows in `data/catalog.json` to `"is_premium": true`. Pick visually-distinguished items so the lock badge is meaningful (e.g. `bookshelf`, `coffee_table`, one accent).
- Build `<LockBadge>` (Radix Tooltip wrapping `<Lock />` from lucide).
- Update `SwapPopover` to render `LockBadge` over premium items and disable selection (`aria-disabled`, prevent click). Add `onLockedClick={() => setUpgradeOpen(true)}`.
- Build `<UpgradeModal>` (Radix Dialog) with copy "Pro coming soon — join the waitlist" + `mailto:` CTA. Wire to lock clicks and quota cap.
- Build `<QuotaBadge>` reading from the quota store. For `!session`, show `X/10 free`; for `session`, show `Free plan`. The store increments on `useGenerateLayout` `onSuccess`.
- Hook the increment: open `lib/api.ts` `useGenerateLayout`, add an `onSuccess` callback that calls `useQuotaStore.getState().increment()` if no auth token was attached.
- Document explicitly in `lib/stores/quota.ts` that this is presentational and real enforcement is the rate-limit middleware (Phase 6/7).

### Phase 7: Validation & rollout

Make sure nothing regressed.

**Tasks:**
- Run the design-token audit in strict mode and fix every violation surfaced.
- Write `tests/a11y.spec.ts` (Playwright + axe) hitting `/`, `/app` (signed out), and a fixture saved-layout page (mock backend with MSW or hit a seeded local Supabase). Fail build on serious violations.
- Manual Lighthouse run on `/` and a saved layout in both themes; capture screenshots in the PR description; fail merge if either score < 80.
- Manual visual QA across both themes for: marketing, dashboard (empty + populated), project, room, layout, share, wizard. Record a short Loom or screenshot grid in the PR.
- Update `CLAUDE.md` "Phase Status" section: tick Phase 5 to shipped.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

### 1. UPDATE `frontend/package.json`

- **IMPLEMENT**: Add deps: `next-themes ^0.3`, `geist ^1.3`, `lucide-react ^0.460`, `framer-motion ^11`. Add devDeps: `@playwright/test ^1.48`, `@axe-core/playwright ^4.10`. Confirm `clsx`, `tailwind-merge` already present.
- **PATTERN**: Existing package.json `dependencies` block (`frontend/package.json:12-27`).
- **GOTCHA**: Do not bump existing `next`, `react`, `@react-three/*` versions in this phase — they are battle-tested for the viewer.
- **VALIDATE**: `cd frontend && pnpm install && pnpm typecheck`.

### 2. CREATE `frontend/lib/utils.ts` (if not present)

- **IMPLEMENT**: Export `cn(...inputs: ClassValue[])` that pipes `clsx` through `twMerge`. Export `formatDate(d: string)` if components.md or existing components reference it (grep first).
- **PATTERN**: shadcn standard `cn()` pattern.
- **VALIDATE**: `cd frontend && pnpm typecheck`.

### 3. CREATE `frontend/lib/design-tokens.ts`

- **IMPLEMENT**: `as const` exports — `SPACING` (4/8/12/16/24/32/48/64), `MOTION_DURATIONS` ({ fast: 150, base: 200, slow: 250 }), `RADII`, `Z_INDEX` ({ shell: 30, inspector: 35, modal: 50, hero: 10 }), `BREAKPOINTS`. Type-export each.
- **PATTERN**: `as const` constants outside component bodies (components.md §3).
- **GOTCHA**: This file must be importable from both `tailwind.config.ts` (Node context) and components — keep it framework-free, no React imports.
- **VALIDATE**: `cd frontend && pnpm typecheck`.

### 4. UPDATE `frontend/app/globals.css`

- **IMPLEMENT**: Add `@layer base { :root { --background: 0 0% 100%; --foreground: 222 47% 11%; --card: 0 0% 100%; --card-foreground: 222 47% 11%; --primary: 222 47% 11%; --primary-foreground: 210 40% 98%; --brand-accent: 24 95% 53%; --muted: 210 40% 96%; --muted-foreground: 215 16% 47%; --border: 214 32% 91%; --ring: 222 47% 11%; --radius: 0.5rem; } .dark { /* mirrored dark values */ } }`. Pick brand-accent purposefully — orange (24 95% 53%) is a placeholder; coordinate with whatever accent the design audit chooses.
- **PATTERN**: shadcn theming convention.
- **GOTCHA**: HSL channel format with no `hsl()` wrapper — Tailwind composes the wrapper. Do not write `--primary: hsl(222 47% 11%)`.
- **VALIDATE**: `cd frontend && pnpm dev`, hit `http://localhost:3000`, toggle `class="dark"` on `<html>` in DevTools, confirm body recolors.

### 5. UPDATE `frontend/tailwind.config.ts`

- **IMPLEMENT**: `theme.extend.colors` with `background`, `foreground`, `card`, `primary`, `muted`, `border`, `ring`, `brand-accent` mapped to `hsl(var(--…) / <alpha-value>)`. `theme.extend.fontFamily` with `display: ['var(--font-display)']`, `body: ['var(--font-body)']`. `theme.extend.transitionDuration` with `fast: '150ms'`, `base: '200ms'`, `slow: '250ms'`. Restrict `theme.spacing` to the canonical scale (override default Tailwind spacing? Safer: leave default + add tokens, then enforce via the audit).
- **PATTERN**: shadcn `tailwind.config.ts`.
- **GOTCHA**: `<alpha-value>` is the literal placeholder — Tailwind replaces it at build time. Don't escape it.
- **VALIDATE**: `cd frontend && pnpm build` should succeed.

### 6. UPDATE `frontend/app/layout.tsx`

- **IMPLEMENT**: Import `Geist`, `Inter` from `next/font` (or `geist/font`); declare with `variable: '--font-display'` / `variable: '--font-body'`. Apply both class names to `<html className={`${geist.variable} ${inter.variable}`}>`. Add `suppressHydrationWarning` on `<html>`. Replace body `bg-white text-neutral-900` with `bg-background text-foreground font-body`.
- **PATTERN**: next/font docs.
- **GOTCHA**: `geist` package exposes `GeistSans` directly with a baked variable name; verify the import shape — it may already provide `.variable`.
- **VALIDATE**: `pnpm dev`, confirm font swap visible on marketing.

### 7. UPDATE `frontend/app/providers.tsx`

- **IMPLEMENT**: Wrap `QueryClientProvider` in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` from `next-themes`.
- **PATTERN**: next-themes App Router README.
- **GOTCHA**: `next-themes` must be a Client Component context — `providers.tsx` is already `"use client"`. Good.
- **VALIDATE**: `pnpm dev`, system theme picks correctly on first load.

### 8. CREATE `frontend/scripts/audit-design-tokens.ts`

- **IMPLEMENT**: Node script with `fast-glob` (already a Tailwind dep); regex against forbidden patterns: `\bp[xytrbl]?-(1|3|5|7|9|10|11|13|14|15|17|18|19|20)\b`, `\b(text|bg|border)-neutral-\d+\b`, `\b(text|bg)-(white|black)\b` outside an allowlist (`globals.css`, the audit itself). Print findings; exit non-zero if `--strict`.
- **GOTCHA**: Existing components heavily use `text-neutral-500/600/900`, `bg-neutral-900`, `border-neutral-200/300`, `bg-white`. The audit will fire on every page. **Do not** strict-mode this script in CI yet — it is the migration tracker for tasks 11–18.
- **VALIDATE**: `pnpm audit:tokens` runs and prints a list (advisory).

### 9. CREATE `frontend/components/shell/AppShell.tsx` and siblings

- **IMPLEMENT**: `AppShell` mounts `LeftRail` (icon-only nav: dashboard, account; hard-coded for v1), `TopToolbar` (logo, breadcrumb slot via context, `<ThemeToggle/>`, `<QuotaBadge/>`, `<AccountMenu/>`), `RightInspector` (`children` from `useInspectorSlot()` context; collapsible via toggle button stored in `useUiStore` Zustand or local `useState` lifted to context).
- **PATTERN**: `frontend/components/result/ResultView.tsx` flex layout; components.md §6 + §3.
- **GOTCHA**: `app/app/layout.tsx` is a Server Component — it cannot pass setters to children. Use a React Context inside a `"use client"` `AppShellProvider` that wraps `{children}`. Pages then call a `useSetInspector(node)` hook to populate the right rail.
- **VALIDATE**: `pnpm typecheck && pnpm build`.

### 10. CREATE `frontend/app/app/layout.tsx`

- **IMPLEMENT**: Server Component that imports `AppShell` (client) and renders `<AppShell><AppShellProvider>{children}</AppShellProvider></AppShell>`.
- **PATTERN**: components.md §1 — server layout, client interactive children.
- **GOTCHA**: This file does NOT exist yet — creating it changes the chrome of every page under `/app`. Test each page after creation.
- **VALIDATE**: Visit `/app` in dev. Shell renders. No layout shift.

### 11–14. UPDATE all four `/app/...` pages to render inside the shell

For each of:
- `frontend/app/app/page.tsx`
- `frontend/app/app/projects/[projectId]/page.tsx`
- `frontend/app/app/projects/[projectId]/rooms/[roomId]/page.tsx`
- `frontend/app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx`

- **IMPLEMENT**: Strip outer `<main mx-auto max-w-5xl p-6>` (it is now the shell's job). Replace neutral classes with token classes (`text-foreground`, `text-muted-foreground`, `bg-card`). Where the page has a sidebar/inspector concept, call `useSetInspector(<NodeForRightRail/>)`. The result page (`layoutId/page.tsx`) renders `<ResultView>` edge-to-edge; pass the sidebar through the inspector context, not as `<aside w-80>`.
- **PATTERN**: `ResultView.tsx` flex layout for the result page; the existing project/room pages for the breadcrumb pattern.
- **GOTCHA**: `ResultView` is shared with `/share/[token]` (no shell). Solve by accepting an `inspector?: 'inline' | 'context'` prop with `inline` default for the share route.
- **VALIDATE**: Each page renders correctly in light + dark; no horizontal scroll; viewer fills viewport on the layout page.

### 15. UPDATE `frontend/components/result/ResultView.tsx`

- **IMPLEMENT**: Add `inspectorMode?: 'inline' | 'context'` prop. When `'context'`, call `useSetInspector(<ResultSidebar … />)` and render the canvas full-bleed; when `'inline'` (default), keep current behaviour. Tokenise classes.
- **PATTERN**: Don't widen the existing prop API beyond this; it is shared.
- **GOTCHA**: Existing `border-l border-neutral-200` becomes `border-border`.
- **VALIDATE**: Saved layout page (context mode) edge-to-edge; `share/[token]` page (inline mode) keeps its sidebar exactly as before. Run `pnpm test` for any existing component tests on `ResultView`.

### 16. UPDATE `frontend/components/sidebar/ResultSidebar.tsx`

- **IMPLEMENT**: Replace `border-neutral-200`, `bg-neutral-50`, `text-neutral-700`, `bg-neutral-900 text-white`, etc. with token classes. Buttons go through one shared `Button` primitive (install via shadcn) with `variant="default"|"outline"|"ghost"`.
- **GOTCHA**: Currently the sidebar has multiple `bg-neutral-900` buttons — that violates the "one primary per screen" rule. Demote secondary buttons to `outline`.
- **VALIDATE**: Visual QA against both themes.

### 17. CREATE `frontend/components/ui/empty-state.tsx`

- **IMPLEMENT**: `<EmptyState illustration={ReactNode} title={string} description={string} cta={ReactNode}>`. Uses tokens, centres content.
- **PATTERN**: components.md §11.
- **VALIDATE**: Storybook-free — just unit-render in a sandbox page.

### 18. CREATE `frontend/components/ui/illustrations/{EmptyProjects,EmptyRooms,EmptyLayouts}.tsx`

- **IMPLEMENT**: Each is an inline-SVG component, ~120×120, `currentColor`, `aria-hidden`. Hand-author or borrow Heroicons-style.
- **GOTCHA**: Do NOT import raster files. They must theme via `currentColor`.
- **VALIDATE**: Render at `text-muted-foreground` and `dark:text-muted-foreground`; both themes legible.

### 19. UPDATE `frontend/components/projects/EmptyProjects.tsx`

- **IMPLEMENT**: Replace body with `<EmptyState illustration={<EmptyProjectsIllustration/>} title="No projects yet" description="…" cta={<Button onClick={onCreate}>Create your first project</Button>}/>`.
- **PATTERN**: Existing `EmptyProjects.tsx` (lines 1–19).
- **VALIDATE**: Dashboard empty state visually verified in both themes.

### 20. CREATE `frontend/components/marketing/HeroScene.tsx`

- **IMPLEMENT**: `"use client"`. `<Canvas dpr={[1,2]} shadows>` with `PerspectiveCamera`, `OrbitControls makeDefault autoRotate autoRotateSpeed={0.4} enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.1}`, `<Bounds fit clip observe margin={1.05}>` wrapping `<Room>` + `<Furniture>` from a hard-coded fixture Layout.
- **PATTERN**: `components/viewer/Scene.tsx`.
- **GOTCHA**: `enableDamping={true}` smooths autoRotate. Do not call `useFrame` and read React state — use refs (components.md §6).
- **VALIDATE**: Hero spins ~6 s/rotation; no wobble; reduced motion fallback shows static frame.

### 21. CREATE `frontend/components/marketing/MarketingHero.tsx`

- **IMPLEMENT**: Wraps `HeroScene` via `next/dynamic({ ssr: false })`. Reads `useReducedMotion()`; if `true`, renders a static `<HeroFallback>` (gradient + headline overlay) instead.
- **PATTERN**: components.md §10.
- **VALIDATE**: System `prefers-reduced-motion: reduce` triggers fallback.

### 22. UPDATE `frontend/app/(marketing)/page.tsx`

- **IMPLEMENT**: Compose `<MarketingHero/>`, `<HowItWorks/>`, `<WhatsIncluded/>`, `<PricingTeaser/>`. CTA → `/app/new`. All copy follows PRD §F15.
- **PATTERN**: Existing marketing page (lines 1–60) for the textual layout reference; rewrite the chrome.
- **VALIDATE**: Lighthouse run on `/`; document scores; ≥ 80.

### 23. CREATE `frontend/app/(marketing)/layout.tsx`

- **IMPLEMENT**: Server Component minimal chrome (top brand strip, footer with legal placeholder + theme toggle).
- **GOTCHA**: Must NOT import `AppShell` — marketing is shell-free.
- **VALIDATE**: `/` and `/app` render different chrome.

### 24. UPDATE `backend/app/models/catalog.py`

- **IMPLEMENT**: Add `is_premium: bool = False` to `CatalogItem`.
- **PATTERN**: existing field declarations (`backend/app/models/catalog.py:20-29`).
- **VALIDATE**: `cd backend && uv run pytest tests/test_routes_layouts.py tests/test_llm_mock.py -q`. Existing fixtures must still load.

### 25. UPDATE `backend/app/data/catalog.json`

- **IMPLEMENT**: Add `"is_premium": true` to exactly 3 items (e.g. `bookshelf`, `coffee_table`, one accent). Leave the rest with no key (defaults to `false`).
- **VALIDATE**: `uv run pytest` full suite. New `tests/test_catalog_premium.py` asserts the 3 are flagged and the rest default false.

### 26. CREATE `backend/app/data/templates.json`

- **IMPLEMENT**: 3 template entries — each a complete `Layout` JSON authored from a real generation run, plus `{ id, name, room_type: "living_room", style, dims }`. Capture from `docs/demo-seeds.md` reproduction.
- **GOTCHA**: Layout JSON in templates must conform to the current `Layout` Pydantic schema EXACTLY — including `catalogVersion`. Run a generation locally and copy the response.
- **VALIDATE**: `python -c "import json; from app.models.layout import Layout; [Layout.model_validate(t['layout']) for t in json.load(open('app/data/templates.json'))]"` passes.

### 27. CREATE `backend/app/routers/templates.py`

- **IMPLEMENT**: `@router.get("", response_model=TemplatesResponse)` returning `_load_templates()` (LRU-cached). Define `Template` and `TemplatesResponse` Pydantic models inline or in `app/models/template.py` (preferred — separate file).
- **PATTERN**: `routers/catalog.py` (lines 1–22).
- **VALIDATE**: `tests/test_routes_templates.py` passes.

### 28. UPDATE `backend/app/main.py`

- **IMPLEMENT**: `app.include_router(templates.router)`.
- **VALIDATE**: `uv run uvicorn app.main:app --reload`, `curl http://localhost:8000/templates` returns 200.

### 29. CREATE `backend/tests/test_routes_templates.py`

- **IMPLEMENT**: Async test client GETs `/templates`, asserts 200, asserts `len(items) >= 3`, asserts every layout validates against `Layout`, asserts no auth header was needed.
- **PATTERN**: `tests/test_routes_layouts.py`.
- **VALIDATE**: `uv run pytest tests/test_routes_templates.py -q` green.

### 30. UPDATE `frontend/lib/types.ts`

- **IMPLEMENT**: Add `is_premium?: boolean` to `CatalogItem`. Add `Template`, `TemplatesResponse`.
- **VALIDATE**: `pnpm typecheck`.

### 31. UPDATE `frontend/lib/api.ts`

- **IMPLEMENT**: Add `templatesQuery()` and `useListTemplates()`. Mirror `catalogQuery` exactly.
- **PATTERN**: components.md §5 sample.
- **VALIDATE**: `pnpm typecheck`.

### 32. CREATE `frontend/components/projects/{TemplateGallery,TemplateCard}.tsx`

- **IMPLEMENT**: Gallery is a token-styled grid; card has thumbnail (placeholder if `thumbnail_url` empty — use a neutral gradient + style label), title, room-type badge, "Use this template" button → `/app/new?template={id}`.
- **PATTERN**: `components/projects/{ProjectCard,ProjectGrid}.tsx`.
- **VALIDATE**: Empty dashboard shows the gallery.

### 33. UPDATE `frontend/app/app/new/page.tsx` and `frontend/components/wizard/WizardShell.tsx`

- **IMPLEMENT**: Add `TemplateReader` analogous to `SeedReader` (lines 9–19) that reads `?template=…`, fetches via `useListTemplates`, finds the entry, calls a new `useWizardStore.applyTemplate(template)` action that seeds dims + style + preferences and (optionally) advances the wizard to the final review step.
- **PATTERN**: `app/app/new/page.tsx:9-19`.
- **GOTCHA**: Templates carry a full `Layout`, but the wizard generates a fresh one. Decision: template seeds **inputs only** (style, dims, preferences). Layout regenerates. The user gets reproducibility via the `seed` field if the template includes one.
- **VALIDATE**: `/app/new?template=<id>` pre-fills the wizard.

### 34. CREATE `frontend/lib/stores/quota.ts`

- **IMPLEMENT**: Zustand store with `count: number`, `cap: 10`, `increment()`, `reset()`. Persist to `sessionStorage` via the `persist` middleware. Reset daily by storing a `dateKey` and clearing if it changes.
- **PATTERN**: `frontend/lib/stores/wizard.ts`.
- **GOTCHA**: This is presentational. Document in a top-of-file comment (the only allowed comment) that real enforcement is the rate-limit middleware in Phase 6.
- **VALIDATE**: `pnpm typecheck`.

### 35. UPDATE `frontend/lib/api.ts` `useGenerateLayout`

- **IMPLEMENT**: Add an `onSuccess` callback that calls `useQuotaStore.getState().increment()` only if the request was anonymous (no auth token attached at the time of the call — read from `useAuthStore.getState().session`).
- **VALIDATE**: After one anon generation, badge increments to `1/10`.

### 36. CREATE `frontend/components/shell/QuotaBadge.tsx` and `frontend/components/ui/UpgradeModal.tsx`

- **IMPLEMENT**: Badge reads quota store; on click opens UpgradeModal. Modal copy matches PRD §F17.
- **PATTERN**: Radix Dialog from shadcn.
- **VALIDATE**: Click badge → modal opens; close works.

### 37. CREATE `frontend/components/ui/LockBadge.tsx` and UPDATE `frontend/components/swap/SwapPopover.tsx`

- **IMPLEMENT**: Lock overlay + Radix Tooltip; swap-popover items with `is_premium=true` get the badge and `aria-disabled`. Click → `setUpgradeOpen(true)` (lifted to a context or a small Zustand store `useUpgradeStore`).
- **VALIDATE**: Hover tooltip "Premium item — Pro coming soon"; click does not swap.

### 38. RUN audit + fix

- **IMPLEMENT**: `pnpm audit:tokens --strict`. Fix every violation. Iterate.
- **VALIDATE**: Audit passes with zero findings.

### 39. CREATE `frontend/tests/a11y.spec.ts`

- **IMPLEMENT**: Playwright + `@axe-core/playwright`. Test `/`, `/app` (anon), and a fixture saved-layout page (mock with MSW or seeded local Supabase). Assert no `serious`/`critical` violations.
- **PATTERN**: `@axe-core/playwright` README example.
- **GOTCHA**: This is the first Playwright suite in the repo — add `pnpm exec playwright install chromium` to CI; gate with `pnpm test:e2e`.
- **VALIDATE**: `pnpm test:e2e` passes locally.

### 40. UPDATE `CLAUDE.md` Phase Status

- **IMPLEMENT**: Tick Phase 5 as shipped. Note any deferred items (theme persistence to `profiles.theme`, waitlist RPC).
- **VALIDATE**: Final review pass.

---

## TESTING STRATEGY

### Unit Tests

Backend:
- `tests/test_routes_templates.py` — GET /templates returns ≥ 3 templates, all layouts valid, no auth required, ETag/cache header set.
- `tests/test_catalog_premium.py` — `is_premium` defaults false; the 3 flagged items return true; total premium count == 3.

Frontend (Vitest + RTL — set up in this phase if not present):
- `EmptyState` renders illustration + title + description + cta.
- `QuotaBadge` increments on store change.
- `LockBadge` renders for premium items only.
- `MarketingHero` renders fallback when `useReducedMotion` returns true.

### Integration Tests

- Playwright `tests/a11y.spec.ts` — axe smoke on three key surfaces.
- Playwright happy path (optional in this phase, recommended for Phase 6/7): marketing → /app/new → wizard → result.
- Manual: `pnpm dev`, hit `/`, `/app`, `/app/new`, `/app/projects/{id}`, `/app/projects/{id}/rooms/{id}`, `/app/projects/{id}/rooms/{id}/layouts/{id}`, `/share/{token}` in both themes.

### Edge Cases

- **Reduced motion**: hero falls back; CompareOverlay slider does not animate; transitions disabled across UI.
- **WebGL unavailable**: `(marketing)/page.tsx` and `result` page show fallback (components.md §10) — at minimum a friendly message + sidebar list.
- **Hydration mismatch on theme**: `<html suppressHydrationWarning>` set; no theme flash.
- **Anon quota cap**: 10th generation triggers UpgradeModal; 11th is still allowed (no real enforcement) but badge stays at 10/10.
- **Authed user + quota badge**: shows "Free plan" string, never a count.
- **Template missing thumbnail**: card shows gradient placeholder.
- **Catalog item without `is_premium`**: defaults to false everywhere — both Pydantic and TS.
- **Off-token classes added in a future PR**: audit script catches them in CI.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# backend
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy app

# frontend
cd ../frontend
pnpm lint
pnpm typecheck
pnpm audit:tokens --strict
```

### Level 2: Unit Tests

```bash
# backend
cd backend
uv run pytest

# frontend
cd ../frontend
pnpm test
```

### Level 3: Integration Tests

```bash
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

### Level 4: Manual Validation

1. `cd backend && uv run uvicorn app.main:app --reload`
2. `cd frontend && pnpm dev`
3. Visit `http://localhost:3000/` — hero spins, CTA links to `/app/new`.
4. Toggle dark mode in top toolbar — entire app recolors without flash.
5. Visit `/app` signed out — quota badge `0/10`, theme toggle, "Try without signing in" route works.
6. Sign in (magic link) — quota badge becomes "Free plan".
7. Empty dashboard — template gallery shows 3 cards; click one → wizard pre-filled.
8. Create a project → empty rooms state shows illustration; create room → empty layouts state.
9. Generate a layout → save → saved layout page is edge-to-edge with floating right inspector.
10. Click an item → "Replace" → verify lock badge on premium options + UpgradeModal opens on click.
11. Open `/share/{token}` in an incognito window — sidebar is inline (not in shell); no theme toggle in chrome (or include if marketing chrome is reused).
12. `prefers-reduced-motion: reduce` in DevTools — hero static, no transitions.
13. Lighthouse on `/` and saved layout — both ≥ 80.

### Level 5: Additional Validation (Optional)

- `microsoft_docs_search` for any Azure-deployed Front Door cache header tweaks if the marketing page is heavy.
- Bundle analyzer (`@next/bundle-analyzer`) on the marketing route — confirm no `app/app/**` chunks leak.

---

## ACCEPTANCE CRITERIA

- [ ] Spacing scale, type pairing, motion durations, button hierarchy locked and enforced by `audit-design-tokens.ts`.
- [ ] Light + dark mode toggleable via top toolbar and persisted via `next-themes`; no FOUC.
- [ ] Geist Sans (display) + Inter (body) load via `next/font` and apply across both themes.
- [ ] Floating-panel app shell renders on every `/app/**` route; viewer is edge-to-edge on the saved layout page.
- [ ] `(marketing)/` page features an autoplay 3D hero loop using existing `Furniture`/`Room` primitives, with a reduced-motion fallback.
- [ ] Below-fold marketing sections (How it works, What's included, Pricing teaser) shipped per PRD §F15.
- [ ] `GET /templates` returns ≥ 3 curated templates; empty dashboard shows them; `/app/new?template={id}` pre-fills the wizard.
- [ ] `EmptyState` primitive used on dashboard (no projects), project page (no rooms), room page (no layouts), each with a custom illustration.
- [ ] `is_premium` flag added to catalog Pydantic model + TS type; 3 items flagged; lock badge renders in `SwapPopover`.
- [ ] Quota badge in top toolbar reflects anon generation count via `lib/stores/quota.ts`; authed users see "Free plan".
- [ ] `UpgradeModal` opens on locked-item click and on quota cap; copy matches PRD §F17 ("Pro coming soon — join the waitlist").
- [ ] Lighthouse ≥ 80 on `/` and saved layout in both themes.
- [ ] axe-core smoke (Playwright) passes for `/`, `/app`, saved layout — no serious/critical violations.
- [ ] Existing tests (`backend/tests`, frontend type checks) all pass with zero regressions.
- [ ] No new Pydantic/TS contract breakage; the LLM prompt and `Layout` schema unchanged in this phase.
- [ ] `CLAUDE.md` Phase Status updated.

---

## COMPLETION CHECKLIST

- [ ] All 40 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All Level 1–4 validation commands executed successfully
- [ ] Backend pytest suite green (including new tests)
- [ ] Frontend typecheck, lint, vitest, audit (strict), Playwright a11y all green
- [ ] Manual cross-theme QA done across the 13 manual steps
- [ ] Lighthouse screenshots captured in PR description
- [ ] No off-token classes anywhere (audit confirms)
- [ ] No new "competing primaries" on any screen
- [ ] CLAUDE.md Phase Status ticked

---

## NOTES

- **Scope discipline**: this phase is **presentation only**. Resist any temptation to add bedroom/dining/home-office room types, swap to Geist Mono, introduce a real catalog browser, wire Stripe, or pre-empt Phase 7 style additions. All of those belong to Phase 6 or 7.
- **Brand accent value**: PRD doesn't pin a hex. Pick one orange/teal/etc. and document it inline in `globals.css`; do not scatter across components.
- **Theme persistence**: localStorage via `next-themes` is sufficient for v1. Per-user persistence (`profiles.theme` column) is a deferred enhancement; do not add a Supabase migration for it in this phase.
- **Waitlist RPC**: the upgrade modal uses `mailto:` for v1. A `notify_pro_waitlist(email)` RPC is deferred — capturing waitlist emails properly is post-v1.
- **Templates as fixtures**: 3 entries is the floor; PRD asks 5–10. If hand-authoring blocks the phase, ship 3 and tag a follow-up — the schema is what matters.
- **Audit script as a living tool**: keep it in CI from this phase forward. Phase 6 will add 30+ catalog items, each potentially crossing into off-token classes (premium overlays, etc.) — the audit prevents drift.
- **R3F hero performance**: the hero must render in < 200 ms TTI on a mid-tier laptop. Hard-cap geometry at < 5 k tris; use the existing `primitive:*` path; do not lazy-load any GLB above the fold.
- **Confidence**: 7/10 for one-pass implementation. Risks: (a) shadcn install changes `globals.css` / `tailwind.config.ts` in surprising ways — install primitives BEFORE writing the token blocks; (b) `next-themes` SSR mismatch on the marketing route can flash light theme — `disableTransitionOnChange` + `suppressHydrationWarning` mitigate; (c) the audit script can be over-eager and block legitimate inline `style` for resolved palette in `Furniture`/`Room` — allowlist those two files; (d) Playwright is new infra in this repo — add it gracefully, gate behind `pnpm test:e2e`, do not block the existing `pnpm test`.
