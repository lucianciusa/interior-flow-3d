"use client";

import { useParams, usePathname } from "next/navigation";
import { useWizardStore } from "@/lib/stores/wizard";
import { useGetRoom } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, Lightbulb, Sparkles, Zap } from "lucide-react";

import { useLanguage } from "@/lib/stores/useLanguage";

export function RightInspector({ isFloating }: { isFloating: boolean }) {
  const { t } = useLanguage();
  const params = useParams<{ roomId?: string }>();
  const pathname = usePathname();
  const roomId = params?.roomId;
  
  // Call ALL hooks unconditionally at the very top.
  // Using individual selectors for maximum stability and performance.
  const roomType = useWizardStore((s) => s.roomType);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);
  const roomQuery = useGetRoom(roomId);

  const isDashboard = pathname === "/app";

  return (
    <aside className={`
      ${isFloating ? "absolute bottom-0 right-0 top-0 z-50 shadow-lg" : "hidden lg:flex h-full relative z-10"} 
      w-80 flex-col border-l bg-background p-6
    `}>
      {isDashboard ? (
        <>
          <h3 className="text-lg font-semibold mb-6 tracking-tight font-display text-foreground">{t("overview")}</h3>
          
          <div className="space-y-6">
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-widest">{t("getting_started")}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("getting_started_desc")}
              </p>
            </div>

            <div className="space-y-5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t("pro_tips")}</h4>
              
              <div className="flex items-start gap-4 group cursor-default">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t("quick_generate_tip")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t("quick_generate_desc")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group cursor-default">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500/20">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t("save_variants_tip")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t("save_variants_desc")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group cursor-default">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-colors group-hover:bg-emerald-500/20">
                  <Home className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t("multi_room_tip")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t("multi_room_desc")}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border/50">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] text-center text-muted-foreground italic">
                  {t("need_help")}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : isFloating ? (
        <>
          <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">{t("scene_details")}</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("room_type")}</p>
              <p className="text-sm font-medium capitalize">{t(roomType || "none")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("dimensions")}</p>
              <p className="text-sm font-medium">{dims?.width_m}m x {dims?.length_m}m x {dims?.height_m}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("style")}</p>
              <p className="text-sm font-medium capitalize">{t(style || "none")}</p>
            </div>
          </div>
        </>
      ) : roomId && roomQuery.isLoading ? (
        <>
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </>
      ) : roomId && roomQuery.data ? (
        <>
          <h3 className="text-lg font-semibold mb-6 tracking-tight font-display text-foreground">{t("room_specs")}</h3>
          
          <div className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t("dimensions")}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("width")}</span>
                  <span className="text-xs font-medium">{roomQuery.data.width_m.toFixed(2)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("length")}</span>
                  <span className="text-xs font-medium">{roomQuery.data.length_m.toFixed(2)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("height")}</span>
                  <span className="text-xs font-medium">{roomQuery.data.height_m.toFixed(2)}m</span>
                </div>
                <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                  <span className="text-xs font-semibold text-foreground">{t("total_area")}</span>
                  <span className="text-sm font-bold text-primary">{(roomQuery.data.width_m * roomQuery.data.length_m).toFixed(1)} m²</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-muted/30 p-4 border border-dashed border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t("room_type")}</p>
              <p className="text-sm font-medium capitalize text-foreground">{t(roomQuery.data.room_type || "none")}</p>
            </div>

            <div className="p-2">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {t("inspector_tip")}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold mb-6 tracking-tight font-display text-foreground">{t("dashboard")}</h3>
          
          <div className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t("current_config")}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("type")}</span>
                  <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border capitalize">{t(roomType || "none")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("size")}</span>
                  <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border">{dims?.width_m}x{dims?.length_m}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("style")}</span>
                  <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border border-border capitalize">{t(style || "none")}</span>
                </div>
              </div>
            </div>

            <div className="p-2">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {t("wizard_tip")}
              </p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}