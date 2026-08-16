import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "strong";
}

export function GlassCard({
  className,
  variant = "default",
  ...props
}: GlassCardProps) {
  const variantClasses = {
    default: "glass",
    subtle: "glass-subtle",
    strong: "glass-strong",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-6 shadow-lg backdrop-blur-md",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

