"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/lib/stores/useLanguage";
import { marketingTranslations } from "@/lib/marketing-translations";
import { WaitlistModal } from "./WaitlistModal";

/* ============ MARQUEE ============ */
export function Marquee() {
  const { language } = useLanguage();
  const itemsEn = [
    "scandinavian", "minimal", "industrial", "japandi", "mid-century",
    "living room", "bedroom", "dining room", "home office",
    "beautiful furniture", "easy swapping", "side-by-side compare", "share with friends",
  ];
  const itemsEs = [
    "escandinavo", "minimalista", "industrial", "japandi", "mid-century",
    "salón", "dormitorio", "comedor", "despacho",
    "muebles hermosos", "cambio fácil", "comparativa A/B", "comparte con amigos",
  ];
  const items = language === "es" ? itemsEs : itemsEn;
  const doubled = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <span key={i} className="marquee-item">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ============ STYLES SHOWCASE ============ */
export function StylesShowcase() {
  const tiles = [
    { name: "Scandinavian", tag: "living · bedroom", accent: "#7B8C6F", wall: "#F4EFE6", floor: "#D9CFBE" },
    { name: "Minimal", tag: "living · office", accent: "#1F2937", wall: "#FFFFFF", floor: "#E8E2D6" },
    { name: "Industrial", tag: "living · office", accent: "#C2410C", wall: "#3A3A45", floor: "#8B7355" },
    { name: "Japandi", tag: "bedroom · dining", accent: "#7B8C6F", wall: "#EFE6D9", floor: "#6B5942" },
    { name: "Mid-century", tag: "living · dining", accent: "#B85A28", wall: "#D9C9A8", floor: "#3F4A3C" },
  ];
  return (
    <div className="styles-showcase">
      {tiles.map((t) => (
        <div key={t.name} className="style-tile">
          <div className="style-tile-img" style={{
            background: `linear-gradient(180deg, ${t.wall} 0%, ${t.wall} 60%, ${t.floor} 60%, ${t.floor} 100%)`,
          }}>
            <svg viewBox="0 0 100 130" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <rect x="20" y="60" width="60" height="22" rx="3" fill={t.accent} opacity="0.85" />
              <rect x="22" y="55" width="56" height="8" rx="2" fill={t.accent} opacity="0.55" />
              <rect x="35" y="92" width="30" height="4" rx="1" fill={t.accent} opacity="0.4" />
              <circle cx="85" cy="85" r="6" fill={t.accent} opacity="0.5" />
              <rect x="10" y="40" width="6" height="50" fill={t.accent} opacity="0.35" />
            </svg>
          </div>
          <div className="style-tile-meta-bg" />
          <div className="style-tile-swatches">
            <span className="style-tile-swatch" style={{ background: t.wall }} />
            <span className="style-tile-swatch" style={{ background: t.floor }} />
            <span className="style-tile-swatch" style={{ background: t.accent }} />
          </div>
          <div className="style-tile-meta">
            <div className="style-tile-name">{t.name}</div>
            <div className="style-tile-meta-row">
              <span>{t.tag}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ ROOMS GRID ============ */
type RoomKind = "living" | "bedroom" | "dining" | "office";

function RoomTopdown({ kind, accent }: { kind: RoomKind; accent: string }) {
  const layouts: Record<RoomKind, React.ReactNode> = {
    living: (
      <g>
        <rect x="10" y="6" width="50" height="14" rx="2" fill={accent} />
        <rect x="20" y="22" width="30" height="14" rx="1" fill={accent} opacity="0.5" />
        <rect x="62" y="32" width="14" height="20" rx="2" fill={accent} opacity="0.7" />
        <circle cx="14" cy="50" r="4" fill={accent} opacity="0.5" />
      </g>
    ),
    bedroom: (
      <g>
        <rect x="20" y="8" width="40" height="32" rx="2" fill={accent} opacity="0.85" />
        <rect x="6" y="14" width="10" height="14" rx="1" fill={accent} opacity="0.5" />
        <rect x="64" y="14" width="10" height="14" rx="1" fill={accent} opacity="0.5" />
        <rect x="22" y="46" width="36" height="6" rx="1" fill={accent} opacity="0.4" />
      </g>
    ),
    dining: (
      <g>
        <rect x="26" y="20" width="28" height="20" rx="2" fill={accent} opacity="0.85" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={`a${i}`} x={28 + i * 7} y="12" width="5" height="6" rx="1" fill={accent} opacity="0.6" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`b${i}`} x={28 + i * 7} y="42" width="5" height="6" rx="1" fill={accent} opacity="0.6" />
        ))}
        <rect x="6" y="14" width="10" height="32" rx="1" fill={accent} opacity="0.4" />
      </g>
    ),
    office: (
      <g>
        <rect x="14" y="10" width="36" height="12" rx="1" fill={accent} />
        <circle cx="32" cy="30" r="5" fill={accent} opacity="0.6" />
        <rect x="58" y="8" width="14" height="40" rx="2" fill={accent} opacity="0.5" />
        <rect x="14" y="40" width="20" height="10" rx="1" fill={accent} opacity="0.4" />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 80 60" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect x="0" y="0" width="80" height="60" fill="var(--bg-3)" />
      <rect x="2" y="2" width="76" height="56" fill="none" stroke="var(--line-2)" strokeWidth="0.5" strokeDasharray="2 2" />
      {layouts[kind]}
    </svg>
  );
}

export function RoomsGrid({ t }: { t?: typeof marketingTranslations.en.wizard_demo.roomTypes | typeof marketingTranslations.es.wizard_demo.roomTypes }) {
  if (!t) return null;
  const rooms: Array<{ kind: RoomKind; id: string; dims: string; tags: string[] }> = [
    { kind: "living", id: "living_room", dims: "3–10 × 3–10 m", tags: ["seating", "media", "reading"] },
    { kind: "bedroom", id: "bedroom", dims: "2.5–6 × 2.5–6 m", tags: ["sleep", "dressing", "reading"] },
    { kind: "dining", id: "dining_room", dims: "2.5–6 × 3–8 m", tags: ["dining", "serving"] },
    { kind: "office", id: "home_office", dims: "2–5 × 2–5 m", tags: ["work", "storage", "accent"] },
  ];
  const accents: Record<RoomKind, string> = {
    living: "#7C5BFF", bedroom: "#E8855A", dining: "#7B8C6F", office: "#C9A86A",
  };
  return (
    <div className="rooms-grid">
      {rooms.map((r) => {
        const info = t[r.id as keyof typeof t] || { name: r.kind };
        return (
          <div key={r.kind} className="room-card">
            <div className="room-card-canvas">
              <RoomTopdown kind={r.kind} accent={accents[r.kind]} />
            </div>
            <div className="room-card-body">
              <div className="room-card-name">{info.name}</div>
              <div className="room-card-meta">{r.dims}</div>
              <div className="room-card-tags">
                {r.tags.map((tag) => <span key={tag} className="room-card-tag">{tag}</span>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ TWO-PASS ============ */
export function TwoPass({ t }: { t?: typeof marketingTranslations.en.sections.twopass | typeof marketingTranslations.es.sections.twopass }) {
  if (!t) return null;
  return (
    <div className="twopass">
      <div>
        <div className="section-tag">{t.tag}</div>
        <h2 className="section-title">{t.title}</h2>
        <p className="section-lede">
          {t.lede}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
          {[
            [t.k1, t.v1],
            [t.k2, t.v2],
            [t.k3, t.v3],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 12, padding: "8px 0" }}>
              <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--accent)", width: 24, paddingTop: 2 }}>→</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{k}</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="twopass-diagram">
        <div className="twopass-step pass1">
          <div className="twopass-step-eyebrow">{t.step1}</div>
          <h4>{t.step1Title}</h4>
          <p>{t.step1Text}</p>
        </div>
        <div className="twopass-arrow" />
        <div className="twopass-step">
          <div className="twopass-step-eyebrow">{t.step2}</div>
          <h4>{t.step2Title}</h4>
          <div className="twopass-fanout">
            <div className="twopass-zone">{t.zone1}</div>
            <div className="twopass-zone">{t.zone2}</div>
            <div className="twopass-zone">{t.zone3}</div>
          </div>
        </div>
        <div className="twopass-arrow" />
        <div className="twopass-step">
          <div className="twopass-step-eyebrow">{t.step3}</div>
          <h4>{t.step3Title}</h4>
          <p>{t.step3Text}</p>
        </div>
      </div>
    </div>
  );
}

/* ============ CATALOG / SWAP ============ */
export function CatalogSwap({ t }: { t?: typeof marketingTranslations.en.sections.catalog | typeof marketingTranslations.es.sections.catalog }) {
  if (!t) return null;
  const [active, setActive] = useState(0);
  const tags = ["seating", "upholstered", "large", "media", "storage", "lighting", "accent", "wood", "fabric", "metal", "glass", "plant"];
  return (
    <div className="catalog-section">
      <div className="swap-demo">
        <div className="swap-viewer">
          <div className="swap-viewer-floor" />
          <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <ellipse cx="150" cy="170" rx="80" ry="6" fill="rgba(0,0,0,0.18)" />
            {active === 0 && <g><rect x="100" y="120" width="100" height="36" rx="6" fill="var(--accent)" /><rect x="100" y="105" width="100" height="20" rx="4" fill="var(--accent)" opacity="0.7" /></g>}
            {active === 1 && <g><rect x="115" y="100" width="70" height="60" rx="4" fill="var(--warm)" /><rect x="115" y="92" width="70" height="14" rx="3" fill="var(--warm)" opacity="0.7" /></g>}
            {active === 2 && <g><rect x="120" y="115" width="60" height="44" rx="3" fill="var(--sage)" /><rect x="118" y="100" width="64" height="20" rx="3" fill="var(--sage)" opacity="0.7" /></g>}
          </svg>
          <div className="swap-popover">
            <div className="swap-popover-title">{t.replace}</div>
            <div className="swap-popover-options">
              {[0, 1, 2].map((i) => (
                <button key={i} className={`swap-popover-option ${active === i ? "active" : ""}`} onClick={() => setActive(i)}>
                  <svg viewBox="0 0 40 40" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                    {i === 0 && <rect x="6" y="20" width="28" height="14" rx="2" fill="var(--accent)" />}
                    {i === 1 && <rect x="10" y="14" width="20" height="20" rx="2" fill="var(--warm)" />}
                    {i === 2 && <rect x="8" y="18" width="24" height="16" rx="2" fill="var(--sage)" />}
                  </svg>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10, fontFamily: "Geist Mono, monospace" }}>
              {t.perfectMatch}
            </div>
          </div>
        </div>
        <div className="tag-cloud">
          {tags.map((t, i) => (
            <span key={t} className={`tag-pill ${i % 4 === 0 ? "accent" : ""}`}>{t}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="section-tag">{t.tag}</div>
        <h2 className="section-title">{t.title}</h2>
        <p className="section-lede">
          {t.lede}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32 }}>
          <Stat n={t.stat1N} k={t.stat1K} />
          <Stat n={t.stat2N} k={t.stat2K} />
          <Stat n={t.stat3N} k={t.stat3K} />
          <Stat n={t.stat4N} k={t.stat4K} />
        </div>
      </div>
    </div>
  );
}

function Stat({ n, k }: { n: string; k: string }) {
  return (
    <div>
      <div style={{ fontFamily: "Geist, sans-serif", fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>{n}</div>
      <div style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{k}</div>
    </div>
  );
}

/* ============ HIERARCHY ============ */
export function Hierarchy({ t }: { t?: typeof marketingTranslations.en.sections.hierarchy | typeof marketingTranslations.es.sections.hierarchy }) {
  if (!t) return null;
  return (
    <div className="hierarchy">
      <div className="hierarchy-tree">
        <div className="hierarchy-node">
          <span className="hierarchy-node-type">{t.project}</span>
          <span className="hierarchy-node-name">{t.projectName}</span>
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>· 4 {t.room.toLowerCase()}s</span>
        </div>
        <div className="hierarchy-node indent-1">
          <span className="hierarchy-node-type">{t.room}</span>
          <span className="hierarchy-node-name">{t.room1Name}</span>
        </div>
        <div className="hierarchy-node indent-2">
          <span className="hierarchy-node-type">{t.layout}</span>
          <span className="hierarchy-node-name">{t.layout1Name}</span>
          <span className="hierarchy-node-primary">{t.primary}</span>
        </div>
        <div className="hierarchy-node indent-2">
          <span className="hierarchy-node-type">{t.layout}</span>
          <span className="hierarchy-node-name">{t.layout2Name}</span>
        </div>
        <div className="hierarchy-node indent-2">
          <span className="hierarchy-node-type">{t.layout}</span>
          <span className="hierarchy-node-name">{t.layout3Name}</span>
        </div>
        <div className="hierarchy-node indent-1">
          <span className="hierarchy-node-type">{t.room}</span>
          <span className="hierarchy-node-name">{t.room2Name}</span>
        </div>
        <div className="hierarchy-node indent-1">
          <span className="hierarchy-node-type">{t.room}</span>
          <span className="hierarchy-node-name">{t.room3Name}</span>
        </div>
        <div className="hierarchy-node indent-1">
          <span className="hierarchy-node-type">{t.room}</span>
          <span className="hierarchy-node-name">{t.room4Name}</span>
        </div>
      </div>
    </div>
  );
}

/* ============ COMPARE SLIDER ============ */
export function CompareSlider() {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  function clientX(e: React.MouseEvent | React.TouchEvent): number {
    if ("touches" in e) return e.touches[0].clientX;
    return (e as React.MouseEvent).clientX;
  }
  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = clientX(e) - r.left;
    setPos(Math.max(5, Math.min(95, (x / r.width) * 100)));
  }

  return (
    <div
      className="compare-demo"
      ref={ref}
      onMouseMove={(e) => { if (e.buttons === 1) onMove(e); }}
      onTouchMove={onMove}
    >
      <div className="compare-pane" style={{ background: "linear-gradient(180deg, #F1ECE3 0%, #F1ECE3 60%, #D9CFBE 60%, #D9CFBE 100%)" }}>
        <svg viewBox="0 0 600 380" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="120" y="180" width="200" height="50" rx="6" fill="#7C5BFF" />
          <rect x="120" y="160" width="200" height="28" rx="4" fill="#7C5BFF" opacity="0.7" />
          <rect x="180" y="245" width="120" height="14" rx="2" fill="#B89B7A" />
          <circle cx="420" cy="240" r="22" fill="#7B8C6F" />
          <rect x="40" y="120" width="20" height="180" fill="#8B7355" opacity="0.6" />
        </svg>
        <span className="compare-label a">A · Bright + storage</span>
      </div>
      <div className="compare-pane" style={{
        clipPath: `inset(0 0 0 ${pos}%)`,
        background: "linear-gradient(180deg, #EFE6D9 0%, #EFE6D9 60%, #6B5942 60%, #6B5942 100%)",
      }}>
        <svg viewBox="0 0 600 380" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="180" y="200" width="240" height="44" rx="4" fill="#3F4A3C" />
          <rect x="170" y="245" width="60" height="36" rx="3" fill="#B85A28" />
          <rect x="370" y="245" width="60" height="36" rx="3" fill="#B85A28" />
          <circle cx="100" cy="250" r="28" fill="#7B8C6F" />
          <rect x="500" y="120" width="60" height="160" fill="#3F4A3C" opacity="0.7" />
        </svg>
        <span className="compare-label b">B · Cozy edition</span>
      </div>
      <div className="compare-handle" style={{ left: `${pos}%` }} />
    </div>
  );
}

/* ============ RATIONALE ============ */
export function Rationale({ t }: { t?: typeof marketingTranslations.en.sections.rationale | typeof marketingTranslations.es.sections.rationale }) {
  if (!t) return null;
  const items = t.items || [
    { name: "3-seat sofa · sofa_3seat", quote: "\"I placed the 3-seat sofa against the south wall to face the window and ground the seating zone.\"", color: "#7C5BFF" },
    { name: "Lounge chair · armchair", quote: "\"I added the armchair at a 45° angle to soften the rectangle and complete a conversational triangle.\"", color: "#E8855A" },
    { name: "Floor lamp · floor_lamp", quote: "\"I tucked the lamp into the NE corner — task light for the chair without crowding the rug.\"", color: "#7B8C6F" },
  ];
  return (
    <div className="rationale-section">
      <div>
        <div className="section-tag">{t.tag}</div>
        <h2 className="section-title">{t.title}</h2>
        <p className="section-lede">
          {t.lede}
        </p>
        <div className="rationale-quote" style={{ marginTop: 32 }}>
          <span className="accent">&ldquo;{t.quote}</span>
          {t.quoteSuffix}&rdquo;
        </div>
        <div className="rationale-attribution">{t.attribution}</div>
      </div>
      <div className="rationale-cards">
        {items.map((r, i) => (
          <div key={i} className="rationale-card">
            <div className="rationale-card-thumb" style={{ background: r.color }}>
              <svg viewBox="0 0 56 56" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <rect x="10" y="32" width="36" height="14" rx="3" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <div>
              <div className="rationale-card-name">{r.name}</div>
              <div className="rationale-card-quote">{r.quote}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ SHARE ============ */
export function ShareDemo() {
  return (
    <div className="share-demo">
      <div className="eyebrow" style={{ marginBottom: 12 }}>Public, read-only · 30-day expiry</div>
      <div className="share-url">
        <span className="share-url-protocol">https://</span>
        <span className="share-url-path">interior-flow-3d.app/share/p7k_v3xQ-8Lm…</span>
        <button className="share-url-button">Copy</button>
      </div>
      <div className="share-meta">
        <span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", display: "inline-block" }} /> Active
        </span>
        <span>· Expires in 30 days</span>
        <span>· Private &amp; Secure</span>
      </div>
    </div>
  );
}

/* ============ THEME DEMO ============ */
export function ThemeDemo() {
  return (
    <div className="theme-demo">
      <div className="theme-card light">
        <span className="theme-card-label">LIGHT</span>
        <svg viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="0" y="0" width="320" height="200" fill="#F1ECE3" />
          <rect x="0" y="200" width="320" height="120" fill="#D9CFBE" />
          <rect x="80" y="160" width="160" height="40" rx="4" fill="#7C5BFF" />
          <rect x="80" y="148" width="160" height="20" rx="3" fill="#7C5BFF" opacity="0.7" />
          <rect x="120" y="210" width="80" height="10" rx="2" fill="#B89B7A" />
          <circle cx="270" cy="220" r="14" fill="#7B8C6F" />
        </svg>
      </div>
      <div className="theme-card dark">
        <span className="theme-card-label">DARK</span>
        <svg viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="0" y="0" width="320" height="200" fill="#181822" />
          <rect x="0" y="200" width="320" height="120" fill="#2A2530" />
          <rect x="80" y="160" width="160" height="40" rx="4" fill="#9B7DFF" />
          <rect x="80" y="148" width="160" height="20" rx="3" fill="#9B7DFF" opacity="0.7" />
          <rect x="120" y="210" width="80" height="10" rx="2" fill="#6B5942" />
          <circle cx="270" cy="220" r="14" fill="#9DAE91" />
        </svg>
      </div>
    </div>
  );
}

/* ============ TEMPLATES ============ */
export function TemplatesGrid({ t }: { t?: typeof marketingTranslations.en.sections.templates | typeof marketingTranslations.es.sections.templates }) {
  if (!t) return null;
  const items = t.items || [
    { name: "Brooklyn brownstone living", meta: "living · scandinavian · 4×5m" },
    { name: "Compact bedroom retreat", meta: "bedroom · japandi · 3.5×4m" },
    { name: "Sunlit dining nook", meta: "dining · mid-century · 3×4m" },
    { name: "Focused home office", meta: "office · minimal · 2.8×3m" },
    { name: "Loft living + media", meta: "living · industrial · 5×6m" },
    { name: "Guest room essentials", meta: "bedroom · scandinavian · 3×3.5m" },
  ];
  const colors = ["#7C5BFF", "#E8855A", "#7B8C6F", "#C9A86A", "#3F4A3C", "#5C3FE0"];
  return (
    <div className="templates-grid">
      {items.map((tpl, i) => (
        <div key={i} className="template-card">
          <div className="template-card-img" style={{ background: `linear-gradient(180deg, ${colors[i]}22 0%, ${colors[i]}11 100%)` }}>
            <svg viewBox="0 0 300 180" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <rect x="0" y="110" width="300" height="70" fill={colors[i]} opacity="0.18" />
              <rect x="80" y="80" width="140" height="40" rx="4" fill={colors[i]} />
              <rect x="80" y="68" width="140" height="20" rx="3" fill={colors[i]} opacity="0.65" />
              <rect x="125" y="125" width="50" height="8" rx="1" fill={colors[i]} opacity="0.6" />
              <circle cx="240" cy="125" r="9" fill={colors[i]} opacity="0.6" />
            </svg>
          </div>
          <div className="template-card-body">
            <div className="template-card-name">{tpl.name}</div>
            <div className="template-card-meta">{tpl.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ TRUST ============ */
export function TrustGrid({ t }: { t?: typeof marketingTranslations.en.sections.trust | typeof marketingTranslations.es.sections.trust }) {
  if (!t) return null;
  const items = t.items || [
    { icon: "🔒", title: "Complete Privacy", text: "Your designs are entirely yours. We keep your projects secure and private, ensuring no one else can see your dream home without your permission." },
    { icon: "✨", title: "Instant Access", text: "No accounts required to start exploring. Try out our tools quickly and save your progress only when you're ready to commit." },
    { icon: "⚡", title: "Lightning Fast", text: "Enjoy seamless, instant rendering. Our optimized platform ensures you can see your design changes in real-time." },
    { icon: "🔗", title: "Easy Sharing", text: "Share your beautiful designs with friends or family via a simple link. You have full control and can turn off access whenever you choose." },
  ];
  return (
    <div className="trust-grid">
      {items.map((it) => (
        <div key={it.title} className="trust-card">
          <div className="trust-card-icon">{it.icon}</div>
          <h4>{it.title}</h4>
          <p>{it.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ============ PRICING ============ */
export function Pricing({ t }: { t?: typeof marketingTranslations.en.sections.pricing | typeof marketingTranslations.es.sections.pricing }) {
  if (!t) return null;
  return (
    <div className="pricing-grid">
      <div className="price-card">
        <div className="price-card-name">{t.freeName}</div>
        <div className="price-card-amount">{t.freeAmount}<span className="price-card-amount-suffix">{t.freeSuffix}</span></div>
        <div className="price-card-tagline">{t.freeTagline}</div>
        <div className="price-card-divider" />
        <ul className="price-card-features">
          <li>{t.features.gen10}</li>
          <li>{t.features.allRooms}</li>
          <li>{t.features.saveUnlimited}</li>
          <li>{t.features.shareLinks}</li>
          <li>{t.features.lightDark}</li>
          <li className="locked">{t.features.premiumLocked}</li>
          <li className="locked">{t.features.hiRes}</li>
        </ul>
        <button className="btn btn-ghost">{t.freeCTA}</button>
      </div>
      <div className="price-card pro">
        <div className="price-card-badge">{t.comingSoon}</div>
        <div className="price-card-name">{t.proName}</div>
        <div className="price-card-amount">{t.proAmount}<span className="price-card-amount-suffix">{t.proSuffix}</span></div>
        <div className="price-card-tagline">{t.proTagline}</div>
        <div className="price-card-divider" />
        <ul className="price-card-features">
          <li>{t.features.unlimited}</li>
          <li>{t.features.allFree}</li>
          <li>{t.features.premiumUnlocked}</li>
          <li>{t.features.hiRes}</li>
          <li>{t.features.priority}</li>
          <li>{t.features.earlyAccess}</li>
          <li>{t.features.support}</li>
        </ul>
        <PricingWaitlistButton label={t.proCTA} />
      </div>
    </div>
  );
}

function PricingWaitlistButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>
      <WaitlistModal open={open} onOpenChange={setOpen} />
    </>
  );
}


/* ============ BLOG ============ */
export function BlogStub({ t }: { t?: typeof marketingTranslations.en.sections.blog | typeof marketingTranslations.es.sections.blog }) {
  if (!t) return null;
  const posts = t.posts || [
    { eyebrow: "Engineering", title: "Why we run two LLM passes instead of one", excerpt: "How splitting zone selection from item selection cut our hallucination rate to near-zero.", meta: "8 min · Apr 24" },
    { eyebrow: "Design", title: "A small enum beats free-form prose every time", excerpt: "Why our LLM picks from a closed slot vocabulary and the server resolves coordinates.", meta: "5 min · Apr 11" },
    { eyebrow: "Catalog", title: "Compressing 40 GLBs into 8 megabytes", excerpt: "Our gltfpack + KTX2 pipeline, end-to-end, with the numbers.", meta: "6 min · Mar 28" },
  ];
  return (
    <div className="blog-grid">
      {posts.map((p, i) => (
        <article key={i} className="blog-card">
          <div className="blog-card-eyebrow">{p.eyebrow}</div>
          <h3>{p.title}</h3>
          <p>{p.excerpt}</p>
          <div className="blog-card-meta">{p.meta}</div>
        </article>
      ))}
    </div>
  );
}

/* ============ FOOTER ============ */
import type { marketingTranslations } from "@/lib/marketing-translations";

export function MarketingFooter({ t }: { t?: typeof marketingTranslations.en.footer | typeof marketingTranslations.es.footer }) {
  if (!t) return null;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr" }}>
          <div className="footer-col">
            <div className="footer-brand-row">
              <span className="nav-brand-mark" />
              <strong style={{ fontFamily: "Geist, sans-serif", fontWeight: 600 }}>Interior Flow 3D</strong>
            </div>
            <p className="footer-tagline">
              {t.tagline}
            </p>
          </div>

          <div className="footer-col">
            <h4>{t.product}</h4>
            <ul>
              <li><a href="#wizard">{t.wizard}</a></li>
              <li><a href="#styles">{t.styles}</a></li>
              <li><a href="#rooms">{t.rooms}</a></li>
              <li><a href="#pricing">{t.pricing}</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t.features}</h4>
            <ul>
              <li><a href="#how">{t.smartLayouts}</a></li>
              <li><a href="#catalog">{t.easySwapping}</a></li>
              <li><a href="#compare">{t.abCompare}</a></li>
              <li><a href="#share">{t.share}</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t.connect}</h4>
            <div className="footer-social-grid" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--ink-3)", marginBottom: "8px", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.repository}</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <a href="https://github.com/lucianciusa/interior-flow-3d" target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub Repository">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  </a>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--ink-3)", marginBottom: "8px", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lucian Ciusa</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <a href="https://github.com/lucianciusa" target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    </a>
                    <a href="https://www.linkedin.com/in/lucian-ciusa-66a7b92b6/" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                    </a>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--ink-3)", marginBottom: "8px", fontFamily: "Geist Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mario García</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <a href="https://github.com/Mariioogrciia" target="_blank" rel="noopener noreferrer" className="social-link" title="GitHub">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    </a>
                    <a href="https://www.linkedin.com/in/mario-garcía-romero-453348304" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t.copy}</span>
        </div>
      </div>
    </footer>
  );
}
