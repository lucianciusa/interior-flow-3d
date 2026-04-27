# Frontend Component Standards

Read this before adding or changing a React component in `frontend/`. Companion doc to `CLAUDE.md`. The product spec lives in `.claude/PRD.md`.

Stack assumed: **Next.js 14 App Router**, **React 18**, **TypeScript**, **Tailwind**, **React Three Fiber** + **@react-three/drei**, **Zustand**, **TanStack Query**, **Radix UI** + **shadcn/ui** primitives, **Supabase JS** client.

---

## 1. Server vs Client Components

The App Router defaults every component to a **Server Component**. Add `"use client"` only when one of these is true:

- Uses a hook (`useState`, `useEffect`, `useRef`, custom hooks).
- Reads browser-only APIs (`window`, `localStorage`, `IntersectionObserver`).
- Renders an interactive primitive (forms, click handlers, drag state).
- Uses Zustand, TanStack Query, R3F (`<Canvas>`), Framer Motion.

**Rules:**

- Keep `"use client"` directives at **leaves**, not at the top of a page. Push interactivity down into the smallest component that needs it. The wizard page itself can stay a Server Component if the steps are individually `"use client"`.
- Pass server-fetched data **down through props**; do not refetch on the client unless mutation requires it.
- Never `import "server-only"` modules into a client tree, and never `import "client-only"` modules into a server tree. The build will fail loudly — fix at the import boundary.
- Catalog (`GET /catalog`) is fetched in a Server Component (or a Route Handler) with `fetch(url, { next: { revalidate: 3600 } })`. Don't refetch it client-side.

---

## 2. File & Folder Conventions

```
frontend/
├── app/
│   ├── (marketing)/page.tsx         # public landing
│   └── app/
│       ├── page.tsx                 # wizard entry (Server Component)
│       ├── result/[id]/page.tsx     # saved layout result
│       └── layout.tsx               # shared chrome
├── components/
│   ├── wizard/
│   │   ├── DimensionsStep.tsx
│   │   ├── StyleStep.tsx
│   │   ├── PreferencesStep.tsx
│   │   └── WizardShell.tsx
│   ├── viewer/
│   │   ├── Scene.tsx                # <Canvas> + lights + controls
│   │   ├── Room.tsx                 # parameterized room mesh
│   │   ├── Furniture.tsx            # .glb / primitive renderer
│   │   ├── CameraPresets.tsx
│   │   └── ItemPopover.tsx
│   ├── sidebar/
│   │   ├── ResultSidebar.tsx
│   │   ├── PaletteBlock.tsx
│   │   └── ExplanationBlock.tsx
│   └── ui/                          # shadcn primitives, do not edit by hand
├── lib/
│   ├── supabase.ts
│   ├── api.ts                       # typed FastAPI fetchers
│   ├── slot-mappings.ts             # display labels for slots
│   └── types.ts                     # mirrors backend Pydantic
└── public/models/*.glb
```

- **One component per file.** File name = component name in `PascalCase.tsx`. Default export is the component; named exports for sub-types and helpers.
- **`components/ui/`** is reserved for shadcn-generated primitives. Treat them as vendored — re-run shadcn rather than editing.
- **No barrel files** (`index.ts` re-exports). They break tree-shaking under Turbopack and obscure dependency graphs. Import from the source path.
- **Co-locate component-specific helpers** in the same file unless reused (e.g. `<DimensionsStep>` keeps its `validateDimensions` helper inline).

---

## 3. Component Anatomy

```tsx
"use client";

import { useState } from "react";
import type { Style } from "@/lib/types";

type StyleStepProps = {
  value: Style | null;
  onChange: (style: Style) => void;
};

const STYLES: ReadonlyArray<{ id: Style; label: string; tagline: string; hero: string }> = [
  { id: "scandinavian", label: "Scandinavian", tagline: "Light woods, soft textiles, cozy", hero: "/styles/scandinavian.jpg" },
  { id: "minimal",      label: "Minimal",      tagline: "Calm surfaces, intentional negative space", hero: "/styles/minimal.jpg" },
  { id: "industrial",   label: "Industrial",   tagline: "Raw metal, concrete, exposed structure", hero: "/styles/industrial.jpg" },
];

export default function StyleStep({ value, onChange }: StyleStepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={cn(
            "rounded-lg border p-4 text-left transition",
            value === s.id ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-foreground/30",
          )}
          aria-pressed={value === s.id}
        >
          {/* … */}
        </button>
      ))}
    </div>
  );
}
```

**Required:**

- `type` props alias declared above the component, suffixed `Props`.
- Constant data (style list, slot map) lives **outside** the function body and is `as const` or `ReadonlyArray<...>`.
- Native `<button>` with `type="button"` (not `<div onClick>`); accessible `aria-pressed` / `aria-selected` / `role` where the visual implies state.
- Tailwind classes composed via `cn()` (the shadcn helper from `lib/utils.ts`). No string concatenation with conditionals inline.
- Default export only for the component itself.

**Forbidden:**

- `React.FC` / `React.FunctionComponent` — prefer plain function with typed props.
- `any`, `unknown` without a type guard, or `@ts-ignore` / `@ts-expect-error` without a one-line reason.
- Inline `style={{ ... }}` for static styling — use Tailwind. Reserve inline style for runtime-derived values (palette hex from layout).
- Reaching into the DOM with `document.querySelector` — use `useRef` or shadcn's `forwardRef` patterns.

---

## 4. State Management

| State | Tool | Where it lives |
|---|---|---|
| Server state (catalog, layouts, generation result) | **TanStack Query** | `lib/api.ts` query/mutation factories |
| Wizard input (dims, style, prefs) | **Zustand** | `lib/stores/wizard.ts` |
| 3D viewer selection / camera preset | **Zustand** | `lib/stores/viewer.ts` |
| Form-local transient (open/closed, cursor) | `useState` | inside the component |

**Rules:**

- **Never lift to global what one parent can hold.** If two siblings need it, lift to the parent first. Reach for Zustand only when 3+ consumers across the tree need the same value.
- **Wizard store is reset on result mount** — keep a `reset()` action and call it in the result page's `useEffect`.
- **Mutations** go through TanStack `useMutation` with `onSuccess` invalidation, not raw `fetch` in event handlers.
- **No prop drilling past 3 levels.** Use Zustand or React Context (for theme-like values).
- **Selectors over `useStore()` whole-store reads** to avoid cascading re-renders. `useWizardStore((s) => s.style)`, not `const { style } = useWizardStore()`.

---

## 5. Server State (TanStack Query) Patterns

`lib/api.ts` exposes typed factories. One per resource.

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Layout, GenerateRequest, CatalogItem } from "./types";

const API = process.env.NEXT_PUBLIC_API_BASE_URL!;

async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export const catalogQuery = () => ({
  queryKey: ["catalog"] as const,
  queryFn: () => authedFetch<{ items: CatalogItem[] }>("/catalog"),
  staleTime: 60 * 60 * 1000, // catalog is static
});

export function useGenerateLayout() {
  return useMutation({
    mutationFn: (body: GenerateRequest) =>
      authedFetch<Layout>("/generate-layout", { method: "POST", body: JSON.stringify(body) }),
  });
}

export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { roomId: string; layout: Layout }) =>
      authedFetch<{ id: string }>("/layouts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layouts"] }),
  });
}
```

**Rules:**

- `queryKey` is always a `const`-tuple, broad-to-narrow: `["layouts", userId, layoutId]`.
- `staleTime` is set explicitly per query — never rely on the global default.
- All errors throw a typed `ApiError` so the UI can branch on status.
- One mutation hook per endpoint. Don't compose mutations inside components.
- Loading/error/empty are **distinct UI states** — never show a spinner forever on error.

---

## 6. React Three Fiber Patterns

The 3D viewer is the polish-critical surface. Get this right.

### Scene shape

```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Bounds, Html } from "@react-three/drei";
import { Suspense } from "react";

export default function Scene({ layout }: { layout: ResolvedLayout }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={45} />
      <OrbitControls makeDefault enablePan enableZoom maxDistance={15} minDistance={2} maxPolarAngle={Math.PI / 2.1} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 3]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} />
      <Suspense fallback={<Loader />}>
        <Bounds clip observe margin={1.1}>
          <Room dims={layout.room} palette={layout.palette} />
          {layout.items.map((item) => (
            <Furniture key={item.id ?? `${item.catalogId}-${item.slot}`} item={item} />
          ))}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
```

### Rules

- **One `<Canvas>` per page.** Never nest. The wizard does not render a canvas; only the result page does.
- **`dpr={[1, 2]}`** caps device pixel ratio at 2 — Retina without melting GPUs.
- **`<Suspense>` wraps anything that calls `useGLTF` / `useTexture`.** A missing fallback flashes a black canvas.
- **`OrbitControls maxPolarAngle={Math.PI / 2.1}`** prevents the camera from going under the floor.
- **Use `<group>` for transforms.** Position, rotate, scale on a `<group>` wrapping the loaded model — never mutate a loaded GLTF's transform directly (it is shared / cached).
- **Memoize geometry / materials.** Use `useMemo` for any `new THREE.BoxGeometry(...)` or `new THREE.MeshStandardMaterial(...)` to avoid recreating on every render.
- **`useGLTF.preload(url)`** at module top for known assets; clears jank on first paint.
- **Don't subscribe to React state in `useFrame`.** Read from refs or Zustand's `useStore.subscribe` to avoid re-rendering the React tree at 60 fps.
- **Click handlers** go on `<group onClick={(e) => { e.stopPropagation(); ... }}>` — always stop propagation, otherwise OrbitControls swallows the event or you get duplicate selects.
- **Cursor feedback:** `onPointerOver={() => (document.body.style.cursor = 'pointer')}` + `onPointerOut={() => (document.body.style.cursor = 'auto')}`.
- **Shadows:** enable `shadows` on `<Canvas>` and `castShadow` on directionalLight + furniture meshes. Skip shadows on the rug (it's flat).
- **No `Vector3` / `Euler` literals in JSX.** Use array form: `position={[x, y, z]}`, `rotation={[0, yaw, 0]}`. Three.js parses arrays correctly and they're cheaper.

### Performance budget

- Total `.glb` payload ≤ 10 MB. Apply Draco compression (`gltf-pipeline -i in.glb -o out.glb --draco.compressionLevel=10`).
- ≤ 50k triangles in the scene at any time. Keep individual furniture under 8k.
- Lazy-load model files only when the result page mounts; do not bundle them into the marketing page.
- Use `<Detailed>` from drei only if you add LOD; for MVP, single LOD is fine.

---

## 7. Slot Display

The backend returns a fully resolved layout. The frontend's job:

- Render at `position` + `rotation_y`. Don't recompute slot math client-side.
- Show the slot name to the user only via `slot-mappings.ts` which converts `north_wall_center` → "Against the back wall, centered".
- The R3F scene never branches on `slot`; it branches on `model` (`.glb` vs `primitive:*`).

If you find yourself computing positions in the frontend, stop — that logic belongs in `backend/app/services/slot_resolver.py`.

---

## 8. Forms & Inputs

- Use **react-hook-form** + **zod** for the wizard. Zod schema mirrors the Pydantic `GenerateLayoutRequest` field-for-field.
- Numeric inputs: `<Input type="number" inputMode="decimal" step="0.1" min={2} max={12}>`. Validate range client-side **and** server-side.
- Chip groups (preferences): native `<button role="checkbox" aria-checked>` in a fieldset, not a custom div. Enforce max-2 by disabling unselected chips when 2 are active.
- Style cards: `role="radiogroup"` on the container, `role="radio"` `aria-checked` on each card.
- Submit buttons: disabled state must be visually distinct, never just opacity.

---

## 9. Styling (Tailwind)

- **Order classes consistently.** Layout → spacing → sizing → typography → colors → states. The Tailwind Prettier plugin enforces this — keep it on.
- **No arbitrary values** unless unavoidable. Prefer the design tokens from `tailwind.config.ts`. `text-foreground` not `text-[#1a1a1a]`.
- **Dark mode:** support via `class` strategy from day 1, even if MVP ships light-only. Don't paint yourself into a corner.
- **Use `cn()` from `lib/utils.ts`** to compose classes. Never string-concatenate with `&&`.
- **Animations:** Tailwind transitions for state changes; Framer Motion only for choreographed sequences (wizard step transitions, sidebar entrance). Don't reach for Framer for a hover effect.

---

## 10. Accessibility

- Every interactive element has a name (label, `aria-label`, or accessible text).
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI controls.
- Focus rings visible — never `outline: none` without a replacement.
- The 3D canvas must have a non-3D fallback path: when WebGL is unavailable, show the layout as a sidebar list with rationale and palette. Don't break the result page entirely.
- Wizard is keyboard-navigable end to end. Tab order matches visual order. Enter advances steps.
- Respect `prefers-reduced-motion`: disable Framer animations and OrbitControls auto-rotate when set.

---

## 11. Loading, Error, Empty States

Three explicit states per data-bound view. None of them are spinners over old content.

- **Loading:** skeleton that matches the final layout's footprint. The result page shows a wireframe room + skeleton sidebar during generation, not a centered spinner.
- **Error:** friendly message + Retry button + a "report" link. Never expose raw stack traces; do log them to the console.
- **Empty:** "No saved layouts yet" with a CTA back to the wizard. Don't show an empty table.

---

## 12. Testing

- **Vitest + React Testing Library** for component unit tests. One spec per component, co-located as `Foo.test.tsx`.
- **Playwright** for the wizard → result happy path and the auth-gated Save flow.
- **R3F testing:** mount with `@react-three/test-renderer` to assert scene-graph shape (counts of meshes, transforms). Don't try to snapshot pixels.
- **No tests for shadcn primitives** — they are vendored.
- **Accessibility smoke:** `axe-core` against the wizard and result page in CI.

---

## 13. Common Pitfalls

- Re-rendering the 3D scene on every wizard keystroke. Symptom: typing dimensions stutters. Fix: keep the canvas page isolated; the wizard does not mount it.
- `useEffect` fetching catalog client-side. Symptom: catalog flashes empty on first paint. Fix: fetch in a Server Component and pass down.
- Mutating `useGLTF()` returned scene. Symptom: the second render of the same model is in the wrong place. Fix: clone (`primitive object={scene.clone()}`) or wrap in a `<group>` and transform the group.
- Forgetting `e.stopPropagation()` in 3D click handlers. Symptom: OrbitControls cancels the click. Fix: stop propagation on every interactive `<group>`.
- Bundling `.glb` into the marketing page. Symptom: 8 MB landing page. Fix: dynamic-import `<Scene>` with `next/dynamic({ ssr: false })`.
- Using `Image` from `next/image` for `.glb` thumbnails — it's for raster images. Render the model in a tiny canvas or pre-render to PNG.

---

## 14. When in Doubt

- Read `.claude/PRD.md` for product behaviour.
- Read `CLAUDE.md` for project-wide rules.
- For anything not covered here, follow the official docs:
  - Next.js App Router: https://nextjs.org/docs/app
  - React Three Fiber: https://docs.pmnd.rs/react-three-fiber
  - drei: https://github.com/pmndrs/drei
  - TanStack Query: https://tanstack.com/query/latest
  - shadcn/ui: https://ui.shadcn.com

External docs evolve. Verify before adopting any specific API surface from training-data memory.
