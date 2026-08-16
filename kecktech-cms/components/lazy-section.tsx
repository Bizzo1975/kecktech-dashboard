"use client";

import { lazy, Suspense, ComponentType } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazySection({ children, fallback }: LazySectionProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}

// Lazy load heavy components
export const LazyGeometricBackground = lazy(
  () => import("@/components/geometric-background").then((mod) => ({ default: mod.GeometricBackground }))
);

