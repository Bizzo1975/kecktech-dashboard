"use client";

import { usePathname } from "next/navigation";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";

export function ConditionalBackground() {
  const pathname = usePathname();
  
  // Don't render background on demo pages - they have their own
  if (pathname?.includes("/circuit-improved-demo")) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 z-0 pointer-events-none min-h-full">
      <CircuitBackground16 />
    </div>
  );
}

