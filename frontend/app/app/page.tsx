"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import EmptyProjects from "@/components/projects/EmptyProjects";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import ProjectGrid from "@/components/projects/ProjectGrid";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { useConvertAnonLayout, useListProjects, useDeleteProject } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/lib/stores/wizard";
import { Skeleton } from "@/components/ui/skeleton";
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
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const router = useRouter();
  const { data, isLoading, isError, error } = useListProjects();
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

  if (!ready) {
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
            Generate a 3D interior layout in seconds. Sign in to save your work.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button asChild>
              <Link href="/app/new">Try without signing in</Link>
            </Button>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
            Projects
          </h1>
          {data && data.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {selectedIds.size === data.length ? "Deselect all" : "Select all"}
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
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            useWizardStore.getState().reset();
            router.push("/app/new");
          }}>
            Quick generate
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            + New project
          </Button>
        </div>
      </div>

      {convertError && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          Could not save your generated layout: {convertError}
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
          Could not load projects: {error instanceof Error ? error.message : "error"}
        </p>
      )}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyProjects onCreate={() => setNewOpen(true)} />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ProjectGrid 
          projects={data} 
          selectedIds={selectedIds}
          onToggle={toggleOne}
        />
      )}

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Delete Multiple Projects"
        description={`Are you sure you want to delete ${selectedIds.size} projects? This action cannot be undone.`}
        onConfirm={deleteSelected}
        isLoading={isDeletingBulk}
      />

      <TemplateGallery />

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
