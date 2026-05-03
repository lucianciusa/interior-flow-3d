"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";

import LoginModal from "@/components/auth/LoginModal";
import ResultView from "@/components/result/ResultView";
import RoomTypeStep from "@/components/wizard/RoomTypeStep";
import DimensionsStep from "@/components/wizard/DimensionsStep";
import PreferencesStep from "@/components/wizard/PreferencesStep";
import StyleStep from "@/components/wizard/StyleStep";

import { useConvertAnonLayout, useGenerateLayout, useSaveLayout } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { useWizardStore } from "@/lib/stores/wizard";
import { useLanguage } from "@/lib/stores/useLanguage";
import type { Preference, RoomDims, Style, RoomType } from "@/lib/types";

const PHASE_LABELS = ["Type", "Dimensions", "Style", "Preferences"];
const PHASE_INDEX: Record<string, number> = { step0: 0, step1: 1, step2: 2, step3: 3 };

type SaveState = "idle" | "saving" | "saved";

export default function WizardShell() {
  const { t } = useLanguage();
  const phase = useWizardStore((s) => s.phase);
  const roomType = useWizardStore((s) => s.roomType);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);
  const preferences = useWizardStore((s) => s.preferences);
  const layout = useWizardStore((s) => s.layout);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setRoomType = useWizardStore((s) => s.setRoomType);
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setPreferences = useWizardStore((s) => s.setPreferences);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setSeed = useWizardStore((s) => s.setSeed);
  const isTemplateFlow = useWizardStore((s) => s.isTemplateFlow);

  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const { mutateAsync: generateAsync, isPending } = useGenerateLayout();
  const { mutateAsync: convertAnon } = useConvertAnonLayout();
  const { mutateAsync: saveExisting } = useSaveLayout();

  const searchParams = useSearchParams();
  const roomId = searchParams?.get("roomId");
  const projectId = searchParams?.get("projectId");
  const isQuickFlow = !!roomId;

  const [loginOpen, setLoginOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSaveRef = useRef(false);
  const captureRef = useRef<(() => string) | null>(null);

  const labels = isQuickFlow 
    ? [t("style"), t("preferences")] 
    : [t("type"), t("dimensions"), t("style"), t("preferences")];
  const stepIndex = PHASE_INDEX[phase] ?? 0;
  const displayStepIndex = isQuickFlow ? stepIndex - 2 : stepIndex;
  const totalSteps = labels.length;

  useEffect(() => {
    if (isQuickFlow && phase === "step0") {
      setPhase("step2");
    }
  }, [isQuickFlow, phase, setPhase]);

  const { language } = useLanguage();

  const handleGenerate = async (newSeed?: number) => {
    if (!style) return;
    const useSeed = newSeed ?? Math.floor(Math.random() * 1_000_000);
    setSeed(useSeed);
    setPhase("generating");
    setSaveState("idle");
    
    try {
      const data = await generateAsync({
        roomType,
        ...dims,
        style,
        preferences,
        seed: useSeed,
        language,
      });
      setLayout(data);
      setPhase("result");
    } catch (err) {
      console.error("Generation failed:", err);
      // Fallback to step 3 so user isn't stuck
      setPhase("step3");
    }
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
      const screenshot = captureRef.current ? captureRef.current() : null;
      if (roomId && projectId) {
        const result = await saveExisting({
          roomId,
          layout,
          name: "New Layout",
          thumbnail_url: screenshot,
        });
        setSaveState("saved");
        router.push(
          `/app/projects/${projectId}/rooms/${roomId}/layouts/${result.id}`,
        );
      } else {
        const result = await convertAnon({
          projectName: t("free_designs_project"),
          roomName: t("quick_room"),
          roomType,
          ...dims,
          layout,
          thumbnail_url: screenshot,
        });
        setSaveState("saved");
        router.push(
          `/app/projects/${result.project_id}/rooms/${result.room_id}/layouts/${result.layout_id}`,
        );
      }
    } catch (e) {
      setSaveState("idle");
      setSaveError(e instanceof Error ? e.message : "save failed");
    }
  }, [layout, style, dims, roomType, t, convertAnon, saveExisting, roomId, projectId, router]);

  const handleSave = () => {
    if (!layout || !style) return;
    if (!session) {
      try {
        window.sessionStorage.setItem(
          "pendingAnonLayout",
          JSON.stringify({
            projectName: t("free_designs_project"),
            roomName: t("quick_room"),
            roomType,
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
          roomType={roomType}
          layout={layout}
          dims={dims}
          style={style}
          preferences={preferences}
          onRegenerate={handleRegenerate}
          onAdjust={handleAdjust}
          onSave={handleSave}
          saveState={saveState}
          captureRef={captureRef}
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
        <p className="text-sm text-muted-foreground">{t("designing_room")}</p>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    router.push("/app");
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">


        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            {labels.map((label, i) => (
              <span key={label} className={i <= displayStepIndex ? "text-foreground font-medium" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((displayStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {phase === "step0" && (
          <RoomTypeStep
            value={roomType}
            onChange={(rt: RoomType) => setRoomType(rt)}
            onNext={() => setPhase("step1")}
            onBack={handleBackToDashboard}
          />
        )}
        {phase === "step1" && (
          <DimensionsStep
            roomType={roomType}
            initial={dims}
            onNext={(d: RoomDims) => {
              setDims(d);
              setPhase("step2");
            }}
            onBack={isTemplateFlow ? handleBackToDashboard : () => setPhase("step0")}
          />
        )}
        {phase === "step2" && (
          <StyleStep
            value={style}
            onChange={(s: Style) => setStyle(s)}
            onNext={() => setPhase("step3")}
            onBack={() => {
              if (isTemplateFlow) {
                handleBackToDashboard();
              } else if (isQuickFlow) {
                router.back();
              } else {
                setPhase("step1");
              }
            }}
          />
        )}
        {phase === "step3" && (
          <PreferencesStep
            value={preferences}
            onChange={(p: Preference[]) => setPreferences(p)}
            onGenerate={() => handleGenerate()}
            onBack={isTemplateFlow ? handleBackToDashboard : () => setPhase("step2")}
            isGenerating={isPending}
          />
        )}
      </div>
    </div>
  );
}
