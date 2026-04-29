"use client";

import { useEffect, useState } from "react";

import { useRevokeShare, useShareLayout } from "@/lib/api";
import type { ShareTokenResponse } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutId: string;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function ShareDialog({ open, onOpenChange, layoutId }: Props) {
  const share = useShareLayout(layoutId);
  const revoke = useRevokeShare(layoutId);
  const [token, setToken] = useState<ShareTokenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setToken(null);
    setCopied(false);
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const create = async () => {
    setError(null);
    try {
      const t = await share.mutateAsync();
      setToken(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not create link");
    }
  };

  const doRevoke = async () => {
    setError(null);
    try {
      await revoke.mutateAsync();
      setToken(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not revoke");
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Share this layout</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Anyone with the link can view (read-only). You can revoke it any time.
        </p>

        {!token && (
          <button
            type="button"
            onClick={create}
            disabled={share.isPending}
            className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {share.isPending ? "Generating…" : "Create share link"}
          </button>
        )}

        {token && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                readOnly
                value={token.url}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={copy}
                className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Expires {fmtDate(token.expires_at)}
            </p>
            <button
              type="button"
              onClick={doRevoke}
              disabled={revoke.isPending}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {revoke.isPending ? "Revoking…" : "Revoke link"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full text-xs text-neutral-500 hover:text-neutral-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
