"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { useLanguage } from "@/lib/stores/useLanguage";

export default function LoginModal({ open, onOpenChange, message }: LoginModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    setTimeout(() => emailRef.current?.focus(), 50);
  }, [open]);

  const emailValid = EMAIL_RE.test(email);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setStatus({ kind: "error", message: error.message });
    else setStatus({ kind: "sent" });
  }

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setStatus({ kind: "error", message: error.message });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("sign_in_to_save")}</DialogTitle>
          <DialogDescription>
            {message ?? t("magic_link_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={status.kind === "sending"}
            className="w-full"
          >
            {t("auth_google")}
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <div>
              <label htmlFor="login-email" className="text-xs font-medium text-foreground">
                {t("email")}
              </label>
              <input
                id="login-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!emailValid || status.kind === "sending" || status.kind === "sent"}
              className="w-full"
            >
              {status.kind === "sending" ? t("sending_link") : t("send_magic_link")}
            </Button>
          </form>

          {status.kind === "sent" && (
            <p className="mt-3 text-sm text-emerald-600">
              {t("check_inbox")}
            </p>
          )}
          {status.kind === "error" && (
            <p className="mt-3 text-sm text-destructive">{status.message}</p>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full mt-2"
          >
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
