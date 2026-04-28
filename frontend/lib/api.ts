import type { CatalogResponse, Layout, GenerateRequest } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";

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
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
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
