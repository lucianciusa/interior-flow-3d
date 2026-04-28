import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/stores/auth";
import { supabase } from "@/lib/supabase";
import type {
  CatalogResponse,
  GenerateRequest,
  Layout,
  LayoutCreate,
  LayoutRecord,
  LayoutSummary,
  RoomCreate,
  RoomRecord,
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

export function useCreateRoom() {
  return useMutation({
    mutationFn: (body: RoomCreate) =>
      authedFetch<RoomRecord>("/rooms", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useSaveLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LayoutCreate) =>
      authedFetch<{ id: string }>("/layouts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts"] });
    },
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

export function useGetLayout(id: string | null | undefined) {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["layouts", id] as const,
    queryFn: () => authedFetch<LayoutRecord>(`/layouts/${id}`),
    enabled: !!session && !!id,
  });
}

export function useDeleteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authedFetch<void>(`/layouts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts"] });
    },
  });
}
