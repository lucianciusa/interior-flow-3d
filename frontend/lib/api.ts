import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/stores/auth";
import { supabase } from "@/lib/supabase";
import type {
  CatalogResponse,
  ConversionRequest,
  ConversionResponse,
  GenerateRequest,
  Layout,
  LayoutCreate,
  LayoutPatch,
  LayoutRecord,
  LayoutSummary,
  ProjectCreate,
  ProjectPatch,
  ProjectRecord,
  RoomCreate,
  RoomPatch,
  RoomRecord,
  ShareTokenResponse,
  SwapRequest,
} from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_BASE_URL!;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const fetchHealth = () => authedFetch<{ status: string }>("/healthz");

export const catalogQuery = () => ({
  queryKey: ["catalog"] as const,
  queryFn: () => authedFetch<CatalogResponse>("/catalog"),
  staleTime: 60 * 60 * 1000,
});

export function useGenerateLayout() {
  return useMutation({
    mutationFn: (body: GenerateRequest) =>
      authedFetch<Layout>("/generate-layout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

// ── projects ────────────────────────────────────────────────────────────────

export function useListProjects() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["projects"] as const,
    queryFn: () => authedFetch<ProjectRecord[]>("/projects"),
    enabled: !!session,
  });
}

export function useGetProject(projectId: string | null | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["projects", projectId] as const,
    queryFn: () => authedFetch<ProjectRecord>(`/projects/${projectId}`),
    enabled: !!session && !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectCreate) =>
      authedFetch<ProjectRecord>("/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectPatch) =>
      authedFetch<ProjectRecord>(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authedFetch<void>(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useConvertAnonLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConversionRequest) =>
      authedFetch<ConversionResponse>("/projects/conversion", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ── rooms ───────────────────────────────────────────────────────────────────

export function useListRoomsForProject(projectId: string | null | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["projects", projectId, "rooms"] as const,
    queryFn: () => authedFetch<RoomRecord[]>(`/projects/${projectId}/rooms`),
    enabled: !!session && !!projectId,
  });
}

export function useCreateRoom(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoomCreate) =>
      authedFetch<RoomRecord>(`/projects/${projectId}/rooms`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["projects", projectId, "rooms"] }),
  });
}

export function useUpdateRoom(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoomPatch) =>
      authedFetch<RoomRecord>(`/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authedFetch<void>(`/rooms/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ── layouts ────────────────────────────────────────────────────────────────

export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LayoutCreate) =>
      authedFetch<{ id: string }>("/layouts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layouts"] }),
  });
}

export function useListLayouts() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["layouts"] as const,
    queryFn: () => authedFetch<LayoutSummary[]>("/layouts"),
    enabled: !!session,
  });
}

export function useListLayoutsForRoom(roomId: string | null | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["rooms", roomId, "layouts"] as const,
    queryFn: () => authedFetch<LayoutSummary[]>(`/layouts?room_id=${roomId}`),
    enabled: !!session && !!roomId,
  });
}

export function useGetLayout(id: string | null | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["layouts", id] as const,
    queryFn: () => authedFetch<LayoutRecord>(`/layouts/${id}`),
    enabled: !!session && !!id,
  });
}

export function useUpdateLayout(layoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LayoutPatch) =>
      authedFetch<LayoutRecord>(`/layouts/${layoutId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts"] });
      qc.invalidateQueries({ queryKey: ["layouts", layoutId] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDuplicateLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authedFetch<{ id: string }>(`/layouts/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authedFetch<void>(`/layouts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// ── share ───────────────────────────────────────────────────────────────────

export function useShareLayout(layoutId: string) {
  return useMutation({
    mutationFn: () =>
      authedFetch<ShareTokenResponse>(`/layouts/${layoutId}/share`, { method: "POST" }),
  });
}

export function useRevokeShare(layoutId: string) {
  return useMutation({
    mutationFn: () =>
      authedFetch<void>(`/layouts/${layoutId}/share`, { method: "DELETE" }),
  });
}

export function useGetSharedLayout(token: string | null | undefined) {
  return useQuery({
    queryKey: ["share", token] as const,
    queryFn: () => publicFetch<LayoutRecord>(`/share/${token}`),
    enabled: !!token,
    retry: false,
  });
}

// ── swap ───────────────────────────────────────────────────────────────────

export function useSwapItem(layoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SwapRequest) =>
      authedFetch<LayoutRecord>(`/layouts/${layoutId}/swap`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts", layoutId] });
    },
  });
}
