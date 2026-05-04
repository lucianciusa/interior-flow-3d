"use client";

import { useState, useEffect, ReactNode } from "react";

export function WebGLFallback({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  // Bypass the strict WebGL check and attempt to render the 3D scene anyway.
  // If it truly fails, the ErrorBoundary wrapper will catch the crash.
  return <>{children}</>;
}
