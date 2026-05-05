"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import EmptyProjects from "@/components/projects/EmptyProjects";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import ProjectGrid from "@/components/projects/ProjectGrid";
import { StyleGallery } from "@/components/templates/StyleGallery";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { useConvertAnonLayout, useListProjects, useDeleteProject, useListLayouts } from "@/lib/api";
import LayoutGrid from "@/components/layouts/LayoutGrid";
import { useAuthStore } from "@/lib/stores/auth";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/lib/stores/wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/stores/useLanguage";
import type { ConversionRequest } from "@/lib/types";

const PENDING_KEY = "pendingAnonLayout";

function readPending(): ConversionRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConversionRequest;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const router = useRouter();
  const { data, isLoading, isError, error } = useListProjects();
  const { data: allLayouts, isLoading: layoutsLoading } = useListLayouts();
  const { mutateAsync: convertAnon } = useConvertAnonLayout();

  const [loginOpen, setLoginOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const convertingRef = useRef(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const { mutateAsync: deleteProject } = useDeleteProject();

  useEffect(() => {
    if (!ready || !session || convertingRef.current) return;
    const pending = readPending();
    if (!pending) return;
    convertingRef.current = true;
    convertAnon(pending)
      .then((res) => {
        window.sessionStorage.removeItem(PENDING_KEY);
        router.push(
          `/app/projects/${res.project_id}/rooms/${res.room_id}/layouts/${res.layout_id}`,
        );
      })
      .catch((e: unknown) => {
        convertingRef.current = false;
        setConvertError(e instanceof Error ? e.message : "conversion failed");
      });
  }, [ready, session, convertAnon, router]);

  const toggleOne = (id: string, val: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (val) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((p) => p.id)));
    }
  };

  const deleteSelected = async () => {
    setIsDeletingBulk(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteProject(id);
      }
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!ready || !mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold tracking-tight font-display text-foreground">
            Interior Flow 3D
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth_subtitle")}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link 
              href="/app/new" 
              className={cn(buttonVariants())}
            >
              {t("try_no_signup")}
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("sign_in")}
            </button>
          </div>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  const freeDesignsNames = [t("free_designs_project"), "Free Designs", "Diseños libres"];
  
  // Filter out the container project from the main grid
  const regularProjects = data?.filter(p => !freeDesignsNames.some(fn => fn.toLowerCase() === p.name.toLowerCase())) || [];
  
  // Filter layouts that belong to the "Free Designs" projects
  const quickLayouts = allLayouts?.filter(l => {
    if (!l.project_name) return false;
    const name = l.project_name.toLowerCase().trim();
    return freeDesignsNames.some(fn => fn.toLowerCase().trim() === name);
  }) || [];

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
            {t("projects")}
          </h1>
          {regularProjects.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {selectedIds.size === regularProjects.length ? t("deselect_all") : t("select_all")}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
            >
              {t("delete_selected")} ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            useWizardStore.getState().reset();
            useWizardStore.getState().setIsTemplateFlow(true);
            router.push("/app/new");
          }}>
            {t("quick_generate")}
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            + {t("new_project")}
          </Button>
        </div>
      </div>

      {convertError && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {convertError}
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "error"}
        </p>
      )}
      
      {!isLoading && !isError && regularProjects.length === 0 && quickLayouts.length === 0 && (
        <EmptyProjects onCreate={() => setNewOpen(true)} />
      )}

      {!isLoading && !isError && regularProjects.length > 0 && (
        <ProjectGrid 
          projects={regularProjects} 
          selectedIds={selectedIds}
          onToggle={toggleOne}
        />
      )}

      {/* Quick Generations Section - Individual Layouts */}
      {!layoutsLoading && quickLayouts.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight font-display text-foreground">
              {t("quick_generations")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("quick_generate_desc")}
            </p>
          </div>
          <LayoutGrid 
            layouts={quickLayouts} 
            selectedIds={selectedIds}
            onToggle={toggleOne}
          />
        </div>
      )}

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={t("delete_multiple_title")}
        description={t("delete_multiple_desc")}
        onConfirm={deleteSelected}
        isLoading={isDeletingBulk}
      />

      <div className="my-12 border-t border-border" />
      <StyleGallery />
      <div className="my-12 border-t border-border" />
      <TemplateGallery />

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
