"use client";

import { useEffect, useState } from "react";
import { useRevokeShare, useShareLayout } from "@/lib/api";
import type { ShareTokenResponse } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this layout</DialogTitle>
          <DialogDescription>
            Anyone with the link can view (read-only). You can revoke it any time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!token && (
            <Button
              onClick={create}
              disabled={share.isPending}
              className="w-full"
            >
              {share.isPending ? "Generating…" : "Create share link"}
            </Button>
          )}

          {token && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={token.url}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button onClick={copy} variant="secondary">
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Expires {fmtDate(token.expires_at)}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={doRevoke}
                disabled={revoke.isPending}
              >
                {revoke.isPending ? "Revoking…" : "Revoke link"}
              </Button>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
