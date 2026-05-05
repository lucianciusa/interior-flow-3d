"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOM_TYPES = [
  { id: "living_room", name: "Living room", tag: "social & lounge" },
  { id: "bedroom", name: "Bedroom", tag: "rest & retreat" },
  { id: "dining_room", name: "Dining room", tag: "gather & eat" },
  { id: "home_office", name: "Home office", tag: "focus & work" },
];

const STYLES = [
  { id: "scandinavian", name: "Scandinavian", tag: "— light & breathable", swatches: ["#F4EFE6", "#D9CFBE", "#7B8C6F"] },
  { id: "minimal", name: "Minimal", tag: "— quiet & spacious", swatches: ["#FFFFFF", "#E8E2D6", "#1F2937"] },
  { id: "industrial", name: "Industrial", tag: "— raw & considered", swatches: ["#3A3A45", "#8B7355", "#C2410C"] },
  { id: "japandi", name: "Japandi", tag: "— grounded & calm", swatches: ["#EFE6D9", "#6B5942", "#7B8C6F"] },
  { id: "mid_century", name: "Mid-century", tag: "— warm & curated", swatches: ["#D9C9A8", "#B85A28", "#3F4A3C"] },
];

const PREFS = [
  { id: "more_seating", label: "More seating" },
  { id: "more_open_space", label: "More open space" },
  { id: "more_storage", label: "More storage" },
];

type Dims = { w: number; l: number; h: number };

const DIM_BOUNDS: Record<string, { w: [number, number], l: [number, number], h: [number, number] }> = {
  living_room: { w: [3.0, 8.0], l: [3.0, 10.0], h: [2.2, 3.5] },
  bedroom: { w: [2.5, 6.0], l: [2.5, 6.0], h: [2.2, 3.2] },
  dining_room: { w: [3.0, 6.0], l: [3.0, 8.0], h: [2.2, 3.5] },
  home_office: { w: [2.2, 5.0], l: [2.2, 5.0], h: [2.2, 3.2] },
};

import { marketingTranslations } from "@/lib/marketing-translations";

export default function Wizard({ t }: { t?: typeof marketingTranslations.en.wizard_demo | typeof marketingTranslations.es.wizard_demo }) {
  if (!t) return null;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roomType, setRoomType] = useState("living_room");
  const [dims, setDims] = useState<Dims>({ w: 4.0, l: 5.0, h: 2.6 });
  const [style, setStyle] = useState("scandinavian");
  const [prefs, setPrefs] = useState<string[]>(["more_storage"]);
  const [loading, setLoading] = useState(false);

  function handleRoomTypeChange(id: string) {
    setRoomType(id);
    const bounds = DIM_BOUNDS[id];
    setDims(prev => ({
      w: Math.max(bounds.w[0], Math.min(bounds.w[1], prev.w)),
      l: Math.max(bounds.l[0], Math.min(bounds.l[1], prev.l)),
      h: Math.max(bounds.h[0], Math.min(bounds.h[1], prev.h)),
    }));
  }

  function togglePref(id: string) {
    setPrefs((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 2) return [p[1], id];
      return [...p, id];
    });
  }

  const roomTypeInfo = t.roomTypes[roomType as keyof typeof t.roomTypes] || { name: "—" };
  const roomTypeName = roomTypeInfo.name;
  const styleInfo = t.styles[style as keyof typeof t.styles] || { name: "—" };
  const styleName = styleInfo.name;

  const handleGenerate = () => {
    setLoading(true);
    const params = new URLSearchParams({
      roomType,
      w: dims.w.toString(),
      l: dims.l.toString(),
      h: dims.h.toString(),
      style,
      prefs: prefs.join(","),
      auto: "true"
    });
    router.push(`/app/new?${params.toString()}`);
  };

  return (
    <div className="wizard-demo">
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>{t.tag}</div>
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>{t.title}</h3>
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
          {t.lede}
        </p>
        <div className="wizard-stepper">
          <button className={`wizard-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`} onClick={() => setStep(1)}>
            <span className="wizard-step-num">{step > 1 ? "✓" : "1"}</span>
            <span className="wizard-step-label">{t.step1}</span>
            <span className="wizard-step-value">{roomTypeName}</span>
          </button>
          <button className={`wizard-step ${step === 2 ? "active" : step > 2 ? "done" : ""}`} onClick={() => setStep(2)}>
            <span className="wizard-step-num">{step > 2 ? "✓" : "2"}</span>
            <span className="wizard-step-label">{t.step2}</span>
            <span className="wizard-step-value">{dims.w.toFixed(1)}×{dims.l.toFixed(1)}m</span>
          </button>
          <button className={`wizard-step ${step === 3 ? "active" : step > 3 ? "done" : ""}`} onClick={() => setStep(3)}>
            <span className="wizard-step-num">{step > 3 ? "✓" : "3"}</span>
            <span className="wizard-step-label">{t.step3}</span>
            <span className="wizard-step-value">{styleName}</span>
          </button>
          <button className={`wizard-step ${step === 4 ? "active" : ""}`} onClick={() => setStep(4)}>
            <span className="wizard-step-num">4</span>
            <span className="wizard-step-label">{t.step4}</span>
            <span className="wizard-step-value">{t.step4Value}</span>
          </button>
        </div>
        <div className="wizard-progress" style={{ maxWidth: "100%" }}>
          <div className={`wizard-progress-bar ${step >= 1 ? "done" : ""}`} />
          <div className={`wizard-progress-bar ${step >= 2 ? "done" : ""}`} />
          <div className={`wizard-progress-bar ${step >= 3 ? "done" : ""}`} />
          <div className={`wizard-progress-bar ${step >= 4 ? "done" : ""}`} />
        </div>
      </div>

      <div className="wizard-panel">
        {step === 1 && <Step0RoomType t={t} value={roomType} onChange={handleRoomTypeChange} />}
        {step === 2 && <Step1Dims t={t} roomType={roomType} dims={dims} setDims={setDims} />}
        {step === 3 && <Step2Style t={t} style={style} setStyle={setStyle} />}
        {step === 4 && <Step3Prefs t={t} prefs={prefs} togglePref={togglePref} />}
        
        <div className="wizard-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            style={{ opacity: step === 1 ? 0.4 : 1 }}
          >
            {t.back}
          </button>
          {step < 4 ? (
            <button className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)}>
              {t.continue}
            </button>
          ) : (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? t.generating : t.generate}
              <span style={{ fontFamily: "Geist Mono, monospace", fontSize: 11, opacity: 0.8 }}>{t.wait}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step0RoomType({ t, value, onChange }: { t: any; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <div className="wizard-panel-eyebrow">{t.step1} 1/4</div>
      <h3>{t.panel1Title}</h3>
      <p className="wizard-panel-sub">{t.panel1Sub}</p>
      <div className="style-grid">
        {ROOM_TYPES.map((r) => {
          const info = t.roomTypes[r.id as keyof typeof t.roomTypes] || { name: r.name, tag: r.tag };
          return (
            <button 
              key={r.id} 
              className={`style-card ${value === r.id ? "active" : ""}`} 
              onClick={() => onChange(r.id)}
              style={{ minHeight: "auto", padding: "16px" }}
            >
              <div className="style-card-name" style={{ fontSize: "16px" }}>{info.name}</div>
              <div className="style-card-tag">{info.tag}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Step1Dims({ t, roomType, dims, setDims }: { t: any; roomType: string; dims: Dims; setDims: (fn: (d: Dims) => Dims) => void }) {
  const bounds = DIM_BOUNDS[roomType] || { w: [3, 8], l: [3, 10], h: [2.2, 3.5] };
  return (
    <>
      <div className="wizard-panel-eyebrow">{t.step2} 2/4</div>
      <h3>{t.panel2Title}</h3>
      <p className="wizard-panel-sub">{t.panel2Sub.replace("{w0}", bounds.w[0]).replace("{w1}", bounds.w[1]).replace("{l0}", bounds.l[0]).replace("{l1}", bounds.l[1])}</p>
      <div className="dim-grid">
        <DimInput label={t.width} value={dims.w} unit="m" min={bounds.w[0]} max={bounds.w[1]} step={0.1}
          onChange={(v) => setDims((d) => ({ ...d, w: v }))} />
        <DimInput label={t.length} value={dims.l} unit="m" min={bounds.l[0]} max={bounds.l[1]} step={0.1}
          onChange={(v) => setDims((d) => ({ ...d, l: v }))} />
        <DimInput label={t.height} value={dims.h} unit="m" min={bounds.h[0]} max={bounds.h[1]} step={0.1}
          onChange={(v) => setDims((d) => ({ ...d, h: v }))} />
      </div>
      <div style={{
        marginTop: 24, padding: 14, background: "var(--bg-2)", borderRadius: 10,
        fontSize: 12, color: "var(--ink-3)", fontFamily: "Geist Mono, monospace",
        border: "1px solid var(--line)",
      }}>
        {t.floorArea}: <strong style={{ color: "var(--ink)" }}>{(dims.w * dims.l).toFixed(1)} m²</strong>
        &nbsp;·&nbsp; {t.volume}: <strong style={{ color: "var(--ink)" }}>{(dims.w * dims.l * dims.h).toFixed(1)} m³</strong>
      </div>
    </>
  );
}

function DimInput({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="dim-input">
      <label>{label}</label>
      <div className="dim-input-row">
        <span className="dim-input-value">{value.toFixed(1)}</span>
        <span className="dim-input-unit">{unit}</span>
      </div>
      <input type="range" className="dim-slider"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

function Step2Style({ t, style, setStyle }: { t: any; style: string; setStyle: (v: string) => void }) {
  return (
    <>
      <div className="wizard-panel-eyebrow">{t.step3} 3/4</div>
      <h3>{t.panel3Title}</h3>
      <p className="wizard-panel-sub">{t.panel3Sub}</p>
      <div className="style-grid">
        {STYLES.map((s) => {
          const info = t.styles[s.id as keyof typeof t.styles] || { name: s.name, tag: s.tag };
          return (
            <button key={s.id} className={`style-card ${style === s.id ? "active" : ""}`} onClick={() => setStyle(s.id)}>
              <div className="style-card-swatch">
                {s.swatches.map((c, i) => (
                  <div key={i} className="swatch-bar" style={{ background: c, height: `${30 + i * 25}%` }} />
                ))}
              </div>
              <div className="style-card-name">{info.name}</div>
              <div className="style-card-tag">{info.tag}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Step3Prefs({ t, prefs, togglePref }: { t: any; prefs: string[]; togglePref: (id: string) => void }) {
  return (
    <>
      <div className="wizard-panel-eyebrow">{t.step4} 4/4</div>
      <h3>{t.panel4Title}</h3>
      <p className="wizard-panel-sub">{t.panel4Sub}</p>
      <div className="pref-chips">
        {PREFS.map((p) => {
          const label = t.prefs[p.id as keyof typeof t.prefs] || p.label;
          return (
            <button key={p.id} className={`pref-chip ${prefs.includes(p.id) ? "active" : ""}`} onClick={() => togglePref(p.id)}>
              <span className="pref-chip-icon" />
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 32, padding: 16, background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t.youGet}</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
          <li>{t.get1}</li>
          <li>{t.get2}</li>
          <li>{t.get3}</li>
        </ul>
      </div>
    </>
  );
}

