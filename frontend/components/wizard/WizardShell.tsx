"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import ResultView from "@/components/result/ResultView";
import DimensionsStep from "@/components/wizard/DimensionsStep";
import PreferencesStep from "@/components/wizard/PreferencesStep";
import StyleStep from "@/components/wizard/StyleStep";
import { useConvertAnonLayout, useGenerateLayout } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { useWizardStore } from "@/lib/stores/wizard";
import type { Preference, RoomDims, Style } from "@/lib/types";

const PHASE_LABELS = ["Dimensions", "Style", "Preferences"];
const PHASE_INDEX: Record<string, number> = { step1: 0, step2: 1, step3: 2 };

type SaveState = "idle" | "saving" | "saved";

export default function WizardShell() {
  const phase = useWizardStore((s) => s.phase);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);
  const preferences = useWizardStore((s) => s.preferences);
  const layout = useWizardStore((s) => s.layout);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setPreferences = useWizardStore((s) => s.setPreferences);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setSeed = useWizardStore((s) => s.setSeed);

  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const { mutate: generate, isPending } = useGenerateLayout();
  const { mutateAsync: convertAnon } = useConvertAnonLayout();

  const [loginOpen, setLoginOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSaveRef = useRef(false);

  const handleGenerate = (newSeed?: number) => {
    if (!style) return;
    const useSeed = newSeed ?? Math.floor(Math.random() * 1_000_000);
    setSeed(useSeed);
    setPhase("generating");
    setSaveState("idle");
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

  const persist = useCallback(async () => {
    if (!layout || !style) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const result = await convertAnon({
        projectName: "My first project",
        roomName: "Living room",
        ...dims,
        layout,
      });
      setSaveState("saved");
      router.push(
        `/app/projects/${result.project_id}/rooms/${result.room_id}/layouts/${result.layout_id}`,
      );
    } catch (e) {
      setSaveState("idle");
      setSaveError(e instanceof Error ? e.message : "save failed");
    }
  }, [layout, style, dims, convertAnon, router]);

  const handleSave = () => {
    if (!layout || !style) return;
    if (!session) {
      try {
        window.sessionStorage.setItem(
          "pendingAnonLayout",
          JSON.stringify({
            projectName: "My first project",
            roomName: "Living room",
            ...dims,
            layout,
          }),
        );
      } catch {
        // sessionStorage unavailable — fall back to in-memory ref.
      }
      pendingSaveRef.current = true;
      setLoginOpen(true);
      return;
    }
    void persist();
  };

  const handleLoginOpenChange = (open: boolean) => {
    setLoginOpen(open);
    if (!open) pendingSaveRef.current = false;
  };

  if (session && pendingSaveRef.current && saveState === "idle") {
    pendingSaveRef.current = false;
    setLoginOpen(false);
    void persist();
  }

  if (phase === "result" && layout && style) {
    return (
      <>
        <ResultView
          layout={layout}
          dims={dims}
          style={style}
          preferences={preferences}
          onRegenerate={handleRegenerate}
          onAdjust={handleAdjust}
          onSave={handleSave}
          saveState={saveState}
        />
        {saveError && (
          <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-destructive px-4 py-2 text-sm text-primary-foreground shadow-lg">
            {saveError}
          </div>
        )}
        <LoginModal
          open={loginOpen}
          onOpenChange={handleLoginOpenChange}
          message="Sign in to save this layout."
        />
      </>
    );
  }

  if (phase === "generating") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">Designing your room&hellip;</p>
      </div>
    );
  }

  const stepIndex = PHASE_INDEX[phase] ?? 0;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            {PHASE_LABELS.map((label, i) => (
              <span key={label} className={i <= stepIndex ? "text-foreground font-medium" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

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
