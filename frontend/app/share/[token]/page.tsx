"use client";

import { useParams } from "next/navigation";

import PublicLayoutView from "@/components/share/PublicLayoutView";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  return <PublicLayoutView token={token} />;
}
