"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "full" | "icon";
}

export function Logo({ 
  className, 
  size = "md", 
  showText = true, 
  variant = "full" 
}: LogoProps) {
  const sizeMap = {
    sm: { text: "text-lg" },
    md: { text: "text-xl" },
    lg: { text: "text-2xl" },
  };

  const dimensions = sizeMap[size];

  return (
    <div className={cn("flex items-center", className)}>
      {/* Logo Text with Creative K - all on one line to match rectangle logo */}
      {showText && variant === "full" && (
        <div className="flex items-baseline">
          {/* Creative K with gradient */}
          <span 
            className={cn(
              "font-bold leading-tight bg-gradient-to-br from-[#0066ff] via-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent tracking-tight",
              dimensions.text
            )}
            style={{
              fontFamily: "var(--font-orbitron), 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            K
          </span>
          {/* Rest of text in current font - bright white for visibility */}
          <span className={cn("font-bold text-white leading-tight", dimensions.text)}>
            ecktech
          </span>
          {/* .net on same line, smaller - bright white */}
          <span className={cn("text-white/90 leading-tight ml-0.5", size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>
            .net
          </span>
        </div>
      )}
      {showText && variant === "icon" && (
        <div className="flex items-baseline">
          <span 
            className={cn(
              "font-bold leading-tight bg-gradient-to-br from-[#0066ff] via-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent tracking-tight",
              dimensions.text
            )}
            style={{
              fontFamily: "var(--font-orbitron), 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            K
          </span>
          <span className={cn("font-bold text-white leading-tight", dimensions.text)}>
            ecktech
          </span>
        </div>
      )}
    </div>
  );
}

