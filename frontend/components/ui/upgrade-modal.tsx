"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Zap } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURES = [
  { icon: Zap, label: "Unlimited generations" },
  { icon: Sparkles, label: "Premium catalog items" },
  { icon: Lock, label: "Priority support" },
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display tracking-tight">
            <Sparkles size={20} className="text-brand-accent" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Get unlimited generations, premium catalog items, and priority support.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 my-4">
          {FEATURES.map((f) => (
            <li key={f.label} className="flex items-center gap-3 text-sm text-foreground">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon size={16} />
              </div>
              {f.label}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Pro is coming soon. You&apos;ll be the first to know!
          </p>
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
