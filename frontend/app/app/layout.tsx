import { AppShell } from "@/components/shell/AppShell";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}