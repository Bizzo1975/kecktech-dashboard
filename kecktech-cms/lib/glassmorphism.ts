// Glassmorphism utility functions and classes

export const glassStyles = {
  default: "glass",
  subtle: "glass-subtle",
  strong: "glass-strong",
} as const;

export type GlassVariant = keyof typeof glassStyles;

// Helper function to apply glassmorphism classes
export function getGlassClass(variant: GlassVariant = "default"): string {
  return glassStyles[variant];
}

// Glassmorphism configuration
export const glassConfig = {
  blur: {
    subtle: "blur(5px)",
    default: "blur(10px)",
    strong: "blur(20px)",
  },
  opacity: {
    subtle: 0.05,
    default: 0.1,
    strong: 0.15,
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.1)",
    default: "rgba(255, 255, 255, 0.2)",
    strong: "rgba(255, 255, 255, 0.3)",
  },
} as const;

