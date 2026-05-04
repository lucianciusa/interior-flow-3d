"use client";

import { useState, useEffect, ReactNode } from "react";

export function WebGLFallback({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "supported" | "unsupported">("checking");

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        setStatus("supported");
      } else {
        setStatus("unsupported");
      }
    } catch (e) {
      setStatus("unsupported");
    }
  }, []);

  if (status === "checking") return null;
  if (status === "unsupported") return <>{fallback}</>;
  
  return <>{children}</>;
}
