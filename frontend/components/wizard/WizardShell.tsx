"use client";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";

import { useWizardStore } from "@/lib/stores/wizard";
import { useGenerateLayout } from "@/lib/api";
import { useViewerStore } from "@/lib/stores/viewer";

import DimensionsStep from "@/components/wizard/DimensionsStep";
import StyleStep from "@/components/wizard/StyleStep";
import PreferencesStep from "@/components/wizard/PreferencesStep";
import ResultSidebar from "@/components/sidebar/ResultSidebar";
import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";

import type { RoomDims, Style, Preference } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

const PHASE_LABELS = ["Dimensions", "Style", "Preferences"];
const PHASE_INDEX: Record<string, number> = { step1: 0, step2: 1, step3: 2 };

export default function WizardShell() {
  const phase = useWizardStore((s) => s.phase);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);
  const preferences = useWizardStore((s) => s.preferences);
  const layout = useWizardStore((s) => s.layout);
  const seed = useWizardStore((s) => s.seed);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setPreferences = useWizardStore((s) => s.setPreferences);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setSeed = useWizardStore((s) => s.setSeed);
  const reset = useWizardStore((s) => s.reset);
  const clearSelection = useViewerStore((s) => s.setSelectedItem);

  const { mutate: generate, isPending } = useGenerateLayout();

  useEffect(() => {
    if (phase === "result") {
      clearSelection(null);
    }
  }, [phase, clearSelection]);

  const handleGenerate = (newSeed?: number) => {
    if (!style) return;
    const useSeed = newSeed ?? Math.floor(Math.random() * 1_000_000);
    setSeed(useSeed);
    setPhase("generating");
    generate(
      { roomType: "living_room", ...dims, style, preferences, seed: useSeed },
      {
        onSuccess: (data) => {
          setLayout(data);
          setPhase("result");
        },
        onError: () => {
          setPhase("step3");
        },
      },
    );
  };

  const handleRegenerate = () => {
    handleGenerate(Math.floor(Math.random() * 1_000_000));
  };

  const handleAdjust = () => {
    setPhase("step3");
  };

  // Result view
  if (phase === "result" && layout && style) {
    return (
      <div className="flex h-screen">
        <div className="relative flex-1">
          <div className="absolute left-4 top-4 z-10">
            <CameraPresets />
          </div>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-neutral-400">
                Loading 3D scene&hellip;
              </div>
            }
          >
            <Scene layout={layout} dims={dims} />
          </Suspense>
          <ItemPopover />
        </div>
        <div className="w-80 shrink-0 border-l border-neutral-200">
          <ResultSidebar
            layout={layout}
            style={style}
            preferences={preferences}
            onRegenerate={handleRegenerate}
            onAdjust={handleAdjust}
          />
        </div>
      </div>
    );
  }

  // Generating loading state
  if (phase === "generating") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
        <p className="text-sm text-neutral-500">Designing your room&hellip;</p>
      </div>
    );
  }

  // Wizard steps
  const stepIndex = PHASE_INDEX[phase] ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-neutral-400">
            {PHASE_LABELS.map((label, i) => (
              <span key={label} className={i <= stepIndex ? "text-neutral-900" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        {phase === "step1" && (
          <DimensionsStep
            initial={dims}
            onNext={(d: RoomDims) => {
              setDims(d);
              setPhase("step2");
            }}
          />
        )}
        {phase === "step2" && (
          <StyleStep
            value={style}
            onChange={(s: Style) => setStyle(s)}
            onNext={() => setPhase("step3")}
            onBack={() => setPhase("step1")}
          />
        )}
        {phase === "step3" && (
          <PreferencesStep
            value={preferences}
            onChange={(p: Preference[]) => setPreferences(p)}
            onGenerate={() => handleGenerate()}
            onBack={() => setPhase("step2")}
            isGenerating={isPending}
          />
        )}
      </div>
    </div>
  );
}
